import type { CategorySlug } from './categories'

/**
 * Central tool registry — the single source of truth for every tool.
 * Each entry drives the homepage grid, category pages, sidebar nav,
 * ⌘K command-palette search, and per-page SEO.
 *
 * Adding a tool = one entry here + its page file at
 * `app/pages/<category>/<slug>.vue`.
 */

/** Where processing happens: 🟢 client · 🟡 server · 🔵 hybrid. */
export type ProcessingTag = 'client' | 'server' | 'hybrid'

/** `live` = page exists and works. `planned` = registered but not built yet. */
export type ToolStatus = 'live' | 'planned'

export interface Tool {
  /** Globally unique id, also used as a stable key. */
  id: string
  title: string
  category: CategorySlug
  /** Path segment within the category, e.g. `temperature`. */
  slug: string
  tag: ProcessingTag
  description: string
  /** Extra search terms for ⌘K (title/description are always searched). */
  keywords: string[]
  status: ToolStatus
}

export const tools: Tool[] = [
  {
    id: 'temperature',
    title: 'Temperature Converter',
    category: 'convert',
    slug: 'temperature',
    tag: 'client',
    description: 'Convert between Celsius, Fahrenheit, and Kelvin.',
    keywords: ['celsius', 'fahrenheit', 'kelvin', 'c to f', 'degrees'],
    status: 'live',
  },
  {
    id: 'length',
    title: 'Length Converter',
    category: 'convert',
    slug: 'length',
    tag: 'client',
    description: 'Convert between meters, feet, miles, inches, and more.',
    keywords: ['distance', 'meters', 'feet', 'miles', 'inches', 'km'],
    status: 'live',
  },
  {
    id: 'weight',
    title: 'Weight Converter',
    category: 'convert',
    slug: 'weight',
    tag: 'client',
    description: 'Convert between kilograms, pounds, ounces, and grams.',
    keywords: ['mass', 'kg', 'pounds', 'lbs', 'ounces', 'grams'],
    status: 'live',
  },
  {
    id: 'volume',
    title: 'Volume Converter',
    category: 'convert',
    slug: 'volume',
    tag: 'client',
    description: 'Convert between litres, millilitres, gallons, cups, and more.',
    keywords: ['litres', 'liters', 'ml', 'gallons', 'cups', 'pints', 'quarts', 'fluid ounce'],
    status: 'live',
  },
  {
    id: 'area',
    title: 'Area Converter',
    category: 'convert',
    slug: 'area',
    tag: 'client',
    description: 'Convert between square metres, acres, hectares, square feet, and more.',
    keywords: ['square metre', 'acre', 'hectare', 'square feet', 'sq ft', 'land'],
    status: 'planned',
  },
  {
    id: 'speed',
    title: 'Speed Converter',
    category: 'convert',
    slug: 'speed',
    tag: 'client',
    description: 'Convert between km/h, mph, m/s, knots, and feet per second.',
    keywords: ['velocity', 'kmh', 'mph', 'knots', 'meters per second', 'ft/s'],
    status: 'planned',
  },
  {
    id: 'time',
    title: 'Time Converter',
    category: 'convert',
    slug: 'time',
    tag: 'client',
    description: 'Convert between seconds, minutes, hours, days, weeks, and years.',
    keywords: ['duration', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'],
    status: 'planned',
  },
  {
    id: 'data-storage',
    title: 'Data Storage Converter',
    category: 'convert',
    slug: 'data-storage',
    tag: 'client',
    description: 'Convert between bytes, KB, MB, GB, and TB.',
    keywords: ['bytes', 'kilobytes', 'megabytes', 'gigabytes', 'file size'],
    status: 'planned',
  },
  {
    id: 'number-base',
    title: 'Number Base Converter',
    category: 'convert',
    slug: 'number-base',
    tag: 'client',
    description: 'Convert between binary, octal, decimal, and hexadecimal.',
    keywords: ['binary', 'hex', 'octal', 'decimal', 'radix'],
    status: 'planned',
  },
  {
    id: 'base64',
    title: 'Base64 Encode / Decode',
    category: 'encode',
    slug: 'base64',
    tag: 'client',
    description: 'Encode text to Base64 or decode Base64 back to text.',
    keywords: ['base64', 'encode', 'decode', 'atob', 'btoa'],
    status: 'planned',
  },
  {
    id: 'uuid',
    title: 'UUID Generator',
    category: 'generate',
    slug: 'uuid',
    tag: 'client',
    description: 'Generate random RFC 4122 UUIDs (v4).',
    keywords: ['uuid', 'guid', 'unique id', 'random'],
    status: 'planned',
  },
]

/** Route path for a tool, e.g. `/convert/temperature`. */
export function toolRoute(tool: Tool): string {
  return `/${tool.category}/${tool.slug}`
}

const toolById = new Map(tools.map((t) => [t.id, t]))

export function getTool(id: string): Tool | undefined {
  return toolById.get(id)
}

export function toolsInCategory(category: CategorySlug): Tool[] {
  return tools.filter((t) => t.category === category)
}
