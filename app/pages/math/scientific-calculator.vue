<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
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
import {
  evaluateExpression,
  type AngleUnit,
  type EvaluateOutcome,
} from '@/utils/scientificCalculator'

definePageMeta({ layout: 'tool' })

const tool = getTool('math-scientific-calculator')!

const ANGLE_OPTIONS = [
  { value: 'deg', label: 'DEG' },
  { value: 'rad', label: 'RAD' },
]

const expression = ref('')
const angleUnit = ref<AngleUnit>('deg')
const memory = ref(0)
const ans = ref(0)
const committed = ref(false)
const lastCommittedExpression = ref<string | null>(null)
const evalOutcome = ref<EvaluateOutcome>({
  status: 'empty',
  value: null,
  formatted: null,
  errorMessage: null,
})

const announcement = ref('')

interface HistoryEntry {
  id: number
  expression: string
  result: string
}
const history = ref<HistoryEntry[]>([])
let historyId = 0

const inputRef = ref<InstanceType<typeof Input> | null>(null)

function getNativeInput(): HTMLInputElement | null {
  const el = inputRef.value?.$el as HTMLElement | undefined
  return el?.querySelector('input') ?? null
}

let mathjsPromise: Promise<typeof import('mathjs')> | null = null
onMounted(() => {
  mathjsPromise = import('mathjs')
})

const DOMAIN_ERROR_STATUSES = new Set(['divide-by-zero', 'complex', 'undefined'])

async function runEvaluate(isCommit: boolean) {
  if (!mathjsPromise) mathjsPromise = import('mathjs')
  const { evaluate } = await mathjsPromise
  const result = evaluateExpression(evaluate, expression.value, angleUnit.value, ans.value)
  evalOutcome.value = result

  if (DOMAIN_ERROR_STATUSES.has(result.status)) {
    committed.value = false
    lastCommittedExpression.value = null
    announcement.value = result.errorMessage ?? ''
    return
  }

  if (isCommit) {
    if (result.status === 'ok' && result.value !== null && result.formatted !== null) {
      ans.value = result.value
      committed.value = true
      lastCommittedExpression.value = expression.value
      announcement.value = `Result: ${result.formatted}`
      history.value = [
        { id: ++historyId, expression: expression.value, result: result.formatted },
        ...history.value,
      ].slice(0, 20)
    }
    return
  }

  if (expression.value === lastCommittedExpression.value) return
  committed.value = false
}

const debouncedEvaluate = useDebounceFn(() => runEvaluate(false), 150)
watch([expression, angleUnit], debouncedEvaluate)

const resultText = computed(() =>
  evalOutcome.value.status === 'ok' ? (evalOutcome.value.formatted ?? '') : '',
)
const domainErrorMessage = computed(() =>
  DOMAIN_ERROR_STATUSES.has(evalOutcome.value.status) ? evalOutcome.value.errorMessage : null,
)

function focusInput() {
  nextTick(() => getNativeInput()?.focus())
}

function insertText(token: string) {
  const native = getNativeInput()
  const start = native?.selectionStart ?? expression.value.length
  const end = native?.selectionEnd ?? expression.value.length
  expression.value = expression.value.slice(0, start) + token + expression.value.slice(end)
  const cursor = start + token.length
  nextTick(() => {
    const el = getNativeInput()
    el?.focus()
    el?.setSelectionRange(cursor, cursor)
  })
}

function backspace() {
  const native = getNativeInput()
  const start = native?.selectionStart ?? expression.value.length
  const end = native?.selectionEnd ?? expression.value.length
  if (start === end) {
    if (start === 0) return
    expression.value = expression.value.slice(0, start - 1) + expression.value.slice(end)
    const cursor = start - 1
    nextTick(() => {
      const el = getNativeInput()
      el?.focus()
      el?.setSelectionRange(cursor, cursor)
    })
  } else {
    expression.value = expression.value.slice(0, start) + expression.value.slice(end)
    nextTick(() => {
      const el = getNativeInput()
      el?.focus()
      el?.setSelectionRange(start, start)
    })
  }
}

function allClear() {
  expression.value = ''
  evalOutcome.value = { status: 'empty', value: null, formatted: null, errorMessage: null }
  committed.value = false
  lastCommittedExpression.value = null
  announcement.value = 'Cleared.'
  focusInput()
}

function commit() {
  runEvaluate(true)
  focusInput()
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    allClear()
  }
}

function currentNumericValue(): number {
  return evalOutcome.value.status === 'ok' && evalOutcome.value.value !== null
    ? evalOutcome.value.value
    : 0
}

function memoryClear() {
  memory.value = 0
}
function memoryRecall() {
  insertText(String(memory.value))
}
function memoryAdd() {
  memory.value += currentNumericValue()
}
function memorySubtract() {
  memory.value -= currentNumericValue()
}

