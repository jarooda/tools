<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { NumberInput } from '@/components/ui/number-input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { generateLorem, type LoremUnit } from '@/utils/loremIpsum'

definePageMeta({ layout: 'tool' })

const tool = getTool('text-lorem-ipsum')!

const unit = ref<LoremUnit>('paragraphs')
const count = ref<number | null>(3)
const startWithLorem = ref(true)

const unitOptions = [
  { value: 'paragraphs', label: 'Paragraphs' },
  { value: 'sentences', label: 'Sentences' },
  { value: 'words', label: 'Words' },
]

const output = ref('')
const ready = ref(false)

function generate() {
  output.value = generateLorem({
    unit: unit.value,
    count: count.value ?? 0,
    startWithLorem: startWithLorem.value,
    rng: Math.random,
  })
}

onMounted(() => {
  generate()
  ready.value = true
})

watch([unit, count, startWithLorem], generate)

const { copy, copied } = useCopy()
const { downloadText } = useDownload()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="lorem">
      <div class="lorem__controls">
        <Field label="Generate" class="lorem__field">
          <Select v-model="unit" :options="unitOptions" />
        </Field>
        <Field label="How many" class="lorem__field lorem__field--num">
          <NumberInput v-model="count" :min="1" :max="100" :step="1" align="left" />
        </Field>
        <Switch v-model="startWithLorem" label="Start with “Lorem ipsum”" class="lorem__switch" />
        <Button variant="secondary" @click="generate">
          <template #icon><Icon :name="UI_ICON.reset" size="16" /></template>
          Regenerate
        </Button>
      </div>

      <div class="lorem__out">
        <div class="lorem__out-head">
          <span class="lorem__label">Result</span>
          <div v-if="ready && output" class="lorem__actions">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Download text"
              @click="downloadText(output, 'lorem-ipsum.txt')"
            >
              <template #icon><Icon :name="UI_ICON.download" size="15" /></template>
              Download
            </Button>
            <Button variant="ghost" size="sm" aria-label="Copy text" @click="copy(output)">
              <template #icon>
                <Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="15" />
              </template>
              {{ copied ? 'Copied' : 'Copy' }}
            </Button>
          </div>
        </div>

        <div v-if="!ready" aria-hidden="true">
          <Skeleton variant="rect" width="100%" height="220px" radius="10px" />
        </div>
        <pre v-else class="lorem__text">{{ output }}</pre>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.lorem {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.lorem__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.lorem__field {
  min-width: 160px;
}
.lorem__field--num {
  min-width: 120px;
}
.lorem__switch {
  padding-bottom: 0.5rem;
}
.lorem__out {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.lorem__out-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 32px;
}
.lorem__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.lorem__actions {
  display: flex;
  gap: 0.25rem;
}
.lorem__text {
  margin: 0;
  padding: 0.85rem 1rem;
  min-height: 220px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
