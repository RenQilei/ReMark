import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { RecoverySnapshot } from '../shared/recovery'

function isSnapshot(value: unknown): value is RecoverySnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<RecoverySnapshot>
  return typeof snapshot.id === 'string'
    && (typeof snapshot.filePath === 'string' || snapshot.filePath === null)
    && typeof snapshot.markdown === 'string'
    && typeof snapshot.savedMarkdown === 'string'
    && (snapshot.mode === 'visual' || snapshot.mode === 'source')
    && typeof snapshot.savedAt === 'number'
}

export class RecoveryService {
  constructor(readonly directory: string) {}

  async save(snapshot: RecoverySnapshot): Promise<void> {
    await mkdir(this.directory, { recursive: true })
    const filePath = this.snapshotPath(snapshot.id)
    const temporaryPath = `${filePath}.${process.pid}.tmp`
    await writeFile(temporaryPath, JSON.stringify(snapshot), 'utf8')
    await rename(temporaryPath, filePath)
  }

  async list(): Promise<RecoverySnapshot[]> {
    let entries: string[]
    try {
      entries = await readdir(this.directory)
    } catch {
      return []
    }
    const snapshots = await Promise.all(entries.filter((entry) => entry.endsWith('.json')).map(async (entry) => {
      try {
        const value: unknown = JSON.parse(await readFile(path.join(this.directory, entry), 'utf8'))
        return isSnapshot(value) ? value : null
      } catch {
        return null
      }
    }))
    return snapshots.filter((snapshot): snapshot is RecoverySnapshot => snapshot !== null).sort((a, b) => a.savedAt - b.savedAt)
  }

  async clear(id: string): Promise<void> {
    await unlink(this.snapshotPath(id)).catch(() => undefined)
  }

  private snapshotPath(id: string): string {
    if (!id || path.basename(id) !== id || id === '.' || id === '..') throw new Error('Invalid recovery identifier')
    return path.join(this.directory, `${id}.json`)
  }
}
