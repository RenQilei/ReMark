import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'

test('loads local images, finds and replaces text, and navigates the outline', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-tools-'))
  await mkdir(path.join(directory, 'assets'))
  const filePath = path.join(directory, 'tools.md')
  await writeFile(path.join(directory, 'assets', 'pixel.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'))
  await writeFile(filePath, '# Top\n\nneedle and needle.\n\n## Second\n\n![Pixel](assets/pixel.png)\n')
  const app = await electron.launch({
    args: ['out/main/index.js', filePath],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })

  try {
    const window = await app.firstWindow()
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
    const image = window.locator('.milkdown-image-block img')
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0)
    await expect(image).toHaveAttribute('src', /remark-asset:/)

    await window.getByRole('button', { name: '查找', exact: true }).click()
    await window.getByRole('textbox', { name: '查找内容' }).fill('needle')
    await window.getByRole('button', { name: '查找下一个' }).click()
    await window.getByRole('textbox', { name: '替换为' }).fill('replacement')
    await window.getByRole('button', { name: '替换', exact: true }).click()
    await expect(window.locator('.ProseMirror')).toContainText('replacement and needle')
    await window.getByRole('button', { name: '全部替换', exact: true }).click()
    await expect(window.locator('.ProseMirror')).toContainText('replacement and replacement')

    await window.getByRole('button', { name: '大纲', exact: true }).click()
    await expect(window.getByRole('complementary', { name: '文档大纲' })).toBeVisible()
    await window.getByRole('button', { name: 'Second', exact: true }).click()
    await window.getByRole('button', { name: '源码', exact: true }).click()
    const source = window.getByRole('textbox', { name: 'Markdown 源码' })
    await expect(source).toContainText('assets/pixel.png')
    await expect(source).not.toContainText('remark-asset:')
    await expect(source).toContainText('replacement and replacement')
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})
