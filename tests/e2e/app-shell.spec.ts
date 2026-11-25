import { _electron as electron, expect, test } from '@playwright/test'

async function launchApp(demo = false) {
  return electron.launch({
    args: ['out/main/index.js'],
    env: {
      ...process.env,
      REMARK_TEST_MODE: '1',
      ...(demo ? { REMARK_DEMO: '1' } : {}),
    },
  })
}

test('opens a clean empty document window without a file manager', async () => {
  const app = await launchApp()
  const window = await app.firstWindow()

  await expect(window.getByRole('button', { name: '打开文件…' })).toBeVisible()
  await expect(window.getByRole('button', { name: '新建文档' })).toBeVisible()
  await expect(window.getByTestId('file-tree')).toHaveCount(0)
  await expect(window.getByTestId('split-editor')).toHaveCount(0)
  await expect(window.getByRole('button', { name: '设置', exact: true })).toHaveCount(0)

  await app.close()
})

test('shows the document-first visual editor shell', async () => {
  const app = await launchApp(true)
  const window = await app.firstWindow()

  await expect(window.getByRole('heading', { name: '让写作回到文档本身' })).toBeVisible()
  await expect(window.getByRole('button', { name: '预览', exact: true })).toBeVisible()
  await expect(window.getByRole('button', { name: '源码', exact: true })).toBeVisible()
  await expect(window.getByRole('toolbar', { name: '文档格式' })).toBeVisible()
  await expect(window.getByTestId('file-tree')).toHaveCount(0)
  await expect(window.getByTestId('split-editor')).toHaveCount(0)
  await expect(window.getByRole('button', { name: '设置', exact: true })).toHaveCount(0)

  await app.close()
})
