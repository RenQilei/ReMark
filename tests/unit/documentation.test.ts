import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')
const english = read('README.md')
const chinese = read('Readme.zh-CN.md')
const documentationFiles = ['README.md', 'Readme.zh-CN.md', 'CONTRIBUTING.md', 'CONTRIBUTING.zh-CN.md', 'SECURITY.md', 'SECURITY.zh-CN.md', 'docs/RELEASING.md']

describe('public documentation', () => {
  it('provides complete English and Chinese entry points with language links', () => {
    expect(english.length).toBeGreaterThan(5000)
    expect(chinese.length).toBeGreaterThan(3000)
    expect(english).toContain('Readme.zh-CN.md')
    expect(chinese).toContain('README.md')
    for (const heading of ['## Download', '## Quick start', '## Features', '## Privacy and document safety', '## Build from source', '## Project status and limitations', '## Documentation and license']) {
      expect(english).toContain(heading)
    }
    for (const heading of ['## 下载', '## 快速开始', '## 功能', '## 隐私与文件安全', '## 从源码运行', '## 项目状态与限制', '## 文档与许可证']) {
      expect(chinese).toContain(heading)
    }
  })

  it('documents both architectures and checksum verification without local paths', () => {
    for (const content of [english, chinese]) {
      expect(content).toContain('Remark-<version>-unsigned-arm64.dmg')
      expect(content).toContain('Remark-<version>-unsigned-x64.dmg')
      expect(content).toContain('shasum -a 256 -c SHA256SUMS.txt')
      expect(content).not.toContain('/Users/')
      expect(content).not.toContain('Remark--unsigned')
    }
  })

  it('keeps every relative link and image target inside the repository', () => {
    for (const file of documentationFiles) {
      const content = read(file)
      const targets = [...content.matchAll(/!??\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1])
      targets.push(...[...content.matchAll(/<img\s+[^>]*src="([^"]+)"/g)].map((match) => match[1]))
      for (const target of targets) {
        if (/^(?:https?:|mailto:|#)/.test(target)) continue
        const relativeTarget = target.split('#')[0]
        expect(relativeTarget.length, `${file} contains an empty link`).toBeGreaterThan(0)
        expect(existsSync(path.resolve(root, path.dirname(file), relativeTarget)), `${file} links to missing ${relativeTarget}`).toBe(true)
      }
    }
  })
})

describe('brand source', () => {
  it('uses Re with a solid vector arrow and removes emoji and previous R implementations', () => {
    const icon = read('build/icon.svg')
    expect(icon).toContain('<title>Re with a solid down arrow</title>')
    expect(icon).toContain('<tspan>R</tspan><tspan dx="32">e</tspan>')
    expect(icon).toContain('id="solid-down-arrow"')
    expect(icon).toContain('M620 568H662V646H707L642 698L577 646H620Z')
    expect(icon).toContain('Arial Black')
    expect(icon).toContain('stroke-linejoin="round"')
    expect(icon).not.toContain('Apple Color Emoji')
    expect(icon).not.toContain('>⬇</text>')
    expect(icon).not.toContain('M370 466h170')
    expect(existsSync(path.join(root, 'build/icon.icns'))).toBe(true)
  })
})
