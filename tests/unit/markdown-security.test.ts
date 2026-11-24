// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { isSafeExternalUrl, sanitizeHtml } from '../../src/renderer/editor/markdown/sanitize'

describe('HTML sanitization', () => {
  it('removes executable elements, event handlers and unsafe URLs', () => {
    const result = sanitizeHtml('<div><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">link</a><iframe src="https://example.com"></iframe><strong>safe</strong></div>')
    expect(result).not.toContain('<script')
    expect(result).not.toContain('onerror')
    expect(result).not.toContain('javascript:')
    expect(result).not.toContain('<iframe')
    expect(result).toContain('<strong>safe</strong>')
  })

  it('only allows expected external protocols', () => {
    expect(isSafeExternalUrl('https://example.com')).toBe(true)
    expect(isSafeExternalUrl('mailto:user@example.com')).toBe(true)
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
  })
})
