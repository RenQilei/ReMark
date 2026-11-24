import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defaultSettings, sanitizeSettings } from '../shared/settings'
import type { AppSettings } from '../shared/settings'

export class SettingsService {
  private settings: AppSettings = { ...defaultSettings }

  constructor(private readonly filePath: string) {}

  async load(): Promise<AppSettings> {
    try {
      this.settings = sanitizeSettings(JSON.parse(await readFile(this.filePath, 'utf8')))
    } catch {
      this.settings = { ...defaultSettings }
    }
    return this.get()
  }

  get(): AppSettings {
    return { ...this.settings }
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = sanitizeSettings({ ...this.settings, ...patch })
    await mkdir(path.dirname(this.filePath), { recursive: true })
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`
    await writeFile(temporaryPath, `${JSON.stringify(this.settings, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, this.filePath)
    return this.get()
  }
}
