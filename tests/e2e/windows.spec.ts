import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'

test('opens multiple files as native-tab-capable windows and deduplicates paths', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-windows-'))
  const userData = path.join(directory, 'user-data')
  const firstFile = path.join(directory, 'first.md')
  const secondFile = path.join(directory, 'second.md')
  await writeFile(firstFile, '# First\n')
  await writeFile(secondFile, '# Second\n')
  const app = await electron.launch({
    args: ['out/main/index.js', firstFile],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: userData },
  })

  try {
    await app.firstWindow()
    await app.evaluate(({ BrowserWindow }) => {
      const state = globalThis as typeof globalThis & { remarkTabCalls?: number }
      state.remarkTabCalls = 0
      const firstWindow = BrowserWindow.getAllWindows()[0]
      const original = firstWindow.addTabbedWindow
      firstWindow.addTabbedWindow = (window) => {
        state.remarkTabCalls = (state.remarkTabCalls ?? 0) + 1
        original.call(firstWindow, window)
      }
    })
    await app.evaluate(({ app: electronApp }, filePath) => {
      electronApp.emit('open-file', { preventDefault() {} }, filePath)
    }, secondFile)
    await expect.poll(() => app.windows().length).toBe(2)

    await app.evaluate(({ app: electronApp }, filePath) => {
      electronApp.emit('open-file', { preventDefault() {} }, filePath)
    }, firstFile)
    await expect.poll(() => app.windows().length).toBe(2)

    const tabCalls = await app.evaluate(() => (globalThis as typeof globalThis & { remarkTabCalls?: number }).remarkTabCalls)
    expect(tabCalls).toBe(1)
    await expect(app.windows()[1].getByRole('heading', { name: 'Second' })).toBeVisible()
  } finally {
    await app.close()
    await rm(directory, { recursive: true, force: true })
  }
})
