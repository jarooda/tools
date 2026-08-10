<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Tooltip } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/table'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import {
  computeElapsedMs,
  computeRemainingMs,
  msFromParts,
  formatCountdownClock,
  formatDurationWords,
} from '@/utils/countdownTimer'

definePageMeta({ layout: 'tool' })

const tool = getTool('datetime-countdown')!

type Mode = 'countdown' | 'stopwatch'
type TimerState = 'idle' | 'running' | 'paused' | 'finished'

const MODE_OPTIONS_BASE = [
  { value: 'countdown', label: 'Countdown' },
  { value: 'stopwatch', label: 'Stopwatch' },
]

const PRESET_OPTIONS = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '10', label: '10m' },
  { value: '25', label: '25m' },
  { value: '60', label: '60m' },
]

const mode = ref<Mode>('countdown')
const state = ref<TimerState>('idle')

const hours = ref(0)
const minutes = ref(5)
const seconds = ref(0)

const soundOn = ref(true)
const notifyOn = ref(false)
const notifyUnsupported = ref(false)
const notifyDenied = ref(false)

const accumulatedMs = ref(0)
const startTimestamp = ref<number | null>(null)
const nowTick = ref(0)

interface Lap {
  id: number
  index: number
  splitMs: number
}
const laps = ref<Lap[]>([])
let lapId = 0

const pulse = ref(false)

const ready = ref(false)

const announcement = ref('')
const finishedAnnouncement = ref('')

let tickHandle: ReturnType<typeof setInterval> | undefined

function startTicking() {
  stopTicking()
  tickHandle = setInterval(tick, 250)
}
function stopTicking() {
  if (tickHandle) {
    clearInterval(tickHandle)
    tickHandle = undefined
  }
}
function tick() {
  nowTick.value = performance.now()
  if (mode.value === 'countdown' && state.value === 'running' && remainingMs.value <= 0) {
    finishCountdown()
  }
}

onMounted(() => {
  nowTick.value = performance.now()
  ready.value = true
})
onUnmounted(() => stopTicking())

const modeOptions = computed(() =>
  MODE_OPTIONS_BASE.map((o) => ({ ...o, disabled: state.value !== 'idle' })),
)

function setMode(next: string) {
  if (state.value !== 'idle') return
  mode.value = next as Mode
  laps.value = []
}

const targetMs = computed(() => msFromParts(hours.value, minutes.value, seconds.value))
const presetSelected = computed(() =>
  hours.value === 0 && seconds.value === 0 ? String(minutes.value) : null,
)

function selectPreset(value: string | string[] | null) {
  if (typeof value !== 'string') return
  hours.value = 0
  minutes.value = Number(value)
  seconds.value = 0
}

const elapsedMs = computed(() =>
  computeElapsedMs(accumulatedMs.value, startTimestamp.value, nowTick.value),
)
const remainingMs = computed(() => computeRemainingMs(targetMs.value, elapsedMs.value))
const displayMs = computed(() => (mode.value === 'countdown' ? remainingMs.value : elapsedMs.value))
const displayClock = computed(() => formatCountdownClock(displayMs.value))

const progressTone = computed(() =>
  remainingMs.value <= targetMs.value * 0.1 ? 'danger' : 'brand',
)

const canStart = computed(() => mode.value === 'stopwatch' || targetMs.value > 0)

const transportLabel = computed(() => {
  if (state.value === 'running') return 'Pause'
  if (state.value === 'paused') return 'Resume'
  return 'Start'
})
const transportIcon = computed(() => (state.value === 'running' ? UI_ICON.pause : UI_ICON.play))

function onTransportClick() {
  if (state.value === 'idle') start()
  else if (state.value === 'running') pause()
  else if (state.value === 'paused') resume()
}

function start() {
  if (!canStart.value) return
  accumulatedMs.value = 0
  startTimestamp.value = performance.now()
  nowTick.value = startTimestamp.value
  state.value = 'running'
  startTicking()
  announcement.value =
    mode.value === 'countdown'
      ? `Countdown started. ${formatDurationWords(targetMs.value)} remaining.`
      : 'Stopwatch started.'
}

