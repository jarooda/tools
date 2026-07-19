<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import {
  generatePassword,
  passwordPool,
  passwordEntropyBits,
  passwordStrength,
  type PasswordOptions,
} from '@/utils/password'

definePageMeta({ layout: 'tool' })

const tool = getTool('generate-password')!

const opts = ref<PasswordOptions>({
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
})

const password = ref('')
const ready = ref(false)

function regenerate() {
  password.value = generatePassword(opts.value)
}

// Regenerate whenever any option changes so the preview always matches.
watch(opts, regenerate, { deep: true })

onMounted(() => {
  regenerate()
  ready.value = true
})

const noneSelected = computed(
  () => !opts.value.lowercase && !opts.value.uppercase && !opts.value.digits && !opts.value.symbols,
)

const strength = computed(() =>
  passwordStrength(passwordEntropyBits(opts.value.length, passwordPool(opts.value).length)),
)

const { copy, copied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="pw">
      <!-- Output -->
      <div class="pw__result">
        <div v-if="!ready" aria-hidden="true">
          <Skeleton variant="rect" width="100%" height="56px" radius="10px" />
        </div>
        <template v-else>
          <output class="pw__value" :data-empty="noneSelected || undefined">
            {{ noneSelected ? 'Select at least one character type' : password }}
          </output>
          <div class="pw__result-actions">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Regenerate password"
              :disabled="noneSelected"
              @click="regenerate"
            >
              <template #icon><Icon :name="UI_ICON.reset" size="16" /></template>
              New
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Copy password"
              :disabled="noneSelected"
              @click="copy(password)"
            >
              <template #icon>
                <Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="16" />
              </template>
              {{ copied ? 'Copied' : 'Copy' }}
            </Button>
          </div>
        </template>
      </div>

      <!-- Strength meter -->
      <div class="pw__strength" :data-score="strength.score">
        <div class="pw__meter" aria-hidden="true">
          <span
            v-for="n in 4"
            :key="n"
            class="pw__bar"
            :data-on="n <= strength.score || undefined"
          />
        </div>
        <span class="pw__strength-label">
          {{ noneSelected ? '—' : `${strength.label} · ~${strength.bits} bits` }}
        </span>
      </div>

      <!-- Controls -->
      <div class="pw__controls">
        <Field :label="`Length — ${opts.length}`">
          <Slider v-model="opts.length" :min="4" :max="64" :step="1" />
        </Field>

        <div class="pw__switches">
          <Switch v-model="opts.lowercase" label="Lowercase (a–z)" />
          <Switch v-model="opts.uppercase" label="Uppercase (A–Z)" />
          <Switch v-model="opts.digits" label="Digits (0–9)" />
          <Switch v-model="opts.symbols" label="Symbols (!@#…)" />
          <Switch v-model="opts.excludeAmbiguous" label="Exclude look-alikes (Il1O0)" />
        </div>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.pw {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.pw__result {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.5rem 0.5rem 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.pw__value {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 1.125rem;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  word-break: break-all;
}
.pw__value[data-empty] {
  font-family: inherit;
  font-size: 0.9375rem;
  color: var(--text-tertiary);
}
.pw__result-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
.pw__strength {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.pw__meter {
  display: flex;
  gap: 4px;
  flex: 1;
  max-width: 220px;
}
.pw__bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--border-subtle);
  transition: background 0.15s ease;
}
.pw__strength-label {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}
/* Colour the lit bars by score. */
.pw__strength[data-score='1'] .pw__bar[data-on] {
  background: var(--danger, #e5484d);
}
.pw__strength[data-score='2'] .pw__bar[data-on] {
  background: var(--warning, #f5a524);
}
.pw__strength[data-score='3'] .pw__bar[data-on] {
  background: var(--info, #3e63dd);
}
.pw__strength[data-score='4'] .pw__bar[data-on] {
  background: var(--success, #30a46c);
}
.pw__controls {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-top: 0.5rem;
}
.pw__switches {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem 1.5rem;
}
</style>
