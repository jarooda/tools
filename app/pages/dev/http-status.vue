<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tag } from '@/components/ui/tag'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Accordion, AccordionItem } from '@/components/ui/accordion'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import type { ResponsiveColumn } from '@/components/ui/responsive-table/ResponsiveTable.vue'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import {
  HTTP_STATUS_CLASS_LABEL,
  httpStatusEntries,
  filterHttpStatusEntries,
  type HttpStatusClass,
  type HttpStatusEntry,
} from '@/utils/httpStatusCodes'

definePageMeta({ layout: 'tool' })

const tool = getTool('dev-http-status')!

const CLASS_ORDER: HttpStatusClass[] = ['1xx', '2xx', '3xx', '4xx', '5xx']
const CLASS_TAG_COLOR: Record<
  HttpStatusClass,
  'info' | 'success' | 'brand' | 'warning' | 'danger'
> = {
  '1xx': 'info',
  '2xx': 'success',
  '3xx': 'brand',
  '4xx': 'warning',
  '5xx': 'danger',
}

const search = ref('')
const selectedClasses = ref<HttpStatusClass[]>([...CLASS_ORDER])

const allSelected = computed(() => selectedClasses.value.length === CLASS_ORDER.length)

function toggleClass(cls: HttpStatusClass) {
  selectedClasses.value = selectedClasses.value.includes(cls)
    ? selectedClasses.value.filter((c) => c !== cls)
    : [...selectedClasses.value, cls]
}

function clearFilters() {
  selectedClasses.value = [...CLASS_ORDER]
}

function clearSearch() {
  search.value = ''
}

const countByClassInSearch = computed(() => {
  const counts: Record<HttpStatusClass, number> = {
    '1xx': 0,
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
  }
  for (const entry of httpStatusEntries) {
    if (filterHttpStatusEntries([entry], search.value, [entry.class]).length > 0) {
      counts[entry.class]++
    }
  }
  return counts
})

const visibleEntries = computed(() =>
  filterHttpStatusEntries(httpStatusEntries, search.value, selectedClasses.value),
)

const sectionsWithEntries = computed(() =>
  CLASS_ORDER.map((cls) => ({
    cls,
    entries: visibleEntries.value.filter((e) => e.class === cls),
  })).filter((section) => section.entries.length > 0),
)

const noResults = computed(() => visibleEntries.value.length === 0)

const { copy, copied } = useCopy()
const copiedCode = ref<number | null>(null)

function copyEntry(code: number, name: string) {
  copiedCode.value = code
  copy(`${code} ${name}`)
}

const COLUMNS: ResponsiveColumn[] = [
  { key: 'code', header: 'Code', numeric: true },
  { key: 'name', header: 'Name', primary: true },
  { key: 'copy', header: 'Copy' },
]

/** ResponsiveTable's `Row` type is a loose `Record<string, unknown>`; narrow it once per cell. */
function asEntry(row: Record<string, unknown>): HttpStatusEntry {
  return row as unknown as HttpStatusEntry
}
</script>

<template>
  <ToolPage :tool="tool">
    <div class="hst">
      <div class="hst__controls">
        <Field label="Search">
          <Input
            v-model="search"
            placeholder="Search by code, name, or keyword…"
            spellcheck="false"
          >
            <template #icon>
              <Icon :name="UI_ICON.search" size="16" />
            </template>
          </Input>
        </Field>

        <div class="hst__chips">
          <Tag
            v-for="cls in CLASS_ORDER"
            :key="cls"
            :selected="selectedClasses.includes(cls)"
            :color="selectedClasses.includes(cls) ? CLASS_TAG_COLOR[cls] : 'neutral'"
            role="button"
            tabindex="0"
            :aria-pressed="selectedClasses.includes(cls)"
            :aria-label="`${cls} ${HTTP_STATUS_CLASS_LABEL[cls]} — ${countByClassInSearch[cls]} matching`"
            @click="toggleClass(cls)"
            @keydown.enter.prevent="toggleClass(cls)"
            @keydown.space.prevent="toggleClass(cls)"
          >
            {{ cls }} {{ HTTP_STATUS_CLASS_LABEL[cls] }} ({{ countByClassInSearch[cls] }})
          </Tag>

          <Button v-if="!allSelected" variant="ghost" size="sm" @click="clearFilters">
            Clear filters
          </Button>
        </div>
      </div>

      <EmptyState
        v-if="noResults"
        bordered
        title="No matching status codes"
        description="Try a different code, name, or keyword."
      >
        <template #icon><Icon :name="UI_ICON.search" size="22" /></template>
        <template #actions>
          <Button v-if="search" variant="secondary" size="sm" @click="clearSearch">
            Clear search
          </Button>
          <Button v-if="!allSelected" variant="secondary" size="sm" @click="clearFilters">
            Clear filters
          </Button>
        </template>
      </EmptyState>

      <Accordion v-else type="multiple" :default-value="sectionsWithEntries.map((s) => s.cls)">
        <AccordionItem
          v-for="section in sectionsWithEntries"
          :key="section.cls"
          :value="section.cls"
          :title="`${section.cls} ${HTTP_STATUS_CLASS_LABEL[section.cls]}`"
        >
          <template #meta>
            <Tag :color="CLASS_TAG_COLOR[section.cls]">{{ section.entries.length }}</Tag>
          </template>

          <ResponsiveTable
            :columns="COLUMNS"
            :data="section.entries"
            :row-key="(row) => asEntry(row).code"
          >
            <template #cell-code="{ row }">
              <code class="hst__code">{{ asEntry(row).code }}</code>
            </template>
            <template #cell-name="{ row }">
              <div class="hst__name">{{ asEntry(row).name }}</div>
              <div class="hst__desc">{{ asEntry(row).description }}</div>
              <div v-if="asEntry(row).note" class="hst__note">{{ asEntry(row).note }}</div>
            </template>
            <template #cell-copy="{ row }">
              <IconButton
                variant="ghost"
                size="sm"
                :aria-label="`Copy ${asEntry(row).code} ${asEntry(row).name}`"
                @click="copyEntry(asEntry(row).code, asEntry(row).name)"
              >
                <Icon
                  :name="copied && copiedCode === asEntry(row).code ? UI_ICON.check : UI_ICON.copy"
                  size="15"
                />
              </IconButton>
            </template>
          </ResponsiveTable>
        </AccordionItem>
      </Accordion>
    </div>
  </ToolPage>
</template>

<style scoped>
.hst {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.hst__controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.hst__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.hst__code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}
.hst__name {
  font-weight: var(--weight-medium);
  color: var(--text-primary);
}
.hst__desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.hst__note {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 0.15rem;
}
</style>
