<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import TextWorkbench from '@/components/tool/TextWorkbench.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { getTool } from '@/lib/tools/registry'
import { applyFindReplace } from '@/utils/findReplace'

definePageMeta({ layout: 'tool' })

const tool = getTool('text-find-replace')!

const input = ref('')
const find = ref('')
const replace = ref('')
const regex = ref(false)
const caseInsensitive = ref(false)
const wholeWord = ref(false)

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const result = computed(() => {
  try {
    const r = applyFindReplace(input.value, {
      find: find.value,
      replace: replace.value,
      regex: regex.value,
      caseInsensitive: caseInsensitive.value,
      wholeWord: wholeWord.value,
    })
    return { output: r.output, count: r.count, error: null as string | null }
  } catch (e) {
    return { output: '', count: 0, error: e instanceof Error ? e.message : 'Invalid pattern' }
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
      output-label="Result"
      empty-description="Enter text and a search term to replace matches."
      download-name="find-replace.txt"
    >
      <template #controls>
        <Field label="Find" class="fr-field">
          <Input
            v-model="find"
            :placeholder="regex ? 'pattern e.g. \\d+' : 'text to find'"
            spellcheck="false"
          />
        </Field>
        <Field label="Replace with" class="fr-field">
          <Input v-model="replace" placeholder="replacement" spellcheck="false" />
        </Field>
        <div class="fr-switches">
          <Switch v-model="regex" label="Regex" />
          <Switch v-model="caseInsensitive" label="Ignore case" />
          <Switch v-model="wholeWord" label="Whole word" />
        </div>
      </template>

      <template #actions>
        <span v-if="!result.error && find" class="fr-count">{{ result.count }} replaced</span>
      </template>
    </TextWorkbench>
  </ToolPage>
</template>

<style scoped>
.fr-field {
  min-width: 200px;
  flex: 1;
}
.fr-switches {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 0.4rem;
}
.fr-count {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  align-self: center;
}
</style>
