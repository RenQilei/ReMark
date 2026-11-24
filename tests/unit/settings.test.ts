import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { SettingsService } from '../../src/main/settings-service'
import { defaultSettings, sanitizeSettings } from '../../src/shared/settings'

const tempDirectories: string[] = []

async function tempFile(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-settings-'))
  tempDirectories.push(directory)
  return path.join(directory, 'settings.json')
}

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('sanitizeSettings', () => {
  it('returns defaults for invalid input and ignores unknown fields', () => {
    expect(sanitizeSettings(null)).toEqual(defaultSettings)
    expect(sanitizeSettings({ theme: 'unknown', fontSize: 'large', extra: true })).toEqual(defaultSettings)
  })

  it('accepts valid values and clamps numeric ranges', () => {
    const result = sanitizeSettings({ theme: 'nord', appearance: 'dark', fontSize: 100, contentWidth: 100, lineHeight: 9 })
    expect(result.theme).toBe('nord')
    expect(result.appearance).toBe('dark')
    expect(result.fontSize).toBe(32)
    expect(result.contentWidth).toBe(560)
    expect(result.lineHeight).toBe(2.2)
  })
})

describe('SettingsService', () => {
  it('recovers from malformed JSON without throwing', async () => {
    const filePath = await tempFile()
    await writeFile(filePath, '{broken')
    const service = new SettingsService(filePath)
    expect(await service.load()).toEqual(defaultSettings)
  })

  it('persists sanitized updates atomically', async () => {
    const filePath = await tempFile()
    const service = new SettingsService(filePath)
    await service.load()
    const updated = await service.update({ theme: 'solarized', fontSize: 19 })

    expect(updated.theme).toBe('solarized')
    expect(updated.fontSize).toBe(19)
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toMatchObject({ theme: 'solarized', fontSize: 19 })

    const reloaded = new SettingsService(filePath)
    expect((await reloaded.load()).theme).toBe('solarized')
  })
})
