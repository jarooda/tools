<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IconButton } from '@/components/ui/icon-button'
import { UI_ICON } from '@/lib/icons'
import type { GraphMarker, GraphSeries } from '@/utils/graphPlotter'

/**
 * Raw-canvas graph plot: axes/gridlines, one polyline per visible function,
 * root markers, and an optional "evaluate at x" crosshair. Owns pan (pointer
 * drag) and zoom in/out/reset, reporting the visible x-range back up via
 * `update:range` so the page can keep its X min/X max fields and the roots
 * table in sync.
 */
const props = withDefaults(
  defineProps<{
    functions: GraphSeries[]
    roots?: GraphMarker[]
    evalMarkers?: GraphMarker[]
    evalX?: number | null
    xMin: number
    xMax: number
  }>(),
  {
    roots: () => [],
    evalMarkers: () => [],
    evalX: null,
  },
)

const emit = defineEmits<{
  'update:range': [range: { xMin: number; xMax: number }]
  reset: []
}>()

const MIN_SPAN = 1e-4
const MAX_SPAN = 1e8

const wrapRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ro: ResizeObserver | null = null

interface Geometry {
  padLeft: number
  padRight: number
  padTop: number
  padBottom: number
  width: number
  height: number
  yMin: number
  yMax: number
}
let geom: Geometry | null = null

function resolveColor(cssColor: string): string {
  const el = wrapRef.value
  if (!el) return cssColor
  el.style.setProperty('--_probe', cssColor)
  const probe = document.createElement('span')
  probe.style.color = 'var(--_probe)'
  el.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  el.removeChild(probe)
  return resolved
}

function niceStep(range: number, targetTicks = 5): number {
  if (range <= 0) return 1
  const rawStep = range / targetTicks
  const mag = 10 ** Math.floor(Math.log10(rawStep))
  const residual = rawStep / mag
  let niceResidual: number
  if (residual > 5) niceResidual = 10
  else if (residual > 2) niceResidual = 5
  else if (residual > 1) niceResidual = 2
  else niceResidual = 1
  return niceResidual * mag
}

function ticksFor(min: number, max: number): number[] {
  const step = niceStep(max - min)
  if (!Number.isFinite(step) || step <= 0) return []
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 1e-6; v += step) {
    ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v)
  }
  return ticks
}

function formatTick(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e5 || abs < 1e-4) return n.toExponential(1)
  return Number(n.toPrecision(6)).toString()
}

function computeYRange(): { yMin: number; yMax: number } {
  const values: number[] = []
  for (const series of props.functions) {
    for (const p of series.points) {
      if (p.y !== null) values.push(p.y)
    }
  }
  for (const m of props.roots) values.push(m.y)
  for (const m of props.evalMarkers) values.push(m.y)

  if (values.length === 0) return { yMin: -1, yMax: 1 }
  let yMin = Math.min(...values)
  let yMax = Math.max(...values)
  if (yMin === yMax) {
    yMin -= 1
    yMax += 1
  }
  const padding = (yMax - yMin) * 0.1
  return { yMin: yMin - padding, yMax: yMax + padding }
}

