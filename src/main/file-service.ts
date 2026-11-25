import { createHash } from 'node:crypto'
import { open, readFile, rename, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import type { LineEnding, OpenedFile, SaveDocumentRequest, SaveDocumentResult } from '../shared/files'

export type FileErrorCode = 'FILE_CHANGED_EXTERNALLY' | 'UNSUPPORTED_ENCODING' | 'PERMISSION_DENIED' | 'DISK_FULL' | 'FILE_NOT_FOUND' | 'WRITE_FAILED'

export class FileServiceError extends Error {
  constructor(readonly code: FileErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'FileServiceError'
  }
}

function digest(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

async function fileFingerprint(filePath: string): Promise<string> {
  const metadata = await stat(filePath, { bigint: true })
  return `${metadata.size}:${metadata.mtimeNs}:${metadata.ctimeNs}`
}

function translateError(error: unknown): FileServiceError {
  if (error instanceof FileServiceError) return error
  const code = (error as NodeJS.ErrnoException)?.code
  if (code === 'EACCES' || code === 'EPERM') return new FileServiceError('PERMISSION_DENIED', '没有读写此文件的权限。', { cause: error })
  if (code === 'ENOSPC') return new FileServiceError('DISK_FULL', '磁盘空间不足，文件尚未保存。', { cause: error })
  if (code === 'ENOENT') return new FileServiceError('FILE_NOT_FOUND', '文件不存在或已被移动。', { cause: error })
  return new FileServiceError('WRITE_FAILED', '无法完成文件操作。', { cause: error })
}

export class FileService {
  async open(filePath: string): Promise<OpenedFile> {
    let bytes: Buffer
    let fingerprint: string
    try {
      fingerprint = await fileFingerprint(filePath)
      bytes = await readFile(filePath)
      const latestFingerprint = await fileFingerprint(filePath)
      if (fingerprint !== latestFingerprint) {
        bytes = await readFile(filePath)
        fingerprint = await fileFingerprint(filePath)
      }
    } catch (error) {
      throw translateError(error)
    }
    const bom = bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))
    let decoded: string
    try {
      decoded = new TextDecoder('utf-8', { fatal: true }).decode(bom ? bytes.subarray(3) : bytes)
    } catch (error) {
      throw new FileServiceError('UNSUPPORTED_ENCODING', '仅支持 UTF-8 文本；请先转换文件编码。', { cause: error })
    }
    const crlfCount = (decoded.match(/\r\n/g) ?? []).length
    const lfCount = (decoded.match(/(?<!\r)\n/g) ?? []).length
    return {
      filePath,
      markdown: decoded.replace(/\r\n?/g, '\n'),
      hash: digest(bytes),
      eol: crlfCount > lfCount ? 'crlf' : 'lf',
      bom,
      fingerprint,
    }
  }

  async openIfChanged(filePath: string, previousFingerprint: string | null): Promise<OpenedFile | null> {
    try {
      if (previousFingerprint && await fileFingerprint(filePath) === previousFingerprint) return null
      return await this.open(filePath)
    } catch (error) {
      throw translateError(error)
    }
  }

  async save(request: SaveDocumentRequest): Promise<SaveDocumentResult> {
    try {
      const current = await readFile(request.filePath)
      if (!request.expectedHash || digest(current) !== request.expectedHash) {
        throw new FileServiceError('FILE_CHANGED_EXTERNALLY', '文件已被其他应用修改，未覆盖保存。')
      }
      const metadata = await stat(request.filePath)
      return await this.writeAtomic(request.filePath, request.markdown, request.eol ?? 'lf', request.bom ?? false, metadata.mode)
    } catch (error) {
      throw translateError(error)
    }
  }

  async saveAs(filePath: string, markdown: string, eol: LineEnding = 'lf', bom = false): Promise<OpenedFile> {
    try {
      await this.writeAtomic(filePath, markdown, eol, bom, 0o666)
      return await this.open(filePath)
    } catch (error) {
      throw translateError(error)
    }
  }

  private async writeAtomic(filePath: string, markdown: string, eol: LineEnding, bom: boolean, mode: number): Promise<SaveDocumentResult> {
    const normalized = eol === 'crlf' ? markdown.replace(/\r\n?|\n/g, '\r\n') : markdown.replace(/\r\n?/g, '\n')
    const body = Buffer.from(normalized, 'utf8')
    const bytes = bom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]) : body
    const temporaryPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.remark-tmp`)
    let handle
    try {
      handle = await open(temporaryPath, 'wx', mode)
      await handle.writeFile(bytes)
      await handle.sync()
      await handle.close()
      handle = undefined
      await rename(temporaryPath, filePath)
      return { hash: digest(bytes), fingerprint: await fileFingerprint(filePath) }
    } catch (error) {
      if (handle) await handle.close().catch(() => undefined)
      await unlink(temporaryPath).catch(() => undefined)
      throw translateError(error)
    }
  }
}
