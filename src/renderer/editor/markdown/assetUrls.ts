export function externalizeAssetUrls(markdown: string, documentId: number): string {
  return markdown.replace(/(!\[[^\]]*\]\()(<[^)]+>|[^)\s]+)(\))/g, (match, prefix: string, rawPath: string, suffix: string) => {
    const assetPath = rawPath.startsWith('<') ? rawPath.slice(1, -1) : rawPath
    if (/^(?:https?:|data:|remark-asset:|mailto:|#|\/\/)/i.test(assetPath)) return match
    return `${prefix}remark-asset://doc-${documentId}/${encodeURIComponent(assetPath)}${suffix}`
  })
}

export function restoreAssetUrls(markdown: string, documentId: number): string {
  const prefix = `remark-asset://doc-${documentId}/`
  return markdown.replace(new RegExp(`${prefix}([^)\\s]+)`, 'g'), (_match, encoded: string) => {
    const decoded = decodeURIComponent(encoded)
    return /\s/.test(decoded) ? `<${decoded}>` : decoded
  })
}
