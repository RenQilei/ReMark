import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'

test('keeps dirty status and primary tools accessible at 1024px', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-responsive-'))
  const filePath = path.join(directory, 'notes.md')
  await writeFile(filePath, '# Original\n')
  const app = await electron.launch({
    args: ['out/main/index.js', filePath],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })

  try {
    const window = await app.firstWindow()
    await window.setViewportSize({ width: 1024, height: 768 })
    await window.getByRole('button', { name: '源码', exact: true }).click()
    await window.getByRole('textbox', { name: 'Markdown 源码' }).fill('# Changed\n')
    await window.getByRole('button', { name: '预览', exact: true }).click()
    await expect(window.getByLabel('未保存')).toBeVisible()

    await window.getByRole('button', { name: '查找', exact: true }).click()
    await expect(window.getByRole('search', { name: '查找和替换' })).toBeVisible()
    await window.getByRole('button', { name: '关闭查找', exact: true }).click()

    await window.getByRole('button', { name: '大纲', exact: true }).click()
    await expect(window.getByRole('complementary', { name: '文档大纲' })).toBeVisible()
    await window.getByRole('button', { name: '关闭大纲', exact: true }).click()

    await window.keyboard.press('Meta+,')
    await expect(window.getByRole('dialog', { name: '全局设置' })).toBeVisible()
    await window.getByRole('button', { name: '关闭设置', exact: true }).click()
    await window.getByRole('button', { name: '源码', exact: true }).click()
    await expect(window.getByRole('textbox', { name: 'Markdown 源码' })).toContainText('# Changed')
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})
