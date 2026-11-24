import { describe, expect, it } from 'vitest'
import { anchorAtSourceOffset, sourceOffsetForAnchor } from '../../src/renderer/editor/markdown/anchors'

const markdown = '# Title\n\nParagraph with **bold** text.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst value = 1\n```\n\n$$\na + b = c\n$$\n'

describe('editor source anchors', () => {
  it('maps offsets to the containing structural block', () => {
    const offset = markdown.indexOf('**bold**') + 2
    const anchor = anchorAtSourceOffset(markdown, offset, 'source')
    expect(anchor.blockPath).toBe('root.children.1')
    expect(anchor.sourceOffset).toBe(offset)
    expect(sourceOffsetForAnchor(markdown, anchor)).toBe(offset)
  })

  it.each([
    ['| 1 | 2 |', 'root.children.2'],
    ['const value', 'root.children.3'],
    ['a + b = c', 'root.children.4'],
  ])('finds %s in %s', (needle, blockPath) => {
    const anchor = anchorAtSourceOffset(markdown, markdown.indexOf(needle), 'source')
    expect(anchor.blockPath).toBe(blockPath)
  })

  it('falls back to the nearest block after content changes', () => {
    const anchor = anchorAtSourceOffset(markdown, markdown.indexOf('**bold**'), 'source')
    const shortened = '# Title\n\nShort.\n'
    const offset = sourceOffsetForAnchor(shortened, anchor)
    expect(offset).toBeGreaterThanOrEqual('# Title\n\n'.length)
    expect(offset).toBeLessThanOrEqual(shortened.length)
  })

  it.each([
    ['root.children.1', '# Title\n\nNext.\n\nLast.\n'],
    ['root.children.20', '# Title\n\nLast.\n'],
  ])('starts at the nearest surviving block for %s', (blockPath, shortened) => {
    const offset = sourceOffsetForAnchor(shortened, { mode: 'visual', blockPath, sourceOffset: 200, inlineOffset: 0 })
    expect(shortened.slice(offset)).toBe(blockPath === 'root.children.1' ? 'Next.\n\nLast.\n' : 'Last.\n')
  })
})
