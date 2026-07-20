<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { getTool } from '@/lib/tools/registry'
import { formatJson, minifyJson, type JsonIndent } from '@/utils/jsonFormat'

definePageMeta({ layout: 'tool' })

const tool = getTool('encode-json')!

const input = ref('')
const mode = ref<'pretty' | 'minify'>('pretty')
const indent = ref<string>('2')

const modeOptions = [
  { value: 'pretty', label: 'Beautify' },
  { value: 'minify', label: 'Minify' },
]
const indentOptions = [
  { value: '2', label: '2 spaces' },
  { value: '4', label: '4 spaces' },
  { value: 'tab', label: 'Tabs' },
]

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const result = computed(() => {
  if (mode.value === 'minify') return minifyJson(input.value)
  const ind: JsonIndent = indent.value === 'tab' ? 'tab' : (Number(indent.value) as 2 | 4)
  return formatJson(input.value, ind)
})

const errorText = computed(() => {
  const err = result.value.error
  if (!err) return null
  return err.line != null ? `${err.message} (line ${err.line}, column ${err.column})` : err.message
})
</script>

<template>
  <ToolPage :tool="tool">
    <TextWorkbench
      v-model="input"
      :output="result.output"
      :error="errorText"
      :ready="ready"
      :input-invalid="!!result.error"
      input-label="JSON"
      output-label="Result"
      input-placeholder='{ "hello": "world" }'
      code-output
      language="json"
      line-numbers
      download-name="formatted.json"
      download-mime="application/json;charset=utf-8"
      empty-description="Paste JSON to format, validate, or minify it."
    >
      <template #controls>
        <Field label="Action">
          <SegmentedControl v-model="mode" :options="modeOptions" />
        </Field>
        <Field v-if="mode === 'pretty'" label="Indent">
          <SegmentedControl v-model="indent" :options="indentOptions" />
        </Field>
      </template>

      <template #actions>
        <span v-if="!result.error && result.output" class="json-ok">Valid</span>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.json-ok {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--success-text, var(--success));
  align-self: center;
  padding-right: 0.25rem;
}
</style>
