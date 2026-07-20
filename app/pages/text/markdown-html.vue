<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { getTool } from '@/lib/tools/registry'

definePageMeta({ layout: 'tool' })

const tool = getTool('text-markdown-html')!

type Direction = 'mdToHtml' | 'htmlToMd'
const direction = ref<Direction>('mdToHtml')
const directionOptions = [
  { value: 'mdToHtml', label: 'Markdown → HTML' },
  { value: 'htmlToMd', label: 'HTML → Markdown' },
]

const input = ref('# Hello\n\nSome **bold** and _italic_ text with a [link](https://example.com).')

// Lazy-loaded converters (kept out of the base bundle).
let marked: typeof import('marked').marked | null = null
let turndown: InstanceType<typeof import('turndown').default> | null = null
const output = ref('')
const error = ref<string | null>(null)
const ready = ref(false)

async function ensureLibs() {
  if (!marked) marked = (await import('marked')).marked
  if (!turndown) {
    const TurndownService = (await import('turndown')).default
    turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
  }
}

async function convert() {
  if (input.value.trim() === '') {
    output.value = ''
    error.value = null
    return
  }
  try {
    await ensureLibs()
    if (direction.value === 'mdToHtml') {
      output.value = String(marked!.parse(input.value, { async: false }))
    } else {
      output.value = turndown!.turndown(input.value)
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

watch([input, direction], convert)
</script>

<template>
  <ToolPage :tool="tool">
    <TextWorkbench
      v-model="input"
      :output="output"
      :error="error"
      :ready="ready"
      :input-label="direction === 'mdToHtml' ? 'Markdown' : 'HTML'"
      :output-label="direction === 'mdToHtml' ? 'HTML' : 'Markdown'"
      code-output
      :language="direction === 'mdToHtml' ? 'html' : 'markdown'"
      line-numbers
      :download-name="direction === 'mdToHtml' ? 'output.html' : 'output.md'"
      :download-mime="
        direction === 'mdToHtml' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8'
      "
      empty-description="Enter Markdown or HTML on the left to convert it."
    >
      <template #controls>
        <Field label="Direction">
          <SegmentedControl v-model="direction" :options="directionOptions" />
        </Field>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>
