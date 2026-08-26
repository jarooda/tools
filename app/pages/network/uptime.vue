<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert } from '@/components/ui/alert'
import { Tag } from '@/components/ui/tag'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { useUptimeCheck } from '@/composables/useUptimeCheck'

definePageMeta({ layout: 'tool' })

const tool = getTool('network-uptime')!

const { url, status, up, statusCode, statusText, responseMs, error, errorKind, check } =
  useUptimeCheck()

const formatInvalid = computed(() => errorKind.value === 'invalid')

const alertTone = computed(() => (errorKind.value === 'rate-limited' ? 'warning' : 'danger'))

const hostname = computed(() => {
  try {
    return new URL(/^https?:\/\//i.test(url.value) ? url.value : `https://${url.value}`).hostname
  } catch {
    return url.value
  }
})

const resultText = computed(() => {
  if (up.value === true) {
    return `${statusCode.value} ${statusText.value} · ${Math.round(responseMs.value ?? 0)}ms`
  }
  if (up.value === false) {
    return `${hostname.value} did not respond — it may be offline, unreachable, or blocking automated requests.`
  }
  return ''
})

const announcement = ref('')

watch(status, (s) => {
  if (s === 'loading') {
    announcement.value = `Checking ${url.value}…`
  } else if (s === 'done' && up.value === true) {
    announcement.value = `${hostname.value} is up. ${statusCode.value} ${statusText.value}, ${Math.round(responseMs.value ?? 0)}ms.`
  } else if (s === 'done' && up.value === false) {
    announcement.value = `${hostname.value} is down — did not respond.`
  } else if (s === 'error') {
    announcement.value = `Check failed: ${error.value}.`
  }
})
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <div class="uc">
      <div class="uc__controls">
        <Field label="URL" class="uc__url-field" :error="formatInvalid ? error || '' : ''">
          <Input
            v-model="url"
            placeholder="https://example.com"
            :invalid="formatInvalid"
            spellcheck="false"
            @keydown.enter="check"
          />
        </Field>

        <Button
          class="uc__check-btn"
          :disabled="!url.trim() || status === 'loading'"
          @click="check"
        >
          {{ status === 'loading' ? 'Checking…' : 'Check' }}
        </Button>
      </div>

      <p v-if="status !== 'error' || formatInvalid" class="uc__caveat">
        A single check from one moment and one location — not continuous monitoring. A brief outage,
        regional block, or maintenance window can cause a false "down" result.
      </p>

      <template v-if="status === 'loading'">
        <Progress indeterminate label="Checking…" />
      </template>

      <template v-else-if="status === 'done' && up !== null">
        <div class="uc__result">
          <Tag :color="up ? 'success' : 'danger'">
            <template #icon
              ><Icon :name="up ? UI_ICON.siteUp : UI_ICON.siteDown" size="15"
            /></template>
            {{ up ? 'Up' : 'Down' }}
          </Tag>
          <p class="uc__result-text">{{ resultText }}</p>
        </div>
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
.uc {
  display: flex;
  flex-direction: column;
  gap: var(--gap-loose);
}
.uc__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}
.uc__url-field {
  flex: 1;
  min-width: 260px;
}
.uc__check-btn {
  flex: none;
  align-self: flex-end;
}
.uc__caveat {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}
.uc__result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.uc__result-text {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-base);
}

@media (max-width: 640px) {
  .uc__controls {
    flex-direction: column;
  }
  .uc__check-btn {
    align-self: stretch;
  }
}
</style>
