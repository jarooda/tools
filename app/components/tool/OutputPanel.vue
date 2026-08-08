<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { UI_ICON } from '@/lib/icons'

/**
 * Shared chrome for a compute-as-you-type output pane: an optional uppercase
 * label + action row, then one of the four required states — loading skeleton,
 * error, empty, or the result body (via the default slot). Used by any tool
 * whose "output" isn't a single textarea (TextWorkbench already covers that
 * shape) — stat grids, digest lists, JSON panels, diff views, and so on.
 */
withDefaults(
  defineProps<{
    /** Uppercase label above the panel. Omit to skip the head bar entirely. */
    label?: string
    ready?: boolean
    /** True once there's nothing to show (e.g. the input is empty). */
    empty?: boolean
    /** Error message; when set, replaces the body with a danger `Alert`. */
    error?: string | null
    emptyTitle?: string
    emptyDescription?: string
    /** Icon name for the empty state; defaults to `UI_ICON.emptyInput`. */
    emptyIcon?: string
    /**
     * Whether the result region announces itself to screen readers via
     * `aria-live="polite"`. Set to `false` for tools that recompute on every
     * keystroke (a raw textarea/input with a `watch`) so assistive tech
     * doesn't re-announce the whole result on each character typed. Leave
     * `true` (the default) for results that only update on a discrete action
     * (a button click, a "generate" call).
     */
    live?: boolean
  }>(),
  {
    label: '',
    ready: true,
    empty: false,
    error: null,
    live: true,
    emptyTitle: 'Nothing to show yet',
    emptyDescription: 'Enter some input to see the result.',
    emptyIcon: '',
  },
)
</script>

<template>
  <div class="op">
    <div v-if="label || $slots.actions" class="op__head">
      <h2 v-if="label" class="op__label">{{ label }}</h2>
      <div v-if="ready && !empty && !error && $slots.actions" class="op__actions">
        <slot name="actions" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="!ready" aria-hidden="true">
      <slot name="skeleton">
        <Skeleton variant="rect" width="100%" height="180px" radius="10px" />
      </slot>
    </div>

    <!-- Error -->
    <Alert v-else-if="error" tone="danger" aria-live="polite">{{ error }}</Alert>

    <!-- Empty -->
    <EmptyState
      v-else-if="empty"
      class="op__empty"
      bordered
      size="sm"
      :title="emptyTitle"
      :description="emptyDescription"
    >
      <template #icon><Icon :name="emptyIcon || UI_ICON.emptyInput" size="22" /></template>
    </EmptyState>

    <!-- Result -->
    <div v-else :aria-live="live ? 'polite' : 'off'">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.op {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.op__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 32px;
}
.op__label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.op__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.op__empty {
  width: 100%;
}
</style>
