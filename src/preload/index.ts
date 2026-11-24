import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { RemarkAPI } from '../shared/api'
import type { AppSettings } from '../shared/settings'
import type { OpenedFile } from '../shared/files'

function subscribe<T>(channel: string, callback: (value: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, value: T) => callback(value)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: RemarkAPI = {
  getBootstrap: () => ipcRenderer.invoke('bootstrap:get'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  requestOpen: () => ipcRenderer.invoke('dialog:open'),
  newDocument: () => ipcRenderer.invoke('document:new'),
  importImages: () => ipcRenderer.invoke('document:import-images'),
  saveDocument: (markdown) => ipcRenderer.invoke('document:save', markdown),
  saveDocumentAs: (markdown) => ipcRenderer.invoke('document:save-as', markdown),
  acceptExternal: (opened) => ipcRenderer.invoke('document:accept-external', opened),
  setDirty: (dirty) => ipcRenderer.invoke('document:dirty', dirty),
  writeRecovery: (input) => ipcRenderer.invoke('document:recovery', input),
  closeWindow: (discard) => ipcRenderer.invoke('document:close', discard),
  onSettingsChanged: (callback) => subscribe<AppSettings>('settings:changed', callback),
  onOpenSettings: (callback) => subscribe<void>('settings:open', callback),
  onRequestOpen: (callback) => subscribe<void>('dialog:open', callback),
  onNewDocument: (callback) => subscribe<void>('document:new', callback),
  onSave: (callback) => subscribe<void>('document:save', callback),
  onSaveAs: (callback) => subscribe<void>('document:save-as', callback),
  onCloseRequested: (callback) => subscribe<void>('document:close-request', callback),
  onExternalChange: (callback) => subscribe<OpenedFile>('document:external-change', callback),
}

contextBridge.exposeInMainWorld('remark', api)

window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('dragover', (event) => {
    if (event.dataTransfer?.types.includes('Files')) event.preventDefault()
  })
  document.addEventListener('drop', (event) => {
    if (!event.dataTransfer?.files.length) return
    event.preventDefault()
    const paths = Array.from(event.dataTransfer.files).map((file) => {
      try {
        return webUtils.getPathForFile(file)
      } catch {
        return ''
      }
    }).filter(Boolean)
    if (paths.length > 0) void ipcRenderer.invoke('document:open-paths', paths)
  })
})
