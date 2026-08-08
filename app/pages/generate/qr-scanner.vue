<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'

definePageMeta({ layout: 'tool' })

const tool = getTool('generate-qr-scanner')!
const { loadImage } = useCanvasImage()

type Mode = 'image' | 'camera'
const mode = ref<Mode>('image')

const ready = ref(false)
const result = ref('')
const error = ref<string | null>(null)
const scanning = ref(false)

const videoRef = ref<HTMLVideoElement | null>(null)
let stream: MediaStream | null = null
let rafId = 0

type DecodeSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
type DetectedCode = { rawValue: string }
// eslint-disable-next-line no-unused-vars
type BarcodeDetectorLike = { detect: (source: DecodeSource) => Promise<DetectedCode[]> }
type BarcodeDetectorCtor = new () => BarcodeDetectorLike

function getBarcodeDetector(): BarcodeDetectorLike | null {
  if (!import.meta.client) return null
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  return ctor ? new ctor() : null
}

/** Decode a QR/barcode from a source, trying the native detector then jsQR. */
async function decode(source: DecodeSource, w: number, h: number): Promise<string | null> {
  const detector = getBarcodeDetector()
  if (detector) {
    try {
      const codes = await detector.detect(source)
      if (codes.length) return codes[0]!.rawValue
    } catch {
      // fall through to jsQR
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, w, h)
  const { data, width, height } = ctx.getImageData(0, 0, w, h)
  const jsQR = (await import('jsqr')).default
  return jsQR(data, width, height)?.data ?? null
}

async function onImage(file: File) {
  stopCamera()
  error.value = null
  result.value = ''
  try {
    const img = await loadImage(file)
    const found = await decode(img.el, img.width, img.height)
    img.revoke()
    if (found) result.value = found
    else error.value = 'No QR code or barcode found in that image.'
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function startCamera() {
  error.value = null
  result.value = ''
  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = 'Camera access is not available in this browser.'
    return
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    })
    const video = videoRef.value
    if (!video) return
    video.srcObject = stream
    await video.play()
    scanning.value = true
    tick()
  } catch (e) {
    error.value = (e as Error).message || 'Could not access the camera.'
  }
}

async function tick() {
  const video = videoRef.value
  if (!scanning.value || !video || video.readyState < 2) {
    if (scanning.value) rafId = requestAnimationFrame(tick)
    return
  }
  const found = await decode(video, video.videoWidth, video.videoHeight)
  if (found) {
    result.value = found
    stopCamera()
    return
  }
  rafId = requestAnimationFrame(tick)
}

function stopCamera() {
  scanning.value = false
  cancelAnimationFrame(rafId)
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  if (videoRef.value) videoRef.value.srcObject = null
}

function switchMode(next: string) {
  mode.value = next as Mode
  stopCamera()
  result.value = ''
  error.value = null
}

const isUrl = computed(() => /^https?:\/\/\S+$/i.test(result.value.trim()))

function openResult() {
  if (isUrl.value) window.open(result.value.trim(), '_blank', 'noopener')
}

const { copy, copied } = useCopy()

onMounted(() => {
  ready.value = true
})
onBeforeUnmount(stopCamera)
</script>

<template>
  <ToolPage :tool="tool">
    <div class="scan">
      <SegmentedControl
        :model-value="mode"
        :options="[
          { value: 'image', label: 'From image' },
          { value: 'camera', label: 'From camera' },
        ]"
        @update:model-value="switchMode"
      />

      <div v-if="!ready" aria-hidden="true">
        <Skeleton variant="rect" width="100%" height="200px" radius="10px" />
      </div>

      <template v-else>
        <!-- Image mode -->
        <FileDropzone
          v-if="mode === 'image'"
          accept="image/*"
          hint="Drop a photo or screenshot containing a QR code or barcode"
          @select="onImage"
        />

        <!-- Camera mode -->
        <div v-else class="scan__camera">
          <video
            ref="videoRef"
            class="scan__video"
            :data-live="scanning || undefined"
            playsinline
            muted
          />
          <div class="scan__camera-actions">
            <Button v-if="!scanning" variant="primary" @click="startCamera">
              <template #icon><Icon :name="UI_ICON.camera" size="16" /></template>
              Start camera
            </Button>
            <Button v-else variant="secondary" @click="stopCamera">
              <template #icon><Icon :name="UI_ICON.cameraOff" size="16" /></template>
              Stop
            </Button>
          </div>
        </div>

        <!-- Result -->
        <Alert v-if="error" tone="danger">{{ error }}</Alert>

        <div v-else-if="result" class="scan__result">
          <span class="scan__label">Decoded</span>
          <div class="scan__value-row">
            <p class="scan__value">{{ result }}</p>
            <div class="scan__actions">
              <Button v-if="isUrl" variant="ghost" size="sm" @click="openResult">
                <template #icon><Icon :name="UI_ICON.arrowRight" size="15" /></template>
                Open
              </Button>
              <Button variant="ghost" size="sm" aria-label="Copy result" @click="copy(result)">
                <template #icon>
                  <Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="15" />
                </template>
                {{ copied ? 'Copied' : 'Copy' }}
              </Button>
            </div>
          </div>
        </div>

        <EmptyState
          v-else
          bordered
          size="sm"
          title="No code scanned yet"
          :description="
            mode === 'image'
              ? 'Upload an image to read its QR code or barcode.'
              : 'Start your camera and point it at a code.'
          "
        >
          <template #icon><Icon :name="UI_ICON.qrScan" size="22" /></template>
        </EmptyState>
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.scan {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.scan__camera {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.scan__video {
  width: 100%;
  max-width: 420px;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-muted, #000);
  object-fit: cover;
}
.scan__video:not([data-live]) {
  display: none;
}
.scan__camera-actions {
  display: flex;
  gap: 0.5rem;
}
.scan__result {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.scan__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.scan__value-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.scan__value {
  margin: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.9375rem;
  color: var(--text-primary);
  word-break: break-all;
}
.scan__actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
</style>
