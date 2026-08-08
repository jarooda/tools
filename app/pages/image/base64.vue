<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Snippet } from '@/components/ui/snippet'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { toDataUrl, parseDataUrl, extensionForMime } from '@/utils/imageBase64'
import { formatBytes } from '@/utils/fileSize'

definePageMeta({ layout: 'tool' })

const tool = getTool('image-base64')!

const ready = ref(false)
onMounted(() => (ready.value = true))

const mode = ref<'encode' | 'decode'>('encode')
const modeOptions = [
  { value: 'encode', label: 'Image → Base64' },
  { value: 'decode', label: 'Base64 → Image' },
]

/* ---- Encode ---- */
const encoded = ref('')
const encodedName = ref('image')

function onSelect(file: File) {
  encodedName.value = file.name.replace(/\.[^.]+$/, '') || 'image'
  const reader = new FileReader()
  reader.onload = () => (encoded.value = String(reader.result))
  reader.readAsDataURL(file)
}

const encodedSize = computed(() => (encoded.value ? formatBytes(encoded.value.length) : ''))

/* ---- Decode ---- */
const input = ref('')
const decodedUrl = shallowRef<string | null>(null)
const decodedBlob = shallowRef<Blob | null>(null)
const decodeError = ref('')

const decodedName = computed(() => {
  const mime = decodedUrl.value ? parseDataUrl(decodedUrl.value)?.mime : undefined
  return `image.${extensionForMime(mime || 'image/png')}`
})

watch([input, mode], async () => {
  if (mode.value !== 'decode') return
  decodeError.value = ''
  decodedBlob.value = null
  if (!input.value.trim()) {
    decodedUrl.value = null
    return
  }
  const url = toDataUrl(input.value)
  if (!url) {
    decodedUrl.value = null
    decodeError.value = 'That doesn’t look like a valid image data URL or Base64 string.'
    return
  }
  try {
    const res = await fetch(url)
    decodedBlob.value = await res.blob()
    decodedUrl.value = url
  } catch {
    decodedUrl.value = null
    decodeError.value = 'Could not decode that Base64 data.'
  }
})

function reset() {
  encoded.value = ''
  input.value = ''
  decodedUrl.value = null
  decodedBlob.value = null
  decodeError.value = ''
}
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready" class="b64">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <div v-else class="b64">
      <Field label="Direction">
        <SegmentedControl
          v-model="mode"
          :options="modeOptions"
          full-width
          @update:model-value="reset"
        />
      </Field>

      <!-- Encode -->
      <template v-if="mode === 'encode'">
        <FileDropzone v-if="!encoded" @select="onSelect" />
        <template v-else>
          <Field label="Base64 data URL">
            <Snippet variant="block" :code="encoded" />
          </Field>
          <div class="b64__actions">
            <span class="b64__size">{{ encodedSize }}</span>
            <div class="b64__buttons">
              <Button variant="ghost" size="sm" @click="reset">
                <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
                New image
              </Button>
            </div>
          </div>
        </template>
      </template>

      <!-- Decode -->
      <template v-else>
        <Field label="Paste Base64 or a data URL">
          <Textarea v-model="input" :rows="6" placeholder="data:image/png;base64,iVBORw0KGgo…" />
        </Field>

        <EmptyState
          v-if="!input.trim()"
          bordered
          size="sm"
          title="Nothing to decode yet"
          description="Paste an image data URL or raw Base64 string above."
        >
          <template #icon><Icon :name="UI_ICON.emptyInput" size="22" /></template>
        </EmptyState>

        <Alert v-else-if="decodeError" tone="danger">{{ decodeError }}</Alert>

        <template v-else-if="decodedUrl">
          <div class="b64__preview">
            <img :src="decodedUrl" alt="Decoded image" class="b64__img" />
          </div>
          <ResultActions :blob="decodedBlob" :filename="decodedName" />
        </template>
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.b64 {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.b64__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.b64__size {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-tertiary);
}
.b64__buttons {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}
.b64__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-sunken, #f4f4f8);
}
.b64__img {
  max-width: 100%;
  max-height: 360px;
  height: auto;
  border-radius: 4px;
}
</style>
