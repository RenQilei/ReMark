import { app, BrowserWindow, dialog, ipcMain, nativeTheme, net, protocol } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { installApplicationMenu } from './app-menu'
import { installWindowZoom, setWindowZoom, stepWindowZoom } from './window-zoom'
import { resolveUserDataPath } from './user-data'
import type { ZoomDirection } from '../shared/zoom'
import { SettingsService } from './settings-service'
import { DocumentService } from './document-service'
import { FileService } from './file-service'
import { RecoveryService } from './recovery-service'
import type { OpenedFile } from '../shared/files'
import type { EditorMode } from '../shared/documents'

app.setName('ReMark')
protocol.registerSchemesAsPrivileged([{ scheme: 'remark-asset', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }])
app.setPath('userData', resolveUserDataPath(app.getPath('appData'), process.env.REMARK_USER_DATA_DIR))

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const settings = new SettingsService(path.join(app.getPath('userData'), 'settings.json'))
const recovery = new RecoveryService(path.join(app.getPath('userData'), 'recovery'))
const documents = new DocumentService(new FileService(), recovery)
const windows = new Set<BrowserWindow>()
const documentPaths = new Map<string, BrowserWindow>()
const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) app.quit()
let pendingFile: string | null = process.argv.slice(1).find((argument) => /\.(md|markdown|mdown|mkd)$/i.test(argument)) ?? null

function senderWindowId(event: IpcMainInvokeEvent): number {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) throw new Error('IPC sender is not a document window')
  return window.id
}

export function createDocumentWindow(filePath: string | null = null, isNew = false, recoveryId?: string): BrowserWindow {
  const documentKey = filePath ? path.resolve(filePath) : null
  const existing = documentKey ? documentPaths.get(documentKey) : null
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore()
    existing.show()
    existing.focus()
    return existing
  }

  const window = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 720,
    minHeight: 520,
    show: false,
    title: filePath ? path.basename(filePath) : '未命名.md',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1f2023' : '#f5f5f2',
    titleBarStyle: 'default',
    trafficLightPosition: { x: 15, y: 18 },
    tabbingIdentifier: 'remark-documents',
    webPreferences: {
      preload: path.join(currentDir, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  installWindowZoom(window)
  documents.register(window, filePath, { demo: process.env.REMARK_DEMO === '1', isNew, recoveryId })
  windows.add(window)
  if (documentKey) {
    documentPaths.set(documentKey, window)
    app.addRecentDocument(documentKey)
  }
  window.once('ready-to-show', () => window.show())
  window.on('close', (event) => {
    if (documents.isDirty(window.id) && !documents.shouldForceClose(window.id)) {
      event.preventDefault()
      window.webContents.send('document:close-request')
    }
  })
  window.on('closed', () => {
    documents.unregister(window.id)
    windows.delete(window)
    if (documentKey && documentPaths.get(documentKey) === window) documentPaths.delete(documentKey)
  })

  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(path.join(currentDir, '../renderer/index.html'))
  return window
}

function addWindowForCurrentPreference(window: BrowserWindow): void {
  const focused = BrowserWindow.getFocusedWindow() ?? Array.from(windows).find((candidate) => candidate !== window)
  if (focused && focused !== window && process.platform === 'darwin' && settings.get().openWindowBehavior === 'tab') {
    focused.addTabbedWindow(window)
  }
}

async function showOpenDialog(): Promise<void> {
  const focused = BrowserWindow.getFocusedWindow()
  const parent = focused ?? windows.values().next().value
  if (!parent) return
  const result = await dialog.showOpenDialog(parent, {
    title: '打开 Markdown 文件',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] }],
  })
  if (result.canceled) return
  for (const filePath of result.filePaths) addWindowForCurrentPreference(createDocumentWindow(filePath))
}

app.on('second-instance', (_event, argv) => {
  const files = argv.slice(1).filter((argument) => /\.(md|markdown|mdown|mkd)$/i.test(argument))
  if (files.length === 0) {
    const window = windows.values().next().value
    if (window) { window.show(); window.focus() }
    return
  }
  for (const filePath of files) addWindowForCurrentPreference(createDocumentWindow(filePath))
})

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (app.isReady()) addWindowForCurrentPreference(createDocumentWindow(filePath))
  else pendingFile = filePath
})
app.on('new-window-for-tab', () => addWindowForCurrentPreference(createDocumentWindow(null, true)))
app.on('window-all-closed', () => {
  app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createDocumentWindow()
})

