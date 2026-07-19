<script setup lang="ts">
import { FileUpload } from '@/components/ui/file-upload'

/**
 * Thin wrapper around the JLDS File Upload, preconfigured for a single image
 * (or whatever `accept` you pass). Emits the picked `File` so tool pages can
 * hand it straight to `useCanvasImage().loadImage()`. In `multiple` mode it also
 * emits `files` with every picked File (e.g. Merge PDFs). All processing stays
 * client-side — nothing is uploaded.
 */
withDefaults(
  defineProps<{
    accept?: string
    /** Max file size in bytes; oversize files are rejected by File Upload. */
    maxSize?: number
    hint?: string
    disabled?: boolean
    /** Accept and emit more than one file (via the `files` event). */
    multiple?: boolean
  }>(),
  {
    accept: 'image/*',
    maxSize: undefined,
    hint: undefined,
    disabled: false,
    multiple: false,
  },
)

const emit = defineEmits<{ select: [file: File]; files: [files: File[]] }>()

function onFiles(files: File[]) {
  if (!files.length) return
  emit('files', files)
  emit('select', files[0]!)
}
</script>

<template>
  <FileUpload
    :accept="accept"
    :multiple="multiple"
    :max-size="maxSize"
    :hint="hint"
    :disabled="disabled"
    :files="[]"
    @files="onFiles"
  />
</template>
