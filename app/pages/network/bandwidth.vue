<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Stat } from '@/components/ui/stat'
import { EmptyState } from '@/components/ui/empty-state'
import { getTool } from '@/lib/tools/registry'
import {
  calcDownloadSeconds,
  humanizeDuration,
  type SizeUnit,
  type SpeedUnit,
} from '@/utils/bandwidth'

definePageMeta({ layout: 'tool' })

const tool = getTool('network-bandwidth')!

const sizeValue = ref<number | null>(100)
const sizeUnit = ref<SizeUnit>('MB')
const speedValue = ref<number | null>(100)
const speedUnit = ref<SpeedUnit>('Mbps')

const SIZE_UNIT_OPTIONS = [
  { value: 'KB', label: 'KB (kilobytes)' },
  { value: 'MB', label: 'MB (megabytes)' },
  { value: 'GB', label: 'GB (gigabytes)' },
  { value: 'TB', label: 'TB (terabytes)' },
]

const SPEED_UNIT_OPTIONS = [
  { value: 'Kbps', label: 'Kbps (kilobits/sec)' },
  { value: 'Mbps', label: 'Mbps (megabits/sec)' },
  { value: 'Gbps', label: 'Gbps (gigabits/sec)' },
]

const PRESETS: { label: string; speedValue: number; speedUnit: SpeedUnit }[] = [
  { label: '56K Dial-up', speedValue: 56, speedUnit: 'Kbps' },
  { label: '10 Mbps', speedValue: 10, speedUnit: 'Mbps' },
  { label: '25 Mbps', speedValue: 25, speedUnit: 'Mbps' },
  { label: '100 Mbps', speedValue: 100, speedUnit: 'Mbps' },
  { label: '1 Gbps', speedValue: 1, speedUnit: 'Gbps' },
]

function applyPreset(preset: (typeof PRESETS)[number]) {
  speedValue.value = preset.speedValue
  speedUnit.value = preset.speedUnit
}

const seconds = computed(() =>
  calcDownloadSeconds(sizeValue.value ?? 0, sizeUnit.value, speedValue.value ?? 0, speedUnit.value),
)

const resultValue = computed(() => (seconds.value != null ? humanizeDuration(seconds.value) : ''))
const resultCaption = computed(() =>
  seconds.value != null ? `${seconds.value.toFixed(1)} seconds` : '',
)

const EMPTY_DESCRIPTION = 'Enter a file size and connection speed to estimate download time.'

// Debounced so a screen reader announcement doesn't fire on every keystroke
// while typing — only once the user pauses.
const announcement = ref('')
let announceTimer: ReturnType<typeof setTimeout> | undefined

watch(
  seconds,
  (s) => {
    if (announceTimer) clearTimeout(announceTimer)
    announceTimer = setTimeout(() => {
      announcement.value =
        s != null ? `${humanizeDuration(s)}, ${s.toFixed(1)} seconds` : EMPTY_DESCRIPTION
    }, 600)
  },
  { immediate: true },
)

onUnmounted(() => {
  if (announceTimer) clearTimeout(announceTimer)
})
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <div class="bw">
      <div class="bw__row">
        <Field label="File size" class="bw__value">
          <NumberInput v-model="sizeValue" :min="0" />
        </Field>
        <Field label="Size unit" class="bw__unit">
          <Select v-model="sizeUnit" :options="SIZE_UNIT_OPTIONS" />
        </Field>
      </div>

      <div class="bw__row">
        <Field label="Connection speed" class="bw__value">
          <NumberInput v-model="speedValue" :min="0" />
        </Field>
        <Field label="Speed unit" class="bw__unit">
          <Select v-model="speedUnit" :options="SPEED_UNIT_OPTIONS" />
        </Field>
      </div>

      <p class="bw__caveat">
        Connection speeds are in bits per second; file sizes are in bytes. We convert automatically.
      </p>

      <div class="bw__presets">
        <Button
          v-for="preset in PRESETS"
          :key="preset.label"
          variant="ghost"
          size="sm"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </Button>
      </div>

      <Stat
        v-if="seconds != null"
        label="Estimated time"
        :value="resultValue"
        :caption="resultCaption"
      />
      <EmptyState v-else :description="EMPTY_DESCRIPTION" />

      <p class="bw__caveat">
        Theoretical best-case at 100% of rated speed — actual downloads are typically slower due to
        network overhead, congestion, and other traffic.
      </p>
    </div>
  </ToolPage>
</template>

<style scoped>
.bw {
  display: flex;
  flex-direction: column;
  gap: var(--gap-loose);
}
.bw__row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}
.bw__value {
  flex: 1;
  min-width: 160px;
}
.bw__unit {
  flex: 1;
  min-width: 200px;
}
.bw__caveat {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}
.bw__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .bw__row {
    flex-direction: column;
  }
}
</style>
