import type { EditorMode } from './documents'

export interface RecoverySnapshot {
  id: string
  filePath: string | null
  markdown: string
  savedMarkdown: string
  mode: EditorMode
  savedAt: number
}
