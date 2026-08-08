<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Textarea } from '@/components/ui/textarea'
import { Snippet } from '@/components/ui/snippet'
import { getTool } from '@/lib/tools/registry'
import { decodeJwt, formatJwtTimestamp } from '@/utils/jwtDecode'

definePageMeta({ layout: 'tool' })

const tool = getTool('encode-jwt')!

const input = ref('')

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const decoded = computed(() => {
  if (input.value.trim() === '') return { data: null, error: null as string | null }
  try {
    return { data: decodeJwt(input.value), error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Invalid token' }
  }
})

const headerJson = computed(() =>
  decoded.value.data ? JSON.stringify(decoded.value.data.header, null, 2) : '',
)
const payloadJson = computed(() =>
  decoded.value.data ? JSON.stringify(decoded.value.data.payload, null, 2) : '',
)

const TIME_CLAIMS: Array<{ key: string; label: string }> = [
  { key: 'iat', label: 'Issued at' },
  { key: 'nbf', label: 'Not before' },
  { key: 'exp', label: 'Expires' },
]

const timeClaims = computed(() => {
  const payload = decoded.value.data?.payload
  if (!payload) return []
  return TIME_CLAIMS.map((c) => ({ ...c, value: formatJwtTimestamp(payload[c.key]) })).filter(
    (c) => c.value != null,
  )
})
</script>

<template>
  <ToolPage :tool="tool">
    <div class="jwt">
      <div class="jwt__input">
        <span class="jwt__label">JSON Web Token</span>
        <Textarea
          v-model="input"
          class="jwt__area"
          placeholder="Paste a JWT (eyJ…)"
          auto-resize
          spellcheck="false"
        />
      </div>

      <OutputPanel
        :ready="ready"
        :empty="input.trim() === ''"
        :error="decoded.error"
        empty-title="No token yet"
        empty-description="Paste a JWT above to inspect its header and payload."
      >
        <div class="jwt__result">
          <Snippet
            class="jwt__panel"
            variant="block"
            title="Header"
            language="json"
            :code="headerJson"
          />
          <Snippet
            class="jwt__panel"
            variant="block"
            title="Payload"
            language="json"
            :code="payloadJson"
          />

          <div v-if="timeClaims.length" class="jwt__claims">
            <div v-for="c in timeClaims" :key="c.key" class="jwt__claim">
              <span class="jwt__claim-label">{{ c.label }}</span>
              <span class="jwt__claim-value">{{ c.value }}</span>
            </div>
          </div>
        </div>
      </OutputPanel>
    </div>
  </ToolPage>
</template>

<style scoped>
.jwt {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.jwt__input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.jwt__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.jwt__area {
  min-height: 110px;
  font-family: var(--font-mono, ui-monospace, monospace);
}
.jwt__result {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
}
.jwt__panel {
  min-width: 0;
}
.jwt__claims {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.jwt__claim {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
}
.jwt__claim-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
}
.jwt__claim-value {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.8125rem;
  color: var(--text-primary);
}
@media (max-width: 640px) {
  .jwt__result {
    grid-template-columns: 1fr;
  }
}
</style>
