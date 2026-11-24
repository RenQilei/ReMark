import type { EditorMode } from './documents'

export type ThemeId = 'native' | 'github' | 'solarized' | 'nord'
export type AppearanceMode = 'system' | 'light' | 'dark'
export type OpenWindowBehavior = 'tab' | 'window' | 'system'
export type DocumentFont = 'system' | 'serif' | 'mono'

export interface AppSettings {
  defaultMode: EditorMode
  rememberModePerFile: boolean
  openWindowBehavior: OpenWindowBehavior
  appearance: AppearanceMode
  theme: ThemeId
  autoSave: boolean
  fontFamily: DocumentFont
  fontSize: number
  contentWidth: number
  lineHeight: number
  showStatusBar: boolean
}

export const defaultSettings: AppSettings = {
  defaultMode: 'visual',
  rememberModePerFile: true,
  openWindowBehavior: 'tab',
  appearance: 'system',
  theme: 'native',
  autoSave: false,
  fontFamily: 'system',
  fontSize: 17,
  contentWidth: 760,
  lineHeight: 1.75,
  showStatusBar: true,
}

function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback
}

function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function sanitizeSettings(input: unknown): AppSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ...defaultSettings }
  const value = input as Record<string, unknown>
  return {
    defaultMode: choice(value.defaultMode, ['visual', 'source'] as const, defaultSettings.defaultMode),
    rememberModePerFile: booleanValue(value.rememberModePerFile, defaultSettings.rememberModePerFile),
    openWindowBehavior: choice(value.openWindowBehavior, ['tab', 'window', 'system'] as const, defaultSettings.openWindowBehavior),
    appearance: choice(value.appearance, ['system', 'light', 'dark'] as const, defaultSettings.appearance),
    theme: choice(value.theme, ['native', 'github', 'solarized', 'nord'] as const, defaultSettings.theme),
    autoSave: booleanValue(value.autoSave, defaultSettings.autoSave),
    fontFamily: choice(value.fontFamily, ['system', 'serif', 'mono'] as const, defaultSettings.fontFamily),
    fontSize: clamp(value.fontSize, defaultSettings.fontSize, 12, 32),
    contentWidth: clamp(value.contentWidth, defaultSettings.contentWidth, 560, 1100),
    lineHeight: clamp(value.lineHeight, defaultSettings.lineHeight, 1.3, 2.2),
    showStatusBar: booleanValue(value.showStatusBar, defaultSettings.showStatusBar),
  }
}
