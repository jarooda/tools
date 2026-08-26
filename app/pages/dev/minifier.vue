<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Tag } from '@/components/ui/tag'
import { getTool } from '@/lib/tools/registry'
import { minifyCode, type MinifyLanguage } from '@/utils/codeMinify'
import { formatBytes, percentSmaller } from '@/utils/fileSize'

definePageMeta({ layout: 'tool' })

const tool = getTool('dev-minifier')!

const input = ref('')
const language = ref<MinifyLanguage>('javascript')

const languageOptions = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
]

const fileExtension: Record<MinifyLanguage, string> = {
  javascript: 'js',
  css: 'css',
  html: 'html',
}
const downloadName = computed(() => `minified.${fileExtension[language.value]}`)

const output = ref('')
const errorText = ref<string | null>(null)
const stats = ref<{ inputBytes: number; outputBytes: number } | null>(null)
const ready = ref(false)

let runToken = 0

async function run() {
  const token = ++runToken
  const result = await minifyCode(input.value, language.value)
  if (token !== runToken) return
  output.value = result.output
  errorText.value = result.error
    ? result.error.line != null
      ? `${result.error.message} (line ${result.error.line}, column ${result.error.column})`
      : result.error.message
    : null
  stats.value = result.stats
}

onMounted(async () => {
  await run()
  ready.value = true
})

watch([input, language], run)

const reductionPercent = computed(() =>
  stats.value ? percentSmaller(stats.value.inputBytes, stats.value.outputBytes) : 0,
)
</script>

<template>
  <ToolPage :tool="tool">
    <TextWorkbench
      v-model="input"
      :output="output"
      :error="errorText"
      :ready="ready"
      :input-invalid="!!errorText"
      :live="false"
      input-label="Code"
      output-label="Minified"
      input-placeholder="Paste code to minify…"
      code-output
      :language="language"
      :download-name="downloadName"
      empty-description="Paste JavaScript, CSS, or HTML to minify it."
    >
      <template #controls>
        <Field label="Language" class="dm-field">
          <Select v-model="language" :options="languageOptions" />
        </Field>
        <NuxtLink to="/encode/json" class="dm-json-link"
          >Need JSON? Use the JSON Formatter</NuxtLink
        >
      </template>

      <template #actions>
        <template v-if="stats">
          <Tag color="neutral"
            >{{ formatBytes(stats.inputBytes) }} → {{ formatBytes(stats.outputBytes) }}</Tag
          >
          <Tag color="success">-{{ reductionPercent }}%</Tag>
        </template>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.dm-field {
  min-width: 200px;
}
.dm-json-link {
  align-self: center;
  font-size: 0.8125rem;
  color: var(--text-brand);
  text-decoration: none;
}
.dm-json-link:hover {
  text-decoration: underline;
}
</style>
