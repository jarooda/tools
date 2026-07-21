<script setup lang="ts">
import { computed, resolveComponent } from 'vue'
import ProcessingBadge from '@/components/tool/ProcessingBadge.vue'
import { Tooltip } from '@/components/ui/tooltip'
import { CATEGORY_ICON, UI_ICON } from '@/lib/icons'
import { toolRoute, type Tool } from '@/lib/tools/registry'

const props = defineProps<{ tool: Tool }>()
const to = toolRoute(props.tool)
const icon = computed(() => CATEGORY_ICON[props.tool.category])

const { isUnavailableOffline, offlineHint } = useOfflineTools()

const comingSoon = computed(() => props.tool.status !== 'live')
// Only meaningful for live tools — a planned one is already unreachable.
const offlineBlocked = computed(() => !comingSoon.value && isUnavailableOffline(props.tool))
const disabled = computed(() => comingSoon.value || offlineBlocked.value)

// Resolve the real NuxtLink component — passing the string "NuxtLink" to
// `<component :is>` fails to resolve during SSR and renders a plain element.
const NuxtLink = resolveComponent('NuxtLink')
const rootEl = computed(() => (disabled.value ? 'div' : NuxtLink))
</script>

<template>
  <component
    :is="rootEl"
    :to="disabled ? undefined : to"
    class="tool-card"
    :class="{ 'tool-card--disabled': disabled }"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <div class="tool-card__top">
      <span class="tool-card__icon" aria-hidden="true">
        <Icon :name="icon" size="19" />
      </span>
      <ProcessingBadge :tag="tool.tag" />
    </div>
    <div class="tool-card__body">
      <h3 class="tool-card__title">{{ tool.title }}</h3>
      <p class="tool-card__desc">{{ tool.description }}</p>
    </div>
    <span v-if="comingSoon" class="tool-card__soon">Coming soon</span>
    <!-- The hint hangs off the pill rather than the card: the card is a grid
         item, and the tooltip's inline-flex wrapper would collapse it. -->
    <Tooltip v-else-if="offlineBlocked" class="tool-card__offline-tip" :content="offlineHint(tool)">
      <span class="tool-card__offline">
        <Icon :name="UI_ICON.offline" size="13" />
        Unavailable offline
      </span>
    </Tooltip>
  </component>
</template>

<style scoped>
.tool-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  text-decoration: none;
  color: inherit;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  transition:
    border-color var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);
}
.tool-card:not(.tool-card--disabled):hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}
.tool-card--disabled {
  opacity: 0.6;
  cursor: default;
}
.tool-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.tool-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--surface-sunken);
  color: var(--text-secondary);
}
.tool-card__title {
  margin: 0 0 4px;
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary);
}
.tool-card__desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-tertiary);
}
.tool-card__soon {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
/* Full-sentence hint — wrap it instead of letting the default nowrap run past
   the card. Scoped to this one tooltip: a bare `.tool-card :deep(…)` also hits
   the ProcessingBadge tooltip nested in the card and squashes it into a narrow
   column, since its positioning context is only as wide as the badge. */
.tool-card__offline-tip :deep(.jl-tooltip__pop) {
  white-space: normal;
  /* max-content so the box grows to the 220px cap instead of shrink-to-fitting
     to the width of the pill it hangs off. */
  width: max-content;
  max-width: 220px;
  text-align: center;
}
.tool-card__offline {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 550;
  color: var(--text-tertiary);
}
</style>
