import path from 'node:path'

export function resolveUserDataPath(appData: string, override?: string): string {
  return override ? path.resolve(override) : path.join(appData, 'remark-editor')
}
