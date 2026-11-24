import DOMPurify from 'dompurify'

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'option', 'link', 'meta', 'base'],
    FORBID_ATTR: ['style', 'srcset', 'formaction'],
    ALLOW_DATA_ATTR: false,
  })
}

export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed', 'image'],
    FORBID_ATTR: ['formaction'],
    ALLOW_DATA_ATTR: false,
  })
}

export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:'
  } catch {
    return false
  }
}
