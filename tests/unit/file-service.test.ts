import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return { ...actual, readFile: vi.fn(actual.readFile) }
})
import { FileService } from '../../src/main/file-service'

const directories: string[] = []
const service = new FileService()

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-files-'))
  directories.push(directory)
  return directory
}

afterEach(async () => {
  vi.clearAllMocks()
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('FileService', () => {
  it('opens UTF-8 BOM and CRLF without leaking encoding details into the editor', async () => {
    const directory = await temporaryDirectory()
    const filePath = path.join(directory, 'notes.md')
    await writeFile(filePath, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('# Hello\r\n\r\nWorld\r\n')]))

    const opened = await service.open(filePath)
    expect(opened.markdown).toBe('# Hello\n\nWorld\n')
    expect(opened.bom).toBe(true)
    expect(opened.eol).toBe('crlf')
  })

  it('skips full reads when the fingerprint is unchanged and reopens after a change', async () => {
    const directory = await temporaryDirectory()
    const filePath = path.join(directory, 'notes.md')
    await writeFile(filePath, '# Original\n')
    const opened = await service.open(filePath)
    expect(opened.fingerprint).toBeTypeOf('string')

    const readFileMock = vi.mocked(readFile)
    readFileMock.mockClear()
    expect(await service.openIfChanged(filePath, opened.fingerprint)).toBeNull()
    expect(readFileMock).not.toHaveBeenCalled()

    await writeFile(filePath, '# Changed\n')
    const changed = await service.openIfChanged(filePath, opened.fingerprint)
    expect(changed?.markdown).toBe('# Changed\n')
    expect(changed?.fingerprint).not.toBe(opened.fingerprint)
  })

  it('atomically saves with the original encoding and file permissions', async () => {
    const directory = await temporaryDirectory()
    const filePath = path.join(directory, 'notes.md')
    await writeFile(filePath, '# Original\n', { mode: 0o640 })
    const opened = await service.open(filePath)

    const result = await service.save({ filePath, markdown: '# Changed\n第二行\n', expectedHash: opened.hash, eol: 'lf', bom: false })
    expect((await readFile(filePath, 'utf8'))).toBe('# Changed\n第二行\n')
    expect((await stat(filePath)).mode & 0o777).toBe(0o640)
    expect(result.hash).not.toBe(opened.hash)
  })

  it('preserves CRLF and BOM when saving', async () => {
    const directory = await temporaryDirectory()
    const filePath = path.join(directory, 'notes.md')
    await writeFile(filePath, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('old\r\n')]))
    const opened = await service.open(filePath)

    await service.save({ filePath, markdown: 'new\ntext\n', expectedHash: opened.hash, eol: opened.eol, bom: opened.bom })
    const bytes = await readFile(filePath)
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]))
    expect(bytes.toString('utf8', 3)).toBe('new\r\ntext\r\n')
  })

  it('refuses to overwrite an external modification', async () => {
    const directory = await temporaryDirectory()
    const filePath = path.join(directory, 'notes.md')
    await writeFile(filePath, 'original')
    const opened = await service.open(filePath)
    await writeFile(filePath, 'someone else')

    await expect(service.save({ filePath, markdown: 'mine', expectedHash: opened.hash })).rejects.toMatchObject({ code: 'FILE_CHANGED_EXTERNALLY' })
    expect(await readFile(filePath, 'utf8')).toBe('someone else')
  })

  it('rejects invalid UTF-8 instead of silently corrupting text', async () => {
    const directory = await temporaryDirectory()
    const filePath = path.join(directory, 'binary.md')
    await writeFile(filePath, Buffer.from([0xff, 0xfe, 0x00, 0x81]))

    await expect(service.open(filePath)).rejects.toEqual(expect.objectContaining({ code: 'UNSUPPORTED_ENCODING' }))
  })
})
