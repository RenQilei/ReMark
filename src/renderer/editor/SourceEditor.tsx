import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { redoDepth, undoDepth } from '@codemirror/commands'
import { markdown as markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { anchorAtSourceOffset, sourceOffsetForAnchor } from './markdown/anchors'
import type { EditorAction, EditorComponentProps, EditorController } from './types'

function performSourceAction(view: EditorView, action: EditorAction): void {
  const state = view.state
  const selection = state.selection.main
  const selected = state.sliceDoc(selection.from, selection.to)
  const inline: Partial<Record<EditorAction, [string, string]>> = {
    bold: ['**', '**'], italic: ['*', '*'], strikethrough: ['~~', '~~'], inlineCode: ['`', '`'],
  }
  if (inline[action]) {
    const [prefix, suffix] = inline[action]
    const content = selected || '文本'
    const insert = `${prefix}${content}${suffix}`
    view.dispatch(state.update({ changes: { from: selection.from, to: selection.to, insert }, selection: { anchor: selection.from + prefix.length, head: selection.from + prefix.length + content.length }, userEvent: 'input' }))
  } else if (action === 'link') {
    const content = selected || '链接文字'
    const insert = `[${content}](https://)`
    view.dispatch(state.update({ changes: { from: selection.from, to: selection.to, insert }, selection: { anchor: selection.from + content.length + 3, head: selection.from + content.length + 10 }, userEvent: 'input' }))
  } else if (['paragraph', 'heading1', 'heading2', 'heading3'].includes(action)) {
    const line = state.doc.lineAt(selection.from)
    const level = action === 'paragraph' ? 0 : Number(action.at(-1))
    const text = line.text.replace(/^\s{0,3}#{1,6}\s+/, '')
    const insert = `${level ? `${'#'.repeat(level)} ` : ''}${text}`
    view.dispatch(state.update({ changes: { from: line.from, to: line.to, insert }, userEvent: 'input' }))
  } else if (['bulletList', 'orderedList', 'blockquote'].includes(action)) {
    const start = state.doc.lineAt(selection.from)
    const end = state.doc.lineAt(selection.to)
    const lines = state.sliceDoc(start.from, end.to).split('\n')
    const insert = lines.map((line, index) => action === 'bulletList' ? `- ${line}` : action === 'orderedList' ? `${index + 1}. ${line}` : `> ${line}`).join('\n')
    view.dispatch(state.update({ changes: { from: start.from, to: end.to, insert }, userEvent: 'input' }))
  } else {
    const blocks: Partial<Record<EditorAction, string>> = {
      table: '\n| 标题 | 标题 |\n| --- | --- |\n| 内容 | 内容 |\n',
      image: '\n![替代文字](assets/image.png)\n',
      math: '\n$$\ne = mc^2\n$$\n',
    }
    const insert = blocks[action]
    if (insert) view.dispatch(state.update({ changes: { from: selection.from, to: selection.to, insert }, selection: { anchor: selection.from + insert.length }, userEvent: 'input' }))
  }
  view.focus()
}

export const SourceEditor = forwardRef<EditorController, EditorComponentProps>(function SourceEditor({ initialMarkdown, initialAnchor, onChange }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const initialMarkdownRef = useRef(initialMarkdown)
  const initialAnchorRef = useRef(initialAnchor)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useImperativeHandle(ref, () => ({
    getMarkdown: () => viewRef.current?.state.doc.toString() ?? null,
    canUndo: () => viewRef.current ? undoDepth(viewRef.current.state) > 0 : false,
    canRedo: () => viewRef.current ? redoDepth(viewRef.current.state) > 0 : false,
    perform: (action) => { if (viewRef.current) performSourceAction(viewRef.current, action) },
    insert: (markdown) => {
      const view = viewRef.current
      if (!view) return
      const selection = view.state.selection.main
      view.dispatch(view.state.update({ changes: { from: selection.from, to: selection.to, insert: markdown }, selection: { anchor: selection.from + markdown.length }, userEvent: 'input' }))
      view.focus()
    },
    findNext: (query) => {
      const view = viewRef.current
      if (!view || !query) return false
      const documentText = view.state.doc.toString()
      const lowerDocument = documentText.toLocaleLowerCase()
      const lowerQuery = query.toLocaleLowerCase()
      let index = lowerDocument.indexOf(lowerQuery, view.state.selection.main.to)
      if (index < 0) index = lowerDocument.indexOf(lowerQuery)
      if (index < 0) return false
      view.dispatch(view.state.update({ selection: { anchor: index, head: index + query.length }, scrollIntoView: true }))
      view.focus()
      return true
    },
    replaceCurrent: (query, replacement) => {
      const view = viewRef.current
      if (!view || !query) return false
      const selection = view.state.selection.main
      if (view.state.sliceDoc(selection.from, selection.to).toLocaleLowerCase() !== query.toLocaleLowerCase()) return false
      view.dispatch(view.state.update({ changes: { from: selection.from, to: selection.to, insert: replacement }, userEvent: 'input' }))
      return true
    },
    replaceAll: (query, replacement) => {
      const view = viewRef.current
      if (!view || !query) return 0
      const text = view.state.doc.toString()
      const lowerText = text.toLocaleLowerCase()
      const lowerQuery = query.toLocaleLowerCase()
      const changes = []
      let index = 0
      while ((index = lowerText.indexOf(lowerQuery, index)) >= 0) {
        changes.push({ from: index, to: index + query.length, insert: replacement })
        index += query.length
      }
      if (changes.length > 0) view.dispatch(view.state.update({ changes: changes.reverse(), userEvent: 'input' }))
      return changes.length
    },
    goToSourceOffset: (offset) => {
      const view = viewRef.current
      if (!view) return
      const anchor = Math.max(0, Math.min(view.state.doc.length, offset))
      view.dispatch(view.state.update({ selection: { anchor }, scrollIntoView: true }))
      view.focus()
    },
    focus: () => viewRef.current?.focus(),
  }), [])

  useEffect(() => {
    if (!containerRef.current) return
    const anchor = initialAnchorRef.current
    const selection = anchor ? sourceOffsetForAnchor(initialMarkdownRef.current, anchor) : initialMarkdownRef.current.length
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: initialMarkdownRef.current,
        selection: { anchor: selection },
        extensions: [
          basicSetup,
          markdownLanguage({ codeLanguages: languages }),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return
            const markdown = update.state.doc.toString()
            onChangeRef.current(markdown, anchorAtSourceOffset(markdown, update.state.selection.main.head, 'source'))
          }),
        ],
      }),
    })
    view.contentDOM.setAttribute('aria-label', 'Markdown 源码')
    view.contentDOM.setAttribute('role', 'textbox')
    view.contentDOM.setAttribute('aria-multiline', 'true')
    view.contentDOM.setAttribute('spellcheck', 'false')
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  return <div className="codemirror-host" ref={containerRef} />
})
