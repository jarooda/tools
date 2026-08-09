<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useDebounceFn, useMediaQuery } from '@vueuse/core'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Tag } from '@/components/ui/tag'
import { Alert } from '@/components/ui/alert'
import { Card, CardBody } from '@/components/ui/card'
import { Resizable, ResizablePanel } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { diffSideBySide, type SideBySideResult, type SideLine } from '@/utils/textDiff'

definePageMeta({ layout: 'tool' })

const tool = getTool('dev-diff')!

const original = ref('')
const changed = ref('')
const ignoreWhitespace = ref(false)

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const empty = computed(() => original.value === '' && changed.value === '')

const diffResult = ref<{ result: SideBySideResult | null; error: string | null }>({
  result: null,
  error: null,
})

function computeDiff() {
  try {
    diffResult.value = {
      result: diffSideBySide(original.value, changed.value, {
        ignoreWhitespace: ignoreWhitespace.value,
      }),
      error: null,
    }
  } catch (e) {
    diffResult.value = {
      result: null,
      error: e instanceof Error ? e.message : 'Could not diff this text.',
    }
  }
}
computeDiff()

const debouncedCompute = useDebounceFn(computeDiff, 180)
watch([original, changed, ignoreWhitespace], () => {
  debouncedCompute()
})

const result = computed(() => diffResult.value.result)
const error = computed(() => diffResult.value.error)
const stats = computed(() => result.value?.stats ?? { added: 0, removed: 0, unchanged: 0 })
const hasDifferences = computed(() => stats.value.added > 0 || stats.value.removed > 0)
const rows = computed(() => result.value?.rows ?? [])

const isNarrow = useMediaQuery('(max-width: 700px)')
const direction = computed(() => (isNarrow.value ? 'vertical' : 'horizontal'))

function sideText(line: SideLine): string {
  return line.text ?? ''
}

const diffText = computed(() =>
  rows.value
    .map((r) => {
      if (r.left.type === 'equal') return `  ${sideText(r.left)}`
      const parts: string[] = []
      if (r.left.type === 'remove') parts.push(`−${sideText(r.left)}`)
      if (r.right.type === 'add') parts.push(`+${sideText(r.right)}`)
      return parts.join('\n')
    })
    .filter(Boolean)
    .join('\n'),
)

const { copy, copied } = useCopy()

const leftViewport = ref<InstanceType<typeof ScrollArea> | null>(null)
const rightViewport = ref<InstanceType<typeof ScrollArea> | null>(null)
let syncing = false

