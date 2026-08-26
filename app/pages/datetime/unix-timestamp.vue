<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Stat } from '@/components/ui/stat'
import { Skeleton } from '@/components/ui/skeleton'
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
  parseTimestamp,
  formatTimestamp,
  msToDatetimeLocal,
  parseDatetimeLocal,
  formatIso8601,
  formatRfc2822Utc,
  formatLocalString,
  formatUtcStringLong,
  formatRelative,
  type TimestampUnit,
  type ZoneMode,
} from '@/utils/unixTimestamp'

definePageMeta({ layout: 'tool' })

const tool = getTool('datetime-unix')!

const UNIT_OPTIONS = [
  { value: 'seconds', label: 'Seconds' },
  { value: 'milliseconds', label: 'Milliseconds' },
]
const ZONE_OPTIONS = [
  { value: 'local', label: 'Local' },
  { value: 'utc', label: 'UTC' },
]

const instantMs = ref<number | null>(null)
const unit = ref<TimestampUnit>('seconds')
const zone = ref<ZoneMode>('local')
const timestampError = ref('')
const dateError = ref('')

const isEmpty = computed(() => instantMs.value === null)

const timestampText = computed({
  get: () => (instantMs.value === null ? '' : formatTimestamp(instantMs.value, unit.value)),
  set: (v: string) => {
    if (v.trim() === '') {
      instantMs.value = null
      timestampError.value = ''
      return
    }
    const result = parseTimestamp(v, unit.value)
    if (result.ok) {
      instantMs.value = result.ms!
      timestampError.value = ''
    } else {
      timestampError.value = result.error ?? 'Invalid timestamp.'
    }
  },
})

const dateText = computed({
  get: () => (instantMs.value === null ? '' : msToDatetimeLocal(instantMs.value, zone.value)),
  set: (v: string) => {
    if (v.trim() === '') {
      instantMs.value = null
      dateError.value = ''
      return
    }
    const ms = parseDatetimeLocal(v, zone.value)
    if (ms === null) {
      dateError.value = 'Enter a valid date and time.'
      return
    }
    instantMs.value = ms
    dateError.value = ''
  },
})

function setUnit(next: string) {
  unit.value = next as TimestampUnit
  timestampError.value = ''
}
function setZone(next: string) {
  zone.value = next as ZoneMode
  dateError.value = ''
}

function useNow() {
  instantMs.value = Date.now()
  timestampError.value = ''
  dateError.value = ''
}

const resolvedZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone
const zoneCaption = computed(() =>
  zone.value === 'local' ? `Your local zone: ${resolvedZoneName}.` : 'Coordinated Universal Time.',
)

const ready = ref(false)
const nowMs = ref(Date.now())
let tickHandle: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  instantMs.value = Date.now()
  nowMs.value = Date.now()
  ready.value = true
  tickHandle = setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (tickHandle) clearInterval(tickHandle)
})

const nowSeconds = computed(() => Math.floor(nowMs.value / 1000))
const nowUtcString = computed(() => new Date(nowMs.value).toUTCString())

interface FormatRow {
  id: string
  label: string
  value: string
}

const formatRows = computed<FormatRow[]>(() => {
  if (instantMs.value === null) return []
  const ms = instantMs.value
  return [
    { id: 'iso', label: 'ISO 8601', value: formatIso8601(ms) },
    { id: 'rfc2822', label: 'RFC 2822 (UTC)', value: formatRfc2822Utc(ms) },
    { id: 'local', label: 'Local string', value: formatLocalString(ms) },
    { id: 'utc', label: 'UTC string', value: formatUtcStringLong(ms) },
    { id: 'relative', label: 'Relative', value: formatRelative(ms, nowMs.value) },
    { id: 'unix-s', label: 'Unix (seconds)', value: formatTimestamp(ms, 'seconds') },
    { id: 'unix-ms', label: 'Unix (milliseconds)', value: formatTimestamp(ms, 'milliseconds') },
  ]
})

const { copy: copyTimestamp, copied: timestampCopied } = useCopy()
const { copy: copyDate, copied: dateCopied } = useCopy()
const { copy: copyRow } = useCopy()
const copiedRow = ref<string | null>(null)

async function copyFormatRow(row: FormatRow) {
  await copyRow(row.value)
  copiedRow.value = row.id
}
</script>

<template>
  <ToolPage :tool="tool">
    <div class="utc">
      <template v-if="!ready">
        <Skeleton variant="rect" width="100%" height="88px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="240px" radius="10px" />
      </template>

      <template v-else>
        <div class="utc__clock" aria-label="Live clock, updates every second">
          <Stat
            plain
            size="sm"
            label="Current Unix time"
            :value="String(nowSeconds)"
            :caption="`${nowUtcString}`"
          />
          <Button variant="ghost" size="sm" @click="useNow">
            <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
            Use now
          </Button>
        </div>

        <section class="utc__panel">
          <SegmentedControl
            :model-value="unit"
            :options="UNIT_OPTIONS"
            aria-label="Timestamp unit"
            @update:model-value="setUnit"
          />
          <Field label="Unix timestamp" :error="timestampError">
            <div class="utc__input-row">
              <Input
                v-model="timestampText"
                type="text"
                inputmode="numeric"
                spellcheck="false"
                placeholder="1700000000"
                :invalid="!!timestampError"
                class="utc__mono-input"
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label="Copy Unix timestamp"
                :disabled="isEmpty"
                @click="copyTimestamp(timestampText)"
              >
                <template #icon>
                  <Icon :name="timestampCopied ? UI_ICON.check : UI_ICON.copy" size="15" />
                </template>
              </Button>
            </div>
          </Field>
        </section>

        <section class="utc__panel">
          <div class="utc__zone-head">
            <SegmentedControl
              :model-value="zone"
              :options="ZONE_OPTIONS"
              aria-label="Time zone"
              @update:model-value="setZone"
            />
            <span class="utc__zone-caption">{{ zoneCaption }}</span>
          </div>
          <Field label="Date & time" :error="dateError">
            <div class="utc__input-row">
              <Input v-model="dateText" type="datetime-local" step="1" :invalid="!!dateError" />
              <Button
                variant="ghost"
                size="sm"
                aria-label="Copy date and time"
                :disabled="isEmpty"
                @click="copyDate(dateText)"
              >
                <template #icon>
                  <Icon :name="dateCopied ? UI_ICON.check : UI_ICON.copy" size="15" />
                </template>
              </Button>
            </div>
          </Field>
        </section>

        <OutputPanel
          label="Formats"
          :empty="isEmpty"
          :live="false"
          empty-title="Nothing to convert yet"
          empty-description="Enter a timestamp or a date to see it converted."
        >
          <Table density="compact">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Format</TableHeaderCell>
                <TableHeaderCell>Value</TableHeaderCell>
                <TableHeaderCell><span class="sr-only">Actions</span></TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow v-for="row in formatRows" :key="row.id">
                <TableCell>{{ row.label }}</TableCell>
                <TableCell class="utc__mono">{{ row.value }}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    :aria-label="`Copy ${row.label}`"
                    @click="copyFormatRow(row)"
                  >
                    <template #icon>
                      <Icon :name="copiedRow === row.id ? UI_ICON.check : UI_ICON.copy" size="15" />
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
.utc {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.utc__clock {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xs);
  background: var(--surface-card);
}
.utc__panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.utc__zone-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.utc__zone-caption {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}
.utc__input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.utc__input-row :deep(.jl-input-wrap) {
  flex: 1;
}
.utc__mono-input :deep(input) {
  font-family: var(--font-mono);
}
.utc__mono {
  font-family: var(--font-mono);
}
</style>
