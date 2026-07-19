<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'

definePageMeta({ layout: 'tool' })

const tool = getTool('text-tts')!

const input = ref('Hello! This text will be read aloud by your browser.')
const rate = ref(1)
const pitch = ref(1)
const voiceName = ref('')

const supported = ref(true)
const speaking = ref(false)
const paused = ref(false)
const voices = ref<SpeechSynthesisVoice[]>([])

const voiceOptions = computed(() =>
  voices.value.map((v) => ({ value: v.name, label: `${v.name} (${v.lang})` })),
)

function loadVoices() {
  voices.value = window.speechSynthesis.getVoices()
  if (!voiceName.value && voices.value.length) {
    const preferred = voices.value.find((v) => v.default) ?? voices.value[0]
    voiceName.value = preferred?.name ?? ''
  }
}

onMounted(() => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    supported.value = false
    return
  }
  loadVoices()
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
})

onBeforeUnmount(() => {
  if (supported.value) {
    window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    window.speechSynthesis.cancel()
  }
})

function speak() {
  if (!supported.value || input.value.trim() === '') return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(input.value)
  const v = voices.value.find((x) => x.name === voiceName.value)
  if (v) u.voice = v
  u.rate = rate.value
  u.pitch = pitch.value
  u.onstart = () => {
    speaking.value = true
    paused.value = false
  }
  u.onend = () => {
    speaking.value = false
    paused.value = false
  }
  u.onerror = () => {
    speaking.value = false
    paused.value = false
  }
  window.speechSynthesis.speak(u)
}

function togglePause() {
  if (paused.value) {
    window.speechSynthesis.resume()
    paused.value = false
  } else {
    window.speechSynthesis.pause()
    paused.value = true
  }
}

function stop() {
  window.speechSynthesis.cancel()
  speaking.value = false
  paused.value = false
}
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!supported" class="tts">
      <EmptyState
        bordered
        title="Speech synthesis isn’t available"
        description="Your browser doesn’t support the Web Speech API. Try a recent version of Chrome, Edge, or Safari."
      >
        <template #icon><Icon :name="UI_ICON.volumeOff" size="24" /></template>
      </EmptyState>
    </div>

    <div v-else class="tts">
      <div class="tts__input">
        <span class="tts__label">Text to speak</span>
        <Textarea
          v-model="input"
          class="tts__area"
          placeholder="Type or paste text to read aloud…"
          auto-resize
          spellcheck="false"
        />
      </div>

      <div class="tts__controls">
        <Field label="Voice" class="tts__voice">
          <Select v-model="voiceName" :options="voiceOptions" placeholder="Default voice" />
        </Field>
        <Field :label="`Speed — ${rate.toFixed(1)}×`" class="tts__slider">
          <Slider v-model="rate" :min="0.5" :max="2" :step="0.1" />
        </Field>
        <Field :label="`Pitch — ${pitch.toFixed(1)}`" class="tts__slider">
          <Slider v-model="pitch" :min="0" :max="2" :step="0.1" />
        </Field>
      </div>

      <div class="tts__actions">
        <Button :disabled="input.trim() === ''" @click="speak">
          <template #icon><Icon :name="UI_ICON.play" size="18" /></template>
          Speak
        </Button>
        <Button variant="secondary" :disabled="!speaking" @click="togglePause">
          <template #icon>
            <Icon :name="paused ? UI_ICON.play : UI_ICON.pause" size="18" />
          </template>
          {{ paused ? 'Resume' : 'Pause' }}
        </Button>
        <Button variant="ghost" :disabled="!speaking" @click="stop">
          <template #icon><Icon :name="UI_ICON.stop" size="18" /></template>
          Stop
        </Button>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.tts {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.tts__input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.tts__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.tts__area {
  min-height: 180px;
}
.tts__controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: start;
}
.tts__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
