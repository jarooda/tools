<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import MediaPreview from '@/components/tool/MediaPreview.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { formatBytes } from '@/utils/fileSize'
import { clampTimeRange, formatClock, formatTimecode, parseTimecode } from '@/utils/mediaTime'
import { buildMediaTrimArgs, getMediaFormat, trimReencodeFormat } from '@/utils/mediaFormat'
import type { MediaInfo } from '@/composables/useFfmpeg'

definePageMeta({ layout: 'tool' })

const tool = getTool('media-trim')!
const { runOnFile, probeMedia, extensionOf, loading, running, progress } = useFfmpeg()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const sourceUrl = ref('')
const info = ref<MediaInfo | null>(null)
const error = ref('')

/** Both cut points in one JLDS range Slider, which keeps the handles ordered. */
const range = ref<[number, number]>([0, 0])
const start = computed(() => range.value[0])
const end = computed(() => range.value[1])
const mode = ref<'fast' | 'precise'>('fast')

const modeOptions = [
  { value: 'fast', label: 'Fast' },
  { value: 'precise', label: 'Precise' },
]

const duration = computed(() => info.value?.duration ?? 0)
const selected = computed(() => Math.max(0, end.value - start.value))

// Text mirrors of the two handles, so a timecode can be typed exactly.
const startText = ref('00:00:00.000')
const endText = ref('00:00:00.000')
watch(start, (v) => (startText.value = formatTimecode(v)))
watch(end, (v) => (endText.value = formatTimecode(v)))

function commitStart() {
  const parsed = parseTimecode(startText.value)
  if (parsed == null) return void (startText.value = formatTimecode(start.value))
  const next = clampTimeRange(parsed, end.value, duration.value)
  range.value = [next.start, next.end]
}

function commitEnd() {
  const parsed = parseTimecode(endText.value)
  if (parsed == null) return void (endText.value = formatTimecode(end.value))
  const next = clampTimeRange(start.value, parsed, duration.value)
  range.value = [next.start, next.end]
}

const output = shallowRef<Blob | null>(null)
const outputUrl = ref('')

function revokeOutput() {
  if (outputUrl.value) URL.revokeObjectURL(outputUrl.value)
  outputUrl.value = ''
  output.value = null
}

function revokeSource() {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  sourceUrl.value = ''
}

const targetFormat = computed(() =>
  mode.value === 'precise' && sourceFile.value
    ? trimReencodeFormat(sourceFile.value.name, info.value?.hasVideo ?? true)
    : null,
)

const outputName = computed(() => {
  const file = sourceFile.value
  if (!file) return 'trimmed'
  const base = file.name.replace(/\.[^./\\]+$/, '') || 'clip'
  const ext = targetFormat.value ? getMediaFormat(targetFormat.value)!.ext : extensionOf(file.name)
  return `${base}-trimmed.${ext}`
})

async function onSelect(file: File) {
  error.value = ''
  revokeOutput()
  revokeSource()
  sourceFile.value = file
  info.value = null
  sourceUrl.value = URL.createObjectURL(file)
  try {
    info.value = await probeMedia(file)
    range.value = [0, info.value.duration]
  } catch {
    error.value = 'This file could not be read as audio or video.'
  }
}

function reset() {
  revokeOutput()
  revokeSource()
  sourceFile.value = null
  info.value = null
  error.value = ''
  range.value = [0, 0]
}

/** Play just the selected range in the preview player. */
const preview = ref<InstanceType<typeof MediaPreview> | null>(null)
function previewRange() {
  const el = preview.value?.el
  if (!el) return
  el.currentTime = start.value
  el.play()
}
function onTimeUpdate() {
  const el = preview.value?.el
  if (el && el.currentTime >= end.value) el.pause()
}

