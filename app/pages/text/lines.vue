<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getTool } from '@/lib/tools/registry'
import { transformLines, type LineSort } from '@/utils/lineTools'

definePageMeta({ layout: 'tool' })

const tool = getTool('text-lines')!

const input = ref('')
const sort = ref<LineSort>('none')
const dedupe = ref(false)
const removeEmpty = ref(false)
const trim = ref(false)
const ignoreCase = ref(false)

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const sortOptions = [
  { value: 'none', label: 'Keep order' },
  { value: 'asc', label: 'Sort A → Z' },
  { value: 'desc', label: 'Sort Z → A' },
  { value: 'length', label: 'Sort by length' },
  { value: 'reverse', label: 'Reverse' },
  { value: 'shuffle', label: 'Shuffle' },
]

const result = computed(() =>
  transformLines(input.value, {
    sort: sort.value,
    dedupe: dedupe.value,
    removeEmpty: removeEmpty.value,
    trim: trim.value,
    ignoreCase: ignoreCase.value,
  }),
)
</script>

<template>
  <ToolPage :tool="tool">
    <TextWorkbench
      v-model="input"
      :output="result.text"
      :ready="ready"
      input-label="Lines"
      output-label="Result"
      input-placeholder="One item per line…"
      empty-description="Paste a list of lines to sort, dedupe, or clean them up."
      download-name="lines.txt"
    >
      <template #controls>
        <Field label="Order" class="lines-sort">
          <Select v-model="sort" :options="sortOptions" />
        </Field>
        <div class="lines-switches">
          <Switch v-model="dedupe" label="Remove duplicates" />
          <Switch v-model="removeEmpty" label="Remove empty" />
          <Switch v-model="trim" label="Trim whitespace" />
          <Switch v-model="ignoreCase" label="Ignore case" />
        </div>
      </template>

      <template #actions>
        <span v-if="result.removed > 0" class="lines-count">{{ result.removed }} removed</span>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.lines-sort {
  min-width: 180px;
}
.lines-switches {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 0.4rem;
}
.lines-count {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  align-self: center;
}
</style>
