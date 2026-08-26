<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { getTool } from '@/lib/tools/registry'
import { jsonToTypeScript, type DeclarationStyle } from '@/utils/jsonToTs'

definePageMeta({ layout: 'tool' })

const tool = getTool('dev-json-to-ts')!

const input = ref('')
const rootName = ref('RootObject')
const declarationStyle = ref<DeclarationStyle>('interface')
const semicolons = ref(true)
const readonlyProps = ref(false)
const nullOptional = ref(true)

const declarationStyleOptions = [
  { value: 'interface', label: 'interface' },
  { value: 'type', label: 'type' },
]

const rootNameValid = computed(() => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(rootName.value))
const rootNameHint = computed(() =>
  rootNameValid.value ? undefined : 'Must be a valid identifier; using RootObject',
)

const output = ref('')
const errorText = ref<string | null>(null)
const ready = ref(false)

function run() {
  const result = jsonToTypeScript(input.value, {
    rootName: rootName.value,
    declarationStyle: declarationStyle.value,
    semicolons: semicolons.value,
    readonly: readonlyProps.value,
    nullOptional: nullOptional.value,
  })
  output.value = result.output
  errorText.value = result.error
}

onMounted(() => {
  run()
  ready.value = true
})

watch([input, rootName, declarationStyle, semicolons, readonlyProps, nullOptional], run)
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
      input-label="JSON"
      output-label="TypeScript"
      input-placeholder="Paste a JSON object or array…"
      code-output
      language="typescript"
      line-numbers
      download-name="types.ts"
      download-mime="text/typescript;charset=utf-8"
      empty-description="Paste a JSON object or array to generate TypeScript interfaces."
    >
      <template #controls>
        <Field label="Root name" :hint="rootNameHint" class="jt-field">
          <Input v-model="rootName" placeholder="RootObject" />
        </Field>
        <Field label="Declaration style">
          <SegmentedControl v-model="declarationStyle" :options="declarationStyleOptions" />
        </Field>
        <Field label="Semicolons">
          <Switch v-model="semicolons" />
        </Field>
        <Field label="Readonly properties">
          <Switch v-model="readonlyProps" />
        </Field>
        <Field label="Mark null fields optional">
          <Switch v-model="nullOptional" />
        </Field>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.jt-field {
  min-width: 200px;
}
</style>
