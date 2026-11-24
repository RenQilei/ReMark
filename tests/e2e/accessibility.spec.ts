import { _electron as electron, expect, test } from '@playwright/test'

test('exposes editor semantics and keeps dialogs keyboard accessible', async () => {
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_DEMO: '1', REMARK_USER_DATA_DIR: '/tmp/remark-e2e-accessibility' },
  })
  try {
    const window = await app.firstWindow()
    await expect(window.getByRole('button', { name: '所见即所得', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(window.getByRole('toolbar', { name: '文档格式' })).toBeVisible()
    await window.getByRole('button', { name: '设置', exact: true }).click()
    await expect(window.getByRole('dialog', { name: '设置' })).toBeVisible()
    await window.keyboard.press('Escape')
    await expect(window.getByRole('dialog', { name: '设置' })).toHaveCount(0)
    await window.getByRole('button', { name: '源码', exact: true }).click()
    await expect(window.getByRole('textbox', { name: 'Markdown 源码' })).toHaveAttribute('aria-multiline', 'true')
    await expect(window.getByRole('button', { name: '源码', exact: true })).toHaveAttribute('aria-pressed', 'true')
  } finally {
    await app.close()
  }
})
