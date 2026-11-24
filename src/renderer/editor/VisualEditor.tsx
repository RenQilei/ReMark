import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Crepe } from '@milkdown/crepe'
import { diagram } from '@milkdown/plugin-diagram'
import { editorViewCtx } from '@milkdown/kit/core'
import { setBlockType, toggleMark, wrapIn } from '@milkdown/kit/prose/commands'
import { wrapInList } from '@milkdown/kit/prose/schema-list'
import { TextSelection } from '@milkdown/kit/prose/state'
import { redoDepth, undoDepth } from '@milkdown/kit/prose/history'
import { insert } from '@milkdown/kit/utils'
import type { EditorView } from '@milkdown/kit/prose/view'
import { anchorAtSourceOffset } from './markdown/anchors'
import { externalizeAssetUrls, restoreAssetUrls } from './markdown/assetUrls'
import { mermaidNodeViewPlugin, sanitizedHtmlNodeViewPlugin, strictMermaidPlugin } from './markdown/technicalPlugins'
import type { EditorAction, EditorComponentProps, EditorController } from './types'
import '@milkdown/crepe/theme/common/style.css'

function textMatches(view: EditorView, query: string): { from: number; to: number }[] {
  const matches: { from: number; to: number }[] = []
  const lowerQuery = query.toLocaleLowerCase()
  if (!lowerQuery) return matches
  view.state.doc.descendants((node, position) => {
    if (!node.isText) return
    const text = node.text ?? ''
    const lowerText = text.toLocaleLowerCase()
    let index = 0
    while ((index = lowerText.indexOf(lowerQuery, index)) >= 0) {
      matches.push({ from: position + index, to: position + index + query.length })
      index += query.length
    }
  })
  return matches
}

interface VisualEditorProps extends EditorComponentProps {
  documentId: number
}

export const VisualEditor = forwardRef<EditorController, VisualEditorProps>(function VisualEditor({ documentId, initialMarkdown, onChange }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const crepeRef = useRef<Crepe | null>(null)
  const onChangeRef = useRef(onChange)
  const initialMarkdownRef = useRef(initialMarkdown)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useImperativeHandle(ref, () => ({
    getMarkdown: () => {
      const markdown = crepeRef.current?.getMarkdown()
      return markdown === undefined ? null : restoreAssetUrls(markdown, documentId)
    },
    canUndo: () => viewRef.current ? undoDepth(viewRef.current.state) > 0 : false,
    canRedo: () => viewRef.current ? redoDepth(viewRef.current.state) > 0 : false,
    perform: (action: EditorAction) => {
      const view = viewRef.current
      if (!view) return
      const marks: Partial<Record<EditorAction, string>> = { bold: 'strong', italic: 'em', strikethrough: 'strike', inlineCode: 'inlineCode', link: 'link' }
      const markName = marks[action]
      if (markName) {
        const mark = view.state.schema.marks[markName]
        if (mark) toggleMark(mark, action === 'link' ? { href: 'https://' } : undefined)(view.state, view.dispatch)
      } else if (['paragraph', 'heading1', 'heading2', 'heading3'].includes(action)) {
        const level = action === 'paragraph' ? 0 : Number(action.at(-1))
        const nodeType = view.state.schema.nodes[action === 'paragraph' ? 'paragraph' : 'heading']
        if (nodeType) setBlockType(nodeType, level ? { level } : undefined)(view.state, view.dispatch)
      } else if (action === 'blockquote') {
        const nodeType = view.state.schema.nodes.blockquote
        if (nodeType) wrapIn(nodeType)(view.state, view.dispatch)
      } else if (action === 'bulletList' || action === 'orderedList') {
        const nodeType = view.state.schema.nodes[action === 'bulletList' ? 'bullet_list' : 'ordered_list']
        if (nodeType) wrapInList(nodeType)(view.state, view.dispatch)
      } else {
        const blocks: Partial<Record<EditorAction, string>> = {
          table: '\n| 标题 | 标题 |\n| --- | --- |\n| 内容 | 内容 |\n',
          image: '\n![替代文字](assets/image.png)\n',
          math: '\n$$\ne = mc^2\n$$\n',
        }
        const markdown = blocks[action]
        if (markdown) crepeRef.current?.editor.action(insert(markdown))
      }
      view.focus()
    },
    insert: (markdown) => {
      crepeRef.current?.editor.action(insert(externalizeAssetUrls(markdown, documentId)))
      viewRef.current?.focus()
    },
    findNext: (query) => {
      const view = viewRef.current
      if (!view || !query) return false
      const matches = textMatches(view, query)
      const match = matches.find((candidate) => candidate.from >= view.state.selection.to) ?? matches[0]
      if (!match) return false
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, match.from, match.to)).scrollIntoView())
      view.focus()
      return true
    },
    replaceCurrent: (query, replacement) => {
      const view = viewRef.current
      if (!view || !query) return false
      const selection = view.state.selection
      const selected = view.state.doc.textBetween(selection.from, selection.to, '\n', '\n')
      if (selected.toLocaleLowerCase() !== query.toLocaleLowerCase()) return false
      view.dispatch(view.state.tr.insertText(replacement, selection.from, selection.to))
      return true
    },
    replaceAll: (query, replacement) => {
      const view = viewRef.current
      if (!view || !query) return 0
      const matches = textMatches(view, query)
      const transaction = view.state.tr
      for (const match of matches.reverse()) transaction.insertText(replacement, match.from, match.to)
      if (matches.length > 0) view.dispatch(transaction)
      return matches.length
    },
    goToSourceOffset: (offset) => {
      const view = viewRef.current
      if (!view) return
      const position = Math.max(1, Math.min(view.state.doc.content.size, offset + 1))
      view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(position))).scrollIntoView())
      view.focus()
    },
    focus: () => viewRef.current?.focus(),
  }), [documentId])

  useEffect(() => {
    if (!containerRef.current) return
    let disposed = false
    const crepe = new Crepe({ root: containerRef.current, defaultValue: externalizeAssetUrls(initialMarkdownRef.current, documentId) })
    crepeRef.current = crepe
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown, previous) => {
        if (disposed) return
        const restored = restoreAssetUrls(markdown, documentId)
        if (restored === restoreAssetUrls(previous, documentId)) return
        const view = viewRef.current
        const offset = view ? view.state.doc.textBetween(0, view.state.selection.from, '\n', '\n').length : 0
        onChangeRef.current(restored, anchorAtSourceOffset(restored, Math.min(restored.length, offset), 'visual'))
      })
    })
    crepe.editor.use(diagram).use(strictMermaidPlugin).use(mermaidNodeViewPlugin).use(sanitizedHtmlNodeViewPlugin)
    void crepe.create().then(() => {
      if (disposed) return
      const view = crepe.editor.action((ctx) => ctx.get(editorViewCtx))
      viewRef.current = view
      view.dom.setAttribute('aria-label', '所见即所得编辑器')
      containerRef.current?.setAttribute('data-ready', 'true')
    })
    return () => {
      disposed = true
      viewRef.current = null
      crepeRef.current = null
      void crepe.destroy()
    }
  }, [documentId])

  return <div className="milkdown-host" ref={containerRef} />
})
