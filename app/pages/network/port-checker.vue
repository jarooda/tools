<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert } from '@/components/ui/alert'
import { Tag } from '@/components/ui/tag'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import type { ResponsiveColumn } from '@/components/ui/responsive-table/ResponsiveTable.vue'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { usePortCheck, type PortCheckAddressResult } from '@/composables/usePortCheck'
import { stripToHostname } from '@/utils/normalizeHostInput'

definePageMeta({ layout: 'tool' })

const tool = getTool('network-port-checker')!

const { host, port, status, results, error, errorKind, check } = usePortCheck()

function normalizeHost() {
  host.value = stripToHostname(host.value)
}

function handleHostPaste() {
  setTimeout(normalizeHost, 0)
}

const PORT_OPTIONS = [
  { value: '21', label: '21 (FTP)' },
  { value: '22', label: '22 (SSH)' },
  { value: '23', label: '23 (Telnet)' },
  { value: '25', label: '25 (SMTP)' },
  { value: '53', label: '53 (DNS)' },
  { value: '80', label: '80 (HTTP)' },
  { value: '110', label: '110 (POP3)' },
  { value: '143', label: '143 (IMAP)' },
  { value: '443', label: '443 (HTTPS)' },
  { value: '587', label: '587 (SMTP Submission)' },
  { value: '993', label: '993 (IMAPS)' },
  { value: '995', label: '995 (POP3S)' },
  { value: '3306', label: '3306 (MySQL)' },
  { value: '3389', label: '3389 (RDP)' },
  { value: '5432', label: '5432 (PostgreSQL)' },
  { value: '6379', label: '6379 (Redis)' },
  { value: '8080', label: '8080 (HTTP Alt)' },
  { value: '27017', label: '27017 (MongoDB)' },
]

const portString = computed({
  get: () => String(port.value),
  set: (v: string) => (port.value = Number.parseInt(v, 10)),
})

const formatInvalid = computed(() => errorKind.value === 'invalid')

const alertTone = computed(() => (errorKind.value === 'rate-limited' ? 'warning' : 'danger'))

const RESULT_META = {
  open: {
    color: 'success' as const,
    label: 'Open',
    icon: UI_ICON.portOpen,
  },
  closed: {
    color: 'neutral' as const,
    label: 'Closed',
    icon: UI_ICON.portClosed,
  },
  timeout: {
    color: 'warning' as const,
    label: 'Timeout',
    icon: UI_ICON.portTimeout,
  },
}

const COLUMNS: ResponsiveColumn[] = [
  { key: 'ip', header: 'Resolved IP', primary: true },
  { key: 'result', header: 'Result' },
]

function asAddressResult(row: Record<string, unknown>): PortCheckAddressResult {
  return row as unknown as PortCheckAddressResult
}

const announcement = ref('')

watch(status, (s) => {
  if (s === 'checking') {
    announcement.value = `Checking port ${port.value} on ${host.value}…`
  } else if (s === 'done' && results.value.length) {
    const counts = results.value.reduce(
      (acc, r) => {
        acc[r.result]++
        return acc
      },
      { open: 0, closed: 0, timeout: 0 },
    )
    const summary = (['open', 'closed', 'timeout'] as const)
      .filter((k) => counts[k] > 0)
      .map((k) => `${counts[k]} ${k}`)
      .join(', ')
    announcement.value = `Checked ${results.value.length} address${results.value.length === 1 ? '' : 'es'} for ${host.value}: ${summary}.`
  } else if (s === 'error') {
    announcement.value = `Check failed: ${error.value}.`
  }
})
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <div class="pc">
      <div class="pc__controls">
        <Field
          label="Host"
          class="pc__host-field"
          :hint="formatInvalid ? undefined : 'Hostname or IP, e.g. example.com'"
          :error="formatInvalid ? error || '' : ''"
        >
          <Input
            v-model="host"
            placeholder="example.com"
            :invalid="formatInvalid"
            spellcheck="false"
            @keydown.enter="check"
            @paste="handleHostPaste"
            @blur="normalizeHost"
          />
        </Field>

        <Field label="Port" class="pc__port-field">
          <Select v-model="portString" :options="PORT_OPTIONS" />
        </Field>

        <div class="pc__check-field">
          <span class="pc__check-label-spacer" aria-hidden="true">Check</span>
          <Button
            class="pc__check-btn"
            :disabled="!host.trim() || status === 'checking'"
            @click="check"
          >
            {{ status === 'checking' ? 'Checking…' : 'Check' }}
          </Button>
        </div>
      </div>

      <p v-if="status !== 'error' || formatInvalid" class="pc__caveat">
        Attempts a direct TCP connection from our server — many hosts and firewalls silently drop or
        rate-limit unsolicited connections, so a "closed" or "timeout" result isn't a guarantee the
        port is actually unreachable. This is a best-effort check, not a full port scan.
      </p>

      <template v-if="status === 'checking'">
        <Progress indeterminate label="Checking port…" />
      </template>

      <template v-else-if="status === 'done' && results.length > 0">
        <p class="pc__lead-in">
          {{ host }} resolves to {{ results.length }} address{{ results.length === 1 ? '' : 'es' }}
        </p>
        <ResponsiveTable :columns="COLUMNS" :data="results" :row-key="(_row, i) => i">
          <template #cell-ip="{ row }">
            <span class="pc__ip">{{ asAddressResult(row).ip }}</span>
          </template>
          <template #cell-result="{ row }">
            <Tag :color="RESULT_META[asAddressResult(row).result].color">
              <template #icon>
                <Icon :name="RESULT_META[asAddressResult(row).result].icon" size="15" />
              </template>
              {{ RESULT_META[asAddressResult(row).result].label }}
            </Tag>
          </template>
        </ResponsiveTable>
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
.pc__host-field {
  flex: 1;
  min-width: 260px;
}
.pc__port-field {
  flex: 0 0 220px;
}
.pc__check-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: none;
  width: auto;
}
.pc__check-label-spacer {
  visibility: hidden;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-tight);
}
.pc__check-btn {
  flex: none;
}
.pc__caveat,
.pc__lead-in {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}
.pc__ip {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

@media (max-width: 640px) {
  .pc__controls {
    flex-direction: column;
  }
  .pc__port-field {
    flex-basis: auto;
  }
  .pc__check-label-spacer {
    display: none;
  }
  .pc__check-field {
    width: 100%;
  }
  .pc__check-btn {
    width: 100%;
  }
}
</style>
