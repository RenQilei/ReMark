import { BrowserWindow, Menu } from 'electron'
import { setWindowZoom, stepWindowZoom } from './window-zoom'
import type { ZoomDirection } from '../shared/zoom'

function sendToFocusedWindow(channel: string): void {
  const window = BrowserWindow.getFocusedWindow()
  window?.webContents.send(channel)
}

function zoomFocusedWindow(direction: ZoomDirection): void {
  const window = BrowserWindow.getFocusedWindow()
  if (window) stepWindowZoom(window, direction)
}

function resetFocusedWindowZoom(): void {
  const window = BrowserWindow.getFocusedWindow()
  if (window) setWindowZoom(window, 1)
}

export function installApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'ReMark',
      submenu: [
        { role: 'about', label: '关于 ReMark' },
        { type: 'separator' },
        { label: '全局设置…', accelerator: 'CmdOrCtrl+,', click: () => sendToFocusedWindow('settings:open') },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { role: 'hide', label: '隐藏 ReMark' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '全部显示' },
        { type: 'separator' },
        { role: 'quit', label: '退出 ReMark' },
      ],
    },
    {
      label: '文件',
      submenu: [
        { label: '新建文档', accelerator: 'CmdOrCtrl+N', click: () => sendToFocusedWindow('document:new') },
        { label: '新建标签', accelerator: 'CmdOrCtrl+T', click: () => sendToFocusedWindow('document:new') },
        { label: '打开文件…', accelerator: 'CmdOrCtrl+O', click: () => sendToFocusedWindow('dialog:open') },
        { role: 'recentDocuments', label: '最近使用', submenu: [{ role: 'clearRecentDocuments', label: '清除最近使用' }] },
        { type: 'separator' },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => sendToFocusedWindow('document:save') },
        { label: '另存为…', accelerator: 'Shift+CmdOrCtrl+S', click: () => sendToFocusedWindow('document:save-as') },
        { type: 'separator' },
        { role: 'close', label: '关闭窗口' },
      ],
    },
    { role: 'editMenu', label: '编辑' },
    {
      label: '显示',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { label: '实际大小', click: resetFocusedWindowZoom },
        { label: '放大', click: () => zoomFocusedWindow('in') },
        { label: '缩小', click: () => zoomFocusedWindow('out') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '进入全屏' },
      ],
    },
    { role: 'windowMenu', label: '窗口' },
    { role: 'help', label: '帮助' },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
