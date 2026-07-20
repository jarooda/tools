<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { getTool } from '@/lib/tools/registry'
import { encodeUrl, decodeUrl, type UrlMode } from '@/utils/urlEncode'

definePageMeta({ layout: 'tool' })

const tool = getTool('encode-url')!

type Direction = 'encode' | 'decode'
const direction = ref<Direction>('encode')
const directionOptions = [
  { value: 'encode', label: 'Encode' },
  { value: 'decode', label: 'Decode' },
]
const mode = ref<UrlMode>('component')
const modeOptions = [
  { value: 'component', label: 'Component' },
  { value: 'full', label: 'Full URL' },
]
const input = ref('')

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const result = computed(() => {
  if (input.value === '') return { output: '', error: null as string | null }
  try {
    const output =
      direction.value === 'encode'
        ? encodeUrl(input.value, mode.value)
        : decodeUrl(input.value, mode.value)
    return { output, error: null }
  } catch (e) {
    return { output: '', error: e instanceof Error ? e.message : 'Invalid input' }
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
      code-output
      language="url"
      download-name="url.txt"
      empty-description="Enter a URL or text to percent-encode or decode."
    >
      <template #controls>
        <Field label="Mode">
          <SegmentedControl v-model="direction" :options="directionOptions" />
        </Field>
        <Field label="Scope">
          <SegmentedControl v-model="mode" :options="modeOptions" />
        </Field>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>
