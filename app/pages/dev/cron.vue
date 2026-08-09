<script setup lang="ts">
import { computed, onMounted, ref, type Ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Tooltip } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { EmptyState } from '@/components/ui/empty-state'
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
import { parseCronExpression, explainCron, nextCronRuns, type CronFields } from '@/utils/cron'

definePageMeta({ layout: 'tool' })

const tool = getTool('dev-cron')!

type Mode = 'build' | 'paste'

const MODE_OPTIONS = [
  { value: 'build', label: 'Build' },
  { value: 'paste', label: 'Paste' },
]

interface BuildField {
  key: string
  label: string
  model: Ref<string>
  placeholder: string
  hint: string
}

const minuteField = ref('')
const hourField = ref('')
const domField = ref('')
const monthField = ref('')
const dowField = ref('')

const BUILD_FIELDS: BuildField[] = [
  {
    key: 'minute',
    label: 'Minute',
    model: minuteField,
    placeholder: '*',
    hint: '0–59. Supports *, lists (0,15,30), ranges (0-29), and steps (*/15).',
  },
  {
    key: 'hour',
    label: 'Hour',
    model: hourField,
    placeholder: '*',
    hint: '0–23. Supports *, lists, ranges, and steps (e.g. 9-17).',
  },
  {
    key: 'dayOfMonth',
    label: 'Day of month',
    model: domField,
    placeholder: '*',
    hint: '1–31. Supports *, lists, ranges, and steps.',
  },
  {
    key: 'month',
    label: 'Month',
    model: monthField,
    placeholder: '*',
    hint: '1–12 or JAN–DEC. Supports *, lists, ranges, and steps.',
  },
  {
    key: 'dayOfWeek',
    label: 'Day of week',
    model: dowField,
    placeholder: '*',
    hint: '0–6 (Sun–Sat) or SUN–SAT. Supports *, lists, ranges, and steps.',
  },
]

const pasteExpression = ref('')
const mode = ref<Mode>('build')
const conversionWarning = ref('')

const PRESETS: { label: string; expr: string }[] = [
  { label: 'Every minute', expr: '* * * * *' },
  { label: 'Hourly', expr: '0 * * * *' },
  { label: 'Daily at midnight', expr: '0 0 * * *' },
  { label: 'Weekdays at 9am', expr: '0 9 * * MON-FRI' },
  { label: 'Monthly on the 1st', expr: '0 0 1 * *' },
]

function joinBuildFields(): string {
  return BUILD_FIELDS.map((f) => f.model.value.trim() || '*').join(' ')
}

function setMode(next: string) {
  const nextMode = next as Mode
  if (nextMode === mode.value) return

  if (mode.value === 'build' && nextMode === 'paste') {
    pasteExpression.value = joinBuildFields()
    conversionWarning.value = ''
    mode.value = 'paste'
    return
  }

  const tokens = pasteExpression.value.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 5) {
    BUILD_FIELDS.forEach((f, i) => {
      f.model.value = tokens[i]!
    })
    conversionWarning.value = ''
    mode.value = 'build'
  } else {
    conversionWarning.value = `Could not split "${pasteExpression.value.trim()}" into exactly 5 fields — stayed in Paste mode.`
  }
}

function applyPreset(expr: string) {
  conversionWarning.value = ''
  if (mode.value === 'build') {
    const tokens = expr.split(' ')
    BUILD_FIELDS.forEach((f, i) => {
      f.model.value = tokens[i]!
    })
  } else {
    pasteExpression.value = expr
  }
}

function fieldError(index: number, raw: string): string {
  if (raw.trim() === '') return ''
  const tokens = ['*', '*', '*', '*', '*']
  tokens[index] = raw.trim()
  const r = parseCronExpression(tokens.join(' '))
  return r.ok ? '' : (r.error ?? '')
}

const buildFieldErrors = computed(() => BUILD_FIELDS.map((f, i) => fieldError(i, f.model.value)))

const buildAllBlank = computed(() => BUILD_FIELDS.every((f) => f.model.value.trim() === ''))
const isEmpty = computed(() =>
  mode.value === 'build' ? buildAllBlank.value : pasteExpression.value.trim() === '',
)

const effectiveExpression = computed(() =>
  mode.value === 'build' ? joinBuildFields() : pasteExpression.value.trim(),
)

const parseResult = computed(() =>
  isEmpty.value ? null : parseCronExpression(effectiveExpression.value),
)
const errorText = computed(() =>
  parseResult.value && !parseResult.value.ok
    ? (parseResult.value.error ?? 'Invalid cron expression.')
    : null,
)
const fields = computed<CronFields | undefined>(() => parseResult.value?.fields)

const explanation = computed(() => (fields.value ? explainCron(fields.value) : ''))

const runFrom = ref('')
const runCount = ref(5)

