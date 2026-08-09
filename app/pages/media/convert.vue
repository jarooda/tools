<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import MediaPreview from '@/components/tool/MediaPreview.vue'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { formatBytes } from '@/utils/fileSize'
import { formatClock } from '@/utils/mediaTime'
import {
  MEDIA_AUDIO_FORMATS,
  MEDIA_VIDEO_FORMATS,
  buildMediaConvertArgs,
  getMediaFormat,
  mediaOutputName,
} from '@/utils/mediaFormat'
import type { MediaQuality } from '@/utils/mediaFormat'
import type { MediaInfo } from '@/composables/useFfmpeg'

definePageMeta({ layout: 'tool' })

const tool = getTool('media-convert')!
const { runOnFile, probeMedia, extensionOf, loading, running, progress } = useFfmpeg()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const info = ref<MediaInfo | null>(null)
const error = ref('')

const format = ref('mp4')
const quality = ref<MediaQuality>('balanced')

const qualityOptions = [
  { value: 'high', label: 'High' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'small', label: 'Small' },
]

// Grouped so the picker separates "keep it a video" from "strip to audio only".
const formatOptions = [
  { label: 'Video', options: MEDIA_VIDEO_FORMATS.map((f) => ({ value: f.value, label: f.label })) },
  { label: 'Audio', options: MEDIA_AUDIO_FORMATS.map((f) => ({ value: f.value, label: f.label })) },
]

const targetMeta = computed(() => getMediaFormat(format.value)!)
const outputName = computed(() =>
  sourceFile.value ? mediaOutputName(sourceFile.value.name, targetMeta.value) : 'output',
)

const output = shallowRef<Blob | null>(null)
const outputUrl = ref('')
const sourceUrl = ref('')

function revokeOutput() {
  if (outputUrl.value) URL.revokeObjectURL(outputUrl.value)
  outputUrl.value = ''
  output.value = null
}

function revokeSource() {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  sourceUrl.value = ''
}

async function onSelect(file: File) {
  error.value = ''
  revokeOutput()
  revokeSource()
  sourceFile.value = file
  info.value = null
  sourceUrl.value = URL.createObjectURL(file)
  try {
    info.value = await probeMedia(file)
    // A video source defaults to MP4; an audio-only source defaults to MP3, so
    // the first click does the obvious thing without touching the picker.
    format.value = info.value.hasVideo ? 'mp4' : 'mp3'
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
}

async function convert() {
  const file = sourceFile.value
  if (!file) return
  error.value = ''
  revokeOutput()
  try {
    const meta = targetMeta.value
    const blob = await runOnFile(file, {
      inputExt: extensionOf(file.name, 'mp4'),
      outputExt: meta.ext,
      outputMime: meta.mime,
      buildArgs: (input, out) =>
        buildMediaConvertArgs({ input, output: out, format: meta.value, quality: quality.value }),
    })
    output.value = blob
    outputUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    error.value = err instanceof Error && err.message ? err.message : 'Conversion failed.'
  }
}

onBeforeUnmount(() => {
  revokeOutput()
  revokeSource()
})

const busy = computed(() => loading.value || running.value)
const sizeDelta = computed(() => {
  if (!output.value || !sourceFile.value) return ''
  const ratio = output.value.size / sourceFile.value.size
  const pct = Math.round(Math.abs(1 - ratio) * 100)
  if (pct < 1) return 'about the same size'
  return ratio < 1 ? `${pct}% smaller` : `${pct}% larger`
})
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!sourceFile"
      title="Convert audio & video"
      description="Drop a media file — it is transcoded by ffmpeg running in your browser and never uploaded."
    >
      <template #icon><Icon :name="UI_ICON.emptyMedia" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="mc__drop"
          accept="video/*,audio/*"
          hint="Video or audio file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="mc">
      <div class="mc__source">
        <p class="mc__name">{{ sourceFile.name }}</p>
        <p class="mc__meta">
          {{ formatBytes(sourceFile.size) }}
          <template v-if="info?.duration"> · {{ formatClock(info.duration) }}</template>
          <template v-if="info?.hasVideo"> · {{ info.width }}×{{ info.height }}</template>
          <template v-else-if="info"> · audio only</template>
        </p>
      </div>

      <MediaPreview
        v-if="sourceUrl"
        :src="sourceUrl"
        :video="info?.hasVideo ?? true"
        :label="`Preview of ${sourceFile.name}`"
      />

      <div class="mc__opts">
        <Field label="Convert to" :hint="targetMeta.note">
          <Select v-model="format" :options="formatOptions" />
        </Field>
        <Field label="Quality">
          <SegmentedControl v-model="quality" :options="qualityOptions" full-width />
        </Field>
      </div>

      <div class="mc__actions">
        <Button variant="primary" :disabled="busy" @click="convert">
          <template #icon><Icon :name="UI_ICON.magic" size="16" /></template>
          Convert
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
        :label="loading ? 'Loading the converter (one-time, ~9 MB)…' : 'Converting…'"
      />

      <p v-if="busy" class="mc__note">
        Encoding happens on your device, so large files take a while — keep this tab open.
      </p>

      <div v-if="output" class="mc__result">
        <MediaPreview
          :src="outputUrl"
          :video="targetMeta.kind === 'video'"
          :label="`Preview of ${outputName}`"
        />
        <p class="mc__delta">{{ outputName }} — {{ sizeDelta }}</p>
        <ResultActions :blob="output" :filename="outputName" no-copy />
      </div>
    </div>

    <Alert v-if="error" tone="danger">{{ error }}</Alert>
  </ToolPage>
</template>

<style scoped>
.mc {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mc__source {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.mc__name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  word-break: break-all;
}
.mc__meta {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.mc__opts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}
.mc__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.mc__note {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.mc__result {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border-subtle);
}
.mc__delta {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.mc__drop {
  width: 100%;
}
</style>
