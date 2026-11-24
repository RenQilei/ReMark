import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { Root, RootContent } from 'mdast'
import type { EditorAnchor, EditorMode } from '../../../shared/documents'

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath)

function children(markdown: string): RootContent[] {
  return (parser.parse(markdown) as Root).children
}

function start(node: RootContent): number {
  return node.position?.start.offset ?? 0
}

function end(node: RootContent): number {
  return node.position?.end.offset ?? start(node)
}

export function anchorAtSourceOffset(markdown: string, offset: number, mode: EditorMode): EditorAnchor {
  const blocks = children(markdown)
  const clamped = Math.max(0, Math.min(markdown.length, offset))
  let selectedIndex = blocks.findIndex((node) => start(node) <= clamped && clamped <= end(node))
  if (selectedIndex < 0 && blocks.length > 0) {
    selectedIndex = blocks.reduce((nearest, node, index) => {
      const distance = Math.min(Math.abs(start(node) - clamped), Math.abs(end(node) - clamped))
      const current = blocks[nearest]
      const currentDistance = Math.min(Math.abs(start(current) - clamped), Math.abs(end(current) - clamped))
      return distance < currentDistance ? index : nearest
    }, 0)
  }
  const selected = selectedIndex >= 0 ? blocks[selectedIndex] : null
  return {
    mode,
    sourceOffset: clamped,
    blockPath: selected ? `root.children.${selectedIndex}` : null,
    inlineOffset: selected ? Math.max(0, clamped - start(selected)) : null,
  }
}

export function sourceOffsetForAnchor(markdown: string, anchor: EditorAnchor): number {
  const blocks = children(markdown)
  const match = /^root\.children\.(\d+)$/.exec(anchor.blockPath ?? '')
  const index = match ? Number(match[1]) : -1
  if (index >= 0 && blocks[index]) {
    const node = blocks[index]
    return Math.min(end(node), start(node) + Math.max(0, anchor.inlineOffset ?? 0))
  }
  return Math.max(0, Math.min(markdown.length, anchor.sourceOffset ?? markdown.length))
}
