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
    status: 'live',
  },
  {
    id: 'speed',
    title: 'Speed Converter',
    category: 'convert',
    slug: 'speed',
    tag: 'client',
    description: 'Convert between km/h, mph, m/s, knots, and feet per second.',
    keywords: ['velocity', 'kmh', 'mph', 'knots', 'meters per second', 'ft/s'],
    status: 'live',
  },
  {
    id: 'time',
    title: 'Time Converter',
    category: 'convert',
    slug: 'time',
    tag: 'client',
    description: 'Convert between seconds, minutes, hours, days, weeks, and years.',
    keywords: ['duration', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'],
    status: 'live',
  },
  {
    id: 'data-storage',
    title: 'Data Storage Converter',
    category: 'convert',
    slug: 'data-storage',
    tag: 'client',
    description: 'Convert between bytes, KB, MB, GB, and TB.',
    keywords: ['bytes', 'kilobytes', 'megabytes', 'gigabytes', 'file size'],
    status: 'live',
  },
  {
    id: 'number-base',
    title: 'Number Base Converter',
    category: 'convert',
    slug: 'number-base',
    tag: 'client',
    description: 'Convert between binary, octal, decimal, and hexadecimal.',
    keywords: ['binary', 'hex', 'octal', 'decimal', 'radix'],
    status: 'live',
  },
  {
    id: 'roman-numeral',
    title: 'Roman Numeral Converter',
    category: 'convert',
    slug: 'roman-numeral',
    tag: 'client',
    description: 'Convert numbers to Roman numerals and back (1–3999).',
    keywords: ['roman', 'numeral', 'mmxxiv', 'latin numbers'],
    status: 'live',
  },
  {
    id: 'timezone',
    title: 'Timezone Converter',
    category: 'convert',
    slug: 'timezone',
    tag: 'client',
    description: 'Convert a date and time between world time zones.',
    keywords: ['timezone', 'time zone', 'utc', 'gmt', 'world clock'],
    status: 'live',
  },
  {
    id: 'currency',
    title: 'Currency Converter',
    category: 'convert',
    slug: 'currency',
    tag: 'server',
    description: 'Convert between world currencies at recent exchange rates.',
    keywords: ['currency', 'money', 'exchange rate', 'forex', 'usd', 'eur'],
    status: 'live',
  },
  {
    id: 'image-watermark',
    title: 'Add Watermark',
    category: 'image',
    slug: 'watermark',
    tag: 'client',
    description: 'Overlay text watermarks on an image, with position and opacity control.',
    keywords: ['watermark', 'text overlay', 'copyright', 'stamp', 'brand'],
    status: 'live',
  },
  {
    id: 'image-resize',
    title: 'Resize Image',
    category: 'image',
    slug: 'resize',
    tag: 'client',
    description: 'Resize or scale an image by pixels or percentage, keeping aspect ratio.',
    keywords: ['resize', 'scale', 'dimensions', 'width', 'height', 'shrink', 'enlarge'],
    status: 'live',
  },
  {
    id: 'image-convert',
    title: 'Image Format Converter',
    category: 'image',
    slug: 'convert',
    tag: 'client',
    description: 'Convert images between PNG, JPG, WebP, and AVIF.',
    keywords: ['convert', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'format'],
    status: 'live',
  },
  {
    id: 'image-compress',
    title: 'Compress Image',
    category: 'image',
    slug: 'compress',
    tag: 'client',
    description: 'Shrink image file size with an adjustable quality slider.',
    keywords: ['compress', 'optimize', 'reduce size', 'quality', 'shrink'],
    status: 'live',
  },
  {
    id: 'image-crop',
    title: 'Crop Image',
    category: 'image',
    slug: 'crop',
    tag: 'client',
    description: 'Crop an image to a custom rectangle by dragging on the preview.',
    keywords: ['crop', 'trim', 'cut', 'rectangle', 'selection'],
    status: 'live',
  },
  {
    id: 'image-rotate',
    title: 'Rotate & Flip Image',
    category: 'image',
    slug: 'rotate',
    tag: 'client',
    description: 'Rotate an image in 90° steps and flip it horizontally or vertically.',
    keywords: ['rotate', 'flip', 'mirror', 'turn', 'orientation'],
    status: 'live',
  },
  {
    id: 'image-color-picker',
    title: 'Image Color Picker',
    category: 'image',
    slug: 'color-picker',
    tag: 'client',
    description: 'Pick colors from an image and read them as HEX, RGB, and HSL.',
    keywords: ['color picker', 'eyedropper', 'hex', 'rgb', 'hsl', 'sample'],
    status: 'live',
  },
  {
    id: 'image-base64',
    title: 'Image ↔ Base64',
    category: 'image',
    slug: 'base64',
    tag: 'client',
    description: 'Encode an image to a Base64 data URL, or decode one back to an image.',
    keywords: ['base64', 'data url', 'encode', 'decode', 'inline image'],
    status: 'live',
  },
  {
    id: 'image-favicon',
    title: 'Favicon Generator',
    category: 'image',
    slug: 'favicon',
    tag: 'client',
    description: 'Generate favicon PNGs and an .ico from a single source image.',
    keywords: ['favicon', 'ico', 'icon', 'app icon', 'apple touch'],
    status: 'live',
  },
  {
    id: 'image-meme',
    title: 'Meme Generator',
    category: 'image',
    slug: 'meme',
    tag: 'client',
    description: 'Add classic top and bottom captions to an image.',
    keywords: ['meme', 'caption', 'impact', 'top text', 'bottom text'],
    status: 'live',
  },
  {
    id: 'image-heic-to-jpg',
    title: 'HEIC to JPG',
    category: 'image',
    slug: 'heic-to-jpg',
    tag: 'hybrid',
    description: 'Convert Apple HEIC/HEIF photos to JPG, entirely in your browser.',
    keywords: ['heic', 'heif', 'apple', 'iphone photo', 'jpg', 'convert'],
    status: 'planned',
  },
  {
    id: 'image-remove-bg',
    title: 'Remove Background',
    category: 'image',
    slug: 'remove-bg',
    tag: 'hybrid',
    description: 'Cut out the background from an image to make it transparent.',
    keywords: ['remove background', 'transparent', 'cutout', 'subject', 'png'],
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
