<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import OutputPanel from '@/components/tool/OutputPanel.vue'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tag } from '@/components/ui/tag'
import { Tooltip } from '@/components/ui/tooltip'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/table'
import { UI_ICON } from '@/lib/icons'
import { getTool } from '@/lib/tools/registry'
import { testRegex, explainPattern, type MatchGroup } from '@/utils/regexTest'

definePageMeta({ layout: 'tool' })

const tool = getTool('dev-regex')!

const pattern = ref('')
const flags = ref('g')
const testString = ref('')

const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const FLAG_ORDER = ['g', 'i', 'm', 's', 'u', 'y'] as const
const FLAG_INFO: Record<(typeof FLAG_ORDER)[number], string> = {
  g: 'Global — find all matches, not just the first.',
  i: 'Case-insensitive — ignore letter case.',
  m: 'Multiline — ^ and $ match the start/end of each line.',
  s: 'Dot-all — . also matches line breaks.',
  u: 'Unicode — treat the pattern as a sequence of Unicode code points.',
  y: 'Sticky — match only starting at the exact last-match position.',
}

function toggleFlag(f: string) {
  flags.value = flags.value.includes(f) ? flags.value.replace(f, '') : flags.value + f
}

const result = computed(() => testRegex(pattern.value, flags.value, testString.value))
const matches = computed(() => result.value.matches)
const errorText = computed(() => result.value.error)
const explainRows = computed(() => explainPattern(pattern.value, flags.value))

const testEmpty = computed(() => pattern.value === '' || testString.value === '')
const explainEmpty = computed(() => pattern.value === '')

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const highlightedHtml = computed(() => {
  const text = testString.value
  if (text === '') return ''
  if (errorText.value || matches.value.length === 0) return escapeHtml(text)
  let html = ''
  let last = 0
  for (const m of matches.value) {
    html += escapeHtml(text.slice(last, m.index))
    const end = m.index + m.match.length
    html += `<mark>${escapeHtml(text.slice(m.index, end))}</mark>`
    last = end
  }
  html += escapeHtml(text.slice(last))
  // A trailing newline collapses to nothing in a <pre-wrap> div; pad it so the
  // backdrop keeps the same number of visual lines as the textarea above it.
  return text.endsWith('\n') ? `${html} ` : html
})

function groupLabel(g: MatchGroup): string {
  return `${g.name}:`
}

const activeTab = ref('matches')
const tabItems = computed(() => [
  { value: 'matches', label: 'Matches', count: matches.value.length },
  { value: 'explanation', label: 'Explanation' },
])

const matchesText = computed(() => matches.value.map((m) => m.match).join('\n'))
const explanationText = computed(() =>
  explainRows.value.map((r) => `${r.token}\t${r.description}`).join('\n'),
)

const { copy: copyMatches, copied: matchesCopied } = useCopy()
const { copy: copyExplanation, copied: explanationCopied } = useCopy()
</script>

