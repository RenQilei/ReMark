import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'

async function stop(app: ElectronApplication): Promise<void> {
  const child = app.process()
  if (child.exitCode !== null) return
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()))
  child.kill('SIGKILL')
  await exited
}

async function launch(markdown: string) {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-reliability-'))
  const filePath = path.join(directory, 'document.md')
  await writeFile(filePath, markdown)
  const app = await electron.launch({
    args: ['out/main/index.js', filePath],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })
  return { app, directory }
}

test('keeps content through 50 unsaved mode switches', async () => {
  test.setTimeout(90_000)
  const { app, directory } = await launch('# Original\n')
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: '源码', exact: true }).click()
    await window.getByRole('textbox', { name: 'Markdown 源码' }).fill('# Persistent\n\n中文内容\n')
    for (let index = 0; index < 25; index += 1) {
      await window.getByRole('button', { name: '预览', exact: true }).click()
      await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
      await expect(window.locator('.ProseMirror')).toContainText('中文内容')
      await window.getByRole('button', { name: '源码', exact: true }).click()
      await expect(window.getByRole('textbox', { name: 'Markdown 源码' })).toContainText('# Persistent')
    }
  } finally {
    await stop(app)
    await rm(directory, { recursive: true, force: true })
  }
})

test('opens a one-megabyte technical document within the performance budget', async () => {
  test.setTimeout(90_000)
  const blocks = ['# Large document\n']
  for (let index = 0; index < 500; index += 1) {
    blocks.push(`## Section ${index}\n\n${'Markdown content with readable prose. '.repeat(56)}\n`)
    if (index % 5 === 0) blocks.push(`$$\nx_{${index}} + y_{${index}} = z_{${index}}\n$$\n`)
    blocks.push(`\`\`\`ts\nconst value${index} = ${index}\n\`\`\`\n`)
  }
  const markdown = blocks.join('\n')
  expect(markdown.length).toBeGreaterThan(1_000_000)
  const { app, directory } = await launch(markdown)
  try {
    const startedAt = Date.now()
    const window = await app.firstWindow()
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
    expect(Date.now() - startedAt).toBeLessThan(30_000)
    await window.getByRole('button', { name: '源码', exact: true }).click()
    await expect(window.getByRole('textbox', { name: 'Markdown 源码' })).toContainText('# Large document')
    await window.getByRole('button', { name: '预览', exact: true }).click()
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
  } finally {
    await stop(app)
    await rm(directory, { recursive: true, force: true })
  }
})
