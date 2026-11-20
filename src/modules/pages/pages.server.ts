import { type DocFrontmatter, parseDocFile } from '@/modules/docs/lib/frontmatter'

/**
 * Registry for this installation's standalone pages (About and the legal
 * pages), served at root-level paths. The markdown is bundled at build time
 * with `import.meta.glob`, as the docs are. A page's slug is its filename
 * stem, or the frontmatter `slug`/`path` when set.
 */

const SOURCES = import.meta.glob('/src/content/pages/*.{md,markdown}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export interface Page {
  slug: string
  frontmatter: DocFrontmatter
  body: string
}

const pages = (() => {
  const map = new Map<string, Page>()
  for (const [filePath, source] of Object.entries(SOURCES)) {
    const { frontmatter, body } = parseDocFile(source, filePath)
    const stem = (filePath.split('/').pop() ?? filePath).replace(/\.(md|markdown)$/, '')
    const slug = frontmatter.slug ?? stem
    if (map.has(slug)) throw new Error(`pages registry: duplicate slug '${slug}' (in ${filePath})`)
    map.set(slug, { slug, frontmatter, body })
  }
  return map
})()

export const getPage = (slug: string): Page | null => pages.get(slug) ?? null
