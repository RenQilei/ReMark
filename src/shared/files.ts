export type LineEnding = 'lf' | 'crlf'

export interface OpenedFile {
  filePath: string
  markdown: string
  hash: string
  eol: LineEnding
  bom: boolean
  fingerprint: string
}

export interface SaveDocumentRequest {
  filePath: string
  markdown: string
  expectedHash: string | null
  eol?: LineEnding
  bom?: boolean
}

export interface SaveDocumentResult {
  hash: string
  fingerprint: string
}
