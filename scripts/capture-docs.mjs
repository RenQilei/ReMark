import { _electron as electron } from '@playwright/test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const directory = await mkdtemp(path.join(tmpdir(), 'remark-docs-capture-'))
const assets = path.resolve('docs/assets')
await mkdir(assets, { recursive: true })
const app = await electron.launch({
  args: ['out/main/index.js'],
  env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_DEMO: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
})
try {
  const window = await app.firstWindow()
  await window.locator('.milkdown-host[data-ready="true"]').waitFor()
  await window.evaluate(() => window.remark.updateSettings({ appearance: 'light', theme: 'native' }))
  await window.evaluate(() => document.fonts.ready)
  await window.screenshot({ path: path.join(assets, 'remark-light.png') })
  await window.evaluate(() => window.remark.updateSettings({ appearance: 'dark', theme: 'native' }))
  await window.waitForTimeout(200)
  await window.screenshot({ path: path.join(assets, 'remark-dark.png') })
  console.log('Captured real Electron light and dark screenshots in docs/assets.')
} finally {
  await app.close()
  await rm(directory, { recursive: true, force: true })
}
