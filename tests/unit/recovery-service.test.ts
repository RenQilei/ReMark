import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { RecoveryService } from '../../src/main/recovery-service'

const directories: string[] = []

async function service(): Promise<RecoveryService> {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-recovery-'))
  directories.push(directory)
  return new RecoveryService(directory)
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('RecoveryService', () => {
  it('persists and returns an unsaved snapshot', async () => {
    const recovery = await service()
    const snapshot = { id: 'window-1', filePath: '/tmp/example.md', markdown: '# unsaved', savedMarkdown: '# saved', mode: 'source' as const, savedAt: Date.now() }
    await recovery.save(snapshot)
    expect(await recovery.list()).toEqual([snapshot])
    await recovery.clear(snapshot.id)
    expect(await recovery.list()).toEqual([])
  })

  it('skips malformed snapshots without losing valid recovery data', async () => {
    const recovery = await service()
    const snapshot = { id: 'valid', filePath: null, markdown: 'keep me', savedMarkdown: '', mode: 'visual' as const, savedAt: 123 }
    await recovery.save(snapshot)
    await writeFile(path.join(recovery.directory, 'broken.json'), '{bad')
    expect(await recovery.list()).toEqual([snapshot])
  })
})