function pause() {
  accumulatedMs.value = computeElapsedMs(
    accumulatedMs.value,
    startTimestamp.value,
    performance.now(),
  )
  startTimestamp.value = null
  state.value = 'paused'
  stopTicking()
  const pausedAt = mode.value === 'countdown' ? remainingMs.value : elapsedMs.value
  announcement.value = `Paused at ${formatDurationWords(pausedAt)}.`
}

function resume() {
  startTimestamp.value = performance.now()
  nowTick.value = startTimestamp.value
  state.value = 'running'
  startTicking()
  announcement.value = 'Resumed.'
}

function reset() {
  accumulatedMs.value = 0
  startTimestamp.value = null
  state.value = 'idle'
  laps.value = []
  stopTicking()
  announcement.value = 'Timer reset.'
}

function lap() {
  if (state.value !== 'running' || mode.value !== 'stopwatch') return
  const splitMs = elapsedMs.value
  const index = laps.value.length + 1
  laps.value = [{ id: ++lapId, index, splitMs }, ...laps.value]
  announcement.value = `Lap ${index}, ${formatDurationWords(splitMs)}.`
}

async function announceFinished() {
  finishedAnnouncement.value = ''
  await nextTick()
  finishedAnnouncement.value = 'Countdown finished.'
}

function playBeep() {
  try {
    const AudioCtxCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtxCtor) return
    const ctx = new AudioCtxCtor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
    osc.onended = () => ctx.close()
  } catch {
    // WebAudio unavailable or blocked — the toast and live-region alerts still fire.
  }
}

function finishCountdown() {
  stopTicking()
  accumulatedMs.value = targetMs.value
  startTimestamp.value = null
  state.value = 'finished'

  announceFinished()
  toast.danger(`Countdown finished — ${formatDurationWords(targetMs.value)} elapsed`, {
    duration: Infinity,
  })
  if (soundOn.value) playBeep()
  if (notifyOn.value && Notification.permission === 'granted' && document.hidden) {
    new Notification('Countdown finished', {
      body: `${formatDurationWords(targetMs.value)} elapsed`,
    })
  }

  pulse.value = true
  setTimeout(() => {
    pulse.value = false
  }, 900)
}

async function onNotifyToggle(value: boolean) {
  if (!value) {
    notifyOn.value = false
    return
  }
  if (typeof Notification === 'undefined') {
    notifyUnsupported.value = true
    notifyOn.value = false
    return
  }
  const permission = await Notification.requestPermission()
  if (permission === 'granted') {
    notifyOn.value = true
  } else {
    notifyDenied.value = true
    notifyOn.value = false
  }
}

const notifyDisabled = computed(() => notifyUnsupported.value || notifyDenied.value)
const notifyTooltip = computed(() => {
  if (notifyUnsupported.value) return 'Notifications are not supported in this browser.'
  if (notifyDenied.value)
    return 'Notification permission was denied — enable it in your browser settings to use this.'
  return ''
})

