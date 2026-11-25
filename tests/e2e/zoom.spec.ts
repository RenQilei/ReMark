import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

async function launch(fileName: string) {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-zoom-'))
  const filePath = path.join(directory, fileName)
  await writeFile(filePath, `# ${fileName}\n`)
  const app = await electron.launch({
    args: ['out/main/index.js', filePath],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })
  return { app, directory, filePath }
}

async function factor(app: ElectronApplication, page?: Page): Promise<number> {
  const id = page ? await page.evaluate(() => window.remark.getBootstrap().then((info) => info.windowId)) : undefined
  return app.evaluate(({ BrowserWindow }, windowId) => {
    const window = windowId === undefined ? BrowserWindow.getAllWindows()[0] : BrowserWindow.fromId(windowId)
    if (!window) throw new Error('Document window not found')
    return window.webContents.getZoomFactor()
  }, id)
}

async function focusWindow(app: ElectronApplication, page: Page): Promise<void> {
  const id = await page.evaluate(() => window.remark.getBootstrap().then((info) => info.windowId))
  await app.evaluate(({ BrowserWindow }, windowId) => {
    const target = BrowserWindow.fromId(windowId)
    target?.show()
    target?.focus()
  }, id)
}

async function viewportState(page: Page): Promise<{ width: number; pixelRatio: number }> {
  return page.evaluate(() => ({ width: window.innerWidth, pixelRatio: window.devicePixelRatio }))
}

test('supports isolated zoom controls, shortcuts, presets, and a taller status bar', async () => {
  const { app, directory } = await launch('zoom.md')
  try {
    const window = await app.firstWindow()
    const percentage = window.getByRole('combobox', { name: '缩放比例' })
    const zoomOut = window.getByRole('button', { name: '缩小', exact: true })
    const zoomIn = window.getByRole('button', { name: '放大', exact: true })
    await expect(window.locator('.status-bar')).toHaveCSS('height', '36px')
    await expect(percentage).toHaveValue('100')
    expect(await factor(app)).toBe(1)
    const initialViewport = await viewportState(window)

    await zoomIn.click()
    await expect.poll(() => factor(app)).toBe(1.1)
    await expect(percentage).toHaveValue('110')
    await zoomOut.click()
    await expect.poll(() => factor(app)).toBe(1)

    await window.keyboard.press('Meta+=')
    await expect.poll(() => factor(app)).toBe(1.1)
    await window.keyboard.press('Meta+Shift+=')
    await expect.poll(() => factor(app)).toBe(1.25)
    await window.keyboard.press('Meta+-')
    await expect.poll(() => factor(app)).toBe(1.1)
    await window.keyboard.press('Meta+0')
    await expect.poll(() => factor(app)).toBe(1)

    await percentage.selectOption('150')
    await expect.poll(() => factor(app)).toBe(1.5)
    const enlargedViewport = await viewportState(window)
    expect(enlargedViewport.width).toBeLessThan(initialViewport.width)
    expect(enlargedViewport.pixelRatio).toBeGreaterThan(initialViewport.pixelRatio)
    await window.keyboard.press('Meta+NumpadSubtract')
    await expect.poll(() => factor(app)).toBe(1.25)
    await window.keyboard.press('Meta+NumpadAdd')
    await expect.poll(() => factor(app)).toBe(1.5)

    await percentage.selectOption('200')
    await zoomIn.click()
    expect(await factor(app)).toBe(2)
    await percentage.selectOption('50')
    await zoomOut.click()
    expect(await factor(app)).toBe(0.5)
    await window.keyboard.press('Meta+0')
    await expect.poll(() => factor(app)).toBe(1)
    expect(await viewportState(window)).toEqual(initialViewport)

    await window.setViewportSize({ width: 720, height: 650 })
    await expect(percentage).toBeVisible()
    await expect(zoomIn).toBeVisible()
    await window.evaluate(() => globalThis.window.remark.updateSettings({ showStatusBar: false }))
    await expect(window.locator('.status-bar')).toHaveCount(0)
    await window.keyboard.press('Meta+=')
    await expect.poll(() => factor(app)).toBe(1.1)
    await window.evaluate(() => globalThis.window.remark.updateSettings({ showStatusBar: true }))
    await expect(percentage).toHaveValue('110')
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})

test('keeps zoom independent for each document tab', async () => {
  const { app, directory } = await launch('first.md')
  const secondFile = path.join(directory, 'second.md')
  await writeFile(secondFile, '# second.md\n')
  try {
    const firstWindow = await app.firstWindow()
    await app.evaluate(({ app: electronApp }, file) => electronApp.emit('open-file', { preventDefault() {} }, file), secondFile)
    await expect.poll(() => app.windows().length).toBe(2)
    const secondWindow = app.windows()[1]
    const firstInitialViewport = await viewportState(firstWindow)
    const secondInitialViewport = await viewportState(secondWindow)
    await focusWindow(app, secondWindow)
    await secondWindow.getByRole('combobox', { name: '缩放比例' }).selectOption('150')
    await expect.poll(() => factor(app, secondWindow)).toBe(1.5)
    const secondEnlargedViewport = await viewportState(secondWindow)
    expect(secondEnlargedViewport.width).toBeLessThan(secondInitialViewport.width)
    expect(secondEnlargedViewport.pixelRatio).toBeGreaterThan(secondInitialViewport.pixelRatio)
    expect(await factor(app, firstWindow)).toBe(1)
    expect(await viewportState(firstWindow)).toEqual(firstInitialViewport)

    await focusWindow(app, firstWindow)
    await expect(firstWindow.getByRole('combobox', { name: '缩放比例' })).toHaveValue('100')
    await firstWindow.getByRole('combobox', { name: '缩放比例' }).selectOption('75')
    await expect.poll(() => factor(app, firstWindow)).toBe(0.75)
    expect(await factor(app, secondWindow)).toBe(1.5)
    expect(await viewportState(secondWindow)).toEqual(secondEnlargedViewport)

    await focusWindow(app, secondWindow)
    await expect(secondWindow.getByRole('combobox', { name: '缩放比例' })).toHaveValue('150')
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})
