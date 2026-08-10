<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Progress } from '@/components/ui/progress'
import { Alert } from '@/components/ui/alert'
import { Tag } from '@/components/ui/tag'
import { Tooltip } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/ui/empty-state'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import type { ResponsiveColumn } from '@/components/ui/responsive-table/ResponsiveTable.vue'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { useHeaderInspector } from '@/composables/useHeaderInspector'
import { useCopy } from '@/composables/useCopy'

definePageMeta({ layout: 'tool' })

const tool = getTool('network-header-inspector')!

const {
  url,
  status,
  statusCode,
  statusText,
  headers,
  redirected,
  finalUrl,
  error,
  errorKind,
  inspect,
} = useHeaderInspector()

const formatInvalid = computed(() => errorKind.value === 'invalid')

const alertTone = computed(() => (errorKind.value === 'rate-limited' ? 'warning' : 'danger'))

const SECURITY_HEADERS = new Set([
  'strict-transport-security',
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
])

function isSecurityHeader(name: string): boolean {
  return SECURITY_HEADERS.has(name.toLowerCase())
}

function isSetCookie(name: string): boolean {
  return name.toLowerCase() === 'set-cookie'
}

const SET_COOKIE_TRUNCATE_LENGTH = 40
const LONG_VALUE_TRUNCATE_LENGTH = 150

function truncatedValue(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}

function isLongValue(value: string): boolean {
  return value.length > LONG_VALUE_TRUNCATE_LENGTH
}

const statusClass = computed(() => {
  const code = statusCode.value
  if (code == null) return ''
  const group = Math.floor(code / 100)
  if (group === 2) return 'hi__status--success'
  if (group === 3) return 'hi__status--info'
  if (group === 4) return 'hi__status--warning'
  if (group === 5) return 'hi__status--danger'
  return ''
})

const COLUMNS: ResponsiveColumn[] = [
  { key: 'name', header: 'Header', primary: true },
  { key: 'value', header: 'Value' },
  { key: 'copy', header: 'Copy' },
]

function asHeader(row: Record<string, unknown>): { name: string; value: string } {
  return row as unknown as { name: string; value: string }
}

const { copy: copyAll, copied: copiedAll } = useCopy()
const { copy: copyRow, copied: copiedRow } = useCopy()
const copiedRowIndex = ref<number | null>(null)

async function handleCopyAll() {
  await copyAll(headers.value.map((h) => `${h.name}: ${h.value}`).join('\n'))
}

async function handleCopyRow(index: number) {
  copiedRowIndex.value = index
  await copyRow(headers.value[index]!.value)
}

const announcement = ref('')

watch(status, (s) => {
  if (s === 'loading') {
    announcement.value = `Fetching headers for ${url.value}…`
  } else if (s === 'done') {
    const redirectPart =
      redirected.value && finalUrl.value ? ` Redirected to ${finalUrl.value}.` : ''
    announcement.value = `${statusCode.value} ${statusText.value}. ${headers.value.length} headers received.${redirectPart}`
  } else if (s === 'error') {
    announcement.value = `Inspection failed: ${error.value}.`
  }
})
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <div class="hi">
      <div class="hi__controls">
        <Field label="URL" class="hi__url-field" :error="formatInvalid ? error || '' : ''">
          <Input
            v-model="url"
            placeholder="https://example.com"
            :invalid="formatInvalid"
            spellcheck="false"
            @keydown.enter="inspect"
          />
        </Field>

        <Button
          class="hi__inspect-btn"
          :disabled="!url.trim() || status === 'loading'"
          @click="inspect"
        >
          {{ status === 'loading' ? 'Inspecting…' : 'Inspect' }}
        </Button>
      </div>

      <Progress v-if="status === 'loading'" indeterminate label="Fetching response headers…" />

      <template v-else-if="status === 'done' && headers.length > 0">
        <div class="hi__summary">
          <span class="hi__status" :class="statusClass">{{ statusCode }} {{ statusText }}</span>
          <p v-if="redirected && finalUrl" class="hi__redirect">Redirected to {{ finalUrl }}</p>
        </div>

        <div class="hi__results-header">
          <span>{{ headers.length }} headers</span>
          <Button variant="ghost" size="sm" @click="handleCopyAll">
            <template #icon>
              <Icon :name="copiedAll ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
            {{ copiedAll ? 'Copied' : 'Copy all' }}
          </Button>
        </div>

        <ResponsiveTable :columns="COLUMNS" :data="headers" :row-key="(_row, i) => i">
          <template #cell-name="{ row }">
            <span class="hi__name">
              {{ asHeader(row).name }}
              <Tag v-if="isSecurityHeader(asHeader(row).name)" color="info">
                <template #icon><Icon :name="UI_ICON.lock" size="12" /></template>
                Security
              </Tag>
            </span>
          </template>
          <template #cell-value="{ row }">
            <Tooltip
              v-if="isSetCookie(asHeader(row).name)"
              content="Value hidden — use copy to get the full header"
            >
              <span class="hi__value">{{
                truncatedValue(asHeader(row).value, SET_COOKIE_TRUNCATE_LENGTH)
              }}</span>
            </Tooltip>
            <Tooltip
              v-else-if="isLongValue(asHeader(row).value)"
              content="Value truncated — use copy to get the full header"
            >
              <span class="hi__value">{{
                truncatedValue(asHeader(row).value, LONG_VALUE_TRUNCATE_LENGTH)
              }}</span>
            </Tooltip>
            <span v-else class="hi__value">{{ asHeader(row).value }}</span>
          </template>
          <template #cell-copy="{ row }">
            <IconButton
              variant="ghost"
              size="sm"
              :aria-label="`Copy value of ${asHeader(row).name}`"
              @click="handleCopyRow(headers.indexOf(asHeader(row)))"
            >
              <Icon
                :name="
                  copiedRow && copiedRowIndex === headers.indexOf(asHeader(row))
                    ? UI_ICON.check
                    : UI_ICON.copy
                "
                size="15"
              />
            </IconButton>
          </template>
        </ResponsiveTable>
      </template>

      <EmptyState
        v-else-if="status === 'done'"
        title="No response headers returned"
        description="The server responded without returning any headers to inspect."
      >
        <template #icon><Icon :name="UI_ICON.httpHeaders" size="22" /></template>
      </EmptyState>

      <Alert
        v-else-if="status === 'error' && !formatInvalid"
        :tone="alertTone"
        title="Inspection failed"
      >
        {{ error }}
        <template #action>
          <Button size="sm" @click="inspect">Retry</Button>
        </template>
      </Alert>
    </div>
  </ToolPage>
</template>

<style scoped>
.hi {
  display: flex;
  flex-direction: column;
  gap: var(--gap-loose);
}
.hi__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}
.hi__url-field {
  flex: 1;
  min-width: 260px;
}
.hi__inspect-btn {
  flex: none;
  align-self: flex-end;
}
.hi__summary {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.hi__status {
  font-family: var(--font-mono);
  font-size: clamp(1.5rem, 5vw, var(--text-4xl));
  font-weight: var(--weight-bold);
  word-break: break-all;
}
.hi__status--success {
  color: var(--success-text);
}
.hi__status--info {
  color: var(--info-text);
}
.hi__status--warning {
  color: var(--warning-text);
}
.hi__status--danger {
  color: var(--danger-text);
}
.hi__redirect {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}
.hi__results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.hi__name {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  white-space: nowrap;
}
.hi__value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .hi__controls {
    flex-direction: column;
  }
  .hi__inspect-btn {
    align-self: stretch;
  }
}
</style>
