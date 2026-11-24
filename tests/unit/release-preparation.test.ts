import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(file, 'utf8')

describe('alpha release preparation', () => {
  it('uses the same alpha version in the package and lockfile', () => {
    const packageJson = JSON.parse(read('package.json'))
    const lockfile = JSON.parse(read('package-lock.json'))
    expect(packageJson.version).toBe('0.1.0-alpha.1')
    expect(lockfile.version).toBe('0.1.0-alpha.1')
    expect(lockfile.packages[''].version).toBe('0.1.0-alpha.1')
    expect(read('scripts/publish-gitee-release.mjs')).toContain("process.env.npm_package_version ?? '0.1.0-alpha.1'")
  })

  it('treats hyphenated tags as prereleases', () => {
    const workflow = read('.github/workflows/release.yml')
    expect(workflow).toContain('[[ "${GITHUB_REF_NAME}" == *-* ]]')
    expect(workflow).toContain('echo "prerelease=true" >> "$GITHUB_OUTPUT"')
    expect(workflow).toContain('v0.1.0-alpha.1')
  })

  it('ignores build output, local settings, and signing credentials', () => {
    const ignore = read('.gitignore')
    for (const pattern of ['release/', 'test-results/', 'build/icon.iconset/', '.env', '.env.*', '*.p8', '*.p12', '*.mobileprovision', '.DS_Store']) {
      expect(ignore).toContain(pattern)
    }
    expect(ignore).toContain('!.env.example')
  })

  it('keeps artifact publishing under explicit workflow control', () => {
    expect(read('scripts/build-dmg.mjs')).toContain("'--publish', 'never'")
  })

  it('configures remotes only in dry-run mode by default', () => {
    const result = spawnSync(process.execPath, ['scripts/setup-remotes.mjs'], { encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Dry run: no remotes will be added or changed.')
  })
})
