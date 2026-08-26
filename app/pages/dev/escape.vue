<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { getTool } from '@/lib/tools/registry'
import { encodeHtml, decodeHtml } from '@/utils/htmlEntities'
import { escapeSql, unescapeSql } from '@/utils/sqlEscape'

definePageMeta({ layout: 'tool' })

const tool = getTool('dev-escape')!

type Format = 'json' | 'html' | 'sql'
type Mode = 'escape' | 'unescape'

const format = ref<Format>('json')
const mode = ref<Mode>('escape')
const input = ref('')

const formatOptions = [
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'sql', label: 'SQL' },
]
const modeOptions = [
  { value: 'escape', label: 'Escape' },
  { value: 'unescape', label: 'Unescape' },
]

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const result = computed<{ output: string; error: string | null }>(() => {
  if (format.value === 'html') {
    const output = mode.value === 'escape' ? encodeHtml(input.value) : decodeHtml(input.value)
    return { output, error: null }
  }

  if (format.value === 'sql') {
    const output = mode.value === 'escape' ? escapeSql(input.value) : unescapeSql(input.value)
    return { output, error: null }
  }

  if (mode.value === 'escape') {
    return { output: JSON.stringify(input.value), error: null }
  }
  try {
    const parsed = JSON.parse(input.value)
    if (typeof parsed !== 'string') {
      return { output: '', error: 'Input must be a JSON string literal, e.g. "hello".' }
    }
    return { output: parsed, error: null }
  } catch (err) {
    return {
      output: '',
      error: err instanceof Error ? err.message : 'Invalid JSON string literal.',
    }
  }
})

const output = computed(() => result.value.output)
const errorText = computed(() => result.value.error)

const formatLabel: Record<Format, string> = {
  json: 'JSON string',
  html: 'HTML entities',
  sql: 'SQL literal',
}

const inputLabel = computed(() => (mode.value === 'escape' ? 'Text' : formatLabel[format.value]))
const outputLabel = computed(() => (mode.value === 'escape' ? formatLabel[format.value] : 'Text'))

const codeLanguage = computed(() => (mode.value === 'escape' ? format.value : 'text'))
</script>

<template>
  <ToolPage :tool="tool">
    <TextWorkbench
      v-model="input"
      :output="output"
      :error="errorText"
      :ready="ready"
      :input-invalid="!!errorText"
      :input-label="inputLabel"
      :output-label="outputLabel"
      code-output
      :language="codeLanguage"
      download-name="escaped.txt"
      empty-description="Enter text to escape, or an escaped string to unescape."
    >
      <template #controls>
        <Field label="Format" class="de-field">
          <Select v-model="format" :options="formatOptions" />
        </Field>
        <Field label="Mode" class="de-field">
          <SegmentedControl v-model="mode" :options="modeOptions" />
        </Field>
        <NuxtLink v-if="format === 'html'" to="/encode/html" class="de-html-link"
          >Need more HTML entity control? Use the HTML Entity Encoder</NuxtLink
        >
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.de-field {
  min-width: 200px;
}
.de-html-link {
  align-self: center;
  font-size: 0.8125rem;
  color: var(--text-brand);
  text-decoration: none;
}
.de-html-link:hover {
  text-decoration: underline;
}
</style>
