<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import GraphCanvas from '@/components/tool/GraphCanvas.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Tooltip } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/table'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { formatNumber } from '@/utils/scientificCalculator'
import {
  evaluateAt,
  findRoots,
  samplePoints,
  toCompiledFn,
  type CompiledFn,
  type GraphMarker,
  type GraphPoint,
  type GraphSeries,
} from '@/utils/graphPlotter'

definePageMeta({ layout: 'tool' })

const tool = getTool('math-graph-plotter')!

const MAX_FUNCTIONS = 3
const SAMPLE_COUNT = 600
// An arbitrary, non-"special" x used only to sanity-check that an expression
// actually parses/evaluates (catches undefined symbols like a stray `y`, not
// caught by mathjs's `compile()` alone). Domain issues at real singularities
// (e.g. `1/x` at x=0) don't throw in mathjs — they resolve to Infinity/NaN —
// so this doesn't false-flag valid expressions.
const TEST_X = 2.718281828
const SERIES_COLORS = ['var(--accent)', 'var(--info)', 'var(--warning)']
const DEFAULT_X_MIN = -10
const DEFAULT_X_MAX = 10

interface FunctionRow {
  id: number
  expr: string
  color: string
  visible: boolean
}

let rowId = 0
const rows = ref<FunctionRow[]>([
  { id: ++rowId, expr: 'x^2 - 3*x + 2', color: SERIES_COLORS[0]!, visible: true },
])

function addRow() {
  if (rows.value.length >= MAX_FUNCTIONS) return
  rows.value.push({
    id: ++rowId,
    expr: '',
    color: SERIES_COLORS[rows.value.length]!,
    visible: true,
  })
}

function removeRow(id: number) {
  if (rows.value.length <= 1) return
  rows.value = rows.value.filter((r) => r.id !== id)
}

const xMinInput = ref<number | null>(DEFAULT_X_MIN)
const xMaxInput = ref<number | null>(DEFAULT_X_MAX)
const rangeValid = computed(
  () => xMinInput.value !== null && xMaxInput.value !== null && xMinInput.value < xMaxInput.value,
)
const rangeErrorMessage = 'X min must be less than X max.'

const appliedXMin = ref(DEFAULT_X_MIN)
const appliedXMax = ref(DEFAULT_X_MAX)
watch(
  [xMinInput, xMaxInput],
  () => {
    if (!rangeValid.value) return
    appliedXMin.value = xMinInput.value!
    appliedXMax.value = xMaxInput.value!
  },
  { immediate: true },
)

function onRangeUpdate(range: { xMin: number; xMax: number }) {
  xMinInput.value = Number(range.xMin.toFixed(4))
  xMaxInput.value = Number(range.xMax.toFixed(4))
}

function onResetView() {
  xMinInput.value = DEFAULT_X_MIN
  xMaxInput.value = DEFAULT_X_MAX
}

const evalX = ref<number | null>(null)

const rowErrors = ref<Record<number, string | null>>({})
const rowPoints = ref<Record<number, GraphPoint[]>>({})

interface RootRow {
  id: string
  expr: string
  color: string
  x: number
  y: number
}
interface EvalRow {
  id: number
  expr: string
  color: string
  y: number | null
}

const rootRows = ref<RootRow[]>([])
const rootMarkers = ref<GraphMarker[]>([])
const evalRows = ref<EvalRow[]>([])
const evalMarkers = ref<GraphMarker[]>([])

const ready = ref(false)
let mathjsPromise: Promise<typeof import('mathjs')> | null = null

async function recompute() {
  if (!mathjsPromise) mathjsPromise = import('mathjs')
  const { compile } = await mathjsPromise

  const xMin = appliedXMin.value
  const xMax = appliedXMax.value

  const nextErrors: Record<number, string | null> = {}
  const nextPoints: Record<number, GraphPoint[]> = {}
  const nextRoots: RootRow[] = []
  const nextRootMarkers: GraphMarker[] = []
  const nextEvalRows: EvalRow[] = []
  const nextEvalMarkers: GraphMarker[] = []

  for (const row of rows.value) {
    const trimmed = row.expr.trim()
    if (!trimmed) {
      nextErrors[row.id] = null
      nextPoints[row.id] = []
      continue
    }

    let fn: CompiledFn | null = null
    let error: string | null = null
    try {
      fn = toCompiledFn(compile(trimmed))
      fn(TEST_X)
    } catch (e) {
      fn = null
      error = e instanceof Error ? e.message : 'Invalid expression'
    }
    nextErrors[row.id] = error

    if (!fn) {
      nextPoints[row.id] = []
      continue
    }

    nextPoints[row.id] = samplePoints(fn, xMin, xMax, SAMPLE_COUNT)

    if (!row.visible) continue

    for (const rootX of findRoots(fn, xMin, xMax)) {
      const y = evaluateAt(fn, rootX) ?? 0
      const displayY = Math.abs(y) < 1e-9 ? 0 : y
      nextRoots.push({
        id: `${row.id}-${rootX}`,
        expr: row.expr,
        color: row.color,
        x: rootX,
        y: displayY,
      })
      nextRootMarkers.push({ x: rootX, y, color: row.color })
    }

    if (evalX.value !== null) {
      const y = evaluateAt(fn, evalX.value)
      nextEvalRows.push({ id: row.id, expr: row.expr, color: row.color, y })
      if (y !== null) nextEvalMarkers.push({ x: evalX.value, y, color: row.color })
    }
  }

  rowErrors.value = nextErrors
  rowPoints.value = nextPoints
  rootRows.value = nextRoots
  rootMarkers.value = nextRootMarkers
  evalRows.value = nextEvalRows
  evalMarkers.value = nextEvalMarkers
}