function syncScroll(source: 'left' | 'right') {
  if (syncing) return
  const from = source === 'left' ? leftViewport.value?.viewport : rightViewport.value?.viewport
  const to = source === 'left' ? rightViewport.value?.viewport : leftViewport.value?.viewport
  if (!from || !to) return
  syncing = true
  to.scrollTop = from.scrollTop
  to.scrollLeft = from.scrollLeft
  nextTick(() => {
    syncing = false
  })
}
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
            placeholder="Paste the original code…"
            auto-resize
            spellcheck="false"
          />
        </div>
        <div class="diff__pane">
          <span class="diff__label">Changed</span>
          <Textarea
            v-model="changed"
            class="diff__area"
            placeholder="Paste the changed code…"
            auto-resize
            spellcheck="false"
          />
        </div>
      </div>

      <div class="diff__toolbar">
        <Switch v-model="ignoreWhitespace" label="Ignore whitespace" size="sm" />
      </div>

      <OutputPanel
        label="Differences"
        :ready="ready"
        :empty="empty"
        :error="error"
        :live="false"
        empty-description="Paste code or config into both boxes to see what changed."
      >
        <template v-if="!empty && !error" #actions>
          <div class="diff__stats">
            <Tag color="success">+{{ stats.added }}</Tag>
            <Tag color="danger">−{{ stats.removed }}</Tag>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Copy diff"
            :disabled="!hasDifferences"
            @click="copy(diffText)"
          >
            <template #icon>
              <Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
            {{ copied ? 'Copied' : 'Copy diff' }}
          </Button>
        </template>

        <Alert v-if="!hasDifferences" tone="success">
          No differences — the two inputs are identical.
        </Alert>

        <div v-else class="diff__result">
          <Alert v-if="!result?.wordLevel" tone="info" class="diff__perf-alert">
            Large input — showing line-level differences only for performance.
          </Alert>

          <Resizable :direction="direction" class="diff__resizable">
            <ResizablePanel :default-size="50" :min-size="20">
              <Card elevation="flat" class="diff__pane-card">
                <CardBody class="diff__pane-body">
                  <ScrollArea ref="leftViewport" class="diff__scroll" @scroll="syncScroll('left')">
                    <div
                      v-for="(r, idx) in rows"
                      :key="idx"
                      class="diff__row"
                      :class="`diff__row--${r.left.type}`"
                    >
                      <span class="diff__gutter">{{ r.left.lineNumber ?? '' }}</span>
                      <code class="diff__code">
                        <template v-if="r.left.spans">
                          <span
                            v-for="(s, si) in r.left.spans"
                            :key="si"
                            :class="s.type === 'remove' ? 'diff__span diff__span--remove' : ''"
                            >{{ s.text }}</span
                          >
                        </template>
                        <template v-else>{{ sideText(r.left) || ' ' }}</template>
                      </code>
                    </div>
                  </ScrollArea>
                </CardBody>
              </Card>
            </ResizablePanel>
            <ResizablePanel :default-size="50" :min-size="20">
              <Card elevation="flat" class="diff__pane-card">
                <CardBody class="diff__pane-body">
                  <ScrollArea
                    ref="rightViewport"
                    class="diff__scroll"
                    @scroll="syncScroll('right')"
                  >
                    <div
                      v-for="(r, idx) in rows"
                      :key="idx"
                      class="diff__row"
                      :class="`diff__row--${r.right.type}`"
                    >
                      <span class="diff__gutter">{{ r.right.lineNumber ?? '' }}</span>
                      <code class="diff__code">
                        <template v-if="r.right.spans">
                          <span
                            v-for="(s, si) in r.right.spans"
                            :key="si"
                            :class="s.type === 'add' ? 'diff__span diff__span--add' : ''"
                            >{{ s.text }}</span
                          >
                        </template>
                        <template v-else>{{ sideText(r.right) || ' ' }}</template>
                      </code>
                    </div>
                  </ScrollArea>
                </CardBody>
              </Card>
            </ResizablePanel>
          </Resizable>
        </div>
      </OutputPanel>
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
  max-height: 320px;
}
.diff__area.jl-textarea--auto {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}
.diff__toolbar {
  display: flex;
  align-items: center;
}
.diff__stats {
  display: flex;
  gap: 0.4rem;
  font-family: var(--font-mono, ui-monospace, monospace);
}
.diff__result {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.diff__resizable {
  height: 420px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  overflow: hidden;
}
.diff__pane-card {
  height: 100%;
  border-radius: 0;
}
.diff__pane-body {
  height: 100%;
  padding: 0;
}
.diff__scroll {
  height: 100%;
}
.diff__row {
  display: flex;
  gap: 0.75rem;
  padding: 0.05rem 0.75rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.8125rem;
  line-height: 1.6;
  white-space: pre;
}
.diff__row--add {
  background: var(--success-subtle, rgba(34, 197, 94, 0.12));
}
.diff__row--remove {
  background: var(--danger-subtle, rgba(239, 68, 68, 0.12));
}
.diff__row--filler {
  background: repeating-linear-gradient(
    45deg,
    var(--border-subtle),
    var(--border-subtle) 6px,
    transparent 6px,
    transparent 12px
  );
  opacity: 0.4;
}
.diff__gutter {
  flex: none;
  min-width: 3ch;
  text-align: right;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  user-select: none;
}
.diff__code {
  color: var(--text-primary);
}
.diff__span--remove {
  background: color-mix(in srgb, var(--danger) 30%, transparent);
  color: var(--danger-text);
  border-radius: var(--radius-xs);
}
.diff__span--add {
  background: color-mix(in srgb, var(--success) 30%, transparent);
  color: var(--success-text);
  border-radius: var(--radius-xs);
}

@media (max-width: 640px) {
  .diff__inputs {
    grid-template-columns: 1fr;
  }
}
</style>
