<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { getTool } from '@/lib/tools/registry'
import { formatXml } from '@/utils/xmlFormat'

definePageMeta({ layout: 'tool' })

const tool = getTool('encode-xml-yaml')!

type Mode = 'xml' | 'yaml2json' | 'json2yaml'
const mode = ref<Mode>('xml')
const modeOptions = [
  { value: 'xml', label: 'Format XML' },
  { value: 'yaml2json', label: 'YAML → JSON' },
  { value: 'json2yaml', label: 'JSON → YAML' },
]

const input = ref('')
const output = ref('')
const error = ref<string | null>(null)
const ready = ref(false)

let yaml: typeof import('js-yaml') | null = null
async function loadYaml() {
  if (!yaml) yaml = await import('js-yaml')
  return yaml
}

async function convert() {
  if (input.value.trim() === '') {
    output.value = ''
    error.value = null
    return
  }
  try {
    if (mode.value === 'xml') {
      output.value = formatXml(input.value)
    } else if (mode.value === 'yaml2json') {
      const y = await loadYaml()
      output.value = JSON.stringify(y.load(input.value), null, 2)
    } else {
      const y = await loadYaml()
      output.value = y.dump(JSON.parse(input.value))
    }
    error.value = null
  } catch (e) {
    output.value = ''
    error.value = e instanceof Error ? e.message : 'Conversion failed'
  }
}

onMounted(async () => {
  await convert()
  ready.value = true
})

watch([input, mode], convert)

const labels = {
  xml: { in: 'XML', out: 'Formatted XML', ph: '<root><item>value</item></root>' },
  yaml2json: { in: 'YAML', out: 'JSON', ph: 'name: toolkit\nitems:\n  - a\n  - b' },
  json2yaml: { in: 'JSON', out: 'YAML', ph: '{ "name": "toolkit", "items": ["a", "b"] }' },
}
</script>

<template>
  <ToolPage :tool="tool">
    <TextWorkbench
      v-model="input"
      :output="output"
      :error="error"
      :ready="ready"
      :input-invalid="!!error"
      :input-label="labels[mode].in"
      :output-label="labels[mode].out"
      :input-placeholder="labels[mode].ph"
      mono
      download-name="output.txt"
      empty-description="Enter data on the left to format or convert it."
    >
      <template #controls>
        <Field label="Operation" class="xy-field">
          <Select v-model="mode" :options="modeOptions" />
        </Field>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.xy-field {
  min-width: 200px;
}
</style>
