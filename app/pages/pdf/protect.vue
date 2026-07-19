<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import ResultActions from '@/components/tool/ResultActions.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-protect')!
const { loadPdfCrypto, readBytes } = usePdf()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const outputBlob = shallowRef<Blob | null>(null)
const busy = ref(false)
const error = ref('')

const password = ref('')
const confirm = ref('')
const showPassword = ref(false)
const allowPrinting = ref(true)
const allowCopying = ref(false)

const mismatch = computed(() => confirm.value.length > 0 && password.value !== confirm.value)
const canSubmit = computed(
  () => !!sourceFile.value && password.value.length >= 3 && password.value === confirm.value,
)

function onSelect(file: File) {
  error.value = ''
  outputBlob.value = null
  sourceFile.value = file
}

function reset() {
  sourceFile.value = null
  outputBlob.value = null
  password.value = ''
  confirm.value = ''
  error.value = ''
}

async function run() {
  const file = sourceFile.value
  if (!file || !canSubmit.value) return
  busy.value = true
  error.value = ''
  outputBlob.value = null
  try {
    const { PDFDocument } = await loadPdfCrypto()
    const doc = await PDFDocument.load(await readBytes(file))
    doc.encrypt({
      userPassword: password.value,
      ownerPassword: password.value,
      permissions: {
        printing: allowPrinting.value ? 'highResolution' : undefined,
        copying: allowCopying.value,
        modifying: false,
      },
    })
    const bytes = await doc.save()
    outputBlob.value = new Blob([bytes], { type: 'application/pdf' })
  } catch {
    error.value = 'Could not encrypt this PDF. It may already be password-protected.'
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
      title="Password-protect a PDF"
      description="Drop a PDF and set a password — it’s encrypted (AES) in your browser, never uploaded."
    >
      <template #icon><Icon :name="UI_ICON.lock" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="pr__drop"
          accept="application/pdf,.pdf"
          hint="PDF file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="pr">
      <p class="pr__source">{{ sourceFile.name }}</p>

      <Field
        label="Password"
        :error="password.length > 0 && password.length < 3 ? 'At least 3 characters.' : ''"
      >
        <Input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="Enter a password"
        >
          <template #trailing>
            <button
              type="button"
              class="pr__reveal"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              <Icon :name="showPassword ? UI_ICON.eyeOff : UI_ICON.eye" size="16" />
            </button>
          </template>
        </Input>
      </Field>

      <Field label="Confirm password" :error="mismatch ? 'Passwords don’t match.' : ''">
        <Input
          v-model="confirm"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="Re-enter the password"
        />
      </Field>

      <div class="pr__perms">
        <Switch v-model="allowPrinting" label="Allow printing" />
        <Switch v-model="allowCopying" label="Allow copying text" />
      </div>

      <div class="pr__actions">
        <Button variant="primary" :disabled="busy || !canSubmit" @click="run">
          <template #icon><Icon :name="UI_ICON.lock" size="16" /></template>
          Encrypt PDF
        </Button>
        <Button variant="ghost" @click="reset">
          <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
          New file
        </Button>
      </div>

      <Progress v-if="busy" indeterminate label="Encrypting…" />

      <ResultActions v-if="outputBlob" :blob="outputBlob" filename="protected.pdf" no-copy />
    </div>

    <p v-if="error" class="pr__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.pr {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.pr__source {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.pr__reveal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0;
}
.pr__reveal:hover {
  color: var(--text-primary);
}
.pr__perms {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.pr__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.pr__drop {
  width: 100%;
}
.pr__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
</style>
