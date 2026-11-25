import { nodeViewCtx } from '@milkdown/kit/core'
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import type { NodeViewConstructor } from '@milkdown/kit/prose/view'
import { sanitizeHtml, sanitizeSvg } from './sanitize'

type Mermaid = typeof import('mermaid').default

let mermaidModule: Promise<Mermaid> | null = null

function loadMermaid(): Promise<Mermaid> {
  mermaidModule ??= import('mermaid').then((module) => {
    const mermaid = module.default
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      htmlLabels: false,
      flowchart: { useMaxWidth: true },
      sequence: { useMaxWidth: true },
    })
    return mermaid
  })
  return mermaidModule
}

export const sanitizedHtmlNodeViewPlugin: MilkdownPlugin = (ctx) => () => {
  const nodeViews = ctx.get(nodeViewCtx)
  ctx.set(nodeViewCtx, [[
    'html',
    (node) => {
      const dom = document.createElement('span')
      dom.className = 'raw-html-node'
      const preview = document.createElement('span')
      preview.className = 'raw-html-preview'
      const source = document.createElement('code')
      source.className = 'raw-html-source'
      const render = (value: string) => {
        const sanitized = sanitizeHtml(value)
        preview.innerHTML = sanitized
        source.textContent = value
        source.hidden = sanitized.length > 0
        for (const link of preview.querySelectorAll('a')) {
          link.addEventListener('click', (event) => event.preventDefault())
        }
      }
      render(String(node.attrs.value ?? ''))
      dom.title = '原始 HTML · 可在源码模式中编辑'
      dom.append(preview, source)
      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'html') return false
          render(String(updatedNode.attrs.value ?? ''))
          return true
        },
      }
    },
  ], ...nodeViews] as [string, NodeViewConstructor][])
}

let mermaidRenderId = 0

export const mermaidNodeViewPlugin: MilkdownPlugin = (ctx) => () => {
  const nodeViews = ctx.get(nodeViewCtx)
  ctx.set(nodeViewCtx, [[
    'diagram',
    (node) => {
      const dom = document.createElement('div')
      dom.className = 'mermaid-node'
      const heading = document.createElement('div')
      heading.className = 'mermaid-heading'
      const label = document.createElement('span')
      label.textContent = 'Mermaid'
      const toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.textContent = '查看代码'
      const preview = document.createElement('div')
      preview.className = 'mermaid-preview'
      const source = document.createElement('pre')
      source.className = 'mermaid-source'
      source.hidden = true
      heading.append(label, toggle)
      dom.append(heading, preview, source)
      let version = 0
      const render = async (value: string) => {
        const current = ++version
        source.textContent = value
        preview.textContent = '正在渲染图表…'
        try {
          const mermaid = await loadMermaid()
          const result = await mermaid.render(`remark-mermaid-${++mermaidRenderId}`, value)
          if (current !== version) return
          preview.innerHTML = sanitizeSvg(result.svg)
        } catch (error) {
          if (current !== version) return
          preview.textContent = error instanceof Error ? `图表无法渲染：${error.message}` : '图表无法渲染'
          source.hidden = false
        }
      }
      void render(String(node.attrs.value ?? ''))
      toggle.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        source.hidden = !source.hidden
        toggle.textContent = source.hidden ? '查看代码' : '隐藏代码'
      })
      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'diagram') return false
          void render(String(updatedNode.attrs.value ?? ''))
          return true
        },
        destroy() { version += 1 },
      }
    },
  ], ...nodeViews] as [string, NodeViewConstructor][])
}
