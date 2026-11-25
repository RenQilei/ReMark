import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'
import type { ChildProcess } from 'node:child_process'

async function launch(markdown: string) {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-clean-'))
  const filePath = path.join(directory, 'document.md')
  await writeFile(filePath, markdown)
  const app = await electron.launch({
    args: ['out/main/index.js', filePath],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })
  return { app, directory, filePath }
}

async function nativeDirty(app: ElectronApplication): Promise<boolean> {
  return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isDocumentEdited())
}

async function closeLastWindow(app: ElectronApplication): Promise<ChildProcess> {
  const child = app.process()
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
  return child
}

async function cleanup(app: ElectronApplication, directory: string): Promise<void> {
  try {
    app.process().kill('SIGKILL')
  } catch {
    // The application has already exited.
  }
  await rm(directory, { recursive: true, force: true })
}

test('opens normalized Markdown clean and exits when the last clean document closes', async () => {
  const original = '# Original  \n\n\nA paragraph with **bold** text.\n\n'
  const { app, directory, filePath } = await launch(original)
  try {
    const window = await app.firstWindow()
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
    await window.getByRole('heading', { name: 'Original' }).click()
    await window.locator('.ProseMirror p').first().click()
    await expect(window.getByLabel('未保存')).toHaveCount(0)
    await expect.poll(() => nativeDirty(app)).toBe(false)
    expect(await readFile(filePath, 'utf8')).toBe(original)

    const child = await closeLastWindow(app)
    await expect.poll(() => child.exitCode).toBe(0)
    expect(await readFile(filePath, 'utf8')).toBe(original)
  } finally {
    await cleanup(app, directory)
  }
})

test('returns to the clean native state after undoing a visual edit', async () => {
  const { app, directory } = await launch('# Original  \n\n\nA paragraph with **bold** text.\n\n')
  try {
    const window = await app.firstWindow()
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
    await expect(window.getByLabel('未保存')).toHaveCount(0)
    await window.getByRole('heading', { name: 'Original' }).click()
    await window.keyboard.press('End')
    await window.keyboard.insertText(' edited')
    await expect(window.getByLabel('未保存')).toBeVisible()
    await expect.poll(() => nativeDirty(app)).toBe(true)

    await window.keyboard.press('Meta+z')
    await expect(window.getByRole('heading', { name: 'Original', exact: true })).toBeVisible()
    await expect(window.getByLabel('未保存')).toHaveCount(0)
    await expect.poll(() => nativeDirty(app)).toBe(false)
    const child = await closeLastWindow(app)
    await expect.poll(() => child.exitCode).toBe(0)
  } finally {
    await cleanup(app, directory)
  }
})

test('returns to the clean native state after undoing a source edit', async () => {
  const { app, directory } = await launch('# Original\n')
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: '源码', exact: true }).click()
    const source = window.getByRole('textbox', { name: 'Markdown 源码' })
    await source.fill('# Source edit\n')
    await expect(window.getByLabel('未保存')).toBeVisible()
    await window.keyboard.press('Meta+z')
    await expect(source).toContainText('# Original')
    await expect(window.getByLabel('未保存')).toHaveCount(0)
    await expect.poll(() => nativeDirty(app)).toBe(false)
    const child = await closeLastWindow(app)
    await expect.poll(() => child.exitCode).toBe(0)
  } finally {
    await cleanup(app, directory)
  }
})

test('keeps the unsaved confirmation before quitting the last dirty document', async () => {
  const { app, directory } = await launch('# Original\n')
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: '源码', exact: true }).click()
    await window.getByRole('textbox', { name: 'Markdown 源码' }).fill('# Unsaved\n')
    const child = await closeLastWindow(app)
    await expect(window.getByRole('alertdialog', { name: '未保存的修改' })).toBeVisible()
    expect(child.exitCode).toBeNull()
    await window.getByRole('button', { name: '不保存', exact: true }).click()
    await expect.poll(() => child.exitCode).toBe(0)
  } finally {
    await cleanup(app, directory)
  }
})
