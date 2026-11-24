import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'

async function launchWithDocument() {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-modes-'))
  const filePath = path.join(directory, 'notes.md')
  await writeFile(filePath, '# Original\n\nA paragraph.\n')
  const app = await electron.launch({
    args: ['out/main/index.js', filePath],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })
  return { app, directory }
}

test('edits naturally in both modes and keeps unsaved content consistent', async () => {
  const { app, directory } = await launchWithDocument()
  try {
    const window = await app.firstWindow()
    await expect(window.getByRole('heading', { name: 'Original' })).toBeVisible()
    await expect(window.locator('.ProseMirror')).not.toContainText('# Original')
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')

    await window.locator('.ProseMirror p').first().click()
    await window.keyboard.press('End')
    await window.keyboard.insertText(' 中文编辑')
    await expect(window.locator('.ProseMirror')).toContainText('中文编辑')
    await window.getByRole('button', { name: '源码', exact: true }).click()
    const source = window.getByRole('textbox', { name: 'Markdown 源码' })
    await expect(source).toContainText('中文编辑')

    await source.fill('# Source final\n\n纯源码编辑\n')
    await window.getByRole('button', { name: '所见即所得', exact: true }).click()
    await expect(window.getByRole('heading', { name: 'Source final' })).toBeVisible()
    await expect(window.locator('.ProseMirror')).toContainText('纯源码编辑')
    await expect(window.getByLabel('未保存')).toBeVisible()
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})

test('applies toolbar formatting through editor commands', async () => {
  const { app, directory } = await launchWithDocument()
  try {
    const window = await app.firstWindow()
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
    await window.locator('.ProseMirror p').first().selectText()
    await window.getByRole('button', { name: '粗体', exact: true }).click()
    await expect(window.locator('.ProseMirror strong')).toHaveText('A paragraph.')
    await window.getByRole('button', { name: '源码', exact: true }).click()
    await expect(window.getByRole('textbox', { name: 'Markdown 源码' })).toContainText('**A paragraph.**')
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})

test('uses session checkpoints when undo crosses an editor mode boundary', async () => {
  const { app, directory } = await launchWithDocument()
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: '源码', exact: true }).click()
    const source = window.getByRole('textbox', { name: 'Markdown 源码' })
    await source.fill('# Changed in source\n')
    await window.getByRole('button', { name: '所见即所得', exact: true }).click()
    await expect(window.getByRole('heading', { name: 'Changed in source' })).toBeVisible()

    await window.locator('.ProseMirror').click()
    await window.keyboard.press('Meta+z')
    await expect(window.getByRole('textbox', { name: 'Markdown 源码' })).toContainText('# Changed in source')
    await window.keyboard.press('Meta+z')
    await expect(window.getByRole('heading', { name: 'Original' })).toBeVisible()
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})
