<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Tag } from '@/components/ui/tag'
import { Stat, StatGroup } from '@/components/ui/stat'
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
import { parseDateOnly, formatDateOnly } from '@/utils/dateDuration'
import {
  countBusinessDays,
  addBusinessDays,
  excludedDaysInRange,
  type WeekdayIndex,
  type BusinessDaysOptions,
} from '@/utils/businessDays'

definePageMeta({ layout: 'tool' })

const tool = getTool('datetime-business-days')!

const DAY_MS = 86_400_000
const EXCLUDED_ROWS_CAP = 20

type Mode = 'between' | 'add'

const MODE_OPTIONS = [
  { value: 'between', label: 'Between two dates' },
  { value: 'add', label: 'Add / subtract days' },
]

const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Mon', ariaLabel: 'Monday' },
  { value: '2', label: 'Tue', ariaLabel: 'Tuesday' },
  { value: '3', label: 'Wed', ariaLabel: 'Wednesday' },
  { value: '4', label: 'Thu', ariaLabel: 'Thursday' },
  { value: '5', label: 'Fri', ariaLabel: 'Friday' },
  { value: '6', label: 'Sat', ariaLabel: 'Saturday' },
  { value: '7', label: 'Sun', ariaLabel: 'Sunday' },
]

const mode = ref<Mode>('between')

const startText = ref('')
const endText = ref('')

const addStartText = ref('')
const addN = ref<number | null>(5)

const weekendDayStrings = ref<string[]>(['6', '7'])
const holidays = ref<number[]>([])
const pendingHolidayText = ref('')

const ready = ref(false)

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function todayDateOnly(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

onMounted(() => {
  const start = parseDateOnly(todayDateOnly())!
  const end = start + 7 * DAY_MS
  startText.value = formatDateOnly(start)
  endText.value = formatDateOnly(end)
  addStartText.value = formatDateOnly(start)
  ready.value = true
})

function setMode(next: string) {
  mode.value = next as Mode
}

function swap() {
  const start = startText.value
  startText.value = endText.value
  endText.value = start
}

const weekendDaySet = computed<ReadonlySet<WeekdayIndex>>(
  () => new Set(weekendDayStrings.value.map(Number) as WeekdayIndex[]),
)

const sortedHolidays = computed(() => [...holidays.value].sort((a, b) => a - b))

const holidaySet = computed<ReadonlySet<number>>(() => new Set(holidays.value))

const options = computed<BusinessDaysOptions>(() => ({
  weekendDays: weekendDaySet.value,
  holidays: holidaySet.value,
}))

const allDaysWeekend = computed(() => weekendDaySet.value.size >= 7)

function addHoliday() {
  const ms = parseDateOnly(pendingHolidayText.value)
  if (ms === null) return
  if (!holidays.value.includes(ms)) {
    holidays.value = [...holidays.value, ms]
  }
  pendingHolidayText.value = ''
}

function removeHoliday(ms: number) {
  holidays.value = holidays.value.filter((h) => h !== ms)
}

function clearHolidays() {
  holidays.value = []
}

function formatDateHuman(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatWeekday(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'long' })
}

// Mode A: between two dates
const startMs = computed(() => parseDateOnly(startText.value))
const endMs = computed(() => parseDateOnly(endText.value))
const betweenEmpty = computed(() => startMs.value === null || endMs.value === null)
const betweenReversed = computed(() => !betweenEmpty.value && endMs.value! < startMs.value!)

const betweenBusinessDays = computed(() =>
  betweenEmpty.value ? 0 : countBusinessDays(startMs.value!, endMs.value!, options.value),
)
const betweenCalendarDays = computed(() =>
  betweenEmpty.value ? 0 : Math.abs(endMs.value! - startMs.value!) / DAY_MS + 1,
)
const betweenExcluded = computed(() =>
  betweenEmpty.value ? [] : excludedDaysInRange(startMs.value!, endMs.value!, options.value),
)
const betweenWeekendCount = computed(
  () => betweenExcluded.value.filter((row) => row.reason === 'weekend').length,
)
const betweenHolidayCount = computed(
  () => betweenExcluded.value.filter((row) => row.reason === 'holiday').length,
)
const betweenCaption = computed(() =>
  betweenReversed.value ? 'End is before start — showing the count between them.' : '',
)

// Mode B: add/subtract business days
const addStartMs = computed(() => parseDateOnly(addStartText.value))
const addEmpty = computed(() => addStartMs.value === null || addN.value === null)
const addResultMs = computed(() => {
  if (addEmpty.value || allDaysWeekend.value) return null
  return addBusinessDays(addStartMs.value!, addN.value!, options.value)
})
const addExcluded = computed(() => {
  if (addEmpty.value || addResultMs.value === null) return []
  return excludedDaysInRange(addStartMs.value!, addResultMs.value, options.value)
})

const isEmpty = computed(() => (mode.value === 'between' ? betweenEmpty.value : addEmpty.value))
const hasError = computed(() => mode.value === 'add' && !addEmpty.value && allDaysWeekend.value)
const errorMessage = 'No business days are possible — every day of the week is marked as a weekend.'

const activeExcluded = computed(() =>
  mode.value === 'between' ? betweenExcluded.value : addExcluded.value,
)
const visibleExcluded = computed(() => activeExcluded.value.slice(0, EXCLUDED_ROWS_CAP))
const hiddenExcludedCount = computed(() =>
  Math.max(0, activeExcluded.value.length - EXCLUDED_ROWS_CAP),
)

