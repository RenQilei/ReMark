import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const apply = process.argv.includes('--apply')
const tag = process.env.TAG ?? `v${process.env.npm_package_version ?? '0.1.0-alpha.0'}`
const releaseDirectory = path.resolve('release')
const assets = (await readdir(releaseDirectory)).filter((file) => file.endsWith('.dmg') || file === 'SHA256SUMS.txt').sort()
if (!apply) {
  console.log(`Dry run: would create Gitee release ${tag} and upload ${assets.join(', ')}.`)
} else {
  const owner = process.env.GITEE_OWNER
  const repo = process.env.GITEE_REPO
  const token = process.env.GITEE_TOKEN
  if (!owner || !repo || !token) throw new Error('GITEE_OWNER, GITEE_REPO and GITEE_TOKEN are required with --apply.')
  const base = 'https://gitee.com/api/v5'
  const response = await fetch(`${base}/repos/${owner}/${repo}/releases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: token,
      tag_name: tag,
      name: `Remark ${tag}`,
      body: process.env.PRERELEASE === 'true' ? 'Unsigned prerelease. Verify SHA-256 before installation.' : 'Signed and notarized release.',
      target_commitish: 'main',
      prerelease: process.env.PRERELEASE === 'true',
    }),
  })
  const release = await response.json()
  if (!response.ok) throw new Error(`Gitee release creation failed: ${response.status} ${JSON.stringify(release)}`)
  for (const file of assets) {
    const form = new FormData()
    form.append('file', new Blob([await readFile(path.join(releaseDirectory, file))]), file)
    const upload = await fetch(`${base}/repos/${owner}/${repo}/releases/${release.id}/attach_files?access_token=${encodeURIComponent(token)}`, { method: 'POST', body: form })
    if (!upload.ok) throw new Error(`Gitee asset upload failed for ${file}: ${upload.status}`)
  }
  console.log(`Published Gitee release ${tag} with ${assets.length} assets.`)
}
