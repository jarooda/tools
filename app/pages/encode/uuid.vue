<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { NumberInput } from '@/components/ui/number-input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { uuidV4Batch } from '@/utils/uuid'

definePageMeta({ layout: 'tool' })

const tool = getTool('uuid')!

const count = ref<number | null>(5)
const uppercase = ref(false)
const hyphens = ref(true)

const raw = ref<string[]>([])
const ready = ref(false)

function generate() {
  raw.value = uuidV4Batch(count.value ?? 0)
}

onMounted(() => {
  generate()
  ready.value = true
})

const output = computed(() =>
  raw.value
    .map((u) => {
      let s = hyphens.value ? u : u.replace(/-/g, '')
      if (uppercase.value) s = s.toUpperCase()
      return s
    })
    .join('\n'),
)

const { copy, copied } = useCopy()
const { downloadText } = useDownload()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="uuid">
      <div class="uuid__controls">
        <Field label="How many" class="uuid__count">
          <NumberInput v-model="count" :min="1" :max="500" :step="1" align="left" />
        </Field>
        <div class="uuid__switches">
          <Switch v-model="uppercase" label="Uppercase" />
          <Switch v-model="hyphens" label="Hyphens" />
        </div>
        <Button variant="secondary" @click="generate">
          <template #icon><Icon :name="UI_ICON.reset" size="16" /></template>
          Regenerate
        </Button>
      </div>

      <div class="uuid__out">
        <div class="uuid__out-head">
          <span class="uuid__label">{{ raw.length }} UUID{{ raw.length === 1 ? '' : 's' }}</span>
          <div v-if="ready && output" class="uuid__actions">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Download UUIDs"
              @click="downloadText(output, 'uuids.txt')"
            >
              <template #icon><Icon :name="UI_ICON.download" size="15" /></template>
              Download
            </Button>
            <Button variant="ghost" size="sm" aria-label="Copy UUIDs" @click="copy(output)">
              <template #icon>
                <Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="15" />
              </template>
              {{ copied ? 'Copied' : 'Copy' }}
            </Button>
          </div>
        </div>

        <div v-if="!ready" aria-hidden="true">
          <Skeleton variant="rect" width="100%" height="180px" radius="10px" />
        </div>
        <pre v-else class="uuid__text">{{ output }}</pre>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.uuid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.uuid__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.uuid__count {
  min-width: 120px;
}
.uuid__switches {
  display: flex;
  gap: 1rem;
  padding-bottom: 0.5rem;
}
.uuid__out {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.uuid__out-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 32px;
}
.uuid__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.uuid__actions {
  display: flex;
  gap: 0.25rem;
}
.uuid__text {
  margin: 0;
  padding: 0.85rem 1rem;
  min-height: 180px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-card);
  color: var(--text-primary);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.875rem;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
