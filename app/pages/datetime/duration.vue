<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
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
  totalYearsApprox,
  totalHours,
  totalMinutes,
  totalSeconds,
  isSameInstant,
  isReversed,
  parseDateOnly,
  parseDateTimeLocal,
  formatDateOnly,
  formatDateTimeLocal,
  type Granularity,
} from '@/utils/dateDuration'

definePageMeta({ layout: 'tool' })

const tool = getTool('datetime-duration')!

const GRANULARITY_OPTIONS = [
  { value: 'date', label: 'Date only' },
  { value: 'datetime', label: 'Date & time' },
]

const granularity = ref<Granularity>('date')
const startText = ref('')
const endText = ref('')

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
  const end = start + 7 * 86_400_000
  startText.value = formatDateOnly(start)
  endText.value = formatDateOnly(end)
  ready.value = true
})

function setGranularity(next: string) {
  const nextGranularity = next as Granularity
  if (nextGranularity === granularity.value) return

  if (nextGranularity === 'date') {
    const startMs = parseDateTimeLocal(startText.value)
    const endMs = parseDateTimeLocal(endText.value)
    startText.value = startMs === null ? '' : formatDateOnly(startMs)
    endText.value = endMs === null ? '' : formatDateOnly(endMs)
  } else {
    const startMs = parseDateOnly(startText.value)
    const endMs = parseDateOnly(endText.value)
    startText.value = startMs === null ? '' : formatDateTimeLocal(startMs)
    endText.value = endMs === null ? '' : formatDateTimeLocal(endMs)
  }
  granularity.value = nextGranularity
}

function swap() {
  const start = startText.value
  startText.value = endText.value
  endText.value = start
}

const startMs = computed(() =>
  granularity.value === 'date'
    ? parseDateOnly(startText.value)
    : parseDateTimeLocal(startText.value),
)
const endMs = computed(() =>
  granularity.value === 'date' ? parseDateOnly(endText.value) : parseDateTimeLocal(endText.value),
)

const isEmpty = computed(() => startMs.value === null || endMs.value === null)

const sameInstant = computed(() => !isEmpty.value && isSameInstant(startMs.value!, endMs.value!))
const reversed = computed(() => !isEmpty.value && isReversed(startMs.value!, endMs.value!))

const durationLabel = computed(() => {
  if (isEmpty.value) return ''
  if (sameInstant.value) return granularity.value === 'date' ? 'Same day' : 'Same moment'
  return formatCalendarBreakdown(calendarBreakdown(startMs.value!, endMs.value!))
})

const durationCaption = computed(() =>
  reversed.value ? 'End is before start — showing the span between them.' : '',
)

const totalDaysValue = computed(() => (isEmpty.value ? 0 : totalDays(startMs.value!, endMs.value!)))
const totalDaysLabel = computed(() => totalDaysValue.value.toLocaleString())

interface AlsoEqualsRow {
  id: string
  label: string
  value: string
}

const alsoEqualsRows = computed<AlsoEqualsRow[]>(() => {
  if (isEmpty.value) return []
  const a = startMs.value!
  const b = endMs.value!
  const rows: AlsoEqualsRow[] = [
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
    {
      id: 'years',
      label: 'Years (approx.)',
      value: totalYearsApprox(a, b).toLocaleString(undefined, { maximumFractionDigits: 2 }),
    },
  ]
  if (granularity.value === 'datetime') {
    rows.push(
      {
        id: 'hours',
        label: 'Hours',
        value: totalHours(a, b).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      },
      {
        id: 'minutes',
        label: 'Minutes',
        value: totalMinutes(a, b).toLocaleString(undefined, { maximumFractionDigits: 0 }),
      },
      {
        id: 'seconds',
        label: 'Seconds',
        value: totalSeconds(a, b).toLocaleString(undefined, { maximumFractionDigits: 0 }),
      },
    )
  }
  return rows
})

const summaryText = computed(() => {
  if (isEmpty.value) return ''
  const lines = [`Duration: ${durationLabel.value}`, `Total days: ${totalDaysLabel.value}`]
  for (const row of alsoEqualsRows.value) {
    lines.push(`${row.label}: ${row.value}`)
  }
  return lines.join('\n')
})

const { copy: copySummary, copied: summaryCopied } = useCopy()
const { copy: copyRow } = useCopy()
const copiedRow = ref<string | null>(null)

async function copyAlsoEqualsRow(row: AlsoEqualsRow) {
  await copyRow(row.value)
  copiedRow.value = row.id
}
</script>

<template>
  <ToolPage :tool="tool">
    <div class="dd">
      <template v-if="!ready">
        <Skeleton variant="rect" width="100%" height="40px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        <Skeleton variant="rect" width="100%" height="240px" radius="10px" />
      </template>

      <template v-else>
        <SegmentedControl
          :model-value="granularity"
          :options="GRANULARITY_OPTIONS"
          aria-label="Granularity"
          @update:model-value="setGranularity"
        />

        <div class="dd__inputs">
          <Field label="Start" class="dd__field">
            <Input v-model="startText" :type="granularity === 'date' ? 'date' : 'datetime-local'" />
          </Field>
          <IconButton aria-label="Swap start and end dates" class="dd__swap" @click="swap">
            <Icon :name="UI_ICON.swapVertical" size="16" />
          </IconButton>
          <Field label="End" class="dd__field">
            <Input v-model="endText" :type="granularity === 'date' ? 'date' : 'datetime-local'" />
          </Field>
        </div>

        <!--
          live="false": native date/datetime-local inputs fire input/change per
          keystroke as the user types into individual segments (day/month/year,
          hour/minute), recomputing the whole panel on every keystroke — the
          same case unix-timestamp.vue and dev/cron.vue already handle this way,
          not the ticking-clock case.
        -->
        <OutputPanel
          label="Duration"
          :empty="isEmpty"
          :live="false"
          empty-title="Pick both dates"
          empty-description="Enter a start and end date to see the duration between them."
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

          <StatGroup :columns="2">
            <Stat label="Duration" :value="durationLabel" :caption="durationCaption" />
            <Stat label="Total days" :value="totalDaysLabel" />
          </StatGroup>
        </OutputPanel>

        <OutputPanel
          label="Also equals"
          :empty="isEmpty"
          :live="false"
          empty-title="Pick both dates"
          empty-description="Enter a start and end date to see the duration between them."
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
              <TableRow v-for="row in alsoEqualsRows" :key="row.id">
                <TableCell>{{ row.label }}</TableCell>
                <TableCell class="dd__mono">{{ row.value }}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    :aria-label="`Copy ${row.label}`"
                    @click="copyAlsoEqualsRow(row)"
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
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.dd {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.dd__inputs {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}
.dd__field {
  flex: 1;
}
.dd__swap {
  flex-shrink: 0;
  margin-bottom: 2px;
}
.dd__mono {
  font-family: var(--font-mono);
}
</style>
