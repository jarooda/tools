/**
 * JSON → TypeScript interface generator — pure, DOM-free logic (unit-tested
 * in `test/`). Hand-rolled (no `quicktype-core`) since we only need one
 * focused JSON→TS inferencer, not a multi-language codegen pipeline.
 *
 * Two-phase design:
 *   1. `inferFromSamples` walks the parsed JSON bottom-up into an unnamed
 *      `TypeNode` tree (objects carry their field list, not a name yet).
 *      Structural equality between two object nodes is decided purely from
 *      this tree via `signature()`, independent of naming/traversal order.
 *   2. `resolveType` walks that tree top-down (root first, depth-first, in
 *      property-declaration order) to mint interface names, dedup
 *      structurally-identical shapes by signature, and collect them in
 *      declaration order.
 */

export type DeclarationStyle = 'interface' | 'type'

export interface JsonToTsOptions {
  rootName: string
  declarationStyle: DeclarationStyle
  semicolons: boolean
  readonly: boolean
  /** Fields ever seen as `null` become optional and gain a `| null` member. */
  nullOptional: boolean
}

export interface JsonToTsResult {
  output: string
  error: string | null
}

type TypeNode =
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'null' }
  | { kind: 'unknown' }
  | { kind: 'array'; element: TypeNode }
  | { kind: 'object'; fields: ObjectField[] }
  | { kind: 'union'; members: TypeNode[] }

interface ObjectField {
  key: string
  type: TypeNode
  optional: boolean
}

interface ResolvedField {
  key: string
  optional: boolean
  typeStr: string
}

interface ResolvedInterface {
  name: string
  fields: ResolvedField[]
}

interface NamingContext {
  interfaces: ResolvedInterface[]
  bySignature: Map<string, string>
  nameCounts: Map<string, number>
}

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

const IRREGULAR_SINGULARS: Record<string, string> = {
  children: 'child',
  people: 'person',
  men: 'man',
  women: 'woman',
  teeth: 'tooth',
  feet: 'foot',
  mice: 'mouse',
  geese: 'goose',
}

const UNCOUNTABLE = new Set(['data', 'news', 'series', 'species', 'status', 'info', 'metadata'])

export function singularize(word: string): string {
  const lower = word.toLowerCase()
  if (UNCOUNTABLE.has(lower)) return word
  if (IRREGULAR_SINGULARS[lower]) return IRREGULAR_SINGULARS[lower]
  if (/ies$/i.test(word) && word.length > 3) return `${word.slice(0, -3)}y`
  if (/(ses|xes|zes|ches|shes)$/i.test(word)) return word.slice(0, -2)
  if (/s$/i.test(word) && !/ss$/i.test(word) && word.length > 1) return word.slice(0, -1)
  return word
}

export function pascalCase(str: string): string {
  const parts = str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
  if (parts.length === 0) return 'Field'
  const name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('')
  return /^[0-9]/.test(name) ? `_${name}` : name
}

function isValidIdentifier(name: string): boolean {
  return IDENTIFIER_RE.test(name)
}

/** Build an unnamed type tree from one or more samples occupying the same slot. */
function inferFromSamples(values: unknown[]): TypeNode {
  const nodes: TypeNode[] = []
  let sawString = false
  let sawNumber = false
  let sawBoolean = false
  let sawNull = false
  const objectSamples: Record<string, unknown>[] = []
  const arraySamples: unknown[][] = []

  for (const value of values) {
    if (value === null) sawNull = true
    else if (typeof value === 'string') sawString = true
    else if (typeof value === 'number') sawNumber = true
    else if (typeof value === 'boolean') sawBoolean = true
    else if (Array.isArray(value)) arraySamples.push(value)
    else if (typeof value === 'object') objectSamples.push(value as Record<string, unknown>)
  }

  if (sawString) nodes.push({ kind: 'string' })
  if (sawNumber) nodes.push({ kind: 'number' })
  if (sawBoolean) nodes.push({ kind: 'boolean' })

  if (objectSamples.length > 0) {
    const keyOrder: string[] = []
    const seenKeys = new Set<string>()
    for (const obj of objectSamples) {
      for (const key of Object.keys(obj)) {
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          keyOrder.push(key)
        }
      }
    }
    const fields: ObjectField[] = keyOrder.map((key) => {
      const present = objectSamples.filter((obj) => Object.prototype.hasOwnProperty.call(obj, key))
      const type = inferFromSamples(present.map((obj) => obj[key]))
      return { key, type, optional: present.length < objectSamples.length }
    })
    nodes.push({ kind: 'object', fields })
  }

  if (arraySamples.length > 0) {
    const items = arraySamples.flat()
    const element: TypeNode = items.length > 0 ? inferFromSamples(items) : { kind: 'unknown' }
    nodes.push({ kind: 'array', element })
  }

  if (sawNull) nodes.push({ kind: 'null' })

  if (nodes.length === 0) return { kind: 'unknown' }
  if (nodes.length === 1) return nodes[0]!
  return { kind: 'union', members: nodes }
}

/** Pure structural signature, independent of naming/registration order. */
function signature(node: TypeNode): string {
  switch (node.kind) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'null':
    case 'unknown':
      return node.kind
    case 'array':
      return `array<${signature(node.element)}>`
    case 'union':
      return `union<${node.members.map(signature).sort().join(',')}>`
    case 'object':
      return `object<${node.fields
        .map((f) => `${f.key}${f.optional ? '?' : ''}:${signature(f.type)}`)
        .join(',')}>`
  }
}

