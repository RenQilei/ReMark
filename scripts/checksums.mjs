import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const releaseDirectory = path.resolve('release')
const files = (await readdir(releaseDirectory)).filter((file) => file.endsWith('.dmg')).sort()
const lines = await Promise.all(files.map(async (file) => {
  const hash = createHash('sha256').update(await readFile(path.join(releaseDirectory, file))).digest('hex')
  return `${hash}  ${file}`
}))
await writeFile(path.join(releaseDirectory, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`)
console.log(`Wrote checksums for ${files.length} DMG files.`)
