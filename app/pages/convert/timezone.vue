<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { TIME_ZONES, convertZones, type ZonedResult } from '@/utils/timezone'

definePageMeta({ layout: 'tool' })

const tool = getTool('timezone')!

const zoneOptions = TIME_ZONES.map((z) => ({ value: z.id, label: z.label }))

const datetime = ref('') // "YYYY-MM-DDTHH:mm" from <input type="datetime-local">
const fromZone = ref('UTC')

const ready = ref(false)
onMounted(() => {
  // Default to the visitor's local zone (if we ship it) and the current time.
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (TIME_ZONES.some((z) => z.id === local)) fromZone.value = local
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  datetime.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  ready.value = true
})

const results = ref<ZonedResult[]>([])
const empty = ref(false)

watch(
  [datetime, fromZone],
  ([dt, zone]) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(dt)
    if (!m) {
      results.value = []
      empty.value = true
      return
    }
    empty.value = false
    results.value = convertZones(
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      zone,
    ).results
  },
  { immediate: true },
)

const { copy, copied } = useCopy()
const copiedZone = ref<string | null>(null)

async function copyResult(id: string, r: ZonedResult) {
  await copy(`${r.time} · ${r.date} (${r.label})`)
  copiedZone.value = id
}
</script>

<template>
  <ToolPage :tool="tool">
    <div class="tz">
      <!-- Left: the date/time + its zone -->
      <div class="tz__input">
        <Field label="Date & time">
          <Input v-model="datetime" type="datetime-local" />
        </Field>
        <Field label="In time zone">
          <Select v-model="fromZone" :options="zoneOptions" />
        </Field>
      </div>

      <!-- Right: that instant across every zone -->
      <div class="tz__results">
        <span class="tz__results-label">Around the world</span>

        <!-- Loading -->
        <ul v-if="!ready" class="tz__list" aria-hidden="true">
          <li v-for="z in TIME_ZONES" :key="z.id" class="tz__row tz__row--skel">
            <Skeleton variant="text" width="90px" />
            <Skeleton variant="text" width="120px" />
          </li>
        </ul>

        <!-- Empty -->
        <EmptyState
          v-else-if="empty"
          class="tz__empty"
          bordered
          size="sm"
          title="Pick a date & time"
          description="Choose a moment on the left to see it in every zone."
        >
          <template #icon>
            <Icon :name="UI_ICON.emptyInput" size="22" />
          </template>
        </EmptyState>

        <!-- Results -->
        <ul v-else class="tz__list">
          <li
            v-for="r in results"
            :key="r.id"
            class="tz__row"
            :class="{ 'tz__row--source': r.id === fromZone }"
          >
            <div class="tz__row-zone">
              <span class="tz__row-city">{{ r.label }}</span>
              <span class="tz__row-offset">{{ r.offset }}</span>
            </div>
            <div class="tz__row-when">
              <span class="tz__row-time">{{ r.time }}</span>
              <span class="tz__row-date">{{ r.date }}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              :aria-label="`Copy ${r.label} time`"
              @click="copyResult(r.id, r)"
            >
              <template #icon>
                <Icon
                  :name="copied && copiedZone === r.id ? UI_ICON.check : UI_ICON.copy"
                  size="15"
                />
              </template>
              {{ copied && copiedZone === r.id ? 'Copied' : 'Copy' }}
            </Button>
          </li>
        </ul>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.tz {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 20px;
  align-items: start;
}
.tz__input {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.tz__results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.tz__results-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.tz__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.tz__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.5rem 0.5rem 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.tz__row--source {
  border-color: var(--accent-muted, var(--accent));
  background: var(--accent-subtle);
}
.tz__row--skel {
  justify-content: space-between;
}
.tz__empty {
  width: 100%;
}
.tz__row-zone {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}
.tz__row-city {
  font-weight: 600;
  color: var(--text-primary);
}
.tz__row-offset {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
.tz__row-when {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
}
.tz__row-time {
  font-size: 1.1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.tz__row-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .tz {
    grid-template-columns: 1fr;
  }
}
</style>
