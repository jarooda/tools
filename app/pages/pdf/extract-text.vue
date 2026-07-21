<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import FileDropzone from '@/components/tool/FileDropzone.vue'
import PdfPreview from '@/components/tool/PdfPreview.vue'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'

definePageMeta({ layout: 'tool' })

const tool = getTool('pdf-extract-text')!
const { openForRender, closeDoc } = usePdf()
const { downloadText } = useDownload()
const { copy, copied } = useCopy()

const ready = ref(false)
onMounted(() => (ready.value = true))

const sourceFile = shallowRef<File | null>(null)
const text = ref('')
const busy = ref(false)
const progress = ref(0)
const total = ref(0)
const error = ref('')
const pageBreaks = ref(true)

const empty = computed(() => !!sourceFile.value && !busy.value && text.value.trim() === '')
const baseName = computed(() => (sourceFile.value?.name || 'document').replace(/\.pdf$/i, ''))
const charCount = computed(() => text.value.length)

function onSelect(file: File) {
  error.value = ''
  text.value = ''
  sourceFile.value = file
  extract()
}

function reset() {
  sourceFile.value = null
  text.value = ''
  error.value = ''
  progress.value = 0
  total.value = 0
}

let runId = 0
async function extract() {
  const file = sourceFile.value
  if (!file) return
  const myRun = ++runId
  busy.value = true
  error.value = ''
  text.value = ''
  progress.value = 0
  try {
    const doc = await openForRender(file)
    total.value = doc.numPages
    const parts: string[] = []
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      const line = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+\n/g, '\n')
      parts.push(pageBreaks.value ? `--- Page ${p} ---\n${line}` : line)
      if (myRun !== runId) return
      progress.value = p
    }
    await closeDoc(doc)
    if (myRun !== runId) return
    text.value = parts.join('\n\n').trim()
  } catch {
    if (myRun !== runId) return
    error.value = 'Could not read this PDF. It may be encrypted or invalid.'
  } finally {
    if (myRun === runId) busy.value = false
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
      title="Extract text from a PDF"
      description="Drop a PDF — its selectable text is pulled out page by page, in your browser."
    >
      <template #icon><Icon :name="UI_ICON.emptyFile" size="24" /></template>
      <template #actions>
        <FileDropzone
          class="ex__drop"
          accept="application/pdf,.pdf"
          hint="PDF file"
          @select="onSelect"
        />
      </template>
    </EmptyState>

    <div v-else class="ex">
      <div class="ex__file">
        <div class="ex__bar">
          <span class="ex__source">{{ sourceFile.name }}</span>
          <Switch v-model="pageBreaks" label="Page markers" @update:model-value="extract" />
        </div>
        <PdfPreview :file="sourceFile" />
      </div>

      <Progress
        v-if="busy"
        :value="total ? (progress / total) * 100 : 0"
        :label="`Reading page ${progress} of ${total}…`"
      />

      <EmptyState
        v-else-if="empty"
        title="No selectable text"
        description="This PDF has no embedded text — it may be a scan or image-only. OCR isn’t supported here."
      >
        <template #icon><Icon :name="UI_ICON.emptyInput" size="24" /></template>
      </EmptyState>

      <template v-else>
        <textarea class="ex__out" :value="text" readonly spellcheck="false"></textarea>
        <div class="ex__actions">
          <span class="ex__count">{{ charCount.toLocaleString() }} characters</span>
          <div class="ex__actions-btns">
            <Button variant="ghost" size="sm" @click="reset">
              <template #icon><Icon :name="UI_ICON.reset" size="15" /></template>
              New file
            </Button>
            <Button variant="ghost" size="sm" @click="copy(text)">
              <template #icon
                ><Icon :name="copied ? UI_ICON.check : UI_ICON.copy" size="15"
              /></template>
              {{ copied ? 'Copied' : 'Copy' }}
            </Button>
            <Button variant="primary" size="sm" @click="downloadText(text, `${baseName}.txt`)">
              <template #icon><Icon :name="UI_ICON.download" size="15" /></template>
              Download .txt
            </Button>
          </div>
        </div>
      </template>
    </div>

    <p v-if="error" class="ex__error" role="alert">{{ error }}</p>
  </ToolPage>
</template>

<style scoped>
.ex {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.ex__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.ex__file {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.ex__source {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  word-break: break-all;
}
.ex__out {
  width: 100%;
  min-height: 320px;
  padding: 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control, 0.625rem);
  background: var(--surface-sunken, #f4f4f8);
  color: var(--text-primary);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.8125rem;
  line-height: 1.55;
  resize: vertical;
}
.ex__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.ex__count {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}
.ex__actions-btns {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}
.ex__drop {
  width: 100%;
}
.ex__error {
  margin: 1rem 0 0;
  color: var(--danger-text, var(--danger));
  font-size: 0.875rem;
}
</style>
