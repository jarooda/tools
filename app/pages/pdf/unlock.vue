<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-unlock')!
const { loadPdfCrypto, readBytes } = usePdf()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const busy = ref(false)
const error = ref('')
const password = ref('')
const showPassword = ref(false)

function onSelect(file: File) {
  error.value = ''
  outputBlob.value = null
  sourceFile.value = file
}

function reset() {
  sourceFile.value = null
  outputBlob.value = null
  password.value = ''
  error.value = ''
}

async function run() {
  const file = sourceFile.value
  if (!file) return
  busy.value = true
  error.value = ''
  outputBlob.value = null
  try {
    const { PDFDocument } = await loadPdfCrypto()
    // Load with the supplied password, then copy every page into a fresh, un-
    // encrypted document — a plain re-save would keep the encryption dictionary.
    const locked = await PDFDocument.load(await readBytes(file), { password: password.value })
    const out = await PDFDocument.create()
    const pages = await out.copyPages(locked, locked.getPageIndices())
    pages.forEach((p) => out.addPage(p))
    const bytes = await out.save()
    outputBlob.value = new Blob([bytes], { type: 'application/pdf' })
  } catch {
    error.value = password.value
      ? 'Wrong password, or this PDF can’t be unlocked.'
      : 'This PDF needs a password. Enter it above and try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ToolPage :tool="tool">
    <div v-if="!ready">
      <Skeleton variant="rect" width="100%" height="220px" radius="12px" />
    </div>

    <EmptyState
      v-else-if="!sourceFile"
      title="Remove a PDF password"
      description="Drop a PDF you can already open with its password — we save a decrypted copy, in your browser."
    >
      <template #icon><Icon :name="UI_ICON.lockOpen" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="ul__drop"
          accept="application/pdf,.pdf"
          hint="PDF file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="ul">
      <p class="ul__source">{{ sourceFile.name }}</p>

      <Field label="Current password" hint="The password you use to open this PDF.">
        <Input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="Enter the PDF’s password"
          @keyup.enter="run"
        >
          <template #trailing>
            <button
              type="button"
              class="ul__reveal"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              <Icon :name="showPassword ? UI_ICON.eyeOff : UI_ICON.eye" size="16" />
            </button>
          </template>
        </Input>
      </Field>

      <div class="ul__actions">
        <Button variant="primary" :disabled="busy" @click="run">
          <template #icon><Icon :name="UI_ICON.lockOpen" size="16" /></template>
          Remove password
        </Button>
        <Button variant="ghost" @click="reset">
          <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
          New file
        </Button>
      </div>

      <Progress v-if="busy" indeterminate label="Unlocking…" />

      <ResultActions v-if="outputBlob" :blob="outputBlob" filename="unlocked.pdf" no-copy />
    </div>

    <p v-if="error" class="ul__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.ul {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.ul__source {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.ul__reveal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0;
}
.ul__reveal:hover {
  color: var(--text-primary);
}
.ul__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ul__drop {
  width: 100%;
}
.ul__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
</style>
