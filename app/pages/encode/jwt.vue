<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
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

const { copy } = useCopy()
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

      <div v-if="!ready" aria-hidden="true">
        <Skeleton variant="rect" width="100%" height="180px" radius="10px" />
      </div>

      <EmptyState
        v-else-if="input.trim() === ''"
        bordered
        size="sm"
        title="No token yet"
        description="Paste a JWT above to inspect its header and payload."
      >
        <template #icon><Icon :name="UI_ICON.emptyInput" size="22" /></template>
      </EmptyState>

      <p v-else-if="decoded.error" class="jwt__error" role="alert">{{ decoded.error }}</p>

      <div v-else class="jwt__result">
        <div class="jwt__panel">
          <div class="jwt__panel-head">
            <span class="jwt__label">Header</span>
            <Button variant="ghost" size="sm" aria-label="Copy header" @click="copy(headerJson)">
              <template #icon><Icon :name="UI_ICON.copy" size="15" /></template>
            </Button>
          </div>
          <pre class="jwt__json">{{ headerJson }}</pre>
        </div>

        <div class="jwt__panel">
          <div class="jwt__panel-head">
            <span class="jwt__label">Payload</span>
            <Button variant="ghost" size="sm" aria-label="Copy payload" @click="copy(payloadJson)">
              <template #icon><Icon :name="UI_ICON.copy" size="15" /></template>
            </Button>
          </div>
          <pre class="jwt__json">{{ payloadJson }}</pre>
        </div>

        <div v-if="timeClaims.length" class="jwt__claims">
          <div v-for="c in timeClaims" :key="c.key" class="jwt__claim">
            <span class="jwt__claim-label">{{ c.label }}</span>
            <span class="jwt__claim-value">{{ c.value }}</span>
          </div>
        </div>
      </div>
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
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}
.jwt__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
}
.jwt__json {
  margin: 0;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
  color: var(--text-primary);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.8125rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
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
.jwt__error {
  margin: 0;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--danger-border, var(--warning));
  border-radius: var(--radius-control, 0.625rem);
  background: var(--danger-subtle, var(--warning-subtle));
  color: var(--danger-text, var(--warning-text));
  font-size: 0.875rem;
}

@media (max-width: 640px) {
  .jwt__result {
    grid-template-columns: 1fr;
  }
}
</style>
