<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert } from '@/components/ui/alert'
import { Tag } from '@/components/ui/tag'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { useMyIp } from '@/composables/useMyIp'

definePageMeta({ layout: 'tool' })

const tool = getTool('network-ip')!

const { status, ip, geo, error, refresh } = useMyIp()

const copied = ref(false)

async function copyIp() {
  if (!ip.value) return
  try {
    await navigator.clipboard.writeText(ip.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // Clipboard write can fail without permission — no fallback needed here.
  }
}

const coordinates = computed(() =>
  geo.value?.lat != null && geo.value?.lon != null ? `${geo.value.lat}, ${geo.value.lon}` : null,
)

const announcement = ref('')

watch(status, (s) => {
  if (s === 'done' && ip.value) {
    if (geo.value) {
      announcement.value = `Your IP address is ${ip.value}. Location: ${geo.value.city ?? '—'}, ${geo.value.region ?? '—'}, ${geo.value.country ?? '—'}.`
    } else {
      announcement.value = `Your IP address is ${ip.value}. Location details unavailable.`
    }
  } else if (s === 'error') {
    announcement.value = `Couldn't detect your IP address: ${error.value}`
  }
})
</script>

<template>
  <ToolPage :tool="tool">
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>

    <div v-if="status === 'loading'" class="ipt">
      <Skeleton variant="text" :width="140" :height="14" />
      <Skeleton variant="rect" :width="260" :height="44" />
      <Skeleton variant="text" :lines="4" />
    </div>

    <div v-else-if="status === 'error'" class="ipt">
      <Alert tone="danger" title="Couldn't detect your IP address">
        {{ error }}
        <template #action>
          <Button size="sm" @click="refresh">Retry</Button>
        </template>
      </Alert>
    </div>

    <div v-else class="ipt">
      <div class="ipt__headline">
        <span class="ipt__label">Your public IP</span>
        <div class="ipt__ip-row">
          <span class="ipt__ip">{{ ip }}</span>
          <Tag v-if="geo?.countryCode" color="neutral">{{ geo.countryCode }}</Tag>
          <Button variant="ghost" size="sm" @click="copyIp">
            <template #icon>
              <Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>
      </div>

      <dl v-if="geo" class="ipt__geo">
        <div class="ipt__row">
          <dt>City</dt>
          <dd>{{ geo.city ?? '—' }}</dd>
        </div>
        <div class="ipt__row">
          <dt>Region</dt>
          <dd>{{ geo.region ?? '—' }}</dd>
        </div>
        <div class="ipt__row">
          <dt>Country</dt>
          <dd>{{ geo.country ?? '—' }}</dd>
        </div>
        <div class="ipt__row">
          <dt>Timezone</dt>
          <dd>{{ geo.timezone ?? '—' }}</dd>
        </div>
        <div class="ipt__row">
          <dt>ISP / Org</dt>
          <dd>{{ geo.org ?? '—' }}</dd>
        </div>
        <div v-if="coordinates" class="ipt__row">
          <dt>Coordinates</dt>
          <dd>{{ coordinates }}</dd>
        </div>
      </dl>

      <Alert v-else tone="info">
        Location details aren't available right now — showing your IP only.
      </Alert>

      <p class="ipt__caveat">
        Looked up in real time when this page loads — nothing about your visit is stored or logged.
      </p>

      <Button variant="ghost" @click="refresh">
        <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
        Refresh
      </Button>
    </div>
  </ToolPage>
</template>

<style scoped>
.ipt {
  display: flex;
  flex-direction: column;
  gap: var(--gap-loose);
}
.ipt__headline {
  display: flex;
  flex-direction: column;
  gap: var(--gap-tight);
}
.ipt__label {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
.ipt__ip-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.ipt__ip {
  font-family: var(--font-mono);
  font-size: clamp(1.5rem, 5vw, var(--text-4xl));
  font-weight: var(--weight-bold);
  word-break: break-all;
}
.ipt__geo {
  margin: 0;
}
.ipt__row {
  display: flex;
  gap: 1rem;
  padding: var(--gap-tight) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.ipt__row dt {
  flex: 0 0 110px;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
.ipt__row dd {
  flex: 1;
  margin: 0;
  font-size: var(--text-base);
  color: var(--text-primary);
  overflow-wrap: anywhere;
}
.ipt__caveat {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

@media (max-width: 480px) {
  .ipt__row {
    flex-direction: column;
    gap: 0.25rem;
  }
  .ipt__row dt {
    flex-basis: auto;
  }
}
</style>
