<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { UI_ICON } from '@/lib/icons'
import { formatBytes } from '@/utils/fileSize'

/**
 * Action row for a generated image result: shows the output size and a
 * download button, plus an optional "copy image to clipboard" button where the
 * async Clipboard API supports it. Extra actions can be slotted in.
 */
const props = defineProps<{
  blob: Blob | null
  filename: string
  /** Hide the copy-to-clipboard button (e.g. for multi-file output). */
  noCopy?: boolean
}>()

const { downloadBlob } = useDownload()

const sizeLabel = computed(() => (props.blob ? formatBytes(props.blob.size) : ''))

function download() {
  if (props.blob) downloadBlob(props.blob, props.filename)
}

const canCopyImage = computed(
  () => !props.noCopy && !import.meta.server && typeof ClipboardItem !== 'undefined',
)
const copied = ref(false)

async function copyImage() {
  if (!props.blob) return
  try {
    await navigator.clipboard.write([new ClipboardItem({ [props.blob.type]: props.blob })])
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // Clipboard write can fail for unsupported types (e.g. JPEG in some
    // browsers) — silently ignore; download is always available.
  }
}
</script>

<template>
  <div class="result-actions">
    <span v-if="sizeLabel" class="result-actions__size">{{ sizeLabel }}</span>
    <div class="result-actions__buttons">
      <slot name="extra" />
      <Button
        v-if="canCopyImage"
        variant="ghost"
        size="sm"
        :disabled="!blob"
        aria-label="Copy image to clipboard"
        @click="copyImage"
      >
        <template #icon>
          <Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="15" />
        </template>
        {{ copied ? 'Copied' : 'Copy' }}
      </Button>
      <Button variant="primary" size="sm" :disabled="!blob" @click="download">
        <template #icon><Icon :name="UI_ICON.download" size="15" /></template>
        Download
      </Button>
    </div>
  </div>
</template>

<style scoped>
.result-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.result-actions__size {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}
.result-actions__buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}
</style>
