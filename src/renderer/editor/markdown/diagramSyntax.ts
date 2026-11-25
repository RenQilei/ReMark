import { $inputRule, $nodeSchema, $remark } from '@milkdown/kit/utils'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import type { Node } from 'unist'

interface MarkdownNode extends Node {
  lang?: string | null
  children?: MarkdownNode[]
}

function transform(node: MarkdownNode): MarkdownNode {
  if (node.type === 'code' && node.lang === 'mermaid') return { ...node, type: 'diagram' }
  if (node.children) return { ...node, children: node.children.map(transform) }
  return node
}

function remarkMermaid() {
  return (tree: MarkdownNode) => {
    if (tree.children) tree.children = tree.children.map(transform)
  }
}

const remarkDiagramPlugin = $remark('remarkMermaid', () => remarkMermaid)

const diagramSchema = $nodeSchema('diagram', () => ({
  content: 'text*',
  group: 'block',
  marks: '',
  defining: true,
  atom: true,
  isolating: true,
  attrs: { value: { default: '' } },
  parseDOM: [{
    tag: 'div[data-type="diagram"]',
    preserveWhitespace: 'full',
    getAttrs: (dom) => {
      if (!(dom instanceof HTMLElement)) return false
      return { value: dom.dataset.value ?? '' }
    },
  }],
  toDOM: (node) => {
    const value = String(node.attrs.value ?? '')
    const dom = document.createElement('div')
    dom.dataset.type = 'diagram'
    dom.dataset.value = value
    dom.textContent = value
    return dom
  },
  parseMarkdown: {
    match: ({ type }) => type === 'diagram',
    runner: (state, node, type) => {
      state.addNode(type, { value: String(node.value ?? '') })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'diagram',
    runner: (state, node) => {
      state.addNode('code', undefined, String(node.attrs.value ?? ''), { lang: 'mermaid' })
    },
  },
}))

const insertDiagramInputRule = $inputRule((ctx) => new InputRule(/^```mermaid$/, (state, _match, start, end) => {
  const nodeType = diagramSchema.type(ctx)
  const $start = state.doc.resolve(start)
  if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), nodeType)) return null
  return state.tr.delete(start, end).setBlockType(start, start, nodeType)
}))

export const diagramSyntax = [remarkDiagramPlugin, diagramSchema, insertDiagramInputRule].flat() as MilkdownPlugin[]
