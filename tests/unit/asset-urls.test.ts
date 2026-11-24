import { describe, expect, it } from 'vitest'
import { externalizeAssetUrls, restoreAssetUrls } from '../../src/renderer/editor/markdown/assetUrls'

describe('local asset URL mapping', () => {
  it('maps relative image paths and restores them without changing network images', () => {
    const input = '![local](<assets/pixel image.png>)\n![remote](https://example.com/a.png)\n![data](data:image/png;base64,AA)'
    const external = externalizeAssetUrls(input, 7)
    expect(external).toContain('remark-asset://doc-7/assets%2Fpixel%20image.png')
    expect(external).toContain('https://example.com/a.png')
    expect(external).toContain('data:image/png;base64,AA')
    expect(restoreAssetUrls(external, 7)).toBe(input)
  })
})