const debouncedRecompute = useDebounceFn(recompute, 150)

onMounted(async () => {
  mathjsPromise = import('mathjs')
  await recompute()
  ready.value = true
})

watch(
  [
    () => rows.value.map((r) => `${r.id}:${r.expr}:${r.visible}`).join('|'),
    appliedXMin,
    appliedXMax,
    evalX,
  ],
  () => {
    if (ready.value) debouncedRecompute()
  },
)

const visibleFunctionSeries = computed<GraphSeries[]>(() =>
  rows.value
    .filter((r) => r.visible)
    .map((r) => ({ id: String(r.id), color: r.color, points: rowPoints.value[r.id] ?? [] })),
)
</script>

<template>
  <ToolPage :tool="tool">
    <div class="gp">
      <template v-if="!ready">
        <Skeleton variant="rect" width="100%" height="120px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="320px" radius="10px" />
      </template>

      <template v-else>
        <div class="gp__functions">
          <div v-for="(row, index) in rows" :key="row.id" class="gp__fn-row">
            <span class="gp__swatch" :style="{ background: row.color }" aria-hidden="true" />
            <Field
              :label="`Function ${index + 1}`"
              :html-for="`gp-fn-${row.id}`"
              class="gp__fn-field gp__fn-field--hidden-label"
              :error="rowErrors[row.id] || ''"
            >
              <Input
                :id="`gp-fn-${row.id}`"
                v-model="row.expr"
                class="gp__fn-input"
                spellcheck="false"
                autocomplete="off"
                placeholder="x^2 - 3*x + 2"
                :invalid="!!rowErrors[row.id]"
              />
            </Field>
            <IconButton
              :aria-label="
                row.visible ? `Hide function ${index + 1}` : `Show function ${index + 1}`
              "
              @click="row.visible = !row.visible"
            >
              <Icon :name="row.visible ? UI_ICON.eye : UI_ICON.eyeOff" size="16" />
            </IconButton>
            <IconButton
              :aria-label="`Remove function ${index + 1}`"
              :disabled="rows.length <= 1"
              @click="removeRow(row.id)"
            >
              <Icon :name="UI_ICON.trash" size="16" />
            </IconButton>
          </div>

          <Tooltip content="Up to 3 functions" :disabled="rows.length < MAX_FUNCTIONS">
            <Button variant="ghost" :disabled="rows.length >= MAX_FUNCTIONS" @click="addRow">
              <template #icon><Icon :name="UI_ICON.add" size="15" /></template>
              Add function
            </Button>
          </Tooltip>
        </div>

        <div class="gp__range">
          <Field label="X min" class="gp__field" :error="!rangeValid ? rangeErrorMessage : ''">
            <NumberInput v-model="xMinInput" :precision="4" :invalid="!rangeValid" />
          </Field>
          <Field label="X max" class="gp__field" :error="!rangeValid ? rangeErrorMessage : ''">
            <NumberInput v-model="xMaxInput" :precision="4" :invalid="!rangeValid" />
          </Field>
        </div>

        <GraphCanvas
          :functions="visibleFunctionSeries"
          :roots="rootMarkers"
          :eval-markers="evalMarkers"
          :eval-x="evalX"
          :x-min="appliedXMin"
          :x-max="appliedXMax"
          @update:range="onRangeUpdate"
          @reset="onResetView"
        />

        <div class="gp__eval">
          <Field label="Evaluate at x" class="gp__field">
            <NumberInput v-model="evalX" :precision="4" placeholder="x" />
          </Field>
          <div v-if="evalX !== null && evalRows.length" class="gp__eval-rows">
            <div v-for="row in evalRows" :key="row.id" class="gp__eval-row">
              <span class="gp__swatch" :style="{ background: row.color }" aria-hidden="true" />
              <span class="gp__eval-readout">
                f({{ formatNumber(evalX) }}) =
                {{ row.y === null ? 'undefined' : formatNumber(row.y) }}
              </span>
            </div>
          </div>
        </div>

        <OutputPanel
          label="Roots"
          :empty="rootRows.length === 0"
          :live="false"
          empty-title="No roots found in this range"
          empty-description="Try widening the x-range or check the expression."
        >
          <Table density="compact">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Function</TableHeaderCell>
                <TableHeaderCell numeric>x</TableHeaderCell>
                <TableHeaderCell numeric>f(x)</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow v-for="root in rootRows" :key="root.id">
                <TableCell class="gp__mono">
                  <span
                    class="gp__swatch gp__swatch--inline"
                    :style="{ background: root.color }"
                    aria-hidden="true"
                  />
                  {{ root.expr }}
                </TableCell>
                <TableCell numeric class="gp__mono">{{ formatNumber(root.x) }}</TableCell>
                <TableCell numeric class="gp__mono">{{ formatNumber(root.y) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </OutputPanel>
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.gp {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.gp__functions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.gp__fn-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}
.gp__swatch {
  flex-shrink: 0;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  margin-bottom: 0.6rem;
}
.gp__swatch--inline {
  display: inline-block;
  margin: 0 0.4rem 0 0;
  vertical-align: middle;
}
.gp__fn-field {
  flex: 1;
  min-width: 0;
}
.gp__fn-field--hidden-label :deep(.jl-field__label) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.gp__fn-input :deep(input) {
  font-family: var(--font-mono);
}
.gp__range {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.gp__field {
  flex: 1;
  min-width: 140px;
}
.gp__eval {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.gp__eval-rows {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.gp__eval-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.gp__eval-readout {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.gp__mono {
  font-family: var(--font-mono);
}
</style>
