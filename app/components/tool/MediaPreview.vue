<script setup lang="ts">
import { ref } from 'vue'

/**
 * Player for a local audio/video object URL, shared by every `/media/*` tool
 * for both the uploaded source and the generated result. Renders a `<video>`
 * for anything with picture and a bare `<audio>` bar otherwise, so audio-only
 * files don't sit in a black letterbox.
 *
 * The underlying element is exposed so callers can drive playback (the trim
 * tool seeks it to preview the selected range).
 */
withDefaults(
  defineProps<{
    src: string
    /** Render a video surface; false gives the compact audio player. */
    video?: boolean
    /** Accessible label, e.g. the source filename. */
    label?: string
  }>(),
  { video: true, label: undefined },
)

const emit = defineEmits<{ timeupdate: [] }>()

const el = ref<HTMLMediaElement | null>(null)
defineExpose({ el })
</script>

<template>
  <video
    v-if="video"
    ref="el"
    class="media-preview__video"
    :src="src"
    :aria-label="label"
    controls
    playsinline
    preload="metadata"
    @timeupdate="emit('timeupdate')"
  />
  <audio
    v-else
    ref="el"
    class="media-preview__audio"
    :src="src"
    :aria-label="label"
    controls
    preload="metadata"
    @timeupdate="emit('timeupdate')"
  />
</template>

<style scoped>
.media-preview__video {
  width: 100%;
  max-height: 320px;
  border-radius: var(--radius-control, 0.625rem);
  background: #000;
}
.media-preview__audio {
  width: 100%;
}
</style>
