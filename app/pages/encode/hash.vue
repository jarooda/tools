<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Textarea } from '@/components/ui/textarea'
import { Snippet } from '@/components/ui/snippet'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { md5 } from '@/utils/md5'

definePageMeta({ layout: 'tool' })

const tool = getTool('encode-hash')!

const input = ref('')

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const ALGOS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'] as const
type Algo = (typeof ALGOS)[number]

const hashes = ref<Record<Algo, string>>({ MD5: '', 'SHA-1': '', 'SHA-256': '', 'SHA-512': '' })

async function shaHex(algo: Exclude<Algo, 'MD5'>, text: string): Promise<string> {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function compute() {
  const text = input.value
  if (text === '') {
    hashes.value = { MD5: '', 'SHA-1': '', 'SHA-256': '', 'SHA-512': '' }
    return
  }
  const [s1, s256, s512] = await Promise.all([
    shaHex('SHA-1', text),
    shaHex('SHA-256', text),
    shaHex('SHA-512', text),
  ])
  hashes.value = { MD5: md5(text), 'SHA-1': s1, 'SHA-256': s256, 'SHA-512': s512 }
}

watch(input, compute)
</script>

<template>
  <ToolPage :tool="tool">
    <div class="hash">
      <div class="hash__input">
        <span class="hash__label">Text to hash</span>
        <Textarea
          v-model="input"
          class="hash__area"
          placeholder="Type or paste text to hash…"
          auto-resize
          spellcheck="false"
        />
      </div>

      <div class="hash__results">
        <ul v-if="!ready" class="hash__list" aria-hidden="true">
          <li v-for="a in ALGOS" :key="a" class="hash__row">
            <Skeleton variant="text" width="64px" />
            <Skeleton variant="text" width="70%" />
          </li>
        </ul>

        <EmptyState
          v-else-if="input === ''"
          bordered
          size="sm"
          title="No hashes yet"
          description="Enter some text above to compute its MD5 and SHA digests."
        >
          <template #icon><Icon :name="UI_ICON.emptyInput" size="22" /></template>
        </EmptyState>

        <ul v-else class="hash__list">
          <li v-for="a in ALGOS" :key="a">
            <Snippet variant="block" :title="a" :code="hashes[a]" />
          </li>
        </ul>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.hash {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.hash__input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.hash__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.hash__area {
  min-height: 140px;
}
.hash__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
/* Skeleton placeholder rows (the real results render as JLDS Snippet blocks). */
.hash__row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.5rem 0.5rem 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}

@media (max-width: 640px) {
  .hash__row {
    grid-template-columns: 72px minmax(0, 1fr);
  }
}
</style>
