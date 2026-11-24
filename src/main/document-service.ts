import { BrowserWindow, dialog } from 'electron'
import { randomUUID } from 'node:crypto'
import { constants, watch } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import type { FSWatcher } from 'node:fs'
import path from 'node:path'
import type { BootstrapInfo } from '../shared/api'
import type { OpenedFile } from '../shared/files'
import type { RecoverySnapshot } from '../shared/recovery'
import type { EditorMode } from '../shared/documents'
import { FileService } from './file-service'
import { RecoveryService } from './recovery-service'

interface RegisterOptions {
  demo: boolean
  isNew: boolean
  recoveryId?: string
}

interface DocumentState {
  window: BrowserWindow
  demo: boolean
  isNew: boolean
  filePath: string | null
  opened: OpenedFile | null
  recoveryId: string
  dirty: boolean
  forceClose: boolean
  watcher: FSWatcher | null
  watchTimer: NodeJS.Timeout | null
  pollTimer: NodeJS.Timeout | null
  lastExternalHash: string | null
  allowedAssets: Set<string>
}

export class DocumentService {
  private readonly states = new Map<number, DocumentState>()

  constructor(private readonly files: FileService, private readonly recovery: RecoveryService) {}

  register(window: BrowserWindow, filePath: string | null, options: RegisterOptions): void {
    this.states.set(window.id, {
      window,
      demo: options.demo,
      isNew: options.isNew,
      filePath,
      opened: null,
      recoveryId: options.recoveryId ?? randomUUID(),
      dirty: false,
      forceClose: false,
      watcher: null,
      watchTimer: null,
      pollTimer: null,
      lastExternalHash: null,
      allowedAssets: new Set<string>(),
    })
  }

  async bootstrap(windowId: number): Promise<BootstrapInfo> {
    const state = this.requireState(windowId)
    if (state.filePath && !state.opened) {
      state.opened = await this.files.open(state.filePath)
      this.watch(state)
    }
    const snapshots = state.recoveryId ? await this.recovery.list() : []
    const recovered = snapshots.find((snapshot) => snapshot.id === state.recoveryId) ?? null
    if (recovered) {
      state.filePath = recovered.filePath
      state.dirty = recovered.markdown !== recovered.savedMarkdown
    }
    return {
      windowId,
      demo: state.demo,
      isNew: state.isNew,
      filePath: state.filePath,
      document: state.opened,
      recovery: recovered,
    }
  }

  isDirty(windowId: number): boolean {
    return this.states.get(windowId)?.dirty ?? false
  }

  shouldForceClose(windowId: number): boolean {
    return this.states.get(windowId)?.forceClose ?? false
  }

  setDirty(windowId: number, dirty: boolean): void {
    const state = this.requireState(windowId)
    state.dirty = dirty
    state.window.setDocumentEdited(dirty)
  }

  async save(windowId: number, markdown: string): Promise<OpenedFile | null> {
    const state = this.requireState(windowId)
    if (!state.filePath || !state.opened) return this.saveAs(windowId, markdown)
    const result = await this.files.save({
      filePath: state.filePath,
      markdown,
      expectedHash: state.opened.hash,
      eol: state.opened.eol,
      bom: state.opened.bom,
    })
    state.opened = { ...state.opened, markdown, hash: result.hash }
    state.lastExternalHash = result.hash
    this.setDirty(windowId, false)
    await this.recovery.clear(state.recoveryId)
    return state.opened
  }

