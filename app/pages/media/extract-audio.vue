<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { formatBytes } from '@/utils/fileSize'
import { formatClock } from '@/utils/mediaTime'
import { MEDIA_AUDIO_FORMATS, buildAudioExtractArgs, getMediaFormat } from '@/utils/mediaFormat'
import type { MediaQuality } from '@/utils/mediaFormat'
import type { MediaInfo } from '@/composables/useFfmpeg'

definePageMeta({ layout: 'tool' })

const tool = getTool('media-extract-audio')!
const { runOnFile, probeMedia, extensionOf, loading, running, progress, logTail } = useFfmpeg()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const info = ref<MediaInfo | null>(null)
const error = ref('')

const format = ref('mp3')
const quality = ref<MediaQuality>('balanced')

const qualityOptions = [
  { value: 'high', label: 'High' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'small', label: 'Small' },
]
const formatOptions = MEDIA_AUDIO_FORMATS.map((f) => ({ value: f.value, label: f.label }))

const targetMeta = computed(() => getMediaFormat(format.value)!)
const lossless = computed(() => format.value === 'wav' || format.value === 'flac')

const outputName = computed(() => {
  const file = sourceFile.value
  if (!file) return 'audio'
  const base = file.name.replace(/\.[^./\\]+$/, '') || 'audio'
  return `${base}.${targetMeta.value.ext}`
})

const output = shallowRef<Blob | null>(null)
const outputUrl = ref('')

function revokeOutput() {
  if (outputUrl.value) URL.revokeObjectURL(outputUrl.value)
  outputUrl.value = ''
  output.value = null
}

async function onSelect(file: File) {
  error.value = ''
  revokeOutput()
  sourceFile.value = file
  info.value = null
  try {
    info.value = await probeMedia(file)
  } catch {
    error.value = 'This file could not be read as audio or video.'
  }
}

function reset() {
  revokeOutput()
  sourceFile.value = null
  info.value = null
  error.value = ''
}

async function extract() {
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
        buildAudioExtractArgs({
          input,
          output: out,
          format: meta.value,
          quality: quality.value,
        }),
    })
    output.value = blob
    outputUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    // `-map 0:a:0` is what fails when the file carries no audio at all. The
    // explanation lands mid-log rather than on the final line, so match the
    // whole tail instead of the thrown message.
    const noAudio = logTail.value.some((line) => /matches no streams/i.test(line))
    error.value = noAudio
      ? 'This file has no audio track to extract.'
      : message || 'Extraction failed.'
  }
}

onBeforeUnmount(revokeOutput)

const busy = computed(() => loading.value || running.value)
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!sourceFile"
      title="Extract audio from video"
      description="Drop a video and pull its soundtrack out as MP3, M4A, WAV, or FLAC — all in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyMedia" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="ea__drop"
          accept="video/*,audio/*"
          hint="Video file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="ea">
      <div class="ea__source">
        <p class="ea__name">{{ sourceFile.name }}</p>
        <p class="ea__meta">
          {{ formatBytes(sourceFile.size) }}
          <template v-if="info?.duration"> · {{ formatClock(info.duration) }}</template>
          <template v-if="info && !info.hasVideo"> · already audio-only</template>
        </p>
      </div>

      <div class="ea__opts">
        <Field label="Save audio as" :hint="targetMeta.note">
          <Select v-model="format" :options="formatOptions" />
        </Field>
        <Field
          label="Quality"
          :hint="lossless ? 'Lossless formats ignore this setting.' : undefined"
        >
          <SegmentedControl
            v-model="quality"
            :options="qualityOptions"
            :disabled="lossless"
            full-width
          />
        </Field>
      </div>

      <div class="ea__actions">
        <Button variant="primary" :disabled="busy" @click="extract">
          <template #icon><Icon :name="UI_ICON.music" size="16" /></template>
          Extract audio
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
        :label="loading ? 'Loading the extractor (one-time, ~9 MB)…' : 'Extracting audio…'"
      />

      <div v-if="output" class="ea__result">
        <audio class="ea__audio" :src="outputUrl" controls />
        <p class="ea__delta">{{ outputName }}</p>
        <ResultActions :blob="output" :filename="outputName" no-copy />
      </div>
    </div>

    <p v-if="error" class="ea__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.ea {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.ea__source {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.ea__name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  word-break: break-all;
}
.ea__meta {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
.ea__opts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}
.ea__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ea__result {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border-subtle);
}
.ea__audio {
  width: 100%;
}
.ea__delta {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.ea__drop {
  width: 100%;
}
.ea__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
</style>