const { copy: copyLap } = useCopy()
const copiedLap = ref<number | null>(null)
async function copyLapRow(row: Lap) {
  await copyLap(formatCountdownClock(row.splitMs))
  copiedLap.value = row.id
}
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
    <span class="sr-only" aria-live="assertive">{{ finishedAnnouncement }}</span>

    <div class="ct">
      <template v-if="!ready">
        <Skeleton variant="rect" width="100%" height="40px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="200px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="88px" radius="10px" />
      </template>

      <template v-else>
        <SegmentedControl
          :model-value="mode"
          :options="modeOptions"
          aria-label="Mode"
          @update:model-value="setMode"
        />

        <div v-if="mode === 'countdown' && state === 'idle'" class="ct__setup">
          <ToggleGroup
            :model-value="presetSelected"
            :options="PRESET_OPTIONS"
            aria-label="Duration preset"
            @update:model-value="selectPreset"
          />
          <div class="ct__parts">
            <Field label="Hours" class="ct__part">
              <NumberInput v-model="hours" :min="0" />
            </Field>
            <Field label="Minutes" class="ct__part">
              <NumberInput v-model="minutes" :min="0" />
            </Field>
            <Field label="Seconds" class="ct__part">
              <NumberInput v-model="seconds" :min="0" />
            </Field>
          </div>
          <p v-if="targetMs === 0" class="ct__hint">Set a duration greater than zero.</p>
        </div>

        <Card elevation="flat">
          <CardBody>
            <div class="ct__hero">
              <div class="ct__display" :class="{ 'ct__display--pulse': pulse }" aria-hidden="true">
                {{ displayClock }}
              </div>
              <Progress
                v-if="mode === 'countdown'"
                :value="elapsedMs"
                :max="targetMs || 1"
                :tone="progressTone"
                size="lg"
              />
            </div>
          </CardBody>
        </Card>

        <div class="ct__transport">
          <Button
            v-if="state !== 'finished'"
            variant="primary"
            size="lg"
            :disabled="state === 'idle' && !canStart"
            @click="onTransportClick"
          >
            <template #icon><Icon :name="transportIcon" size="18" /></template>
            {{ transportLabel }}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            :disabled="state === 'idle' || state === 'running'"
            @click="reset"
          >
            <template #icon><Icon :name="UI_ICON.reset" size="18" /></template>
            Reset
          </Button>
          <Button
            v-if="mode === 'stopwatch'"
            variant="ghost"
            size="lg"
            :disabled="state !== 'running'"
            @click="lap"
          >
            <template #icon><Icon :name="UI_ICON.lap" size="18" /></template>
            Lap
          </Button>
        </div>

        <div class="ct__toggles">
          <Switch v-model="soundOn" label="Sound" />
          <Tooltip :content="notifyTooltip" :disabled="!notifyDisabled">
            <Switch
              :model-value="notifyOn"
              label="Notify me if I switch tabs"
              :disabled="notifyDisabled"
              @update:model-value="onNotifyToggle"
            />
          </Tooltip>
        </div>

        <OutputPanel
          v-if="mode === 'stopwatch'"
          label="Laps"
          :empty="laps.length === 0"
          :live="false"
          empty-title="No laps yet"
          empty-description="Start the stopwatch and tap Lap to record a split."
        >
          <Table density="compact">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Lap</TableHeaderCell>
                <TableHeaderCell>Split</TableHeaderCell>
                <TableHeaderCell><span class="sr-only">Actions</span></TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow v-for="row in laps" :key="row.id">
                <TableCell>{{ row.index }}</TableCell>
                <TableCell class="ct__mono">{{ formatCountdownClock(row.splitMs) }}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    :aria-label="`Copy lap ${row.index} split`"
                    @click="copyLapRow(row)"
                  >
                    <template #icon>
                      <Icon :name="copiedLap === row.id ? UI_ICON.check : UI_ICON.copy" size="15" />
                    </template>
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </OutputPanel>
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.ct {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.ct__setup {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.ct__parts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.ct__part {
  flex: 1 1 100px;
}
.ct__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
.ct__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 0;
}
.ct__display {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: clamp(2.75rem, 9vw, 4.5rem);
  font-weight: var(--weight-semibold);
  line-height: 1;
  color: var(--text-primary);
}
@media (prefers-reduced-motion: no-preference) {
  .ct__display--pulse {
    animation: ct-pulse 0.9s ease-out;
  }
}
@keyframes ct-pulse {
  0% {
    color: var(--danger);
  }
  100% {
    color: var(--text-primary);
  }
}
.ct__hero :deep(.jl-progress) {
  width: 100%;
  max-width: 360px;
}
.ct__transport {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.ct__toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}
.ct__mono {
  font-family: var(--font-mono);
}
</style>
