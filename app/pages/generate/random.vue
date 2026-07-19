<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { secureRandomInts, rollDice, flipCoin, pickItems, parsePickList } from '@/utils/randomPick'

definePageMeta({ layout: 'tool' })

const tool = getTool('generate-random')!

type Mode = 'number' | 'dice' | 'coin' | 'list'
const mode = ref<Mode>('number')

// Number
const min = ref<number | null>(1)
const max = ref<number | null>(100)
const count = ref<number | null>(1)
const unique = ref(false)

// Dice
const sides = ref('6')
const diceCount = ref<number | null>(2)

// Coin
const coinCount = ref<number | null>(1)

// List
const listInput = ref('Alice\nBob\nCharlie\nDana')
const pickCount = ref<number | null>(1)
const listUnique = ref(true)

const ready = ref(false)
const results = ref<string[]>([])
const summary = ref('')

function generate() {
  if (mode.value === 'number') {
    const nums = secureRandomInts(min.value ?? 0, max.value ?? 0, count.value ?? 1, unique.value)
    results.value = nums.map(String)
    summary.value = nums.length > 1 ? `Sum ${nums.reduce((a, b) => a + b, 0)}` : ''
  } else if (mode.value === 'dice') {
    const rolls = rollDice(Number(sides.value), diceCount.value ?? 1)
    results.value = rolls.map(String)
    summary.value = rolls.length > 1 ? `Total ${rolls.reduce((a, b) => a + b, 0)}` : ''
  } else if (mode.value === 'coin') {
    const flips = Array.from({ length: coinCount.value ?? 1 }, () => flipCoin())
    results.value = flips
    const heads = flips.filter((f) => f === 'Heads').length
    summary.value = flips.length > 1 ? `${heads} heads · ${flips.length - heads} tails` : ''
  } else {
    const items = parsePickList(listInput.value)
    results.value = pickItems(items, pickCount.value ?? 1, listUnique.value)
    summary.value = ''
  }
}

function switchMode(next: string) {
  mode.value = next as Mode
  generate()
}

const listCount = computed(() => parsePickList(listInput.value).length)

const output = computed(() => results.value.join('\n'))
const { copy, copied } = useCopy()

onMounted(() => {
  generate()
  ready.value = true
})

const DICE = [
  { value: '4', label: 'd4' },
  { value: '6', label: 'd6' },
  { value: '8', label: 'd8' },
  { value: '10', label: 'd10' },
  { value: '12', label: 'd12' },
  { value: '20', label: 'd20' },
  { value: '100', label: 'd100' },
]
</script>

<template>
  <ToolPage :tool="tool">
    <div class="rnd">
      <SegmentedControl
        :model-value="mode"
        :options="[
          { value: 'number', label: 'Numbers' },
          { value: 'dice', label: 'Dice' },
          { value: 'coin', label: 'Coin' },
          { value: 'list', label: 'List picker' },
        ]"
        @update:model-value="switchMode"
      />

      <!-- Controls -->
      <div class="rnd__controls">
        <template v-if="mode === 'number'">
          <Field label="Min" class="rnd__field"><NumberInput v-model="min" align="left" /></Field>
          <Field label="Max" class="rnd__field"><NumberInput v-model="max" align="left" /></Field>
          <Field label="How many" class="rnd__field">
            <NumberInput v-model="count" :min="1" :max="1000" align="left" />
          </Field>
          <Switch v-model="unique" label="No repeats" class="rnd__switch" />
        </template>

        <template v-else-if="mode === 'dice'">
          <Field label="Die" class="rnd__field"><Select v-model="sides" :options="DICE" /></Field>
          <Field label="How many" class="rnd__field">
            <NumberInput v-model="diceCount" :min="1" :max="100" align="left" />
          </Field>
        </template>

        <template v-else-if="mode === 'coin'">
          <Field label="How many flips" class="rnd__field">
            <NumberInput v-model="coinCount" :min="1" :max="100" align="left" />
          </Field>
        </template>

        <template v-else>
          <Field :label="`Items — one per line (${listCount})`" class="rnd__list">
            <Textarea v-model="listInput" auto-resize spellcheck="false" />
          </Field>
          <Field label="Pick" class="rnd__field">
            <NumberInput v-model="pickCount" :min="1" :max="1000" align="left" />
          </Field>
          <Switch v-model="listUnique" label="No repeats" class="rnd__switch" />
        </template>
      </div>

      <Button variant="primary" class="rnd__go" @click="generate">
        <template #icon><Icon :name="UI_ICON.dice" size="16" /></template>
        {{ mode === 'coin' ? 'Flip' : mode === 'dice' ? 'Roll' : 'Generate' }}
      </Button>

      <!-- Result -->
      <div class="rnd__out">
        <div class="rnd__out-head">
          <span class="rnd__label">Result{{ summary ? ` · ${summary}` : '' }}</span>
          <Button
            v-if="ready && output"
            variant="ghost"
            size="sm"
            aria-label="Copy result"
            @click="copy(output)"
          >
            <template #icon>
              <Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>

        <div v-if="!ready" aria-hidden="true">
          <Skeleton variant="rect" width="100%" height="90px" radius="10px" />
        </div>
        <div v-else-if="results.length" class="rnd__chips">
          <span v-for="(r, i) in results" :key="i" class="rnd__chip">{{ r }}</span>
        </div>
        <p v-else class="rnd__empty">Nothing to pick — add some items above.</p>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.rnd {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.rnd__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.rnd__field {
  width: 130px;
}
.rnd__list {
  flex: 1;
  min-width: 240px;
}
.rnd__switch {
  padding-bottom: 0.5rem;
}
.rnd__go {
  align-self: flex-start;
}
.rnd__out {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.rnd__out-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 32px;
}
.rnd__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.rnd__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1rem;
  min-height: 90px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.rnd__chip {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: var(--accent-subtle, var(--surface-muted));
  color: var(--accent-text, var(--text-primary));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.9375rem;
  font-weight: 600;
}
.rnd__empty {
  margin: 0;
  padding: 1rem;
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  color: var(--text-tertiary);
  font-size: 0.875rem;
}
</style>
