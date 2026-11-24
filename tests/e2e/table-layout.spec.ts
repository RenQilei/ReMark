import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'

test('wraps long code inside cells and sizes columns from their content', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-table-'))
  const filePath = path.join(directory, 'table.md')
  await copyFile(path.resolve('tests/fixtures/table-layout.md'), filePath)
  const app = await electron.launch({
    args: ['out/main/index.js', filePath],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })

  try {
    const window = await app.firstWindow()
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
    const table = window.locator('.milkdown-table-block table:visible').first()
    await expect(table).toBeVisible()
    await expect(table).toHaveCSS('table-layout', 'auto')

    const layout = await table.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      columnWidths: Array.from(element.querySelectorAll('tbody tr:first-child td, tbody tr:first-child th')).map((cell) => cell.clientWidth),
      overflowingCells: Array.from(element.querySelectorAll('td,th')).filter((cell) => cell.scrollWidth > cell.clientWidth + 1).length,
    }))
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1)
    expect(layout.overflowingCells).toBe(0)
    expect(new Set(layout.columnWidths).size).toBeGreaterThan(1)

    const code = table.locator('code').first()
    await expect(code).toHaveCSS('overflow-wrap', 'anywhere')
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})