/**
 * Resolve a field's raw type against the null-optional toggle: a bare `null`
 * becomes `unknown` (optional per the toggle); a union containing `null`
 * either loses the member and gains `?` (toggle on) or keeps `| null` as a
 * non-optional member (toggle off).
 */
function resolveFieldType(
  node: TypeNode,
  options: JsonToTsOptions,
): { type: TypeNode; optional: boolean } {
  if (node.kind === 'null') return { type: { kind: 'unknown' }, optional: options.nullOptional }
  if (node.kind !== 'union') return { type: node, optional: false }

  const hasNull = node.members.some((m) => m.kind === 'null')
  if (!hasNull) return { type: node, optional: false }

  const rest = node.members.filter((m) => m.kind !== 'null')
  const withoutNull: TypeNode = rest.length === 1 ? rest[0]! : { kind: 'union', members: rest }
  if (options.nullOptional) return { type: withoutNull, optional: true }
  return { type: { kind: 'union', members: [...rest, { kind: 'null' }] }, optional: false }
}

function mintObjectName(candidateBase: string, ctx: NamingContext): string {
  const count = ctx.nameCounts.get(candidateBase) ?? 0
  ctx.nameCounts.set(candidateBase, count + 1)
  return count === 0 ? candidateBase : `${candidateBase}${count + 1}`
}

function registerObject(
  node: Extract<TypeNode, { kind: 'object' }>,
  name: string,
  sig: string,
  ctx: NamingContext,
  options: JsonToTsOptions,
): string {
  ctx.bySignature.set(sig, name)
  const resolved: ResolvedInterface = { name, fields: [] }
  ctx.interfaces.push(resolved)

  resolved.fields = node.fields.map((f) => {
    const { type, optional: nullOptional } = resolveFieldType(f.type, options)
    const typeStr = resolveType(type, f.key, ctx, options)
    return { key: f.key, optional: f.optional || nullOptional, typeStr }
  })

  return name
}

function resolveType(
  node: TypeNode,
  nameHint: string,
  ctx: NamingContext,
  options: JsonToTsOptions,
): string {
  switch (node.kind) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'null':
      return 'null'
    case 'unknown':
      return 'unknown'
    case 'array': {
      const elType = resolveType(node.element, singularize(nameHint), ctx, options)
      return node.element.kind === 'union' ? `(${elType})[]` : `${elType}[]`
    }
    case 'union':
      return [...new Set(node.members.map((m) => resolveType(m, nameHint, ctx, options)))].join(
        ' | ',
      )
    case 'object': {
      const sig = signature(node)
      const existing = ctx.bySignature.get(sig)
      if (existing) return existing
      const name = mintObjectName(pascalCase(nameHint), ctx)
      return registerObject(node, name, sig, ctx, options)
    }
  }
}

function renderInterface(iface: ResolvedInterface, options: JsonToTsOptions): string {
  const readonlyPrefix = options.readonly ? 'readonly ' : ''
  const semi = options.semicolons ? ';' : ''
  const lines = iface.fields.map((f) => {
    const propKey = IDENTIFIER_RE.test(f.key) ? f.key : JSON.stringify(f.key)
    const opt = f.optional ? '?' : ''
    return `  ${readonlyPrefix}${propKey}${opt}: ${f.typeStr}${semi}`
  })

  if (options.declarationStyle === 'type') {
    const body = lines.length > 0 ? `{\n${lines.join('\n')}\n}` : '{}'
    return `type ${iface.name} = ${body}${semi}`
  }
  if (lines.length === 0) return `interface ${iface.name} {}`
  return `interface ${iface.name} {\n${lines.join('\n')}\n}`
}

/** Generate TypeScript interfaces/type aliases from a sample JSON value. Never throws. */
export function jsonToTypeScript(input: string, options: JsonToTsOptions): JsonToTsResult {
  if (input.trim() === '') return { output: '', error: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (err) {
    return { output: '', error: err instanceof SyntaxError ? err.message : 'Invalid JSON.' }
  }

  const rootName = isValidIdentifier(options.rootName) ? options.rootName : 'RootObject'
  const rootNode = inferFromSamples([parsed])
  const ctx: NamingContext = { interfaces: [], bySignature: new Map(), nameCounts: new Map() }

  // Reserve the root identifier up front so a nested shape that would
  // otherwise mint the same name (e.g. a root array of objects deriving its
  // element name from a singularized root name) gets suffixed instead of
  // colliding with the root declaration.
  ctx.nameCounts.set(rootName, 1)

  if (rootNode.kind !== 'object') {
    const typeStr = resolveType(rootNode, rootName, ctx, options)
    const semi = options.semicolons ? ';' : ''
    const rootDecl = `type ${rootName} = ${typeStr}${semi}`
    const nested = ctx.interfaces.map((iface) => renderInterface(iface, options))
    return { output: [rootDecl, ...nested].join('\n\n'), error: null }
  }

  const sig = signature(rootNode)
  registerObject(rootNode, rootName, sig, ctx, options)

  const output = ctx.interfaces.map((iface) => renderInterface(iface, options)).join('\n\n')
  return { output, error: null }
}