async function trim() {
  const file = sourceFile.value
  if (!file || selected.value <= 0) return
  error.value = ''
  revokeOutput()
  try {
    const reencode = mode.value === 'precise'
    const format = targetFormat.value
    const meta = format ? getMediaFormat(format)! : null
    const blob = await runOnFile(file, {
      inputExt: extensionOf(file.name, 'mp4'),
      outputExt: meta ? meta.ext : extensionOf(file.name, 'mp4'),
      outputMime: meta ? meta.mime : file.type || 'application/octet-stream',
      buildArgs: (input, out) =>
        buildMediaTrimArgs({
          input,
          output: out,
          start: start.value,
          end: end.value,
          reencode,
          format: format ?? undefined,
        }),
    })
    output.value = blob
    outputUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    error.value = err instanceof Error && err.message ? err.message : 'Trimming failed.'
  }
}

onBeforeUnmount(() => {
  revokeOutput()
  revokeSource()
})

const busy = computed(() => loading.value || running.value)
const isVideo = computed(() => info.value?.hasVideo ?? false)
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!sourceFile"
      title="Trim audio & video"
      description="Drop a media file and pick the part to keep — the cut runs in your browser, nothing is uploaded."
    >
      <template #icon><Icon :name="UI_ICON.emptyMedia" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="mt__drop"
          accept="video/*,audio/*"
          hint="Video or audio file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="mt">
      <div class="mt__source">
        <p class="mt__name">{{ sourceFile.name }}</p>
        <p class="mt__meta">
          {{ formatBytes(sourceFile.size) }}
          <template v-if="duration"> · {{ formatClock(duration) }}</template>
        </p>
      </div>

      <MediaPreview
        ref="preview"
        :src="sourceUrl"
        :video="isVideo"
        :label="`Preview of ${sourceFile.name}`"
        @timeupdate="onTimeUpdate"
      />

      <Field label="Range to keep">
        <Slider v-model="range" range :min="0" :max="duration" :step="0.05" />
      </Field>

      <div class="mt__times">
        <Field label="Start">
          <Input v-model="startText" size="sm" @blur="commitStart" @keyup.enter="commitStart" />
        </Field>
        <Field label="End">
          <Input v-model="endText" size="sm" @blur="commitEnd" @keyup.enter="commitEnd" />
        </Field>
      </div>

      <p class="mt__selection">
        Keeping <strong>{{ formatClock(selected) }}</strong> of {{ formatClock(duration) }}
      </p>

      <Field
        label="Cut mode"
        :hint="
          mode === 'fast'
            ? 'Instant: copies streams untouched, but snaps to the nearest keyframe.'
            : `Exact cut — re-encodes to ${getMediaFormat(targetFormat ?? 'mp4')!.label}, which takes longer.`
        "
      >
        <SegmentedControl v-model="mode" :options="modeOptions" full-width />
      </Field>

      <div class="mt__actions">
        <Button variant="primary" :disabled="busy || selected <= 0" @click="trim">
          <template #icon><Icon :name="UI_ICON.scissors" size="16" /></template>
          Trim
        </Button>
        <Button variant="secondary" :disabled="busy" @click="previewRange">
          <template #icon><Icon :name="UI_ICON.play" size="15" /></template>
          Preview range
        </Button>
        <Button variant="ghost" :disabled="busy" @click="reset">
          <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
          New file
        </Button>
      </div>

      <Progress
        v-if="busy"
        :value="loading ? 0 : progress * 100"
        :indeterminate="loading"
        :label="loading ? 'Loading the trimmer (one-time, ~9 MB)…' : 'Trimming…'"
      />

      <div v-if="output" class="mt__result">
        <MediaPreview :src="outputUrl" :video="isVideo" :label="`Preview of ${outputName}`" />
        <p class="mt__delta">{{ outputName }}</p>
        <ResultActions :blob="output" :filename="outputName" no-copy />
      </div>
    </div>

    <Alert v-if="error" tone="danger">{{ error }}</Alert>
  </ToolPage>
</template>

<style scoped>
.mt {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mt__source {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.mt__name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  word-break: break-all;
}
.mt__meta {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.mt__times {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}
.mt__selection {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
.mt__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.mt__result {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border-subtle);
}
.mt__delta {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.mt__drop {
  width: 100%;
}
</style>
