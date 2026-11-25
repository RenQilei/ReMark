import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

test('applies complete themes and appearance settings immediately', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-appearance-'))
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_DEMO: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })
  try {
    const window = await app.firstWindow()
    const shell = window.locator('.app-shell')
    await expect(window.getByRole('toolbar', { name: '文档格式' })).toBeVisible()

    await window.keyboard.press('Meta+,')
    await expect(window.getByRole('dialog', { name: '全局设置' })).toBeVisible()
    await window.getByRole('button', { name: /GitHub/ }).click()
    await expect(shell).toHaveAttribute('data-theme', 'github')
    await window.getByRole('button', { name: '深色', exact: true }).click()
    await expect(shell).toHaveAttribute('data-appearance', 'dark')
    await window.getByRole('button', { name: 'Solarized' }).click()
    await expect(shell).toHaveAttribute('data-theme', 'solarized')
    await window.getByRole('button', { name: 'Nord' }).click()
    await expect(shell).toHaveAttribute('data-theme', 'nord')
  } finally {
    await app.close()
    await rm(directory, { recursive: true, force: true })
  }
})
