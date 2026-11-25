import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'

async function launchFixture(fixtureName: string) {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-technical-'))
  const filePath = path.join(directory, fixtureName)
  await copyFile(path.resolve('tests/fixtures', fixtureName), filePath)
  const app = await electron.launch({
    args: ['out/main/index.js', filePath],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })
  return { app, directory }
}

test('renders technical markdown and preserves its source after a visual edit', async () => {
  const { app, directory } = await launchFixture('technical.md')
  try {
    const window = await app.firstWindow()
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
    await expect(window.getByRole('heading', { name: '技术文档' })).toBeVisible()
    await expect(window.getByText('脚注内容会显示在文档中。')).toBeVisible()
    await expect(window.locator('.katex').first()).toBeVisible()
    await expect(window.locator('.mermaid-preview svg')).toBeVisible({ timeout: 20_000 })
    await expect(window.getByRole('table').first()).toBeVisible()
    await expect(window.locator('.raw-html-preview strong')).toHaveText('安全 HTML')
    expect(await window.evaluate(() => '__remarkUnsafe' in window)).toBe(false)

    await window.getByRole('heading', { name: '技术文档' }).click()
    await window.keyboard.press('End')
    await window.keyboard.insertText(' 编辑')
    await window.getByRole('button', { name: '源码', exact: true }).click()
    const source = window.getByRole('textbox', { name: 'Markdown 源码' })
    await expect(source).toContainText('[^note]')
    await expect(source).toContainText('graph TD')
    await expect(source).toContainText('<script>window.__remarkUnsafe = true</script>')
    await expect(source).toContainText('技术文档 编辑')
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})

test('does not execute malicious HTML or diagram content', async () => {
  const { app, directory } = await launchFixture('adversarial.html.md')
  try {
    const window = await app.firstWindow()
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
    await expect(window.locator('.raw-html-preview iframe')).toHaveCount(0)
    await expect(window.locator('.raw-html-preview script')).toHaveCount(0)
    expect(await window.evaluate(() => (window as unknown as { __remarkUnsafe?: boolean }).__remarkUnsafe)).not.toBe(true)
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})


test('renders Chinese and multiline Mermaid labels as safe SVG text', async () => {
  const { app, directory } = await launchFixture('mermaid-labels.md')
  try {
    const window = await app.firstWindow()
    const preview = window.locator('.mermaid-preview')
    await expect(preview.locator('svg')).toBeVisible({ timeout: 20_000 })
    await expect(preview).toContainText('用户触点')
    await expect(preview).toContainText('Flutter App')
    await expect(preview).toContainText('iOS / Android')
    await expect(preview).toContainText('鸿蒙：技术验证，不随首发')
    await expect(preview).toContainText('API 网关')
    await expect(preview.locator('foreignObject, script')).toHaveCount(0)
    const emptyNodes = await preview.locator('svg .node').evaluateAll((elements) => elements.filter((element) => !(element.textContent ?? '').trim()).length)
    expect(emptyNodes).toBe(0)

    await window.getByRole('button', { name: '源码', exact: true }).click()
    const source = window.getByRole('textbox', { name: 'Markdown 源码' })
    await expect(source).toContainText('flowchart TB')
    await expect(source).toContainText('subgraph Client[用户触点]')
    await expect(source).toContainText('Flutter App<br/>iOS / Android')

    await source.fill('')
    await window.getByRole('button', { name: '所见即所得', exact: true }).click()
    await window.locator('.ProseMirror').click()
    await window.keyboard.type('```mermaid')
    await expect(window.locator('.mermaid-node')).toHaveCount(1)
    await window.getByRole('button', { name: '源码', exact: true }).click()
    await expect(source).toContainText('```mermaid')
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})
