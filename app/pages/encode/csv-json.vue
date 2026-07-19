<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getTool } from '@/lib/tools/registry'
import { csvToJson, jsonToCsv } from '@/utils/csvJson'

definePageMeta({ layout: 'tool' })

const tool = getTool('encode-csv-json')!

type Direction = 'csv2json' | 'json2csv'
const direction = ref<Direction>('csv2json')
const directionOptions = [
  { value: 'csv2json', label: 'CSV → JSON' },
  { value: 'json2csv', label: 'JSON → CSV' },
]
const delimiter = ref(',')
const delimiterOptions = [
  { value: ',', label: 'Comma' },
  { value: ';', label: 'Semicolon' },
  { value: '\t', label: 'Tab' },
]
const header = ref(true)
const input = ref('')

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const placeholder = computed(() =>
  direction.value === 'csv2json' ? 'name,age\nAlice,30' : '[{ "name": "Alice", "age": 30 }]',
)

const result = computed(() => {
  if (input.value.trim() === '') return { output: '', error: null as string | null }
  try {
    const output =
      direction.value === 'csv2json'
        ? csvToJson(input.value, { delimiter: delimiter.value, header: header.value })
        : jsonToCsv(input.value, { delimiter: delimiter.value })
    return { output, error: null }
  } catch (e) {
    return { output: '', error: e instanceof Error ? e.message : 'Conversion failed' }
  }
})
</script>

<template>
  <ToolPage :tool="tool">
    <TextWorkbench
      v-model="input"
      :output="result.output"
      :error="result.error"
      :ready="ready"
      :input-invalid="!!result.error"
      :input-label="direction === 'csv2json' ? 'CSV' : 'JSON'"
      :output-label="direction === 'csv2json' ? 'JSON' : 'CSV'"
      :input-placeholder="placeholder"
      mono
      :download-name="direction === 'csv2json' ? 'data.json' : 'data.csv'"
      :download-mime="
        direction === 'csv2json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8'
      "
      empty-description="Paste CSV or a JSON array to convert between the two."
    >
      <template #controls>
        <Field label="Direction">
          <SegmentedControl v-model="direction" :options="directionOptions" />
        </Field>
        <Field label="Delimiter" class="cj-delim">
          <Select v-model="delimiter" :options="delimiterOptions" />
        </Field>
        <Switch
          v-if="direction === 'csv2json'"
          v-model="header"
          label="First row is header"
          class="cj-switch"
        />
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.cj-delim {
  min-width: 150px;
}
.cj-switch {
  padding-bottom: 0.5rem;
}
</style>
