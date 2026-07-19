<script setup lang="ts">
import { FileUpload } from '@/components/ui/file-upload'

/**
 * Thin wrapper around the JLDS File Upload, preconfigured for a single image
 * (or whatever `accept` you pass). Emits the picked `File` so tool pages can
 * hand it straight to `useCanvasImage().loadImage()`. All processing stays
 * client-side — nothing is uploaded.
 */
withDefaults(
  defineProps<{
    accept?: string
    /** Max file size in bytes; oversize files are rejected by File Upload. */
    maxSize?: number
    hint?: string
    disabled?: boolean
  }>(),
  {
    accept: 'image/*',
    maxSize: undefined,
    hint: undefined,
    disabled: false,
  },
)

const emit = defineEmits<{ select: [file: File] }>()

function onFiles(files: File[]) {
  const file = files[0]
  if (file) emit('select', file)
}
</script>

<template>
  <FileUpload
    :accept="accept"
    :max-size="maxSize"
    :hint="hint"
    :disabled="disabled"
    :files="[]"
    @files="onFiles"
  />
</template>