const summaryText = computed(() => {
  if (isEmpty.value || hasError.value) return ''
  if (mode.value === 'between') {
    return [
      `Business days: ${betweenBusinessDays.value.toLocaleString()}`,
      `Calendar days: ${betweenCalendarDays.value.toLocaleString()}`,
      `Weekend days excluded: ${betweenWeekendCount.value.toLocaleString()}`,
      `Holidays excluded: ${betweenHolidayCount.value.toLocaleString()}`,
    ].join('\n')
  }
  if (addResultMs.value === null) return ''
  return [
    `Resulting date: ${formatDateHuman(addResultMs.value)}`,
    `Weekday: ${formatWeekday(addResultMs.value)}`,
  ].join('\n')
})

const { copy: copySummary, copied: summaryCopied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="bd">
      <template v-if="!ready">
        <Skeleton variant="rect" width="100%" height="40px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="240px" radius="10px" />
      </template>

      <template v-else>
        <SegmentedControl
          :model-value="mode"
          :options="MODE_OPTIONS"
          aria-label="Calculation mode"
          @update:model-value="setMode"
        />

        <div v-if="mode === 'between'" class="bd__inputs">
          <Field label="Start" class="bd__field">
            <Input v-model="startText" type="date" />
          </Field>
          <IconButton aria-label="Swap start and end dates" class="bd__swap" @click="swap">
            <Icon :name="UI_ICON.swapVertical" size="16" />
          </IconButton>
          <Field label="End" class="bd__field">
            <Input v-model="endText" type="date" />
          </Field>
        </div>

        <div v-else class="bd__inputs">
          <Field label="Start" class="bd__field">
            <Input v-model="addStartText" type="date" />
          </Field>
          <Field label="Business days to add/subtract" class="bd__field">
            <NumberInput v-model="addN" :step="1" suffix="days" />
          </Field>
        </div>

        <div class="bd__settings">
          <Field label="Weekend days">
            <ToggleGroup
              v-model="weekendDayStrings"
              type="multiple"
              :options="WEEKDAY_OPTIONS"
              aria-label="Weekend days"
            />
          </Field>

          <Field label="Holidays">
            <div class="bd__holiday-add">
              <Input v-model="pendingHolidayText" type="date" @keydown.enter="addHoliday" />
              <Button :disabled="!pendingHolidayText" @click="addHoliday">
                <template #icon><Icon :name="UI_ICON.add" size="15" /></template>
                Add holiday
              </Button>
            </div>

            <div v-if="sortedHolidays.length > 0" class="bd__holiday-list">
              <Tag v-for="ms in sortedHolidays" :key="ms" removable @remove="removeHoliday(ms)">
                {{ formatDateHuman(ms) }}
              </Tag>
              <Button variant="ghost" size="sm" @click="clearHolidays">Clear all</Button>
            </div>
          </Field>
        </div>

        <!--
          live="false": native date/number inputs commit per-field, not
          per-keystroke — same rationale as duration.vue.
        -->
        <OutputPanel
          label="Result"
          :empty="isEmpty"
          :error="hasError ? errorMessage : null"
          :live="false"
          :empty-title="mode === 'between' ? 'Pick both dates' : 'Pick a start date'"
          :empty-description="
            mode === 'between'
              ? 'Enter a start and end date to count business days between them.'
              : 'Enter a start date and a number of business days.'
          "
        >
          <template v-if="!isEmpty && !hasError" #actions>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Copy summary"
              @click="copySummary(summaryText)"
            >
              <template #icon>
                <Icon :name="summaryCopied ? UI_ICON.check : UI_ICON.copy" size="15" />
              </template>
              {{ summaryCopied ? 'Copied' : 'Copy summary' }}
            </Button>
          </template>

          <StatGroup v-if="mode === 'between'" :columns="2">
            <Stat
              label="Business days"
              :value="betweenBusinessDays.toLocaleString()"
              :caption="betweenCaption"
            />
            <Stat label="Calendar days" :value="betweenCalendarDays.toLocaleString()" />
            <Stat label="Weekend days excluded" :value="betweenWeekendCount.toLocaleString()" />
            <Stat label="Holidays excluded" :value="betweenHolidayCount.toLocaleString()" />
          </StatGroup>

          <StatGroup v-else-if="addResultMs !== null" :columns="2">
            <Stat label="Resulting date" :value="formatDateHuman(addResultMs)" />
            <Stat label="Weekday" :value="formatWeekday(addResultMs)" />
          </StatGroup>
        </OutputPanel>

        <OutputPanel
          v-if="!isEmpty && !hasError"
          label="Excluded dates"
          :live="false"
          :empty="activeExcluded.length === 0"
          empty-title="No excluded dates"
          empty-description="No weekends or holidays fall within this range."
        >
          <Table density="compact">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Reason</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow v-for="row in visibleExcluded" :key="row.dateMs">
                <TableCell>{{ formatDateHuman(row.dateMs) }}</TableCell>
                <TableCell>
                  <Tag :color="row.reason === 'holiday' ? 'info' : 'neutral'">
                    {{ row.reason === 'holiday' ? 'Holiday' : 'Weekend' }}
                  </Tag>
                </TableCell>
              </TableRow>
              <TableRow v-if="hiddenExcludedCount > 0">
                <TableCell colspan="2">
                  <Tag>{{ hiddenExcludedCount }} more</Tag>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </OutputPanel>
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.bd {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.bd__inputs {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}
.bd__field {
  flex: 1;
}
.bd__swap {
  flex-shrink: 0;
  margin-bottom: 2px;
}
.bd__settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.bd__holiday-add {
  display: flex;
  gap: 0.5rem;
}
.bd__holiday-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
</style>
