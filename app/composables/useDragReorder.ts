import { ref, type CSSProperties, type Ref } from 'vue'

const DRAG_THRESHOLD = 5
const DRAG_ITEM_ATTR = 'data-drag-index'

export interface DragReorderOptions<T> {
  /** Fired whenever an item's position changes, from either drag or the button path. */
  onReorder?: (item: T, from: number, to: number, total: number) => void
}

interface Point {
  x: number
  y: number
}

/**
 * Pointer-based drag-to-reorder for a `v-for` list, with the up/down button path kept
 * as the primary, always-available way to reorder — dragging is a progressive enhancement
 * layered on top via `data-drag-index` markers on each row/cell.
 */
export function useDragReorder<T>(items: Ref<T[]>, options: DragReorderOptions<T> = {}) {
  const dragIndex = ref<number | null>(null)
  const overIndex = ref<number | null>(null)
  const itemTransforms = ref<Record<number, string>>({})

  let handleEl: HTMLElement | null = null
  let pointerId: number | null = null
  let sourceIndex = -1
  let dragging = false
  let startClientX = 0
  let startClientY = 0
  let startRects: Point[] = []

  function reorderTo(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= items.value.length || to >= items.value.length)
      return
    const next = items.value.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    items.value = next
    options.onReorder?.(moved!, from, to, next.length)
  }

  function findIndexAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>(`[${DRAG_ITEM_ATTR}]`)
    if (!el) return null
    const idx = Number(el.getAttribute(DRAG_ITEM_ATTR))
    return Number.isNaN(idx) ? null : idx
  }

  function captureStartRects() {
    const row = handleEl?.closest<HTMLElement>(`[${DRAG_ITEM_ATTR}]`)
    const container = row?.parentElement
    if (!container) return
    const els = Array.from(container.querySelectorAll<HTMLElement>(`[${DRAG_ITEM_ATTR}]`))
    startRects = els.map((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left, y: r.top }
    })
  }

  function updateTransforms(dx: number, dy: number) {
    const map: Record<number, string> = {}
    map[sourceIndex] = `translate(${dx}px, ${dy}px)`

    const to = overIndex.value
    if (to !== null && to !== sourceIndex) {
      const lo = Math.min(sourceIndex, to)
      const hi = Math.max(sourceIndex, to)
      for (let i = lo; i <= hi; i++) {
        if (i === sourceIndex) continue
        const shiftedFrom = to > sourceIndex ? i - 1 : i + 1
        const from = startRects[i]
        const dest = startRects[shiftedFrom]
        if (!from || !dest) continue
        map[i] = `translate(${dest.x - from.x}px, ${dest.y - from.y}px)`
      }
    }
    itemTransforms.value = map
  }

  function onPointerMove(e: PointerEvent) {
    if (pointerId === null) return
    const dx = e.clientX - startClientX
    const dy = e.clientY - startClientY
    if (!dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      dragging = true
      dragIndex.value = sourceIndex
      overIndex.value = sourceIndex
      captureStartRects()
    }
    const idx = findIndexAt(e.clientX, e.clientY)
    if (idx !== null) overIndex.value = idx
    updateTransforms(dx, dy)
  }

  function cleanup() {
    if (handleEl && pointerId !== null) {
      try {
        handleEl.releasePointerCapture(pointerId)
      } catch {
        // Capture may already be released (e.g. pointercancel).
      }
      handleEl.removeEventListener('pointermove', onPointerMove)
      handleEl.removeEventListener('pointerup', onPointerUp)
      handleEl.removeEventListener('pointercancel', onPointerUp)
    }
    handleEl = null
    pointerId = null
    sourceIndex = -1
    dragging = false
    startRects = []
    dragIndex.value = null
    overIndex.value = null
    itemTransforms.value = {}
  }

  function onPointerUp() {
    if (dragging && sourceIndex >= 0 && overIndex.value !== null) {
      reorderTo(sourceIndex, overIndex.value)
    }
    cleanup()
  }

  function onHandlePointerDown(e: PointerEvent, index: number) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    handleEl = e.currentTarget as HTMLElement
    pointerId = e.pointerId
    sourceIndex = index
    startClientX = e.clientX
    startClientY = e.clientY
    dragging = false
    handleEl.setPointerCapture(pointerId)
    handleEl.addEventListener('pointermove', onPointerMove)
    handleEl.addEventListener('pointerup', onPointerUp)
    handleEl.addEventListener('pointercancel', onPointerUp)
  }

  function styleFor(index: number): CSSProperties | undefined {
    const transform = itemTransforms.value[index]
    if (!transform) return undefined
    const isDragged = index === dragIndex.value
    return {
      transform,
      transition: isDragged ? 'none' : 'transform var(--duration-fast) var(--ease-standard)',
      zIndex: isDragged ? 2 : undefined,
      // Let elementFromPoint hit-test whatever is visually underneath the dragged item.
      pointerEvents: isDragged ? 'none' : undefined,
    }
  }

  return {
    dragIndex,
    overIndex,
    onHandlePointerDown,
    reorderTo,
    styleFor,
  }
}
