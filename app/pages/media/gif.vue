<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import MediaPreview from '@/components/tool/MediaPreview.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { formatBytes } from '@/utils/fileSize'
import { clampTimeRange, formatClock, formatTimecode, parseTimecode } from '@/utils/mediaTime'
import { buildGifArgs } from '@/utils/mediaFormat'
import type { MediaInfo } from '@/composables/useFfmpeg'

definePageMeta({ layout: 'tool' })

const tool = getTool('media-gif')!
const { runOnFile, probeMedia, extensionOf, loading, running, progress } = useFfmpeg()

const ready = ref(false)
onMounted(() => (ready.value = true))

/** GIFs balloon fast, so a fresh file starts capped to a short section. */
const DEFAULT_SPAN_SECONDS = 5

const sourceFile = shallowRef<File | null>(null)
const sourceUrl = ref('')
const info = ref<MediaInfo | null>(null)
const error = ref('')

const range = ref<[number, number]>([0, 0])
const start = computed(() => range.value[0])
const end = computed(() => range.value[1])
const fps = ref(12)
const width = ref('480')

const widthOptions = [
  { value: '240', label: '240 px — small' },
  { value: '320', label: '320 px' },
  { value: '480', label: '480 px — default' },
  { value: '640', label: '640 px — large' },
]

const duration = computed(() => info.value?.duration ?? 0)
const selected = computed(() => Math.max(0, end.value - start.value))
/** Rough frame count, the honest predictor of how big the GIF will get. */
const frameCount = computed(() => Math.round(selected.value * fps.value))

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

const outputName = computed(() => {
  const file = sourceFile.value
  if (!file) return 'clip.gif'
  return `${file.name.replace(/\.[^./\\]+$/, '') || 'clip'}.gif`
})

async function onSelect(file: File) {
  error.value = ''
  revokeOutput()
  revokeSource()
  sourceFile.value = file
  info.value = null
  sourceUrl.value = URL.createObjectURL(file)
  try {
    const probed = await probeMedia(file)
    info.value = probed
    if (!probed.hasVideo) {
      error.value = 'This file has no video to turn into a GIF.'
      return
    }
    range.value = [0, Math.min(probed.duration, DEFAULT_SPAN_SECONDS)]
  } catch {
    error.value = 'This file could not be read as a video.'
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

async function makeGif() {
  const file = sourceFile.value
  if (!file || selected.value <= 0) return
  error.value = ''
  revokeOutput()
  try {
    const blob = await runOnFile(file, {
      inputExt: extensionOf(file.name, 'mp4'),
      outputExt: 'gif',
      outputMime: 'image/gif',
      buildArgs: (input, out) =>
        buildGifArgs({
          input,
          output: out,
          start: start.value,
          end: end.value,
          fps: fps.value,
          width: Number(width.value),
        }),
    })
    output.value = blob
    outputUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    error.value = err instanceof Error && err.message ? err.message : 'GIF creation failed.'
  }
}

onBeforeUnmount(() => {
  revokeOutput()
  revokeSource()
})

const busy = computed(() => loading.value || running.value)
const hasVideo = computed(() => info.value?.hasVideo ?? false)
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!sourceFile"
      title="Make a GIF from a video"
      description="Drop a video and pick a short section — the GIF is rendered in your browser and never uploaded."
    >
      <template #icon><Icon :name="UI_ICON.emptyMedia" size="24" /></template>
      <template #actions>
        <FileDropzone class="mg__drop" accept="video/*" hint="Video file" @select="onSelect" />
      </template>
    </EmptyState>

    <div v-else class="mg">
      <div class="mg__source">
        <p class="mg__name">{{ sourceFile.name }}</p>
        <p class="mg__meta">
          {{ formatBytes(sourceFile.size) }}
          <template v-if="duration"> · {{ formatClock(duration) }}</template>
          <template v-if="info?.hasVideo"> · {{ info.width }}×{{ info.height }}</template>
        </p>
      </div>

      <template v-if="hasVideo">
        <MediaPreview :src="sourceUrl" :label="`Preview of ${sourceFile.name}`" />

        <Field label="Section to capture">
          <Slider v-model="range" range :min="0" :max="duration" :step="0.05" />
        </Field>

        <div class="mg__times">
          <Field label="Start">
            <Input v-model="startText" size="sm" @blur="commitStart" @keyup.enter="commitStart" />
          </Field>
          <Field label="End">
            <Input v-model="endText" size="sm" @blur="commitEnd" @keyup.enter="commitEnd" />
          </Field>
        </div>

        <div class="mg__opts">
          <Field label="Frame rate" hint="Fewer frames means a much smaller GIF.">
            <Slider
              v-model="fps"
              :min="5"
              :max="24"
              :step="1"
              show-value
              :format-value="(v) => `${v} fps`"
            />
          </Field>
          <Field label="Width">
            <Select v-model="width" :options="widthOptions" />
          </Field>
        </div>

        <p class="mg__selection">
          <strong>{{ formatClock(selected) }}</strong> at {{ fps }} fps ≈ {{ frameCount }} frames
        </p>

        <div class="mg__actions">
          <Button variant="primary" :disabled="busy || selected <= 0" @click="makeGif">
            <template #icon><Icon :name="UI_ICON.gif" size="16" /></template>
            Create GIF
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
          :label="loading ? 'Loading the encoder (one-time, ~9 MB)…' : 'Rendering GIF…'"
        />

        <div v-if="output" class="mg__result">
          <img class="mg__preview" :src="outputUrl" :alt="`GIF preview of ${sourceFile.name}`" />
          <p class="mg__delta">{{ outputName }}</p>
          <ResultActions :blob="output" :filename="outputName" no-copy />
        </div>
      </template>

      <Button v-else variant="ghost" @click="reset">
        <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
        Choose another file
      </Button>
    </div>

    <p v-if="error" class="mg__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.mg {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mg__source {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.mg__name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  word-break: break-all;
}
.mg__meta {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.mg__times,
.mg__opts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}
.mg__selection {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
.mg__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.mg__result {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border-subtle);
}
.mg__preview {
  max-width: 100%;
  align-self: flex-start;
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-sunken, #f4f4f8);
}
.mg__delta {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.mg__drop {
  width: 100%;
}
.mg__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
</style>
