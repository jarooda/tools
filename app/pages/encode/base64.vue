<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { getTool } from '@/lib/tools/registry'
import { encodeBase64, decodeBase64 } from '@/utils/base64Text'

definePageMeta({ layout: 'tool' })

const tool = getTool('base64')!

type Direction = 'encode' | 'decode'
const direction = ref<Direction>('encode')
const directionOptions = [
  { value: 'encode', label: 'Encode' },
  { value: 'decode', label: 'Decode' },
]
const urlSafe = ref(false)
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
        ? encodeBase64(input.value, urlSafe.value)
        : decodeBase64(input.value)
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
      :input-label="direction === 'encode' ? 'Text' : 'Base64'"
      :output-label="direction === 'encode' ? 'Base64' : 'Text'"
      :input-invalid="!!result.error"
      mono
      download-name="base64.txt"
      empty-description="Enter text to encode, or Base64 to decode."
    >
      <template #controls>
        <Field label="Mode">
          <SegmentedControl v-model="direction" :options="directionOptions" />
        </Field>
        <Switch
          v-if="direction === 'encode'"
          v-model="urlSafe"
          label="URL-safe"
          class="b64-switch"
        />
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.b64-switch {
  padding-bottom: 0.5rem;
}
</style>
