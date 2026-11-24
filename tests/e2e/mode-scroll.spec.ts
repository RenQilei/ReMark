import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const targetY = 140

interface VisibleBlock {
  text: string
  blockViewportOffset: number
}

function visibleBlockAt({ scroller, block }: { scroller: string; block: string }): VisibleBlock | null {
  const scrollerTop = document.querySelector(scroller)!.getBoundingClientRect().top
  const elements = Array.from(document.querySelectorAll<HTMLElement>(block))
  const element = elements.find((candidate) => candidate.textContent && candidate.getBoundingClientRect().bottom > scrollerTop)
  if (!element) return null
  return {
    text: element.textContent ?? '',
    blockViewportOffset: element.getBoundingClientRect().top - scrollerTop,
  }
}

async function captureVisualBlock(window: Page): Promise<VisibleBlock> {
  const block = await window.evaluate(visibleBlockAt, { scroller: '.milkdown-host', block: '.ProseMirror > :not(.ProseMirror-widget):not(.ProseMirror-gapcursor)' })
  expect(block).not.toBeNull()
  expect(block!.text).not.toBe('')
  return block!
}

async function expectSourceBlock(window: Page, block: VisibleBlock): Promise<void> {
  await expect.poll(() => window.locator('.cm-scroller').evaluate((_, expected) => {
    const lines = Array.from(document.querySelectorAll('.cm-line'))
    const scrollerTop = document.querySelector('.cm-scroller')!.getBoundingClientRect().top
    const line = lines.find((candidate) => candidate.textContent === expected.text && Math.abs(candidate.getBoundingClientRect().top - scrollerTop - expected.blockViewportOffset) <= 2)
    if (!line) return null
    return line.getBoundingClientRect().top - document.querySelector('.cm-scroller')!.getBoundingClientRect().top
  }, block), { message: `源码中应保持“${block.text.slice(0, 30)}”的视口坐标` }).toBeCloseTo(block.blockViewportOffset, 0)
}

async function expectVisualBlock(window: Page, block: VisibleBlock): Promise<void> {
  await expect.poll(() => window.locator('.ProseMirror').evaluate((_, expected) => {
    const hostTop = document.querySelector('.milkdown-host')!.getBoundingClientRect().top
    const elements = Array.from(document.querySelectorAll('.ProseMirror > :not(.ProseMirror-widget):not(.ProseMirror-gapcursor)'))
    const element = elements.find((candidate) => candidate.textContent === expected.text && Math.abs(candidate.getBoundingClientRect().top - hostTop - expected.blockViewportOffset) <= 2)
    if (!element) return null
    return element.getBoundingClientRect().top - hostTop
  }, block), { message: `富文本中应保持“${block.text.slice(0, 30)}”的视口坐标` }).toBeCloseTo(block.blockViewportOffset, 0)
}

async function launchLongDocument() {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-e2e-scroll-'))
  const filePath = path.join(directory, 'long.md')
  const sections = Array.from({ length: 40 }, (_, index) => `## Section ${index + 1}\n\nParagraph ${index + 1}. ${'A paragraph with enough content to make the document long. '.repeat(8)}\n`)
  const markdown = `# Long document\n\n${sections.join('\n')}`
  await writeFile(filePath, markdown)
  const app = await electron.launch({
    args: ['out/main/index.js', filePath],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })
  return { app, directory, markdown }
}

async function scrollSectionIntoReadingPosition(window: Page): Promise<void> {
  await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
  const visualHeading = window.getByRole('heading', { name: 'Section 20', exact: true })
  await visualHeading.evaluate((element, offset) => {
    const host = document.querySelector('.milkdown-host')!
    const blockTop = element.getBoundingClientRect().top - host.getBoundingClientRect().top
    host.scrollTop += blockTop - offset
  }, targetY)
  await expect.poll(() => visualHeading.evaluate((element) => element.getBoundingClientRect().top - document.querySelector('.milkdown-host')!.getBoundingClientRect().top)).toBeCloseTo(targetY, 0)
}

test('restores the first visible block at the same viewport coordinate in both editor modes', async () => {
  const { app, directory } = await launchLongDocument()
  try {
    const window = await app.firstWindow()
    await scrollSectionIntoReadingPosition(window)
    const visualBlock = await captureVisualBlock(window)

    await window.getByRole('button', { name: '源码', exact: true }).click()
    await expectSourceBlock(window, visualBlock)
    const sourceBlock = await window.evaluate(visibleBlockAt, { scroller: '.cm-scroller', block: '.cm-line' })
    expect(sourceBlock?.text).toBe(visualBlock.text)
    expect(sourceBlock?.blockViewportOffset).toBeCloseTo(visualBlock.blockViewportOffset, 0)

    await window.getByRole('button', { name: '所见即所得', exact: true }).click()
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
    await expectVisualBlock(window, visualBlock)
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})

test('restores the nearest surviving block when the original block was deleted', async () => {
  const { app, directory } = await launchLongDocument()
  try {
    const window = await app.firstWindow()
    await scrollSectionIntoReadingPosition(window)
    const visualBlock = await captureVisualBlock(window)
    await window.getByRole('button', { name: '源码', exact: true }).click()
    const targetLine = window.locator('.cm-line').filter({ hasText: visualBlock.text }).first()
    await expect(targetLine).toBeVisible()
    await targetLine.click({ position: { x: 30, y: 65 } })
    await window.keyboard.press('Control+l')
    await window.keyboard.press('Backspace')
    const source = window.getByRole('textbox', { name: 'Markdown 源码' })
    await expect(source).not.toContainText(visualBlock.text)
    await window.getByRole('button', { name: '所见即所得', exact: true }).click()
    await expect(window.locator('.milkdown-host')).toHaveAttribute('data-ready', 'true')
    const restored = await captureVisualBlock(window)
    expect(restored.text).not.toBe(visualBlock.text)
    expect(restored.text).not.toBe('Long document')
    expect(await window.locator('.milkdown-host').evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})
