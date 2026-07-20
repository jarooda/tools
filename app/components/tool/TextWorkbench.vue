<script setup lang="ts">
import { computed } from 'vue'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Snippet } from '@/components/ui/snippet'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'

/**
 * Two-pane text workbench shared by the Text & Encode/Decode tools: an input
 * textarea on the left, a read-only output on the right that handles the three
 * required states (loading skeleton → empty → results/error) and offers copy +
 * download. Tool-specific options go in the `#controls` slot above the panes.
 */
const props = withDefaults(
  defineProps<{
    /** Input text (v-model). */
    modelValue: string
    /** Computed output to show on the right. */
    output?: string
    /** Error message; when set the output pane shows it in place of results. */
    error?: string | null
    ready?: boolean
    inputLabel?: string
    outputLabel?: string
    inputPlaceholder?: string
    emptyTitle?: string
    emptyDescription?: string
    /** Render the output in a monospace font (code-ish results). */
    mono?: boolean
    /**
     * Render the output as a JLDS `Snippet` code block (title bar, language
     * label, optional line numbers, built-in copy) instead of a plain `<pre>`.
     * Use for code-shaped results — JSON, XML/YAML, HTML, Base64, …
     */
    codeOutput?: boolean
    /** Language label shown in the Snippet bar (implies `codeOutput`'s bar). */
    language?: string
    /** Number the lines of the Snippet block. */
    lineNumbers?: boolean
    /** Filename used by the download button. */
    downloadName?: string
    /** MIME type used by the download button. */
    downloadMime?: string
    /** Hide the download button (some tools only want copy). */
    noDownload?: boolean
    inputInvalid?: boolean
  }>(),
  {
    output: '',
    error: null,
    ready: true,
    inputLabel: 'Input',
    outputLabel: 'Output',
    inputPlaceholder: 'Type or paste text here…',
    emptyTitle: 'Nothing to show yet',
    emptyDescription: 'Enter some text on the left to see the result.',
    mono: false,
    codeOutput: false,
    language: '',
    lineNumbers: false,
    downloadName: 'output.txt',
    downloadMime: 'text/plain;charset=utf-8',
    noDownload: false,
    inputInvalid: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const input = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})

const empty = computed(() => props.modelValue.trim() === '')

const { copy, copied } = useCopy()
const { downloadText } = useDownload()
</script>

<template>
  <div class="tw">
    <div v-if="$slots.controls" class="tw__controls">
      <slot name="controls" />
    </div>

    <div class="tw__panes">
      <!-- Input -->
      <div class="tw__pane">
        <span class="tw__label">{{ inputLabel }}</span>
        <Textarea
          v-model="input"
          class="tw__area"
          :invalid="inputInvalid"
          :placeholder="inputPlaceholder"
          auto-resize
          spellcheck="false"
        />
        <slot name="input-footer" />
      </div>

      <!-- Output -->
      <div class="tw__pane">
        <div class="tw__out-head">
          <span class="tw__label">{{ outputLabel }}</span>
          <div v-if="ready && !empty && !error && output" class="tw__actions">
            <slot name="actions" />
            <Button
              v-if="!noDownload"
              variant="ghost"
              size="sm"
              aria-label="Download output"
              @click="downloadText(output, downloadName, downloadMime)"
            >
              <template #icon><Icon :name="UI_ICON.download" size="15" /></template>
              Download
            </Button>
            <!-- Snippet ships its own copy button, so skip ours in code mode. -->
            <Button
              v-if="!codeOutput"
              variant="ghost"
              size="sm"
              aria-label="Copy output"
              @click="copy(output)"
            >
              <template #icon>
                <Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="15" />
              </template>
              {{ copied ? 'Copied' : 'Copy' }}
            </Button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="!ready" class="tw__skel" aria-hidden="true">
          <Skeleton variant="rect" width="100%" height="140px" radius="10px" />
        </div>

        <!-- Empty -->
        <EmptyState
          v-else-if="empty"
          class="tw__empty"
          bordered
          size="sm"
          :title="emptyTitle"
          :description="emptyDescription"
        >
          <template #icon><Icon :name="UI_ICON.emptyInput" size="22" /></template>
        </EmptyState>

        <!-- Error -->
        <p v-else-if="error" class="tw__error" role="alert">{{ error }}</p>

        <!-- Results -->
        <Snippet
          v-else-if="codeOutput"
          class="tw__code"
          variant="block"
          :code="output"
          :language="language"
          :line-numbers="lineNumbers"
        />
        <pre v-else class="tw__output" :class="{ 'tw__output--mono': mono }">{{ output }}</pre>

        <slot name="output-footer" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tw {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.tw__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.tw__panes {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.tw__pane {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}
.tw__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.tw__area {
  min-height: 220px;
}
.tw__out-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 32px;
}
.tw__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.tw__output {
  margin: 0;
  padding: 0.7rem 0.85rem;
  min-height: 220px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}
.tw__code {
  min-height: 220px;
}
.tw__output--mono {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.875rem;
}
.tw__error {
  margin: 0;
  padding: 0.7rem 0.85rem;
  min-height: 220px;
  border: 1px solid var(--danger-border, var(--warning));
  border-radius: var(--radius-control, 0.625rem);
  background: var(--danger-subtle, var(--warning-subtle));
  color: var(--danger-text, var(--warning-text));
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.tw__empty {
  width: 100%;
}

@media (max-width: 640px) {
  .tw__panes {
    grid-template-columns: 1fr;
  }
}
</style>
