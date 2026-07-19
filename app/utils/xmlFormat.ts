/**
 * XML pretty-printer — pure, DOM-free logic (unit-tested in `test/`).
 * A lightweight, well-formed-input formatter: it re-indents tags without a
 * full parser. It does not validate XML — malformed input is passed through
 * best-effort. (YAML/JSON conversion lives in the page via lazy js-yaml.)
 */

export type XmlIndent = 2 | 4 | 'tab'

function indentUnit(indent: XmlIndent): string {
  return indent === 'tab' ? '\t' : ' '.repeat(indent)
}

/** Re-indent XML by one level per open tag. Returns the formatted string. */
export function formatXml(xml: string, indent: XmlIndent = 2): string {
  const unit = indentUnit(indent)
  const trimmed = xml.trim()
  if (trimmed === '') return ''

  // Put each tag on its own line, keeping text content with its tags.
  const withBreaks = trimmed.replace(/>\s*</g, '>\n<')
  const lines = withBreaks.split('\n')

  let depth = 0
  const out: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') continue

    const isClosing = /^<\//.test(line)
    const isSelfClosing = /\/>$/.test(line) || /^<\?/.test(line) || /^<!/.test(line)
    // A line that opens and closes the same tag, e.g. <a>text</a>.
    const isOpenClose = /^<[^!?][^>]*>.*<\/[^>]+>$/.test(line)

    if (isClosing) depth = Math.max(0, depth - 1)

    out.push(unit.repeat(depth) + line)

    if (!isClosing && !isSelfClosing && !isOpenClose && /^<[^!?]/.test(line)) depth++
  }

  return out.join('\n')
}
