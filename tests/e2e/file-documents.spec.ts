import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-file-'))
  const userData = path.join(directory, 'user-data')
  const filePath = path.join(directory, 'notes.md')
  await writeFile(filePath, '# Original\n')
  return { directory, userData, filePath }
}

function launch(userData: string, filePath?: string) {
  return electron.launch({
    args: ['out/main/index.js', ...(filePath ? [filePath] : [])],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: userData },
  })
}

test('opens, edits and saves a real file through the application menu', async () => {
  const { directory, userData, filePath } = await fixture()
  const app = await launch(userData, filePath)
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: '源码', exact: true }).click()
    const editor = window.getByRole('textbox', { name: 'Markdown 源码' })
    await expect(editor).toContainText('# Original')
    await editor.fill('# Changed\n\nBody\n')
    await app.evaluate(({ Menu }) => {
      const saveItem = Menu.getApplicationMenu()?.items.find((item) => item.label === '文件')?.submenu?.items.find((item) => item.label === '保存')
      if (!saveItem) throw new Error('Save menu item is missing')
      saveItem.click()
    })
    await expect.poll(() => readFile(filePath, 'utf8')).toBe('# Changed\n\nBody\n')
    await expect(window.getByLabel('未保存')).toHaveCount(0)
  } finally {
    await app.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('protects unsaved edits when the file changes on disk', async () => {
  const { directory, userData, filePath } = await fixture()
  const app = await launch(userData, filePath)
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: '源码', exact: true }).click()
    const editor = window.getByRole('textbox', { name: 'Markdown 源码' })
    await editor.fill('# My unsaved version\n')
    await writeFile(filePath, '# Disk version\n')
    await expect(window.getByRole('alertdialog', { name: '文件已在外部修改' })).toBeVisible()
    await window.getByRole('button', { name: '重新加载', exact: true }).click()
    await expect(editor).toContainText('# Disk version')
  } finally {
    await app.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('asks before closing a dirty document and allows discarding explicitly', async () => {
  const { directory, userData, filePath } = await fixture()
  const app = await launch(userData, filePath)
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: '源码', exact: true }).click()
    await window.getByRole('textbox', { name: 'Markdown 源码' }).fill('# Unsaved close\n')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close())
    await expect(window.getByRole('alertdialog', { name: '未保存的修改' })).toBeVisible()
    await window.getByRole('button', { name: '不保存', exact: true }).click()
    await expect.poll(() => app.windows().length).toBe(0)
  } finally {
    await app.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('restores unsaved content after a process crash', async () => {
  const { directory, userData, filePath } = await fixture()
  const firstApp = await launch(userData, filePath)
  const firstWindow = await firstApp.firstWindow()
  await firstWindow.getByRole('button', { name: '源码', exact: true }).click()
  await firstWindow.getByRole('textbox', { name: 'Markdown 源码' }).fill('# Recover me\n')
  await expect.poll(async () => (await readdir(path.join(userData, 'recovery')).catch(() => [])).length).toBeGreaterThan(0)
  firstApp.process().kill('SIGKILL')

  const secondApp = await launch(userData)
  try {
    const recoveredWindow = await secondApp.firstWindow()
    const editor = recoveredWindow.getByRole('textbox', { name: 'Markdown 源码' })
    await expect(editor).toBeVisible()
    await expect(editor).toContainText('# Recover me')
  } finally {
    secondApp.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})
