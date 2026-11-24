import { _electron as electron, expect } from '@playwright/test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const directory = await mkdtemp(path.join(tmpdir(), 'remark-packaged-smoke-'))
const filePath = path.join(directory, 'packaged.md')
await writeFile(filePath, '# Packaged\n')
const app = await electron.launch({
  executablePath: path.resolve('release/mac-arm64/Remark.app/Contents/MacOS/Remark'),
  args: [filePath],
  env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
})
try {
  const window = await app.firstWindow()
  await window.getByRole('button', { name: '源码', exact: true }).click()
  await window.getByRole('textbox', { name: 'Markdown 源码' }).fill('# Packaged save\n')
  await app.evaluate(({ Menu }) => {
    const saveItem = Menu.getApplicationMenu()?.items.find((item) => item.label === '文件')?.submenu?.items.find((item) => item.label === '保存')
    if (!saveItem) throw new Error('Save menu item is missing')
    saveItem.click()
  })
  await expect.poll(() => readFile(filePath, 'utf8')).toBe('# Packaged save\n')
  console.log('Packaged app open/edit/save smoke test passed.')
} finally {
  await app.close()
  await rm(directory, { recursive: true, force: true })
}