function recall(entry: HistoryEntry) {
  expression.value = entry.expression
  focusInput()
}
function recallKeydown(event: KeyboardEvent, entry: HistoryEntry) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    recall(entry)
  }
}
function clearHistory() {
  history.value = []
}

const { copy: copyResult, copied: resultCopied } = useCopy()
const { copy: copyHistoryRow, copied: historyRowCopied } = useCopy()
const copiedHistoryId = ref<number | null>(null)
async function copyHistoryEntry(entry: HistoryEntry) {
  await copyHistoryRow(entry.result)
  copiedHistoryId.value = entry.id
}

const FUNCTION_BUTTONS = [
  { key: 'sin', label: 'sin', insert: 'sin(' },
  { key: 'cos', label: 'cos', insert: 'cos(' },
  { key: 'tan', label: 'tan', insert: 'tan(' },
  { key: 'pow', label: 'xʸ', ariaLabel: 'Power', insert: '^' },
  { key: 'sqrt', label: '√', ariaLabel: 'Square root', insert: 'sqrt(' },
  { key: 'ln', label: 'ln', ariaLabel: 'Natural log', insert: 'log(' },
  { key: 'log', label: 'log', ariaLabel: 'Log base 10', insert: 'log10(' },
  { key: 'factorial', label: 'n!', ariaLabel: 'Factorial', insert: '!' },
  { key: 'pi', label: 'π', ariaLabel: 'Pi', insert: 'pi' },
  { key: 'e', label: 'e', ariaLabel: "Euler's number", insert: 'e' },
]
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <div class="sc">
      <div class="sc__toolbar">
        <div class="sc__memory">
          <Button variant="ghost" size="sm" aria-label="Memory clear" @click="memoryClear">
            MC
          </Button>
          <Button variant="ghost" size="sm" aria-label="Memory recall" @click="memoryRecall">
            MR
          </Button>
          <Button variant="ghost" size="sm" aria-label="Memory add" @click="memoryAdd">M+</Button>
          <Button variant="ghost" size="sm" aria-label="Memory subtract" @click="memorySubtract">
            M-
          </Button>
        </div>
        <SegmentedControl
          v-model="angleUnit"
          :options="ANGLE_OPTIONS"
          size="sm"
          aria-label="Angle unit"
        />
      </div>

      <div class="sc__screen">
        <Field label="Expression" html-for="sc-expression" class="sc__expr-field">
          <Input
            id="sc-expression"
            ref="inputRef"
            v-model="expression"
            class="sc__expr-input"
            spellcheck="false"
            autocomplete="off"
            placeholder="0"
            @keydown="onInputKeydown"
          />
        </Field>

        <div v-if="!domainErrorMessage" class="sc__result">
          <div class="sc__readout" :class="{ 'sc__readout--committed': committed }">
            {{ resultText }}
          </div>
          <Button
            v-if="resultText"
            variant="ghost"
            size="sm"
            aria-label="Copy result"
            @click="copyResult(resultText)"
          >
            <template #icon>
              <Icon :name="resultCopied ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
          </Button>
        </div>
      </div>
      <Alert v-if="domainErrorMessage" tone="danger">{{ domainErrorMessage }}</Alert>

      <div class="sc__keypads">
        <div class="sc__functions">
          <div class="sc__grid sc__grid--functions">
            <Button
              v-for="fn in FUNCTION_BUTTONS"
              :key="fn.key"
              variant="secondary"
              size="lg"
              class="sc__fnkey"
              :aria-label="fn.ariaLabel"
              @click="insertText(fn.insert)"
            >
              {{ fn.label }}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              class="sc__fnkey"
              aria-label="Open parenthesis"
              @click="insertText('(')"
            >
              (
            </Button>
            <Button
              variant="secondary"
              size="lg"
              class="sc__fnkey"
              aria-label="Close parenthesis"
              @click="insertText(')')"
            >
              )
            </Button>
          </div>
          <div class="sc__grid sc__grid--utility">
            <Button
              variant="secondary"
              size="lg"
              class="sc__fnkey sc__ac"
              aria-label="All clear"
              @click="allClear"
            >
              AC
            </Button>
            <Button
              variant="secondary"
              size="lg"
              class="sc__fnkey"
              aria-label="Backspace"
              @click="backspace"
            >
              <template #icon><Icon :name="UI_ICON.backspace" size="18" /></template>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              class="sc__fnkey"
              aria-label="Percent"
              @click="insertText('%')"
            >
              %
            </Button>
          </div>
        </div>

        <div class="sc__grid sc__grid--keypad">
          <Button variant="secondary" size="lg" @click="insertText('7')">7</Button>
          <Button variant="secondary" size="lg" @click="insertText('8')">8</Button>
          <Button variant="secondary" size="lg" @click="insertText('9')">9</Button>
          <Button variant="secondary" size="lg" aria-label="Divide" @click="insertText('/')">
            ÷
          </Button>

          <Button variant="secondary" size="lg" @click="insertText('4')">4</Button>
          <Button variant="secondary" size="lg" @click="insertText('5')">5</Button>
          <Button variant="secondary" size="lg" @click="insertText('6')">6</Button>
          <Button variant="secondary" size="lg" aria-label="Multiply" @click="insertText('*')">
            ×
          </Button>

          <Button variant="secondary" size="lg" @click="insertText('1')">1</Button>
          <Button variant="secondary" size="lg" @click="insertText('2')">2</Button>
          <Button variant="secondary" size="lg" @click="insertText('3')">3</Button>
          <Button variant="secondary" size="lg" aria-label="Subtract" @click="insertText('-')">
            −
          </Button>

          <Button variant="secondary" size="lg" class="sc__zero" @click="insertText('0')">
            0
          </Button>
          <Button variant="secondary" size="lg" @click="insertText('.')">.</Button>
          <Button variant="secondary" size="lg" aria-label="Add" @click="insertText('+')">
            +
          </Button>

          <Button variant="primary" size="lg" class="sc__equals" @click="commit">=</Button>
        </div>
      </div>

      <OutputPanel
        label="History"
        :empty="history.length === 0"
        :live="false"
        empty-title="No calculations yet"
        empty-description="Results you calculate will appear here."
      >
        <template #actions>
          <Button variant="ghost" size="sm" aria-label="Clear history" @click="clearHistory">
            <template #icon><Icon :name="UI_ICON.trash" size="15" /></template>
          </Button>
        </template>

        <Table density="compact">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Expression</TableHeaderCell>
              <TableHeaderCell>Result</TableHeaderCell>
              <TableHeaderCell><span class="sr-only">Actions</span></TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow
              v-for="entry in history"
              :key="entry.id"
              interactive
              tabindex="0"
              role="button"
              :aria-label="`Recall ${entry.expression} = ${entry.result}`"
              @click="recall(entry)"
              @keydown="recallKeydown($event, entry)"
            >
              <TableCell class="sc__mono">{{ entry.expression }}</TableCell>
              <TableCell class="sc__mono">{{ entry.result }}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  :aria-label="`Copy result ${entry.result}`"
                  @click.stop="copyHistoryEntry(entry)"
                >
                  <template #icon>
                    <Icon
                      :name="
                        historyRowCopied && copiedHistoryId === entry.id
                          ? UI_ICON.check
                          : UI_ICON.copy
                      "
                      size="15"
                    />
                  </template>
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </OutputPanel>
    </div>
  </ToolPage>
