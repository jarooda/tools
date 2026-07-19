<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { getTool } from '@/lib/tools/registry'
import { convertCase, CASE_MODES, type CaseMode } from '@/utils/textCase'

definePageMeta({ layout: 'tool' })

const tool = getTool('text-case')!

const input = ref('')
const mode = ref<CaseMode>('title')

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const modeOptions = CASE_MODES.map((m) => ({ value: m.value, label: `${m.label}  —  ${m.sample}` }))

const output = computed(() => convertCase(input.value, mode.value))
</script>

<template>
  <ToolPage :tool="tool">
    <TextWorkbench
      v-model="input"
      :output="output"
      :ready="ready"
      output-label="Result"
      empty-description="Enter some text and pick a case to transform it."
      download-name="text-case.txt"
    >
      <template #controls>
        <Field label="Convert to" class="case-field">
          <Select v-model="mode" :options="modeOptions" />
        </Field>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.case-field {
  min-width: 260px;
}
</style>
