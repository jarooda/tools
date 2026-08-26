<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import {
  calendarBreakdown,
  formatCalendarBreakdown,
  totalDays,
  totalWeeks,
  totalMonthsApprox,
  parseDateOnly,
} from '@/utils/dateDuration'
import { weekdayName, nextBirthday, isFutureBirth } from '@/utils/ageCalculator'

definePageMeta({ layout: 'tool' })

const tool = getTool('datetime-age')!

const birthText = ref('')
const asOfText = ref('')

const ready = ref(false)

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function todayDateOnly(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

onMounted(() => {
  asOfText.value = todayDateOnly()
  ready.value = true
})

function resetAsOfToday() {
  asOfText.value = todayDateOnly()
}

const birthMs = computed(() => parseDateOnly(birthText.value))
const asOfMs = computed(() => parseDateOnly(asOfText.value))

const isEmpty = computed(() => birthMs.value === null || asOfMs.value === null)

const birthError = computed(() => {
  if (isEmpty.value) return ''
  if (isFutureBirth(birthMs.value!, asOfMs.value!)) {
    return "Birth date can't be after the 'as of' date."
  }
  return ''
})

const hasError = computed(() => birthError.value !== '')

const breakdown = computed(() =>
  isEmpty.value || hasError.value ? null : calendarBreakdown(birthMs.value!, asOfMs.value!),
)

const ageLabel = computed(() => (breakdown.value ? formatCalendarBreakdown(breakdown.value) : ''))

const sameDay = computed(() => !isEmpty.value && !hasError.value && birthMs.value === asOfMs.value)

const ageCaption = computed(() => {
  if (isEmpty.value || hasError.value || sameDay.value) return ''
  return `Born on a ${weekdayName(birthMs.value!)}.`
})

const totalDaysValue = computed(() =>
  isEmpty.value || hasError.value ? 0 : totalDays(birthMs.value!, asOfMs.value!),
)
const totalDaysLabel = computed(() => totalDaysValue.value.toLocaleString())

interface LivedRow {
  id: string
  label: string
  value: string
}

const livedRows = computed<LivedRow[]>(() => {
  if (isEmpty.value || hasError.value) return []
  const a = birthMs.value!
  const b = asOfMs.value!
  return [
    {
      id: 'weeks',
      label: 'Weeks',
      value: totalWeeks(a, b).toLocaleString(undefined, { maximumFractionDigits: 2 }),
    },
    {
      id: 'months',
      label: 'Months (approx.)',
      value: totalMonthsApprox(a, b).toLocaleString(undefined, { maximumFractionDigits: 2 }),
    },
  ]
})

const nextBirthdayResult = computed(() =>
  isEmpty.value || hasError.value ? null : nextBirthday(birthMs.value!, asOfMs.value!),
)

function formatDateHuman(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const nextBirthdayLabel = computed(() => {
  const result = nextBirthdayResult.value
  if (!result) return ''
  if (result.isToday) return 'Today'
  return formatDateHuman(result.dateMs)
})

const nextBirthdayCaption = computed(() => {
  const result = nextBirthdayResult.value
  if (!result) return ''
  if (result.isToday) return `Turning ${result.turningAge} today`
  if (result.leapDayObserved) {
    return 'Observed Feb 28 in non-leap years (born on a leap day).'
  }
  return ''
})

const daysUntilLabel = computed(() => {
  const result = nextBirthdayResult.value
  return result ? String(result.daysUntil) : ''
})

const inCaption = computed(() => {
  const result = nextBirthdayResult.value
  return result ? `Turning ${result.turningAge}` : ''
})

const summaryText = computed(() => {
  if (isEmpty.value || hasError.value) return ''
  const lines = [`Age: ${ageLabel.value}`, `Total days lived: ${totalDaysLabel.value}`]
  for (const row of livedRows.value) {
    lines.push(`${row.label}: ${row.value}`)
  }
  if (nextBirthdayResult.value) {
    lines.push(`Next birthday: ${nextBirthdayLabel.value}`)
    lines.push(`In: ${daysUntilLabel.value} day${daysUntilLabel.value === '1' ? '' : 's'}`)
  }
  return lines.join('\n')
})

const { copy: copySummary, copied: summaryCopied } = useCopy()
const { copy: copyRow } = useCopy()
const copiedRow = ref<string | null>(null)

async function copyLivedRow(row: LivedRow) {
  await copyRow(row.value)
  copiedRow.value = row.id
}
</script>

<template>
  <ToolPage :tool="tool">
    <div class="age">
      <template v-if="!ready">
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
      </template>

      <template v-else>
        <div class="age__inputs">
          <Field label="Birth date" class="age__field" :error="birthError">
            <Input v-model="birthText" type="date" :invalid="hasError" />
          </Field>
          <div class="age__field age__field--as-of">
            <Field label="As of">
              <Input v-model="asOfText" type="date" />
            </Field>
            <Button variant="ghost" size="sm" class="age__today" @click="resetAsOfToday">
              Today
            </Button>
          </div>
        </div>

        <!--
          live="false": native date inputs fire input/change per keystroke as
          the user types into individual segments (day/month/year),
          recomputing the whole panel on every keystroke — the same case
          duration.vue and unix-timestamp.vue already handle this way, not
          the ticking-clock case.
        -->
        <OutputPanel
          label="Age"
          :empty="isEmpty"
          :error="birthError || null"
          :live="false"
          empty-title="Enter a birth date"
          empty-description="Pick a date of birth to see the age breakdown."
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

          <StatGroup :columns="2">
            <Stat label="Age" :value="ageLabel" :caption="ageCaption" />
            <Stat label="Total days lived" :value="totalDaysLabel" />
          </StatGroup>
        </OutputPanel>

        <OutputPanel
          label="Lived so far"
          :empty="isEmpty"
          :error="birthError || null"
          :live="false"
          empty-title="Enter a birth date"
          empty-description="Pick a date of birth to see the age breakdown."
        >
          <Table density="compact">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Unit</TableHeaderCell>
                <TableHeaderCell>Value</TableHeaderCell>
                <TableHeaderCell><span class="sr-only">Actions</span></TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow v-for="row in livedRows" :key="row.id">
                <TableCell>{{ row.label }}</TableCell>
                <TableCell class="age__mono">{{ row.value }}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    :aria-label="`Copy ${row.label}`"
                    @click="copyLivedRow(row)"
                  >
                    <template #icon>
                      <Icon :name="copiedRow === row.id ? UI_ICON.check : UI_ICON.copy" size="15" />
                    </template>
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </OutputPanel>

        <OutputPanel
          label="Next birthday"
          :empty="isEmpty"
          :error="birthError || null"
          :live="false"
          empty-title="Enter a birth date"
          empty-description="Pick a date of birth to see the age breakdown."
        >
          <StatGroup :columns="2">
            <Stat label="Next birthday" :value="nextBirthdayLabel" :caption="nextBirthdayCaption" />
            <Stat label="Days until" :value="daysUntilLabel" :caption="inCaption" />
          </StatGroup>
        </OutputPanel>
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.age {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.age__inputs {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}
.age__field {
  flex: 1;
}
.age__field--as-of {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}
.age__today {
  flex-shrink: 0;
  margin-bottom: 2px;
}
.age__mono {
  font-family: var(--font-mono);
}
</style>
