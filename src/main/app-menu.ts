import { BrowserWindow, Menu } from 'electron'

function sendToFocusedWindow(channel: string): void {
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  window?.webContents.send(channel)
}

export function installApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Remark',
      submenu: [
        { role: 'about', label: '关于 Remark' },
        { type: 'separator' },
        { label: '设置…', accelerator: 'CmdOrCtrl+,', click: () => sendToFocusedWindow('settings:open') },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { role: 'hide', label: '隐藏 Remark' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '全部显示' },
        { type: 'separator' },
        { role: 'quit', label: '退出 Remark' },
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
    { role: 'viewMenu', label: '显示' },
    { role: 'windowMenu', label: '窗口' },
    { role: 'help', label: '帮助' },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
