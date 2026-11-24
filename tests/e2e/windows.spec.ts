import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'

test('opens multiple files as native-tab-capable windows and deduplicates paths', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-windows-'))
  const userData = path.join(directory, 'user-data')
  const firstFile = path.join(directory, 'first.md')
  const secondFile = path.join(directory, 'second.md')
  await writeFile(firstFile, '# First\n')
  await writeFile(secondFile, '# Second\n')
  const app = await electron.launch({
    args: ['out/main/index.js', firstFile],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: userData },
  })

  try {
    await app.firstWindow()
    await app.evaluate(({ BrowserWindow }) => {
      const state = globalThis as typeof globalThis & { remarkTabCalls?: number }
      state.remarkTabCalls = 0
      const firstWindow = BrowserWindow.getAllWindows()[0]
      const original = firstWindow.addTabbedWindow
      firstWindow.addTabbedWindow = (window) => {
        state.remarkTabCalls = (state.remarkTabCalls ?? 0) + 1
        original.call(firstWindow, window)
      }
    })
    await app.evaluate(({ app: electronApp }, filePath) => {
      electronApp.emit('open-file', { preventDefault() {} }, filePath)
    }, secondFile)
    await expect.poll(() => app.windows().length).toBe(2)

    await app.evaluate(({ app: electronApp }, filePath) => {
      electronApp.emit('open-file', { preventDefault() {} }, filePath)
    }, firstFile)
    await expect.poll(() => app.windows().length).toBe(2)

    const tabCalls = await app.evaluate(() => (globalThis as typeof globalThis & { remarkTabCalls?: number }).remarkTabCalls)
    expect(tabCalls).toBe(1)
    await expect(app.windows()[1].getByRole('heading', { name: 'Second' })).toBeVisible()
  } finally {
    await app.close()
    await rm(directory, { recursive: true, force: true })
  }
})


test('saves and switches only the focused document tab', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-tab-isolation-'))
  const firstFile = path.join(directory, 'first.md')
  const secondFile = path.join(directory, 'second.md')
  await writeFile(firstFile, '# First\n')
  await writeFile(secondFile, '# Second\n')
  const app = await electron.launch({
    args: ['out/main/index.js', firstFile],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })

  try {
    const firstWindow = await app.firstWindow()
    await expect(firstWindow.getByRole('heading', { name: 'First' })).toBeVisible()
    await app.evaluate(({ app: electronApp }, filePath) => {
      electronApp.emit('open-file', { preventDefault() {} }, filePath)
    }, secondFile)
    await expect.poll(() => app.windows().length).toBe(2)
    const secondWindow = app.windows()[1]
    await expect(secondWindow.getByRole('heading', { name: 'Second' })).toBeVisible()
    const firstWindowId = await firstWindow.evaluate(() => window.remark.getBootstrap().then((info) => info.windowId))
    const secondWindowId = await secondWindow.evaluate(() => window.remark.getBootstrap().then((info) => info.windowId))

    await app.evaluate(({ BrowserWindow }, id) => {
      const window = BrowserWindow.fromId(id)
      window?.show()
      window?.focus()
    }, secondWindowId)
    await secondWindow.getByRole('button', { name: '源码', exact: true }).click()
    await secondWindow.getByRole('textbox', { name: 'Markdown 源码' }).fill('# Second edited\n\nOnly the second file.\n')
    await app.evaluate(({ Menu }) => {
      const save = Menu.getApplicationMenu()?.items.find((item) => item.label === '文件')?.submenu?.items.find((item) => item.label === '保存')
      save?.click()
    })
    await expect.poll(() => readFile(secondFile, 'utf8')).toBe('# Second edited\n\nOnly the second file.\n')
    expect(await readFile(firstFile, 'utf8')).toBe('# First\n')
    await secondWindow.getByRole('button', { name: '所见即所得', exact: true }).click()
    await expect(secondWindow.getByRole('heading', { name: 'Second edited' })).toBeVisible()

    await app.evaluate(({ BrowserWindow }, id) => {
      const window = BrowserWindow.fromId(id)
      window?.show()
      window?.focus()
    }, firstWindowId)
    await firstWindow.getByRole('button', { name: '源码', exact: true }).click()
    await firstWindow.getByRole('textbox', { name: 'Markdown 源码' }).fill('# First edited\n')
    await app.evaluate(({ Menu }) => {
      const save = Menu.getApplicationMenu()?.items.find((item) => item.label === '文件')?.submenu?.items.find((item) => item.label === '保存')
      save?.click()
    })
    await expect.poll(() => readFile(firstFile, 'utf8')).toBe('# First edited\n')
    expect(await readFile(secondFile, 'utf8')).toBe('# Second edited\n\nOnly the second file.\n')

    await app.evaluate(({ BrowserWindow }, id) => {
      const window = BrowserWindow.fromId(id)
      window?.show()
      window?.focus()
    }, secondWindowId)
    await expect(secondWindow.getByRole('heading', { name: 'Second edited' })).toBeVisible()
    await secondWindow.getByRole('button', { name: '源码', exact: true }).click()
    await expect(secondWindow.getByRole('textbox', { name: 'Markdown 源码' })).toContainText('# Second edited')
    await expect(secondWindow.getByRole('textbox', { name: 'Markdown 源码' })).not.toContainText('First edited')
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})

test('does not send document commands to another window when none is focused', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-menu-focus-'))
  const filePath = path.join(directory, 'first.md')
  await writeFile(filePath, '# First\n')
  const app = await electron.launch({
    args: ['out/main/index.js', filePath],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })

  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: '源码', exact: true }).click()
    await window.getByRole('textbox', { name: 'Markdown 源码' }).fill('# Unsaved first\n')
    await app.evaluate(({ BrowserWindow }) => {
      for (const window of BrowserWindow.getAllWindows()) window.blur()
    })
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getFocusedWindow()?.id ?? null)).toBeNull()

    const sent = await app.evaluate(({ BrowserWindow, Menu }) => {
      const channels: string[] = []
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send = (channel: string) => { channels.push(channel) }
      }
      const save = Menu.getApplicationMenu()?.items.find((item) => item.label === '文件')?.submenu?.items.find((item) => item.label === '保存')
      save?.click()
      return channels
    })
    expect(sent).not.toContain('document:save')
    expect(await readFile(filePath, 'utf8')).toBe('# First\n')
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})
