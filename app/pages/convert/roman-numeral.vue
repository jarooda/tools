<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { toRoman, fromRoman, ROMAN_MIN, ROMAN_MAX } from '@/utils/roman-numeral'

definePageMeta({ layout: 'tool' })

const tool = getTool('roman-numeral')!

type Direction = 'toRoman' | 'fromRoman'
const direction = ref<Direction>('toRoman')
const directionOptions = [
  { value: 'toRoman', label: 'Number → Roman' },
  { value: 'fromRoman', label: 'Roman → Number' },
]

const numberValue = ref<number | null>(2024)
const romanValue = ref('MMXXIV')

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const result = ref('')
const error = ref<string | null>(null)
const empty = ref(false)

const resultLabel = computed(() => (direction.value === 'toRoman' ? 'Roman numeral' : 'Number'))

watch(
  [direction, numberValue, romanValue],
  ([dir, num, roman]) => {
    error.value = null
    empty.value = false
    try {
      if (dir === 'toRoman') {
        if (num == null) {
          empty.value = true
          result.value = ''
          return
        }
        result.value = toRoman(num)
      } else {
        if (roman.trim() === '') {
          empty.value = true
          result.value = ''
          return
        }
        result.value = String(fromRoman(roman))
      }
    } catch (e) {
      result.value = ''
      error.value = e instanceof Error ? e.message : 'Invalid input'
    }
  },
  { immediate: true },
)

const { copy, copied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="conv">
      <!-- Left: direction + the input for that direction -->
      <div class="conv__input">
        <Field label="Direction">
          <SegmentedControl v-model="direction" :options="directionOptions" full-width />
        </Field>

        <Field v-if="direction === 'toRoman'" :label="`Number (${ROMAN_MIN}–${ROMAN_MAX})`">
          <NumberInput
            v-model="numberValue"
            :min="ROMAN_MIN"
            :max="ROMAN_MAX"
            :step="1"
            align="left"
          />
        </Field>
        <Field v-else label="Roman numeral">
          <Input
            v-model="romanValue"
            :invalid="!!error"
            placeholder="e.g. MMXXIV"
            clearable
            spellcheck="false"
          />
        </Field>

        <p v-if="error" class="conv__warn" role="alert">{{ error }}</p>
      </div>

      <!-- Right: the single result -->
      <div class="conv__results">
        <span class="conv__results-label">{{ resultLabel }}</span>

        <!-- Loading -->
        <div v-if="!ready" class="conv__row conv__row--skel" aria-hidden="true">
          <Skeleton variant="text" width="140px" />
          <Skeleton variant="rect" width="72px" height="30px" radius="8px" />
        </div>

        <!-- Empty -->
        <EmptyState
          v-else-if="empty"
          class="conv__empty"
          bordered
          size="sm"
          title="Nothing to convert yet"
          description="Enter a value on the left to convert it."
        >
          <template #icon>
            <Icon :name="UI_ICON.emptyInput" size="22" />
          </template>
        </EmptyState>

        <!-- Result -->
        <div v-else-if="result" class="conv__row conv__row--result">
          <span class="conv__result-value">{{ result }}</span>
          <Button variant="ghost" size="sm" aria-label="Copy result" @click="copy(result)">
            <template #icon>
              <Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.conv {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.conv__input {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.conv__warn {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--danger-text, var(--warning-text));
}
.conv__results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.conv__results-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.conv__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.5rem 0.6rem 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.conv__row--result {
  border-color: var(--accent-muted, var(--accent));
  background: var(--accent-subtle);
}
.conv__empty {
  width: 100%;
}
.conv__result-value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  word-break: break-all;
}

@media (max-width: 640px) {
  .conv {
    grid-template-columns: 1fr;
  }
}
</style>
