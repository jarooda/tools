<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { getTool } from '@/lib/tools/registry'
import { formatCode, type CodeLanguage, type CodeIndent } from '@/utils/codeFormat'

definePageMeta({ layout: 'tool' })

const tool = getTool('dev-formatter')!

const input = ref('')
const language = ref<CodeLanguage>('javascript')
const indent = ref<string>('2')

const languageOptions = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
]
const isSql = computed(() => language.value === 'sql')
const indentOptions = computed(() => [
  { value: '2', label: '2 spaces', disabled: isSql.value },
  { value: '4', label: '4 spaces', disabled: isSql.value },
  { value: 'tab', label: 'Tabs', disabled: isSql.value },
])
const languageHint = computed(() =>
  isSql.value ? 'SQL uses a different formatter, so it has fewer style options.' : undefined,
)

const fileExtension: Record<CodeLanguage, string> = {
  javascript: 'js',
  html: 'html',
  css: 'css',
  json: 'json',
  sql: 'sql',
}
const downloadName = computed(() => `formatted.${fileExtension[language.value]}`)

const output = ref('')
const errorText = ref<string | null>(null)
const ready = ref(false)

async function run() {
  const ind: CodeIndent = indent.value === 'tab' ? 'tab' : (Number(indent.value) as 2 | 4)
  const result = await formatCode(input.value, language.value, ind)
  output.value = result.output
  errorText.value = result.error
    ? result.error.line != null
      ? `${result.error.message} (line ${result.error.line}, column ${result.error.column})`
      : result.error.message
    : null
}

onMounted(async () => {
  await run()
  ready.value = true
})

watch([input, language, indent], run)
</script>

<template>
  <ToolPage :tool="tool">
    <TextWorkbench
      v-model="input"
      :output="output"
      :error="errorText"
      :ready="ready"
      :input-invalid="!!errorText"
      input-label="Code"
      output-label="Formatted"
      input-placeholder="Paste code to format…"
      code-output
      :language="language"
      line-numbers
      :download-name="downloadName"
      empty-description="Paste JavaScript, HTML, CSS, JSON, or SQL to format it."
    >
      <template #controls>
        <Field label="Language" :hint="languageHint" class="df-field">
          <Select v-model="language" :options="languageOptions" />
        </Field>
        <Field label="Indent">
          <SegmentedControl v-model="indent" :options="indentOptions" />
        </Field>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.df-field {
  min-width: 200px;
}
</style>