const ready = ref(false)

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function nowDatetimeLocal(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`
}

onMounted(() => {
  minuteField.value = '0'
  hourField.value = '9'
  domField.value = '*'
  monthField.value = '*'
  dowField.value = 'MON-FRI'
  runFrom.value = nowDatetimeLocal()
  ready.value = true
})

function resetToNow() {
  runFrom.value = nowDatetimeLocal()
}

const runFromDate = computed(() => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(runFrom.value)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
})

const runs = computed(() => {
  if (!fields.value || !runFromDate.value) return []
  const count = Math.min(10, Math.max(1, runCount.value || 1))
  return nextCronRuns(fields.value, runFromDate.value, count)
})

const runsEmpty = computed(() => !errorText.value && !isEmpty.value && runs.value.length === 0)

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function formatTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
function formatWeekday(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long' })
}

const runsText = computed(() =>
  runs.value
    .map((d, i) => `${i + 1}. ${formatDate(d)} ${formatTime(d)} (${formatWeekday(d)})`)
    .join('\n'),
)

const { copy: copyExplanation, copied: explanationCopied } = useCopy()
const { copy: copyRuns, copied: runsCopied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="ct">
      <div class="ct__mode">
        <SegmentedControl
          :model-value="mode"
          :options="MODE_OPTIONS"
          @update:model-value="setMode"
        />
      </div>

      <Alert v-if="conversionWarning" tone="warning">{{ conversionWarning }}</Alert>

      <div v-if="mode === 'build'" class="ct__build">
        <div class="ct__build-fields">
          <Tooltip v-for="(f, i) in BUILD_FIELDS" :key="f.key" :content="f.hint">
            <Field :label="f.label" :error="buildFieldErrors[i]" class="ct__build-field">
              <Input
                v-model="f.model.value"
                class="ct__mono-input"
                :placeholder="f.placeholder"
                :invalid="!!buildFieldErrors[i]"
                spellcheck="false"
              />
            </Field>
          </Tooltip>
        </div>

        <div class="ct__presets">
          <Button
            v-for="p in PRESETS"
            :key="p.label"
            variant="ghost"
            size="sm"
            @click="applyPreset(p.expr)"
          >
            {{ p.label }}
          </Button>
        </div>
      </div>

      <div v-else class="ct__paste">
        <Field label="Cron expression">
          <Input
            v-model="pasteExpression"
            class="ct__mono-input ct__paste-input"
            placeholder="0 9 * * MON-FRI"
            :invalid="!!errorText"
            spellcheck="false"
          />
        </Field>

        <div class="ct__presets">
          <Button
            v-for="p in PRESETS"
            :key="p.label"
            variant="ghost"
            size="sm"
            @click="applyPreset(p.expr)"
          >
            {{ p.label }}
          </Button>
        </div>
      </div>

      <Alert v-if="errorText" tone="danger">{{ errorText }}</Alert>

      <div class="ct__grid">
        <OutputPanel
          label="What this means"
          :ready="ready"
          :empty="isEmpty"
          :error="errorText"
          :live="false"
          empty-title="Nothing to explain yet"
          empty-description="Build or paste a cron expression to see what it means."
        >
          <template v-if="!isEmpty && !errorText" #actions>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Copy explanation"
              @click="copyExplanation(explanation)"
            >
              <template #icon>
                <Icon :name="explanationCopied ? UI_ICON.check : UI_ICON.copy" size="15" />
              </template>
              {{ explanationCopied ? 'Copied' : 'Copy' }}
            </Button>
          </template>

          <p class="ct__explanation">{{ explanation }}</p>
        </OutputPanel>

        <OutputPanel
          label="Next runs"
          :ready="ready"
          :empty="isEmpty"
          :error="errorText"
          :live="false"
          empty-title="Nothing to preview yet"
          empty-description="Build or paste a cron expression to see upcoming run times."
        >
          <template v-if="!isEmpty && !errorText && runs.length" #actions>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Copy next runs"
              @click="copyRuns(runsText)"
            >
              <template #icon>
                <Icon :name="runsCopied ? UI_ICON.check : UI_ICON.copy" size="15" />
              </template>
              {{ runsCopied ? 'Copied' : 'Copy' }}
            </Button>
          </template>

          <div class="ct__runs">
            <div class="ct__runs-controls">
              <Field label="Run from">
                <Input v-model="runFrom" type="datetime-local" />
              </Field>
              <Field label="Show next">
                <NumberInput v-model="runCount" :min="1" :max="10" />
              </Field>
              <Button variant="ghost" size="sm" @click="resetToNow">
                <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
                Reset to now
              </Button>
            </div>

            <EmptyState
              v-if="runsEmpty"
              class="ct__runs-empty"
              bordered
              size="sm"
              title="No runs found"
              description="No matching run was found in the next 4 years — check the expression."
            >
              <template #icon><Icon :name="UI_ICON.emptyInput" size="22" /></template>
            </EmptyState>

            <Table v-else-if="runs.length" density="compact">
              <TableHead>
                <TableRow>
                  <TableHeaderCell numeric>#</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Time</TableHeaderCell>
                  <TableHeaderCell>Weekday</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow v-for="(r, i) in runs" :key="i">
                  <TableCell numeric>{{ i + 1 }}</TableCell>
                  <TableCell>{{ formatDate(r) }}</TableCell>
                  <TableCell>{{ formatTime(r) }}</TableCell>
                  <TableCell>{{ formatWeekday(r) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </OutputPanel>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.ct {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.ct__mode {
  display: flex;
}
.ct__build,
.ct__paste {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.ct__build-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.ct__build-field {
  flex: 1;
  min-width: 140px;
}
.ct__mono-input :deep(input) {
  font-family: var(--font-mono);
  text-align: center;
}
.ct__paste-input {
  width: 100%;
}
.ct__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.ct__explanation {
  margin: 0;
  padding: 0.75rem 1rem;
  background: var(--surface-muted);
  border-radius: var(--radius-xs);
  color: var(--text-primary);
}
.ct__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}
.ct__runs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.ct__runs-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}
.ct__runs-empty {
  width: 100%;
}

@media (max-width: 640px) {
  .ct__grid {
    grid-template-columns: 1fr;
  }
}
</style>
