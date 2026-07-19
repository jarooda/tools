<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { getTool } from '@/lib/tools/registry'
import { slugify } from '@/utils/slugify'

definePageMeta({ layout: 'tool' })

const tool = getTool('text-slug')!

const input = ref('')
const separator = ref('-')
const lowercase = ref(true)
const symbols = ref(false)

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const separatorOptions = [
  { value: '-', label: 'Hyphen -' },
  { value: '_', label: 'Underscore _' },
]

const output = computed(() =>
  input.value
    .split(/\r\n|\r|\n/u)
    .map((line) =>
      slugify(line, {
        separator: separator.value,
        lowercase: lowercase.value,
        symbols: symbols.value,
      }),
    )
    .join('\n'),
)
</script>

<template>
  <ToolPage :tool="tool">
    <TextWorkbench
      v-model="input"
      :output="output"
      :ready="ready"
      input-label="Text"
      output-label="Slug"
      input-placeholder="My Awesome Blog Post!"
      empty-description="Type a title or phrase to turn it into a slug."
      mono
      download-name="slug.txt"
    >
      <template #controls>
        <Field label="Separator">
          <SegmentedControl v-model="separator" :options="separatorOptions" />
        </Field>
        <div class="slug-switches">
          <Switch v-model="lowercase" label="Lowercase" />
          <Switch v-model="symbols" label="Convert symbols" />
        </div>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.slug-switches {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 0.4rem;
}
</style>
