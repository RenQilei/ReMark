import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { toString } from 'mdast-util-to-string'
import { unified } from 'unified'
import type { Root } from 'mdast'

export interface DocumentHeading {
  level: number
  text: string
  offset: number
}

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath)

export function documentHeadings(markdown: string): DocumentHeading[] {
  const tree = parser.parse(markdown) as Root
  return tree.children.filter((node) => node.type === 'heading').map((node) => ({
    level: node.depth,
    text: toString(node),
    offset: node.position?.start.offset ?? 0,
  }))
}
