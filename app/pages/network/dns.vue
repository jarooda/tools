<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Progress } from '@/components/ui/progress'
import { Alert } from '@/components/ui/alert'
import { Tag } from '@/components/ui/tag'
import { EmptyState } from '@/components/ui/empty-state'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import type { ResponsiveColumn } from '@/components/ui/responsive-table/ResponsiveTable.vue'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { useDnsLookup } from '@/composables/useDnsLookup'
import { useCopy } from '@/composables/useCopy'
import type { DnsAnswer, DnsRecordType } from '@/utils/dnsLookup'

definePageMeta({ layout: 'tool' })

const tool = getTool('network-dns')!

const RECORD_TYPES: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA']

type TagColor = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'
const RECORD_TYPE_TAG_COLOR: Record<DnsRecordType, TagColor> = {
  A: 'info',
  AAAA: 'info',
  CNAME: 'brand',
  MX: 'warning',
  TXT: 'neutral',
  NS: 'success',
  SOA: 'neutral',
  CAA: 'neutral',
}

const { hostname, recordType, status, answers, error, lookup } = useDnsLookup()

function recordLine(a: DnsAnswer): string {
  return `${a.name} ${a.ttl} IN ${a.type} ${a.data}`
}

function formatTtl(seconds: number): string {
  if (seconds >= 86400) return `${Math.round(seconds / 86400)}d`
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`
  if (seconds >= 60) return `${Math.round(seconds / 60)}m`
  return `${seconds}s`
}

const { copy, copied } = useCopy()
const copiedAll = ref(false)
const copiedRowIndex = ref<number | null>(null)

async function copyAll() {
  copiedAll.value = true
  copiedRowIndex.value = null
  await copy(answers.value.map(recordLine).join('\n'))
}

async function copyRow(index: number) {
  copiedAll.value = false
  copiedRowIndex.value = index
  await copy(recordLine(answers.value[index]!))
}

const COLUMNS: ResponsiveColumn[] = [
  { key: 'type', header: 'Type', primary: true },
  { key: 'name', header: 'Name' },
  { key: 'ttl', header: 'TTL', numeric: true },
  { key: 'data', header: 'Data' },
  { key: 'copy', header: 'Copy' },
]

function asAnswer(row: Record<string, unknown>): DnsAnswer {
  return row as unknown as DnsAnswer
}

const announcement = ref('')

watch(status, (s) => {
  if (s === 'loading') {
    announcement.value = `Looking up ${recordType.value} records for ${hostname.value}…`
  } else if (s === 'done') {
    announcement.value = answers.value.length
      ? `${answers.value.length} ${recordType.value} record${answers.value.length === 1 ? '' : 's'} found for ${hostname.value}.`
      : `No ${recordType.value} records found for ${hostname.value}.`
  } else if (s === 'error') {
    announcement.value = `Lookup failed: ${error.value}.`
  }
})

const recordCountLabel = computed(
  () => `${answers.value.length} record${answers.value.length === 1 ? '' : 's'}`,
)
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <div class="dl">
      <div class="dl__controls">
        <Field label="Hostname" class="dl__hostname-field">
          <Input
            v-model="hostname"
            placeholder="example.com"
            spellcheck="false"
            @keydown.enter="lookup"
          />
        </Field>

        <Field label="Record type" class="dl__type-field">
          <Select v-model="recordType" :options="RECORD_TYPES" />
        </Field>

        <Button
          class="dl__lookup-btn"
          :disabled="!hostname.trim() || status === 'loading'"
          @click="lookup"
        >
          {{ status === 'loading' ? 'Looking up…' : 'Lookup' }}
        </Button>
      </div>

      <Progress v-if="status === 'loading'" indeterminate label="Looking up records…" />

      <template v-else-if="status === 'done' && answers.length > 0">
        <div class="dl__results-header">
          <span>{{ recordCountLabel }}</span>
          <Button variant="ghost" size="sm" @click="copyAll">
            <template #icon>
              <Icon :name="copied && copiedAll ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
            {{ copied && copiedAll ? 'Copied' : 'Copy all' }}
          </Button>
        </div>

        <ResponsiveTable :columns="COLUMNS" :data="answers" :row-key="(_row, i) => i">
          <template #cell-type="{ row }">
            <Tag :color="RECORD_TYPE_TAG_COLOR[asAnswer(row).type as DnsRecordType] ?? 'neutral'">
              {{ asAnswer(row).type }}
            </Tag>
          </template>
          <template #cell-name="{ row }">
            <span class="dl__name">{{ asAnswer(row).name }}</span>
          </template>
          <template #cell-ttl="{ row }">
            <div>{{ asAnswer(row).ttl }}</div>
            <div class="dl__ttl-human">{{ formatTtl(asAnswer(row).ttl) }}</div>
          </template>
          <template #cell-data="{ row }">
            <span class="dl__data">{{ asAnswer(row).data }}</span>
          </template>
          <template #cell-copy="{ row }">
            <IconButton
              variant="ghost"
              size="sm"
              :aria-label="`Copy ${asAnswer(row).type} record for ${asAnswer(row).name}`"
              @click="copyRow(answers.indexOf(asAnswer(row)))"
            >
              <Icon
                :name="
                  copied && copiedRowIndex === answers.indexOf(asAnswer(row))
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
        :title="`No ${recordType} records found`"
        :description="`${hostname} doesn't have any ${recordType} records.`"
      >
        <template #icon><Icon :name="UI_ICON.dns" size="22" /></template>
      </EmptyState>

      <Alert v-else-if="status === 'error'" tone="danger" title="Lookup failed">
        {{ error }}
        <template #action>
          <Button size="sm" @click="lookup">Retry</Button>
        </template>
      </Alert>
    </div>
  </ToolPage>
</template>

<style scoped>
.dl {
  display: flex;
  flex-direction: column;
  gap: var(--gap-loose);
}
.dl__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}
.dl__hostname-field {
  flex: 1;
  min-width: 220px;
}
.dl__type-field {
  flex: 0 0 150px;
  min-width: 130px;
}
.dl__lookup-btn {
  flex: none;
  align-self: flex-end;
}
.dl__results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.dl__name {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  white-space: nowrap;
}
.dl__data {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}
.dl__ttl-human {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

@media (max-width: 640px) {
  .dl__controls {
    flex-direction: column;
  }
  .dl__lookup-btn {
    align-self: stretch;
  }
}
</style>
