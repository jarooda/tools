<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { getTool } from '@/lib/tools/registry'
import { computeTextStats, formatReadingTime } from '@/utils/textStats'

definePageMeta({ layout: 'tool' })

const tool = getTool('text-counter')!

const input = ref('')

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const stats = computed(() => computeTextStats(input.value))

const cards = computed(() => [
  { label: 'Words', value: stats.value.words.toLocaleString() },
  { label: 'Characters', value: stats.value.characters.toLocaleString() },
  { label: 'Characters (no spaces)', value: stats.value.charactersNoSpaces.toLocaleString() },
  { label: 'Sentences', value: stats.value.sentences.toLocaleString() },
  { label: 'Paragraphs', value: stats.value.paragraphs.toLocaleString() },
  { label: 'Lines', value: stats.value.lines.toLocaleString() },
  { label: 'Reading time', value: formatReadingTime(stats.value.readingSeconds) },
])
</script>

<template>
  <ToolPage :tool="tool">
    <div class="counter">
      <div class="counter__input">
        <span class="counter__label">Your text</span>
        <Textarea
          v-model="input"
          class="counter__area"
          placeholder="Type or paste your text here…"
          auto-resize
          spellcheck="false"
        />
      </div>

      <OutputPanel :ready="ready">
        <template #skeleton>
          <div class="counter__stats">
            <div v-for="n in 7" :key="n" class="counter__card" aria-hidden="true">
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" width="45%" height="26px" />
            </div>
          </div>
        </template>
        <div class="counter__stats">
          <div v-for="c in cards" :key="c.label" class="counter__card">
            <span class="counter__card-label">{{ c.label }}</span>
            <span class="counter__card-value">{{ c.value }}</span>
          </div>
        </div>
      </OutputPanel>
    </div>
  </ToolPage>
</template>

<style scoped>
.counter {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.counter__input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.counter__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.counter__area {
  min-height: 200px;
}
.counter__stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}
.counter__card {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.counter__card-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-tertiary);
}
.counter__card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
</style>
