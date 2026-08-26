<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Stepper } from '@/components/ui/stepper'
import { Progress } from '@/components/ui/progress'
import { Stat, StatGroup } from '@/components/ui/stat'
import { Alert } from '@/components/ui/alert'
import { UI_ICON, CATEGORY_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { useSpeedTest } from '@/composables/useSpeedTest'

definePageMeta({ layout: 'tool' })

const tool = getTool('network-speed-test')!

const { phase, progress, ping, downloadMbps, uploadMbps, error, failedPhase, start } =
  useSpeedTest()

const STEPS = [
  { label: 'Ping', description: 'Measuring latency' },
  { label: 'Download', description: 'Measuring download speed' },
  { label: 'Upload', description: 'Measuring upload speed' },
]

const stepIndex = computed(() => {
  const activePhase = phase.value === 'error' ? failedPhase.value : phase.value
  switch (activePhase) {
    case 'ping':
      return 0
    case 'download':
      return 1
    case 'upload':
      return 2
    default:
      return 3
  }
})

function formatMbps(v: number | null): string {
  return v == null ? '—' : `${v.toFixed(1)} Mbps`
}
function formatMs(v: number | null): string {
  return v == null ? '—' : `${v} ms`
}

const sparkline = ref<number[]>([])
const MAX_SAMPLES = 30

const liveValue = computed(() =>
  phase.value === 'download'
    ? downloadMbps.value
    : phase.value === 'upload'
      ? uploadMbps.value
      : null,
)

watch(liveValue, (v) => {
  if (v == null) return
  sparkline.value = [...sparkline.value, v].slice(-MAX_SAMPLES)
})

watch(phase, (p, prev) => {
  if (p === 'ping') {
    sparkline.value = []
    announcement.value = 'Measuring latency'
  } else if (p === 'download') {
    sparkline.value = []
    announcement.value =
      prev === 'ping'
        ? `Ping: ${ping.value} ms. Measuring download speed`
        : 'Measuring download speed'
  } else if (p === 'upload') {
    sparkline.value = []
    announcement.value = `Download: ${formatMbps(downloadMbps.value)}. Measuring upload speed`
  } else if (p === 'done') {
    announcement.value = `Test complete. Ping ${ping.value} ms, download ${formatMbps(downloadMbps.value)}, upload ${formatMbps(uploadMbps.value)}.`
  } else if (p === 'error') {
    announcement.value = `Test failed: ${error.value}`
  }
})

const announcement = ref('')
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <EmptyState
      v-if="phase === 'idle'"
      title="Test your connection speed"
      description="An informal check of your connection using a small test payload — not a lab-grade measurement."
    >
      <template #icon><Icon :name="CATEGORY_ICON.network" size="22" /></template>
      <template #actions>
        <Button size="lg" @click="start">
          <template #icon><Icon :name="UI_ICON.play" size="18" /></template>
          Start Test
        </Button>
      </template>
    </EmptyState>

    <div v-else-if="phase === 'error'" class="st">
      <Stepper :steps="STEPS" :active="stepIndex" />
      <Alert tone="danger" title="Test failed">
        {{ error }}
        <template #action>
          <Button size="sm" @click="start">Retry</Button>
        </template>
      </Alert>
    </div>

    <div v-else class="st">
      <Stepper :steps="STEPS" :active="stepIndex" />

      <template v-if="phase === 'ping'">
        <Progress indeterminate label="Measuring latency…" />
      </template>

      <template v-else-if="phase === 'download' || phase === 'upload'">
        <Progress
          :value="progress * 100"
          show-value
          :label="phase === 'download' ? 'Downloading…' : 'Uploading…'"
        />
        <Stat
          :label="phase === 'download' ? 'Download speed' : 'Upload speed'"
          :value="formatMbps(phase === 'download' ? downloadMbps : uploadMbps)"
          :data="sparkline.length > 1 ? sparkline : undefined"
        />
      </template>

      <StatGroup v-else-if="phase === 'done'">
        <Stat label="Ping" :value="formatMs(ping)" />
        <Stat label="Download" :value="formatMbps(downloadMbps)" />
        <Stat label="Upload" :value="formatMbps(uploadMbps)" />
      </StatGroup>

      <Button v-if="phase === 'done'" variant="ghost" @click="start">
        <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
        Test again
      </Button>
    </div>
  </ToolPage>
</template>

<style scoped>
.st {
  display: flex;
  flex-direction: column;
  gap: var(--gap-loose);
}
</style>
