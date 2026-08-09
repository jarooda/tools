<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Stat, StatGroup } from '@/components/ui/stat'
import { Alert } from '@/components/ui/alert'
import { getTool } from '@/lib/tools/registry'
import { usePingCheck } from '@/composables/usePingCheck'

definePageMeta({ layout: 'tool' })

const tool = getTool('network-ping')!

const { target, status, samples, stats, error, errorKind, check } = usePingCheck()

const formatInvalid = computed(() => errorKind.value === 'invalid')

const latestSample = computed(() =>
  samples.value.length ? `${samples.value[samples.value.length - 1]} ms` : '—',
)

const alertTone = computed(() => (errorKind.value === 'rate-limited' ? 'warning' : 'danger'))

const announcement = ref('')

watch(status, (s) => {
  if (s === 'checking') {
    announcement.value = 'Pinging…'
  } else if (s === 'done' && stats.value) {
    announcement.value = `Check complete. Average ${stats.value.avg} ms, min ${stats.value.min} ms, max ${stats.value.max} ms.`
  } else if (s === 'error') {
    announcement.value = `Check failed: ${error.value}`
  }
})
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <div class="pc">
      <div class="pc__controls">
        <Field
          label="Target"
          class="pc__target-field"
          :hint="
            formatInvalid ? undefined : 'Hostname or URL, e.g. google.com or https://example.com'
          "
          :error="formatInvalid ? error || '' : ''"
        >
          <Input
            v-model="target"
            placeholder="google.com"
            :invalid="formatInvalid"
            spellcheck="false"
            @keydown.enter="check"
          />
        </Field>

        <Button
          class="pc__check-btn"
          :disabled="!target.trim() || status === 'checking'"
          @click="check"
        >
          {{ status === 'checking' ? 'Checking…' : 'Check' }}
        </Button>
      </div>

      <p class="pc__caveat">
        Measures HTTP round-trip time to the target's server, not ICMP ping — results may differ
        from a system <code>ping</code> command.
      </p>

      <template v-if="status === 'checking'">
        <Progress indeterminate label="Pinging…" />
        <Stat
          label="Latest RTT"
          :value="latestSample"
          :data="samples.length > 1 ? samples : undefined"
        />
      </template>

      <template v-else-if="status === 'done' && stats">
        <Stat label="Latency over probes" :value="`${stats.avg} ms avg`" :data="samples" />
        <StatGroup>
          <Stat label="Min" :value="`${stats.min} ms`" />
          <Stat label="Max" :value="`${stats.max} ms`" />
          <Stat label="Median" :value="`${stats.median} ms`" />
          <Stat label="Avg" :value="`${stats.avg} ms`" />
        </StatGroup>
      </template>

      <Alert
        v-else-if="status === 'error' && !formatInvalid"
        :tone="alertTone"
        title="Check failed"
      >
        {{ error }}
        <template #action>
          <Button size="sm" @click="check">Retry</Button>
        </template>
      </Alert>
    </div>
  </ToolPage>
</template>

<style scoped>
.pc {
  display: flex;
  flex-direction: column;
  gap: var(--gap-loose);
}
.pc__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}
.pc__target-field {
  flex: 1;
  min-width: 260px;
}
.pc__check-btn {
  flex: none;
  align-self: flex-end;
}
.pc__caveat {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

@media (max-width: 640px) {
  .pc__controls {
    flex-direction: column;
  }
  .pc__check-btn {
    align-self: stretch;
  }
}
</style>