function draw() {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap) return
  const rect = wrap.getBoundingClientRect()
  const width = Math.max(1, rect.width)
  const height = Math.max(1, rect.height)
  const dpr = window.devicePixelRatio || 1

  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const { xMin, xMax } = props
  if (xMax <= xMin) return
  const { yMin, yMax } = computeYRange()

  const padLeft = 44
  const padRight = 12
  const padTop = 12
  const padBottom = 26
  const plotWidth = Math.max(1, width - padLeft - padRight)
  const plotHeight = Math.max(1, height - padTop - padBottom)

  geom = { padLeft, padRight, padTop, padBottom, width, height, yMin, yMax }

  const sx = (x: number) => padLeft + ((x - xMin) / (xMax - xMin)) * plotWidth
  const sy = (y: number) => padTop + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight

  const gridColor = resolveColor('var(--border-subtle)')
  const axisColor = resolveColor('var(--border-strong)')
  const labelColor = resolveColor('var(--text-tertiary)')

  ctx.font = '11px var(--font-mono, monospace)'
  ctx.fillStyle = labelColor
  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1

  const xTicks = ticksFor(xMin, xMax)
  for (const t of xTicks) {
    const px = sx(t)
    ctx.beginPath()
    ctx.moveTo(px, padTop)
    ctx.lineTo(px, padTop + plotHeight)
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(formatTick(t), px, padTop + plotHeight + 6)
  }

  const yTicks = ticksFor(yMin, yMax)
  for (const t of yTicks) {
    const py = sy(t)
    ctx.beginPath()
    ctx.moveTo(padLeft, py)
    ctx.lineTo(padLeft + plotWidth, py)
    ctx.stroke()
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(formatTick(t), padLeft - 6, py)
  }

  ctx.strokeStyle = axisColor
  ctx.lineWidth = 1.5
  if (yMin <= 0 && yMax >= 0) {
    const py = sy(0)
    ctx.beginPath()
    ctx.moveTo(padLeft, py)
    ctx.lineTo(padLeft + plotWidth, py)
    ctx.stroke()
  }
  if (xMin <= 0 && xMax >= 0) {
    const px = sx(0)
    ctx.beginPath()
    ctx.moveTo(px, padTop)
    ctx.lineTo(px, padTop + plotHeight)
    ctx.stroke()
  }

  if (props.evalX !== null && props.evalX >= xMin && props.evalX <= xMax) {
    const px = sx(props.evalX)
    ctx.save()
    ctx.strokeStyle = labelColor
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px, padTop)
    ctx.lineTo(px, padTop + plotHeight)
    ctx.stroke()
    ctx.restore()
  }

  for (const series of props.functions) {
    const color = resolveColor(series.color)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    let started = false
    for (const p of series.points) {
      if (p.y === null || !Number.isFinite(p.y)) {
        started = false
        continue
      }
      const px = sx(p.x)
      const py = sy(p.y)
      if (!started) {
        ctx.moveTo(px, py)
        started = true
      } else {
        ctx.lineTo(px, py)
      }
    }
    ctx.stroke()
  }

  const surfaceColor = resolveColor('var(--surface-card)')
  for (const marker of props.roots) {
    const px = sx(marker.x)
    const py = sy(marker.y)
    if (px < padLeft || px > padLeft + plotWidth) continue
    ctx.beginPath()
    ctx.arc(px, py, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = surfaceColor
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = resolveColor(marker.color)
    ctx.stroke()
  }

  for (const marker of props.evalMarkers) {
    const px = sx(marker.x)
    const py = sy(marker.y)
    if (px < padLeft || px > padLeft + plotWidth) continue
    ctx.beginPath()
    ctx.arc(px, py, 4, 0, Math.PI * 2)
    ctx.fillStyle = resolveColor(marker.color)
    ctx.fill()
  }
}

function scheduleDraw() {
  requestAnimationFrame(draw)
}

watch(
  () => [props.functions, props.roots, props.evalMarkers, props.evalX, props.xMin, props.xMax],
  scheduleDraw,
  { deep: true },
)

onMounted(() => {
  scheduleDraw()
  if (wrapRef.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(scheduleDraw)
    ro.observe(wrapRef.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())

function clampSpan(span: number): number {
  return Math.min(MAX_SPAN, Math.max(MIN_SPAN, span))
}

function zoom(factor: number) {
  const mid = (props.xMin + props.xMax) / 2
  const span = clampSpan((props.xMax - props.xMin) * factor)
  emit('update:range', { xMin: mid - span / 2, xMax: mid + span / 2 })
}

function resetView() {
  emit('reset')
}

let dragging = false
let dragPointerId: number | null = null
let dragStartClientX = 0
let dragStartXMin = 0
let dragStartXMax = 0

function onPointerDown(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas || !geom) return
  dragging = true
  dragPointerId = event.pointerId
  dragStartClientX = event.clientX
  dragStartXMin = props.xMin
  dragStartXMax = props.xMax
  canvas.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging || event.pointerId !== dragPointerId || !geom) return
  const plotWidthPx = geom.width - geom.padLeft - geom.padRight
  if (plotWidthPx <= 0) return
  const dxPx = event.clientX - dragStartClientX
  const xUnitsPerPx = (dragStartXMax - dragStartXMin) / plotWidthPx
  const shift = -dxPx * xUnitsPerPx
  emit('update:range', { xMin: dragStartXMin + shift, xMax: dragStartXMax + shift })
}

function endDrag(event: PointerEvent) {
  if (event.pointerId !== dragPointerId) return
  dragging = false
  dragPointerId = null
  canvasRef.value?.releasePointerCapture(event.pointerId)
}
</script>

<template>
  <div class="gc">
    <div class="gc__toolbar">
      <IconButton aria-label="Zoom out" size="sm" @click="zoom(1.4)">
        <Icon :name="UI_ICON.zoomOut" size="16" />
      </IconButton>
      <IconButton aria-label="Zoom in" size="sm" @click="zoom(1 / 1.4)">
        <Icon :name="UI_ICON.zoomIn" size="16" />
      </IconButton>
      <IconButton aria-label="Reset view" size="sm" @click="resetView">
        <Icon :name="UI_ICON.reset" size="16" />
      </IconButton>
    </div>
    <div ref="wrapRef" class="gc__canvas-wrap">
      <canvas
        ref="canvasRef"
        class="gc__canvas"
        role="img"
        aria-label="Function graph. Use the X min and X max fields above to pan or zoom."
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      />
    </div>
  </div>
</template>

<style scoped>
.gc {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.gc__toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
}
.gc__canvas-wrap {
  width: 100%;
  height: 320px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-sunken, #f4f4f8);
  overflow: hidden;
}
.gc__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
}
.gc__canvas:active {
  cursor: grabbing;
}
</style>