  async saveAs(windowId: number, markdown: string): Promise<OpenedFile | null> {
    const state = this.requireState(windowId)
    const result = await dialog.showSaveDialog(state.window, {
      title: '保存 Markdown 文件',
      defaultPath: state.filePath ?? '未命名.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    if (result.canceled || !result.filePath) return null
    const opened = await this.files.saveAs(result.filePath, markdown, state.opened?.eol ?? 'lf', state.opened?.bom ?? false)
    this.unwatch(state)
    state.filePath = result.filePath
    state.opened = opened
    state.isNew = false
    state.lastExternalHash = opened.hash
    state.window.setTitle(path.basename(result.filePath))
    this.setDirty(windowId, false)
    this.watch(state)
    await this.recovery.clear(state.recoveryId)
    return opened
  }

  async writeRecovery(windowId: number, input: { markdown: string; savedMarkdown: string; mode: EditorMode }): Promise<void> {
    const state = this.requireState(windowId)
    const snapshot: RecoverySnapshot = {
      id: state.recoveryId,
      filePath: state.filePath,
      markdown: input.markdown,
      savedMarkdown: input.savedMarkdown,
      mode: input.mode,
      savedAt: Date.now(),
    }
    state.dirty = input.markdown !== input.savedMarkdown
    if (state.dirty) await this.recovery.save(snapshot)
    else await this.recovery.clear(state.recoveryId)
  }

  async acceptExternal(windowId: number, opened: OpenedFile): Promise<void> {
    const state = this.requireState(windowId)
    if (state.filePath !== opened.filePath) throw new Error('External document path mismatch')
    state.opened = opened
    state.lastExternalHash = opened.hash
    this.setDirty(windowId, false)
    await this.recovery.clear(state.recoveryId)
  }

  async close(windowId: number, discard: boolean): Promise<void> {
    const state = this.requireState(windowId)
    if (discard) await this.recovery.clear(state.recoveryId)
    state.forceClose = true
    state.window.close()
  }

  async importImages(windowId: number): Promise<string[]> {
    const state = this.requireState(windowId)
    const result = await dialog.showOpenDialog(state.window, {
      title: '插入图片',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return []
    const choice = await dialog.showMessageBox(state.window, {
      type: 'question',
      title: '图片保存方式',
      message: '复制到文档旁的 assets 目录，还是仅插入原始路径？',
      buttons: ['复制到 assets', '仅插入路径', '取消'],
      defaultId: 0,
      cancelId: 2,
    })
    if (choice.response === 2) return []
    if (choice.response === 0 && !state.filePath) {
      await dialog.showMessageBox(state.window, { type: 'info', message: '请先保存文档，再复制图片到文档旁。' })
      return []
    }

    const paths: string[] = []
    for (const source of result.filePaths) {
      state.allowedAssets.add(path.resolve(source))
      if (choice.response === 1) {
        paths.push(source)
        continue
      }
      const assetsDirectory = path.join(path.dirname(state.filePath!), 'assets')
      await mkdir(assetsDirectory, { recursive: true })
      let destination = path.join(assetsDirectory, path.basename(source))
      try {
        await copyFile(source, destination, constants.COPYFILE_EXCL)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
        destination = path.join(assetsDirectory, `${Date.now()}-${path.basename(source)}`)
        await copyFile(source, destination)
      }
      state.allowedAssets.add(path.resolve(destination))
      paths.push(`assets/${path.basename(destination)}`)
    }
    return paths
  }

  resolveAsset(windowId: number, assetPath: string): string {
    const state = this.requireState(windowId)
    if (path.isAbsolute(assetPath)) {
      const resolved = path.resolve(assetPath)
      if (!state.allowedAssets.has(resolved)) throw new Error('Asset is not authorized for this document')
      return resolved
    }
    if (!state.filePath) throw new Error('Save the document before loading relative assets')
    const root = path.dirname(state.filePath)
    const resolved = path.resolve(root, assetPath)
    const relative = path.relative(root, resolved)
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Asset path escapes the document directory')
    return resolved
  }

  unregister(windowId: number): void {
    const state = this.states.get(windowId)
    if (!state) return
    this.unwatch(state)
    this.states.delete(windowId)
  }

  private requireState(windowId: number): DocumentState {
    const state = this.states.get(windowId)
    if (!state) throw new Error('Unknown document window')
    return state
  }

  private watch(state: DocumentState): void {
    if (!state.filePath || state.watcher) return
    const filePath = state.filePath
    const directory = path.dirname(filePath)
    state.watcher = watch(directory, { persistent: false }, () => {
      if (state.watchTimer) clearTimeout(state.watchTimer)
      state.watchTimer = setTimeout(() => {
        void this.notifyExternalChange(state, filePath)
      }, 120)
    })
    state.watcher.on('error', () => this.unwatch(state))
    state.pollTimer = setInterval(() => {
      void this.notifyExternalChange(state, filePath)
    }, 1000)
    state.pollTimer.unref()
  }

  private async notifyExternalChange(state: DocumentState, filePath: string): Promise<void> {
    if (state.filePath !== filePath) return
    try {
      const opened = await this.files.open(filePath)
      if (opened.hash === state.opened?.hash || opened.hash === state.lastExternalHash) return
      state.lastExternalHash = opened.hash
      if (!state.window.isDestroyed()) state.window.webContents.send('document:external-change', opened)
    } catch {
      if (!state.window.isDestroyed()) state.window.webContents.send('document:external-missing', filePath)
    }
  }

  private unwatch(state: DocumentState): void {
    if (state.watchTimer) clearTimeout(state.watchTimer)
    if (state.pollTimer) clearInterval(state.pollTimer)
    state.watchTimer = null
    state.pollTimer = null
    state.watcher?.close()
    state.watcher = null
  }
}