<template>
  <ToolPage :tool="tool">
    <div class="rt">
      <div class="rt__controls">
        <Field label="Pattern" class="rt__pattern-field" :error="errorText || ''">
          <Input
            v-model="pattern"
            class="rt__pattern-input"
            :invalid="!!errorText"
            placeholder="e.g. ^[\w.+-]+@[\w-]+\.[a-z]{2,}$"
            spellcheck="false"
          />
        </Field>

        <Field label="Flags">
          <div class="rt__flags">
            <Tooltip v-for="f in FLAG_ORDER" :key="f" :content="FLAG_INFO[f]">
              <Tag
                :selected="flags.includes(f)"
                :color="flags.includes(f) ? 'brand' : 'neutral'"
                role="button"
                tabindex="0"
                :aria-pressed="flags.includes(f)"
                :aria-label="`${f} flag — ${FLAG_INFO[f]}`"
                @click="toggleFlag(f)"
                @keydown.enter.prevent="toggleFlag(f)"
                @keydown.space.prevent="toggleFlag(f)"
              >
                {{ f }}
              </Tag>
            </Tooltip>
          </div>
        </Field>
      </div>

      <div class="rt__test">
        <span class="rt__label">Test string</span>
        <div class="rt__highlight-wrap">
          <div class="rt__backdrop" aria-hidden="true" v-html="highlightedHtml" />
          <Textarea
            v-model="testString"
            class="rt__textarea"
            placeholder="Paste text to test against…"
            auto-resize
            spellcheck="false"
          />
        </div>
      </div>

      <Tabs v-model="activeTab" :items="tabItems" />

      <OutputPanel
        v-if="activeTab === 'matches'"
        :ready="ready"
        :empty="testEmpty"
        :error="errorText"
        :live="false"
        empty-title="Nothing to test yet"
        empty-description="Enter a pattern and some test text to see matches."
      >
        <template v-if="!testEmpty && !errorText && matches.length" #actions>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Copy matches"
            @click="copyMatches(matchesText)"
          >
            <template #icon>
              <Icon :name="matchesCopied ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
            {{ matchesCopied ? 'Copied' : 'Copy matches' }}
          </Button>
        </template>

        <EmptyState
          v-if="matches.length === 0"
          class="rt__no-matches"
          bordered
          size="sm"
          title="No matches"
          description="Nothing in the test string matches this pattern."
        >
          <template #icon><Icon :name="UI_ICON.search" size="22" /></template>
        </EmptyState>

        <Table v-else density="compact">
          <TableHead>
            <TableRow>
              <TableHeaderCell numeric>#</TableHeaderCell>
              <TableHeaderCell>Match</TableHeaderCell>
              <TableHeaderCell numeric>Index</TableHeaderCell>
              <TableHeaderCell>Groups</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow v-for="(m, i) in matches" :key="i">
              <TableCell numeric>{{ i + 1 }}</TableCell>
              <TableCell
                ><code class="rt__code">{{ m.match || '(empty)' }}</code></TableCell
              >
              <TableCell numeric>{{ m.index }}</TableCell>
              <TableCell>
                <span v-if="m.groups.length === 0" class="rt__muted">—</span>
                <div v-else class="rt__group-tags">
                  <Tag v-for="(g, gi) in m.groups" :key="gi" color="neutral">
                    {{ groupLabel(g) }}
                    <span v-if="g.value === undefined" class="rt__muted">(empty)</span>
                    <span v-else>{{ g.value }}</span>
                  </Tag>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </OutputPanel>

      <OutputPanel
        v-else
        :ready="ready"
        :empty="explainEmpty"
        :error="errorText"
        :live="false"
        empty-title="Nothing to explain yet"
        empty-description="Enter a pattern to see a plain-English explanation."
      >
        <template v-if="!explainEmpty && !errorText" #actions>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Copy explanation"
            @click="copyExplanation(explanationText)"
          >
            <template #icon>
              <Icon :name="explanationCopied ? UI_ICON.check : UI_ICON.copy" size="15" />
            </template>
            {{ explanationCopied ? 'Copied' : 'Copy explanation' }}
          </Button>
        </template>

        <ol class="rt__explain">
          <li v-for="(row, i) in explainRows" :key="i" class="rt__explain-row">
            <code class="rt__code rt__explain-token">{{ row.token }}</code>
            <span class="rt__explain-desc">{{ row.description }}</span>
          </li>
        </ol>
      </OutputPanel>
    </div>
  </ToolPage>
</template>

<style scoped>
.rt {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.rt__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}
.rt__pattern-field {
  flex: 1;
  min-width: 260px;
}
.rt__pattern-input :deep(input) {
  font-family: var(--font-mono);
}
.rt__flags {
  display: flex;
  gap: 0.4rem;
}
.rt__test {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.rt__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.rt__highlight-wrap {
  position: relative;
}
.rt__backdrop,
.rt__textarea {
  width: 100%;
  min-height: 140px;
  padding: var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-input);
  font-family: var(--font-mono);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
}
.rt__backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: var(--text-primary);
  border-color: transparent;
  pointer-events: none;
}
.rt__backdrop :deep(mark) {
  background: var(--accent-subtle);
  color: inherit;
  border-radius: var(--radius-xs);
}
.rt__textarea {
  position: relative;
  color: transparent;
  caret-color: var(--text-primary);
  background: transparent;
}
.rt__textarea::selection {
  background: var(--accent-subtle);
}
.rt__code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}
.rt__muted {
  color: var(--text-tertiary);
}
.rt__group-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.rt__no-matches {
  width: 100%;
}
.rt__explain {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rt__explain-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--surface-muted);
  border-radius: var(--radius-xs);
}
.rt__explain-token {
  flex: none;
  min-width: 3ch;
  color: var(--text-brand);
}
.rt__explain-desc {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

@media (max-width: 640px) {
  .rt__controls {
    flex-direction: column;
  }
}
</style>
