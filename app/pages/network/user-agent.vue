<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Tag } from '@/components/ui/tag'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { useCopy } from '@/composables/useCopy'
import { parseUserAgent, type DeviceType } from '@/utils/userAgentParser'

definePageMeta({ layout: 'tool' })

const tool = getTool('network-user-agent')!

const input = ref('')
const originalUa = ref<string | null>(null)

onMounted(() => {
  const ua = navigator.userAgent
  originalUa.value = ua
  input.value = ua
})

const parsed = computed(() => parseUserAgent(input.value))

const canReset = computed(() => originalUa.value != null && input.value !== originalUa.value)

function resetToMyUa() {
  if (originalUa.value == null) return
  input.value = originalUa.value
}

const { copy, copied } = useCopy()

async function copyJson() {
  await copy(JSON.stringify(parsed.value, null, 2))
}

const DEVICE_TAG_COLOR: Record<Exclude<DeviceType, null>, 'neutral' | 'info' | 'warning'> = {
  desktop: 'neutral',
  mobile: 'info',
  tablet: 'info',
  bot: 'warning',
}

const DEVICE_TYPE_LABEL: Record<Exclude<DeviceType, null>, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
  bot: 'Bot',
}

const announcement = ref('')
let announceTimer: ReturnType<typeof setTimeout> | null = null

function announce() {
  if (announceTimer) clearTimeout(announceTimer)
  announceTimer = setTimeout(() => {
    if (!input.value.trim()) {
      announcement.value = 'Field cleared.'
      return
    }
    const p = parsed.value
    announcement.value = `Browser: ${p.browser.name ?? 'unknown'}. OS: ${p.os.name ?? 'unknown'}. Device: ${p.device.type ?? 'unknown'}.`
  }, 400)
}

watch(input, announce)
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <div class="uap">
      <div class="uap__input-row">
        <Field label="User-Agent string" class="uap__field">
          <Textarea v-model="input" rows="3" spellcheck="false" class="uap__textarea" />
        </Field>
      </div>

      <div class="uap__toolbar">
        <Tag color="success">No data sent</Tag>
        <Button
          v-if="originalUa"
          variant="ghost"
          size="sm"
          :disabled="!canReset"
          @click="resetToMyUa"
        >
          <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
          Use my browser's UA
        </Button>
      </div>

      <EmptyState
        v-if="!input.trim()"
        title="Paste a User-Agent string"
        description="Enter or paste a UA string to see its breakdown, or use your browser's own."
      >
        <template #icon><Icon :name="UI_ICON.emptyInput" size="22" /></template>
      </EmptyState>

      <template v-else>
        <div class="uap__results-header">
          <Button variant="ghost" size="sm" @click="copyJson">
            <template #icon>
              <Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
            {{ copied ? 'Copied' : 'Copy as JSON' }}
          </Button>
        </div>

        <div class="uap__grid">
          <Card elevation="flat">
            <CardHeader title="Browser">
              <template #icon><Icon :name="UI_ICON.browser" size="18" /></template>
            </CardHeader>
            <CardBody>
              <dl class="uap__dl">
                <div class="uap__row">
                  <dt>Name</dt>
                  <dd>{{ parsed.browser.name ?? '—' }}</dd>
                </div>
                <div class="uap__row">
                  <dt>Version</dt>
                  <dd>{{ parsed.browser.version ?? '—' }}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card elevation="flat">
            <CardHeader title="OS">
              <template #icon><Icon :name="UI_ICON.os" size="18" /></template>
            </CardHeader>
            <CardBody>
              <dl class="uap__dl">
                <div class="uap__row">
                  <dt>Name</dt>
                  <dd>{{ parsed.os.name ?? '—' }}</dd>
                </div>
                <div class="uap__row">
                  <dt>Version</dt>
                  <dd>{{ parsed.os.version ?? '—' }}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card elevation="flat">
            <CardHeader title="Device">
              <template #icon><Icon :name="UI_ICON.device" size="18" /></template>
            </CardHeader>
            <CardBody>
              <dl class="uap__dl">
                <div class="uap__row">
                  <dt>Type</dt>
                  <dd>
                    <Tag
                      :color="parsed.device.type ? DEVICE_TAG_COLOR[parsed.device.type] : 'neutral'"
                    >
                      {{ parsed.device.type ? DEVICE_TYPE_LABEL[parsed.device.type] : 'Unknown' }}
                    </Tag>
                  </dd>
                </div>
                <div class="uap__row">
                  <dt>Vendor</dt>
                  <dd>{{ parsed.device.vendor ?? '—' }}</dd>
                </div>
                <div class="uap__row">
                  <dt>Model</dt>
                  <dd>{{ parsed.device.model ?? '—' }}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card elevation="flat">
            <CardHeader title="Engine">
              <template #icon><Icon :name="UI_ICON.engine" size="18" /></template>
            </CardHeader>
            <CardBody>
              <dl class="uap__dl">
                <div class="uap__row">
                  <dt>Name</dt>
                  <dd>{{ parsed.engine.name ?? '—' }}</dd>
                </div>
                <div class="uap__row">
                  <dt>Version</dt>
                  <dd>{{ parsed.engine.version ?? '—' }}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>
      </template>
    </div>
  </ToolPage>
</template>

<style scoped>
.uap {
  display: flex;
  flex-direction: column;
  gap: var(--gap-loose);
}
.uap__field {
  width: 100%;
}
.uap__textarea {
  font-family: var(--font-mono);
  resize: none;
}
.uap__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.uap__results-header {
  display: flex;
  justify-content: flex-end;
}
.uap__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap-loose);
}
.uap__dl {
  margin: 0;
}
.uap__row {
  display: flex;
  gap: 1rem;
  padding: var(--gap-tight) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.uap__row:last-child {
  border-bottom: none;
}
.uap__row dt {
  flex: 0 0 70px;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
.uap__row dd {
  flex: 1;
  margin: 0;
  font-size: var(--text-base);
  color: var(--text-primary);
  overflow-wrap: anywhere;
}
</style>
