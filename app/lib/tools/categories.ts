/**
 * The 8 top-level tool categories. The `slug` is the first URL segment
 * (e.g. `/convert/temperature`) and the folder name under `app/pages/`.
 */
export type CategorySlug =
  'convert' | 'image' | 'pdf' | 'text' | 'encode' | 'generate' | 'color' | 'media'

export interface Category {
  slug: CategorySlug
  title: string
  description: string
  /** Emoji icon (kept dependency-free until an icon set is chosen). */
  icon: string
}

export const categories: Category[] = [
  {
    slug: 'convert',
    title: 'Converters',
    description: 'Convert between units, values, and number systems.',
    icon: '🔁',
  },
  {
    slug: 'image',
    title: 'Image Tools',
    description: 'Resize, convert, compress, and edit images in your browser.',
    icon: '🖼️',
  },
  {
    slug: 'pdf',
    title: 'PDF Tools',
    description: 'Merge, split, convert, and secure PDF documents locally.',
    icon: '📄',
  },
  {
    slug: 'text',
    title: 'Text Tools',
    description: 'Count, transform, compare, and generate text.',
    icon: '✍️',
  },
  {
    slug: 'encode',
    title: 'Encode & Decode',
    description: 'Base64, URL, JSON, JWT, hashing, and other data formats.',
    icon: '🔣',
  },
  {
    slug: 'generate',
    title: 'Generators',
    description: 'QR codes, passwords, UUIDs, placeholders, and more.',
    icon: '⚙️',
  },
  {
    slug: 'color',
    title: 'Color & Design',
    description: 'Convert colors, check contrast, and generate CSS.',
    icon: '🎨',
  },
  {
    slug: 'media',
    title: 'Audio & Video',
    description: 'Convert, trim, and extract media entirely in-browser.',
    icon: '🎬',
  },
]

const categoryBySlug = new Map(categories.map((c) => [c.slug, c]))

export function getCategory(slug: string): Category | undefined {
  return categoryBySlug.get(slug as CategorySlug)
}
