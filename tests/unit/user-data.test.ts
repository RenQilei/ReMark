import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveUserDataPath } from '../../src/main/user-data'

describe('user data path compatibility', () => {
  it('keeps the legacy data directory after the ReMark brand rename', () => {
    expect(resolveUserDataPath('/Library/Application Support')).toBe('/Library/Application Support/remark-editor')
  })

  it('honors an explicit test directory without changing production defaults', () => {
    expect(resolveUserDataPath('/Library/Application Support', './tmp/remark-tests')).toBe(path.resolve('./tmp/remark-tests'))
  })
})
