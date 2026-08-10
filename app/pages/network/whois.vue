<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert } from '@/components/ui/alert'
import { Tag } from '@/components/ui/tag'
import { EmptyState } from '@/components/ui/empty-state'
import { Divider } from '@/components/ui/divider'
import { Collapsible } from '@/components/ui/collapsible'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import type { ResponsiveColumn } from '@/components/ui/responsive-table/ResponsiveTable.vue'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { useWhoisLookup } from '@/composables/useWhoisLookup'
import { useCopy } from '@/composables/useCopy'

definePageMeta({ layout: 'tool' })

const tool = getTool('network-whois')!

const {
  domain,
  status,
  found,
  registrar,
  statuses,
  nameservers,
  events,
  raw,
  error,
  errorKind,
  lookup,
} = useWhoisLookup()

const alertTone = computed(() => (errorKind.value === 'rate-limited' ? 'warning' : 'danger'))

const EVENT_LABEL: Record<string, string> = {
  registration: 'Registered',
  expiration: 'Expires',
  'last changed': 'Last updated',
  transfer: 'Transferred',
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function humanizeAction(action: string): string {
  return EVENT_LABEL[action] ?? titleCase(action)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const expiryEvent = computed(() => events.value.find((e) => e.action === 'expiration'))

const daysUntilExpiry = computed(() => {
  if (!expiryEvent.value) return null
  const d = new Date(expiryEvent.value.date)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
})

const expiryTag = computed(() => {
  const days = daysUntilExpiry.value
  if (days == null) return null
  if (days < 0) return { color: 'danger' as const, label: 'Expired' }
  if (days <= 30) return { color: 'warning' as const, label: `Expires in ${days} days` }
  if (days <= 90) return { color: 'success' as const, label: `Expires in ${days} days` }
  return null
})

const COLUMNS: ResponsiveColumn[] = [
  { key: 'action', header: 'Event', primary: true },
  { key: 'date', header: 'Date' },
]

function eventAction(row: Record<string, unknown>): string {
  return row.action as string
}
function eventDate(row: Record<string, unknown>): string {
  return row.date as string
}

const { copy: copySummary, copied: copiedSummary } = useCopy()
const { copy: copyRawJson, copied: copiedRaw } = useCopy()

function summaryText(): string {
  const lines = [
    `Domain: ${domain.value}`,
    `Registrar: ${registrar.value ?? '—'}`,
    `Status: ${statuses.value.join(', ')}`,
    `Nameservers: ${nameservers.value.join(', ')}`,
    ...events.value.map((e) => `${humanizeAction(e.action)}: ${e.date}`),
  ]
  return lines.join('\n')
}

async function handleCopySummary() {
  await copySummary(summaryText())
}

async function handleCopyRawJson() {
  await copyRawJson(JSON.stringify(raw.value, null, 2))
}

const announcement = ref('')

watch(status, (s) => {
  if (s === 'loading') {
    announcement.value = `Looking up ${domain.value}…`
  } else if (s === 'done') {
    if (found.value) {
      const expiryPart =
        daysUntilExpiry.value != null
          ? daysUntilExpiry.value < 0
            ? ' Domain has expired.'
            : ` Expires in ${daysUntilExpiry.value} days.`
          : ''
      announcement.value = `Domain found. Registrar ${registrar.value ?? '—'}.${expiryPart}`
    } else {
      announcement.value = `${domain.value} is not registered.`
    }
  } else if (s === 'error') {
    announcement.value = `Lookup failed: ${error.value}.`
  }
})
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <div class="wl">
      <div class="wl__controls">
        <Field label="Domain" class="wl__domain-field">
          <Input
            v-model="domain"
            placeholder="example.com"
            spellcheck="false"
            @keydown.enter="lookup"
          />
        </Field>

        <Button
          class="wl__lookup-btn"
          :disabled="!domain.trim() || status === 'loading'"
          @click="lookup"
        >
          {{ status === 'loading' ? 'Looking up…' : 'Lookup' }}
        </Button>
      </div>

      <p v-if="status !== 'error'" class="wl__caveat">
        Shows registrar, status, nameservers, and key dates only. Registrant contact details are
        typically redacted by registries for privacy (GDPR), so they're not shown here.
      </p>

      <Progress v-if="status === 'loading'" indeterminate label="Looking up domain…" />

      <template v-else-if="status === 'done' && found">
        <div class="wl__summary">
          <span class="wl__domain">{{ domain }}</span>
          <Tag v-if="expiryTag" :color="expiryTag.color">{{ expiryTag.label }}</Tag>
        </div>

        <dl class="wl__facts">
          <div class="wl__row">
            <dt>Registrar</dt>
            <dd>{{ registrar ?? '—' }}</dd>
          </div>
          <div class="wl__row">
            <dt>Status</dt>
            <dd>
              <div v-if="statuses.length" class="wl__chips">
                <Tag v-for="s in statuses" :key="s" color="neutral">{{ s }}</Tag>
              </div>
              <template v-else>—</template>
            </dd>
          </div>
          <div class="wl__row">
            <dt>Nameservers</dt>
            <dd>
              <div v-if="nameservers.length" class="wl__chips">
                <Tag v-for="ns in nameservers" :key="ns" color="info">{{ ns }}</Tag>
              </div>
              <template v-else>—</template>
            </dd>
          </div>
        </dl>

        <Divider label="Timeline" />

        <ResponsiveTable :columns="COLUMNS" :data="events" :row-key="(_row, i) => i">
          <template #cell-action="{ row }">
            {{ humanizeAction(eventAction(row)) }}
          </template>
          <template #cell-date="{ row }">
            <span :title="eventDate(row)">{{ formatDate(eventDate(row)) }}</span>
          </template>
        </ResponsiveTable>

        <Button variant="ghost" class="wl__copy-summary-btn" @click="handleCopySummary">
          <template #icon>
            <Icon :name="copiedSummary ? UI_ICON.check : UI_ICON.copy" size="15" />
          </template>
          {{ copiedSummary ? 'Copied' : 'Copy summary' }}
        </Button>

        <Collapsible variant="bordered" trigger="View raw RDAP JSON">
          <pre class="wl__raw">{{ JSON.stringify(raw, null, 2) }}</pre>
          <Button variant="ghost" size="sm" @click="handleCopyRawJson">
            <template #icon>
              <Icon :name="copiedRaw ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
            {{ copiedRaw ? 'Copied' : 'Copy raw JSON' }}
          </Button>
        </Collapsible>
      </template>

      <EmptyState
        v-else-if="status === 'done'"
        title="Domain not registered"
        :description="`${domain} doesn't have an active registration, or its registry doesn't publish a public RDAP record.`"
      >
        <template #icon><Icon :name="UI_ICON.domain" size="22" /></template>
      </EmptyState>

      <Alert v-else-if="status === 'error'" :tone="alertTone" title="Lookup failed">
        {{ error }}
        <template #action>
          <Button size="sm" @click="lookup">Retry</Button>
        </template>
      </Alert>
    </div>
  </ToolPage>
</template>

<style scoped>
.wl {
  display: flex;
  flex-direction: column;
  gap: var(--gap-loose);
}
.wl__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}
.wl__domain-field {
  flex: 1;
  min-width: 260px;
}
.wl__lookup-btn {
  flex: none;
  align-self: flex-end;
}
.wl__caveat {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}
.wl__summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.wl__domain {
  font-family: var(--font-mono);
  font-size: clamp(1.5rem, 5vw, var(--text-4xl));
  font-weight: var(--weight-bold);
  word-break: break-all;
}
.wl__facts {
  margin: 0;
}
.wl__row {
  display: flex;
  gap: 1rem;
  padding: var(--gap-tight) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.wl__row dt {
  flex: 0 0 130px;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
.wl__row dd {
  flex: 1;
  margin: 0;
  font-size: var(--text-base);
  color: var(--text-primary);
  overflow-wrap: anywhere;
}
.wl__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.wl__copy-summary-btn {
  align-self: flex-start;
}
.wl__raw {
  margin: 0 0 var(--gap-tight);
  padding: var(--pad-card);
  background: var(--surface-sunken);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  overflow-x: auto;
  white-space: pre;
}

@media (max-width: 640px) {
  .wl__controls {
    flex-direction: column;
  }
  .wl__lookup-btn {
    align-self: stretch;
  }
}

@media (max-width: 480px) {
  .wl__row {
    flex-direction: column;
    gap: 0.25rem;
  }
  .wl__row dt {
    flex-basis: auto;
  }
}
</style>
