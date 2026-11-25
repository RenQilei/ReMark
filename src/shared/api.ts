import type { AppSettings } from './settings'
import type { OpenedFile } from './files'
import type { RecoverySnapshot } from './recovery'
import type { EditorMode } from './documents'
import type { ZoomDirection } from './zoom'

export interface BootstrapInfo {
  windowId: number
  demo: boolean
  isNew: boolean
  filePath: string | null
  document: OpenedFile | null
  recovery: RecoverySnapshot | null
}

export interface RemarkAPI {
  getBootstrap(): Promise<BootstrapInfo>
  getSettings(): Promise<AppSettings>
  updateSettings(patch: Partial<AppSettings>): Promise<AppSettings>
  requestOpen(): Promise<void>
  newDocument(): Promise<void>
  importImages(): Promise<string[]>
  saveDocument(markdown: string): Promise<OpenedFile | null>
  saveDocumentAs(markdown: string): Promise<OpenedFile | null>
  acceptExternal(opened: OpenedFile): Promise<void>
  setDirty(dirty: boolean): Promise<void>
  writeRecovery(input: { markdown: string; savedMarkdown: string; mode: EditorMode }): Promise<void>
  closeWindow(discard: boolean): Promise<void>
  getZoomFactor(): Promise<number>
  setZoomFactor(factor: number): Promise<number>
  stepZoom(direction: ZoomDirection): Promise<number>
  onZoomChanged(callback: (factor: number) => void): () => void
  onSettingsChanged(callback: (settings: AppSettings) => void): () => void
  onOpenSettings(callback: () => void): () => void
  onRequestOpen(callback: () => void): () => void
  onNewDocument(callback: () => void): () => void
  onSave(callback: () => void): () => void
  onSaveAs(callback: () => void): () => void
  onCloseRequested(callback: () => void): () => void
  onExternalChange(callback: (opened: OpenedFile) => void): () => void
}
