import { _electron as electron, expect, test } from '@playwright/test'

test('applies complete themes and appearance settings immediately', async () => {
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_DEMO: '1' },
  })
  const window = await app.firstWindow()
  const shell = window.locator('.app-shell')

  await window.getByRole('button', { name: '设置', exact: true }).click()
  await expect(window.getByRole('dialog', { name: '设置' })).toBeVisible()
  await window.getByRole('button', { name: /GitHub/ }).click()
  await expect(shell).toHaveAttribute('data-theme', 'github')
  await window.getByRole('button', { name: '深色', exact: true }).click()
  await expect(shell).toHaveAttribute('data-appearance', 'dark')
  await window.getByRole('button', { name: 'Solarized' }).click()
  await expect(shell).toHaveAttribute('data-theme', 'solarized')
  await window.getByRole('button', { name: 'Nord' }).click()
  await expect(shell).toHaveAttribute('data-theme', 'nord')

  await app.close()
})
