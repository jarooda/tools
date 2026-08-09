<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import {
  NUMBER_BASES,
  convertNumberBase,
  type BaseResult,
  type NumberBase,
} from '@/utils/number-base'

definePageMeta({ layout: 'tool' })

const tool = getTool('number-base')!

const input = ref('255')
const fromStr = ref('10')

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const baseOptions = NUMBER_BASES.map((b) => ({ value: String(b.base), label: b.name }))

const results = ref<BaseResult[]>([])
const error = ref<string | null>(null)
const empty = ref(false)

watch(
  [input, fromStr],
  ([raw, baseStr]) => {
    const base = Number(baseStr) as NumberBase
    if (raw.trim() === '') {
      results.value = []
      error.value = null
      empty.value = true
      return
    }
    empty.value = false
    try {
      results.value = convertNumberBase(raw, base)
      error.value = null
    } catch (e) {
      results.value = []
      error.value = e instanceof Error ? e.message : 'Invalid number'
    }
  },
  { immediate: true },
)

const { copy, copied } = useCopy()
const copiedBase = ref<NumberBase | null>(null)

async function copyResult(base: NumberBase, text: string) {
  await copy(text)
  copiedBase.value = base
}
</script>

<template>
  <ToolPage :tool="tool">
    <div class="conv">
      <!-- Left: the number + its base -->
      <div class="conv__input">
        <Field label="Number">
          <Input
            v-model="input"
            :invalid="!!error"
            placeholder="Enter a number"
            clearable
            spellcheck="false"
          />
        </Field>
        <Field label="From base">
          <SegmentedControl v-model="fromStr" :options="baseOptions" full-width />
        </Field>
        <Alert v-if="error" tone="danger">{{ error }}</Alert>
      </div>

      <!-- Right: the value in every base, each copyable -->
      <div class="conv__results">
        <span class="conv__results-label">In every base</span>

        <!-- Loading -->
        <ul v-if="!ready" class="conv__list" aria-hidden="true">
          <li v-for="b in NUMBER_BASES" :key="b.base" class="conv__row conv__row--skel">
            <Skeleton variant="text" width="120px" />
            <Skeleton variant="rect" width="72px" height="30px" radius="8px" />
          </li>
        </ul>

        <!-- Empty -->
        <EmptyState
          v-else-if="empty"
          class="conv__empty"
          bordered
          size="sm"
          title="Nothing to convert yet"
          description="Enter a number on the left to see it in binary, octal, decimal, and hex."
        >
          <template #icon>
            <Icon :name="UI_ICON.emptyInput" size="22" />
          </template>
        </EmptyState>

        <!-- Results (hidden while the input is invalid — the error shows on the left) -->
        <ul v-else-if="results.length" class="conv__list">
          <li v-for="r in results" :key="r.base" class="conv__row conv__row--num">
            <div class="conv__num-main">
              <span class="conv__num-label">{{ r.name }}</span>
              <code class="conv__num-value"
                ><span v-if="r.prefix" class="conv__num-prefix">{{ r.prefix }}</span
                >{{ r.display }}</code
              >
            </div>
            <Button
              variant="ghost"
              size="sm"
              :aria-label="`Copy ${r.name} value`"
              @click="copyResult(r.base, r.display)"
            >
              <template #icon>
                <Icon
                  :name="copied && copiedBase === r.base ? UI_ICON.check : UI_ICON.copy"
                  size="15"
                />
              </template>
              {{ copied && copiedBase === r.base ? 'Copied' : 'Copy' }}
            </Button>
          </li>
        </ul>
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
.conv__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
.conv__empty {
  width: 100%;
}
.conv__num-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.conv__num-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-tertiary);
}
.conv__num-value {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-all;
}
.conv__num-prefix {
  color: var(--text-tertiary);
}

@media (max-width: 640px) {
  .conv {
    grid-template-columns: 1fr;
  }
}
</style>