if (hasSingleInstanceLock) void app.whenReady().then(async () => {
  const currentSettings = await settings.load()
  nativeTheme.themeSource = currentSettings.appearance
  installApplicationMenu()
  protocol.handle('remark-asset', (request) => {
    try {
      const url = new URL(request.url)
      const windowId = /^doc-(\d+)$/.exec(url.hostname)?.[1]
      if (!windowId) return new Response('Invalid document', { status: 400 })
      const filePath = documents.resolveAsset(Number(windowId), decodeURIComponent(url.pathname.slice(1)))
      return net.fetch(pathToFileURL(filePath).toString())
    } catch {
      return new Response('Asset not authorized', { status: 403 })
    }
  })

  ipcMain.handle('bootstrap:get', (event) => documents.bootstrap(senderWindowId(event)))
  ipcMain.handle('settings:get', () => settings.get())
  ipcMain.handle('settings:update', async (_event, patch) => {
    const updated = await settings.update(patch)
    nativeTheme.themeSource = updated.appearance
    for (const window of windows) window.webContents.send('settings:changed', updated)
    return updated
  })
  ipcMain.handle('window:zoom:get', (event) => BrowserWindow.fromWebContents(event.sender)?.webContents.getZoomFactor() ?? 1)
  ipcMain.handle('window:zoom:set', (event, factor: number) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) throw new Error('IPC sender is not a document window')
    return setWindowZoom(window, factor)
  })
  ipcMain.handle('window:zoom:step', (event, direction: ZoomDirection) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) throw new Error('IPC sender is not a document window')
    return stepWindowZoom(window, direction)
  })
  ipcMain.handle('dialog:open', showOpenDialog)
  ipcMain.handle('document:new', () => addWindowForCurrentPreference(createDocumentWindow(null, true)))
  ipcMain.handle('document:import-images', (event) => documents.importImages(senderWindowId(event)))
  ipcMain.handle('document:save', (event, markdown: string) => documents.save(senderWindowId(event), markdown))
  ipcMain.handle('document:save-as', async (event, markdown: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const opened = await documents.saveAs(senderWindowId(event), markdown)
    if (window && opened) {
      for (const [key, candidate] of documentPaths) if (candidate === window) documentPaths.delete(key)
      documentPaths.set(path.resolve(opened.filePath), window)
      app.addRecentDocument(opened.filePath)
    }
    return opened
  })
  ipcMain.handle('document:open-paths', (_event, paths: string[]) => {
    for (const filePath of paths.filter((candidate) => /\.(md|markdown|mdown|mkd)$/i.test(candidate))) {
      addWindowForCurrentPreference(createDocumentWindow(filePath))
    }
  })
  ipcMain.handle('document:accept-external', (event, opened: OpenedFile) => documents.acceptExternal(senderWindowId(event), opened))
  ipcMain.handle('document:dirty', (event, dirty: boolean) => documents.setDirty(senderWindowId(event), dirty))
  ipcMain.handle('document:recovery', (event, input: { markdown: string; savedMarkdown: string; mode: EditorMode; dirty: boolean }) => documents.writeRecovery(senderWindowId(event), input))
  ipcMain.handle('document:close', (event, discard: boolean) => documents.close(senderWindowId(event), discard))

  const initialFilePath = pendingFile
  pendingFile = null
  const snapshots = await recovery.list()
  const window = initialFilePath || snapshots.length === 0 ? createDocumentWindow(initialFilePath) : null
  for (const snapshot of snapshots) createDocumentWindow(snapshot.filePath, false, snapshot.id)

  if (window && app.isPackaged && !process.env.REMARK_TEST_MODE && !initialFilePath) {
    void dialog.showOpenDialog(window, {
      title: '打开 Markdown 文件',
      properties: ['openFile'],
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] }],
    }).then((result) => {
      if (!result.canceled && result.filePaths[0]) addWindowForCurrentPreference(createDocumentWindow(result.filePaths[0]))
    })
  }
})
