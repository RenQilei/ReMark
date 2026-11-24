import { describe, expect, it } from 'vitest'
import { documentHeadings } from '../../src/renderer/editor/markdown/outline'

describe('document outline', () => {
  it('returns real headings with offsets and ignores code fences', () => {
    const markdown = '# Top\n\n```md\n## Not a heading\n```\n\n## Second **heading**\n'
    expect(documentHeadings(markdown)).toEqual([
      { level: 1, text: 'Top', offset: 0 },
      { level: 2, text: 'Second heading', offset: 35 },
    ])
  })
})
