import { _electron as electron, expect } from '@playwright/test'
import { copyFile, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import asar from '@electron/asar'

const directory = await mkdtemp(path.join(tmpdir(), 'remark-packaged-smoke-'))
const filePath = path.join(directory, 'packaged.md')
await copyFile(path.resolve('tests/fixtures/technical.md'), filePath)
const app = await electron.launch({
  executablePath: path.resolve('release/mac-arm64/ReMark.app/Contents/MacOS/ReMark'),
  args: [filePath],
  env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
})
try {
  expect(await app.evaluate(({ app: electronApp }) => electronApp.getName())).toBe('ReMark')
  const asarPath = path.resolve('release/mac-arm64/ReMark.app/Contents/Resources/app.asar')
  const asarSize = (await stat(asarPath)).size
  const entries = asar.listPackage(asarPath, { isPack: false })
  expect(entries.some((entry) => entry.replace(/^\/+/, '').startsWith('node_modules/'))).toBe(false)
  expect(asarSize).toBeLessThanOrEqual(25 * 1024 * 1024)

  const window = await app.firstWindow()
  await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
  await expect(window.locator('.mermaid-preview svg')).toBeVisible({ timeout: 20_000 })
  await expect(window.locator('.mermaid-preview')).toContainText('打开文件')
  await expect(window.locator('.mermaid-preview')).toContainText('编辑文档')
  await expect(window.locator('.mermaid-preview')).toContainText('保存文件')
  await window.getByRole('button', { name: '源码', exact: true }).click()
  await expect(window.getByRole('textbox', { name: 'Markdown 源码' })).toContainText('graph TD')
  await window.getByRole('textbox', { name: 'Markdown 源码' }).fill('# Packaged save\n')
  await app.evaluate(({ Menu }) => {
    const saveItem = Menu.getApplicationMenu()?.items.find((item) => item.label === '文件')?.submenu?.items.find((item) => item.label === '保存')
    if (!saveItem) throw new Error('Save menu item is missing')
    saveItem.click()
  })
  await expect.poll(() => readFile(filePath, 'utf8')).toBe('# Packaged save\n')
  console.log(`Packaged app ASAR (${asarSize} bytes) and open/edit/save smoke test passed.`)
} finally {
  await app.close()
  await rm(directory, { recursive: true, force: true })
}
