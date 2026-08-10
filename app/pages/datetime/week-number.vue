<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Stat, StatGroup } from '@/components/ui/stat'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/date-picker'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { parseDateOnly, formatDateOnly } from '@/utils/dateDuration'
import {
  isoWeek,
  usWeek,
  dayOfYear,
  daysRemainingInYear,
  quarter,
  isIsoYearBoundary,
} from '@/utils/weekNumber'

definePageMeta({ layout: 'tool' })

const tool = getTool('datetime-week-number')!

const WEEK_START_OPTIONS = [
  { value: '1', label: 'Mon-start' },
  { value: '0', label: 'Sun-start' },
]

const dateText = ref('')
const weekStartValue = ref('1')

const ready = ref(false)

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function todayDateOnly(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

onMounted(() => {
  dateText.value = todayDateOnly()
  ready.value = true
})

function resetToday() {
  dateText.value = todayDateOnly()
}

const weekStartsOn = computed(() => Number(weekStartValue.value))

const dateMs = computed(() => parseDateOnly(dateText.value))
const isEmpty = computed(() => dateMs.value === null)

const isoResult = computed(() => (isEmpty.value ? null : isoWeek(dateMs.value!)))
const usResult = computed(() => (isEmpty.value ? null : usWeek(dateMs.value!)))
const quarterValue = computed(() => (isEmpty.value ? 0 : quarter(dateMs.value!)))
const dayOfYearValue = computed(() => (isEmpty.value ? 0 : dayOfYear(dateMs.value!)))
const daysRemainingValue = computed(() => (isEmpty.value ? 0 : daysRemainingInYear(dateMs.value!)))
const daysInYearValue = computed(() => dayOfYearValue.value + daysRemainingValue.value)
const calendarYear = computed(() => (isEmpty.value ? 0 : new Date(dateMs.value!).getUTCFullYear()))

const isoWeekLabel = computed(() =>
  isoResult.value ? `Week ${isoResult.value.week}, ${isoResult.value.isoYear}` : '',
)
const usWeekLabel = computed(() =>
  usResult.value ? `Week ${usResult.value.week}, ${usResult.value.year}` : '',
)
const quarterLabel = computed(() =>
  isEmpty.value ? '' : `Q${quarterValue.value} ${calendarYear.value}`,
)
const dayOfYearLabel = computed(() =>
  isEmpty.value ? '' : `${dayOfYearValue.value} of ${daysInYearValue.value}`,
)
const daysRemainingLabel = computed(() => (isEmpty.value ? '' : String(daysRemainingValue.value)))

const boundary = computed(() => !isEmpty.value && isIsoYearBoundary(dateMs.value!))

function formatDateHuman(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateWithWeekday(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const boundaryText = computed(() => {
  if (!boundary.value) return ''
  const iso = isoResult.value!
  return `${formatDateHuman(dateMs.value!)} falls in ISO week ${iso.week} of ${iso.isoYear} — the ISO year and calendar year differ here.`
})

const summaryText = computed(() => {
  if (isEmpty.value) return ''
  return [
    `Date: ${formatDateWithWeekday(dateMs.value!)}`,
    `ISO week: ${isoWeekLabel.value}`,
    `US week: ${usWeekLabel.value}`,
    `Quarter: ${quarterLabel.value}`,
    `Day of year: ${dayOfYearLabel.value}`,
    `Days remaining in year: ${daysRemainingLabel.value}`,
  ].join('\n')
})

const { copy: copySummary, copied: summaryCopied } = useCopy()

function msToLocalDate(ms: number): Date {
  const d = new Date(ms)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function localDateToMs(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

const selectedDate = computed<Date | null>({
  get: () => (isEmpty.value ? null : msToLocalDate(dateMs.value!)),
  set: (d) => {
    if (!d) return
    dateText.value = formatDateOnly(localDateToMs(d))
  },
})

const calendarMonth = ref<Date>(new Date())
watch(
  dateMs,
  (ms) => {
    if (ms !== null) calendarMonth.value = msToLocalDate(ms)
  },
  { immediate: true },
)
</script>

<template>
  <ToolPage :tool="tool">
    <div class="wn">
      <template v-if="!ready">
        <Skeleton variant="rect" width="100%" height="40px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="340px" radius="10px" />
      </template>

      <template v-else>
        <div class="wn__field-row">
          <Field label="Date" class="wn__field">
            <Input v-model="dateText" type="date" />
          </Field>
          <Button variant="ghost" size="sm" class="wn__today" @click="resetToday"> Today </Button>
        </div>

        <!--
          live="false": the native date input fires input/change per keystroke
          as the user types into individual segments (day/month/year),
          recomputing the whole panel on every keystroke — the same case
          duration.vue and age.vue already handle this way.
        -->
        <OutputPanel
          label="Week & calendar info"
          :empty="isEmpty"
          :live="false"
          empty-title="Pick a date"
          empty-description="Enter a date to see its week number and calendar position."
        >
          <template v-if="!isEmpty" #actions>
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

          <div class="wn__stats">
            <StatGroup :columns="2">
              <Stat label="ISO week" :value="isoWeekLabel" />
              <Stat
                label="US week"
                :value="usWeekLabel"
                caption="Sunday-start, week 1 = week containing Jan 1"
              />
              <Stat label="Quarter" :value="quarterLabel" />
              <Stat label="Day of year" :value="dayOfYearLabel" />
              <Stat label="Days remaining in year" :value="daysRemainingLabel" />
            </StatGroup>

            <Alert v-if="boundary" tone="info">{{ boundaryText }}</Alert>
          </div>
        </OutputPanel>

        <OutputPanel
          label="Calendar"
          :empty="isEmpty"
          :live="false"
          empty-title="Pick a date"
          empty-description="Enter a date to see its week number and calendar position."
        >
          <div class="wn__calendar">
            <SegmentedControl
              v-model="weekStartValue"
              :options="WEEK_START_OPTIONS"
              aria-label="Week start"
            />
            <Calendar
              v-model="selectedDate"
              v-model:month="calendarMonth"
              :week-starts-on="weekStartsOn"
            />
          </div>
        </OutputPanel>
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.wn {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.wn__field-row {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}
.wn__field {
  flex: 1;
}
.wn__today {
  flex-shrink: 0;
  margin-bottom: 2px;
}
.wn__stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.wn__calendar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}
</style>
