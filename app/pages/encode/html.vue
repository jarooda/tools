<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { getTool } from '@/lib/tools/registry'
import { encodeHtml, decodeHtml } from '@/utils/htmlEntities'

definePageMeta({ layout: 'tool' })

const tool = getTool('encode-html')!

type Direction = 'encode' | 'decode'
const direction = ref<Direction>('encode')
const directionOptions = [
  { value: 'encode', label: 'Encode' },
  { value: 'decode', label: 'Decode' },
]
const input = ref('')

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const output = computed(() =>
  direction.value === 'encode' ? encodeHtml(input.value) : decodeHtml(input.value),
)
</script>

<template>
  <ToolPage :tool="tool">
    <TextWorkbench
      v-model="input"
      :output="output"
      :ready="ready"
      :input-label="direction === 'encode' ? 'Text' : 'HTML entities'"
      :output-label="direction === 'encode' ? 'HTML entities' : 'Text'"
      code-output
      :language="direction === 'encode' ? 'html' : 'text'"
      download-name="html.txt"
      empty-description="Enter text to escape into HTML entities, or entities to decode."
    >
      <template #controls>
        <Field label="Mode">
          <SegmentedControl v-model="direction" :options="directionOptions" />
        </Field>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>
