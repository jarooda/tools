<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { diffLines, diffStats } from '@/utils/textDiff'

definePageMeta({ layout: 'tool' })

const tool = getTool('text-diff')!

const original = ref('')
const changed = ref('')

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const rows = computed(() => diffLines(original.value, changed.value))
const stats = computed(() => diffStats(rows.value))
const empty = computed(() => original.value === '' && changed.value === '')

const SIGN: Record<string, string> = { add: '+', remove: '−', equal: ' ' }
</script>

<template>
  <ToolPage :tool="tool">
    <div class="diff">
      <div class="diff__inputs">
        <div class="diff__pane">
          <span class="diff__label">Original</span>
          <Textarea
            v-model="original"
            class="diff__area"
            placeholder="Paste the original text…"
            auto-resize
            spellcheck="false"
          />
        </div>
        <div class="diff__pane">
          <span class="diff__label">Changed</span>
          <Textarea
            v-model="changed"
            class="diff__area"
            placeholder="Paste the changed text…"
            auto-resize
            spellcheck="false"
          />
        </div>
      </div>

      <div class="diff__result">
        <div class="diff__result-head">
          <span class="diff__label">Differences</span>
          <div v-if="ready && !empty" class="diff__stats">
            <span class="diff__stat diff__stat--add">+{{ stats.added }}</span>
            <span class="diff__stat diff__stat--remove">−{{ stats.removed }}</span>
          </div>
        </div>

        <div v-if="!ready" aria-hidden="true">
          <Skeleton variant="rect" width="100%" height="160px" radius="10px" />
        </div>
        <EmptyState
          v-else-if="empty"
          bordered
          size="sm"
          title="Nothing to compare yet"
          description="Paste text into both boxes to see what changed."
        >
          <template #icon><Icon :name="UI_ICON.emptyInput" size="22" /></template>
        </EmptyState>
        <div v-else class="diff__lines">
          <div
            v-for="(r, idx) in rows"
            :key="idx"
            class="diff__line"
            :class="`diff__line--${r.type}`"
          >
            <span class="diff__sign">{{ SIGN[r.type] }}</span>
            <code class="diff__text">{{ r.value || ' ' }}</code>
          </div>
        </div>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.diff {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.diff__inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
}
.diff__pane {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}
.diff__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.diff__area {
  min-height: 180px;
}
.diff__result {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.diff__result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.diff__stats {
  display: flex;
  gap: 0.6rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-weight: 700;
  font-size: 0.875rem;
}
.diff__stat--add {
  color: var(--success-text, var(--success));
}
.diff__stat--remove {
  color: var(--danger-text, var(--warning-text));
}
.diff__lines {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
  overflow-x: auto;
  padding: 0.35rem 0;
}
.diff__line {
  display: flex;
  gap: 0.5rem;
  padding: 0.05rem 0.75rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.8125rem;
  line-height: 1.6;
  white-space: pre;
}
.diff__line--add {
  background: var(--success-subtle, rgba(34, 197, 94, 0.12));
}
.diff__line--remove {
  background: var(--danger-subtle, var(--warning-subtle, rgba(239, 68, 68, 0.12)));
}
.diff__sign {
  width: 1ch;
  flex: none;
  color: var(--text-tertiary);
}
.diff__line--add .diff__sign {
  color: var(--success-text, var(--success));
}
.diff__line--remove .diff__sign {
  color: var(--danger-text, var(--warning-text));
}
.diff__text {
  color: var(--text-primary);
}

@media (max-width: 640px) {
  .diff__inputs {
    grid-template-columns: 1fr;
  }
}
</style>