</template>

<style scoped>
.sc {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.sc__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.sc__memory {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.sc__screen {
  background: var(--surface-sunken);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow:
    inset 0 2px 5px rgba(0, 0, 0, 0.16),
    inset 0 -1px 0 hsl(0 0% 100% / 0.5);
}
[data-theme='dark'] .sc__screen {
  box-shadow:
    inset 0 2px 5px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 hsl(0 0% 100% / 0.04);
}
.sc__expr-field :deep(.jl-field__label) {
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
.sc__expr-field :deep(.jl-input-wrap) {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  padding: 0;
}
.sc__expr-field :deep(.jl-input-wrap:hover) {
  border-color: transparent;
}
.sc__expr-field :deep(.jl-input-wrap:focus-within) {
  border-color: transparent;
  box-shadow: var(--ring-focus);
}
.sc__expr-input :deep(input) {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
}
.sc__result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: var(--space-2) 0.25rem 0;
  margin-top: var(--space-2);
  border-top: 1px solid var(--border-subtle);
}
.sc__readout {
  flex: 1 1 auto;
  text-align: right;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: clamp(1.5rem, 5vw, 2.25rem);
  font-weight: var(--weight-semibold);
  line-height: 1.1;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.sc__readout--committed {
  color: var(--text-primary);
}
.sc__fnkey {
  background: var(--surface-sunken);
  box-shadow: none;
  color: var(--text-secondary);
}
.sc__ac {
  color: var(--danger);
}
.sc__keypads {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.sc__functions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.sc__grid {
  display: grid;
  gap: 0.5rem;
}
.sc__grid--functions {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.sc__grid--utility {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}
.sc__grid--keypad {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.35rem;
}
.sc__zero {
  grid-column: span 2;
}
.sc__equals {
  grid-column: span 4;
}
.sc__mono {
  font-family: var(--font-mono);
}

@media (min-width: 900px) {
  .sc__keypads {
    flex-direction: row;
    align-items: flex-start;
  }
  .sc__functions,
  .sc__grid--keypad {
    flex: 1 1 0;
  }
}
</style>
