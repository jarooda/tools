import { CATEGORY_ICON } from '@/lib/icons'

/**
 * The top-level tool categories. The `slug` is the first URL segment
 * (e.g. `/convert/temperature`) and the folder name under `app/pages/`.
 */
export type CategorySlug =
  | 'convert'
  | 'image'
  | 'pdf'
  | 'text'
  | 'encode'
  | 'generate'
  | 'color'
  | 'media'
  | 'dev'
  | 'network'
  | 'datetime'
  | 'math'

export interface Category {
  slug: CategorySlug
  title: string
  description: string
  /** MDI icon name from the central registry (`CATEGORY_ICON`). */
  icon: string
}

export const categories: Category[] = [
  {
    slug: 'convert',
    title: 'Converters',
    description: 'Convert between units, values, and number systems.',
    icon: CATEGORY_ICON.convert,
  },
  {
    slug: 'image',
    title: 'Image Tools',
    description: 'Resize, convert, compress, and edit images in your browser.',
    icon: CATEGORY_ICON.image,
  },
  {
    slug: 'pdf',
    title: 'PDF Tools',
    description: 'Merge, split, convert, and secure PDF documents locally.',
    icon: CATEGORY_ICON.pdf,
  },
  {
    slug: 'text',
    title: 'Text Tools',
    description: 'Count, transform, compare, and generate text.',
    icon: CATEGORY_ICON.text,
  },
  {
    slug: 'encode',
    title: 'Encode & Decode',
    description: 'Base64, URL, JSON, JWT, hashing, and other data formats.',
    icon: CATEGORY_ICON.encode,
  },
  {
    slug: 'generate',
    title: 'Generators',
    description: 'QR codes, passwords, UUIDs, placeholders, and more.',
    icon: CATEGORY_ICON.generate,
  },
  {
    slug: 'color',
    title: 'Color & Design',
    description: 'Convert colors, check contrast, and generate CSS.',
    icon: CATEGORY_ICON.color,
  },
  {
    slug: 'media',
    title: 'Audio & Video',
    description: 'Convert, trim, and extract media entirely in-browser.',
    icon: CATEGORY_ICON.media,
  },
  {
    slug: 'dev',
    title: 'Developer Tools',
    description: 'Format, test, and inspect code snippets, cron jobs, and configs.',
    icon: CATEGORY_ICON.dev,
  },
  {
    slug: 'network',
    title: 'Network & Performance',
    description: 'Check your connection, look up network info, and inspect endpoints.',
    icon: CATEGORY_ICON.network,
  },
  {
    slug: 'datetime',
    title: 'Date & Time',
    description: 'Convert timestamps, calculate durations, and work across time zones.',
    icon: CATEGORY_ICON.datetime,
  },
  {
    slug: 'math',
    title: 'Math & Finance',
    description: 'Calculate, convert, and plan — from scientific math to loans and interest.',
    icon: CATEGORY_ICON.math,
  },
]

const categoryBySlug = new Map(categories.map((c) => [c.slug, c]))

export function getCategory(slug: string): Category | undefined {
  return categoryBySlug.get(slug as CategorySlug)
}
