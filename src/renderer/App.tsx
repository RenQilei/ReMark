import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { ZoomControl } from './components/ZoomControl'
import type { ZoomDirection } from '../shared/zoom'
import type { BootstrapInfo } from '../shared/api'
import { MarkdownDocumentSession } from '../shared/documents'
import type { DocumentSnapshot, EditorAnchor, EditorMode } from '../shared/documents'
import type { OpenedFile } from '../shared/files'
import { defaultSettings } from '../shared/settings'
import type { AppSettings, DocumentFont } from '../shared/settings'
import { demoMarkdown } from './components/DemoDocument'
import { EditorToolbar } from './components/EditorToolbar'
import { EmptyState } from './components/EmptyState'
import { ModeSwitch } from './components/ModeSwitch'
import { SettingsPanel } from './components/SettingsPanel'
import { FindReplace } from './components/FindReplace'
import { DocumentOutline } from './components/DocumentOutline'
import { documentHeadings } from './editor/markdown/outline'
import { EditorHost } from './editor/EditorHost'
import type { EditorAction, EditorController } from './editor/types'

const fontFamilies: Record<DocumentFont, string> = {
  system: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif',
  serif: '"Songti SC", "Iowan Old Style", "Source Han Serif SC", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
}

export function App() {
  const sessionRef = useRef<MarkdownDocumentSession | null>(null)
  const editorRef = useRef<EditorController>(null)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [bootstrap, setBootstrap] = useState<BootstrapInfo | null>(null)
  const [fileState, setFileState] = useState<OpenedFile | null>(null)
  const [mode, setMode] = useState<EditorMode>(settings.defaultMode)
  const [source, setSource] = useState('')
  const [savedSource, setSavedSource] = useState('')
  const [anchor, setAnchor] = useState<EditorAnchor | null>(null)
  const [viewportAnchor, setViewportAnchor] = useState<EditorAnchor | null>(null)
  const [epoch, setEpoch] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [closeRequested, setCloseRequested] = useState(false)
  const [externalChange, setExternalChange] = useState<OpenedFile | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [zoomFactor, setZoomFactor] = useState(1)
  const [visualBaseline, setVisualBaseline] = useState<string | null>(null)
  const dirty = source !== savedSource && source !== visualBaseline
  const hasDocument = Boolean(bootstrap && (bootstrap.demo || bootstrap.isNew || bootstrap.filePath || bootstrap.recovery))

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    let active = true
    const unsubscribe = window.remark.onZoomChanged(setZoomFactor)
    void window.remark.getZoomFactor().then((current) => { if (active) setZoomFactor(current) })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    void Promise.all([window.remark.getBootstrap(), window.remark.getSettings()]).then(([info, currentSettings]) => {
      const initialSource = info.recovery?.markdown ?? info.document?.markdown ?? (info.demo ? demoMarkdown : '')
      const initialSavedSource = info.recovery?.savedMarkdown ?? info.document?.markdown ?? initialSource
      const initialMode = info.recovery?.mode ?? currentSettings.defaultMode
      sessionRef.current = new MarkdownDocumentSession(info.filePath, initialSource, initialMode, initialSavedSource)
      setBootstrap(info)
      setFileState(info.document)
      setSource(initialSource)
      setSavedSource(initialSavedSource)
      setSettings(currentSettings)
      setMode(initialMode)
      document.title = info.filePath?.split('/').pop() ?? (info.demo ? '产品手记.md' : info.isNew ? '未命名.md' : 'Remark')
    })
    const subscriptions = [
      window.remark.onSettingsChanged(setSettings),
      window.remark.onOpenSettings(() => setSettingsOpen(true)),
      window.remark.onRequestOpen(() => void window.remark.requestOpen()),
      window.remark.onNewDocument(() => void window.remark.newDocument()),
      window.remark.onCloseRequested(() => setCloseRequested(true)),
    ]
    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }, [])

  const saveDocument = useCallback(async (): Promise<OpenedFile | null> => {
    setErrorMessage(null)
    try {
      const markdownToSave = editorRef.current?.getMarkdown() ?? source
      const opened = await window.remark.saveDocument(markdownToSave)
      if (opened) {
        sessionRef.current?.markSaved(markdownToSave)
        setVisualBaseline(markdownToSave)
        setSource(markdownToSave)
        setFileState(opened)
        setSavedSource(markdownToSave)
        setBootstrap((current) => current ? { ...current, filePath: opened.filePath, isNew: false } : current)
        document.title = opened.filePath.split('/').pop() ?? 'Remark'
      }
      return opened
    } catch (error) {
      setErrorMessage(error instanceof Error && error.message.includes('FILE_CHANGED_EXTERNALLY') ? '文件已被其他应用修改，请选择重新加载或另存副本。' : '保存失败，请检查文件权限和磁盘空间。')
      return null
    }
  }, [source])

  const saveDocumentAs = useCallback(async (): Promise<OpenedFile | null> => {
    setErrorMessage(null)
    try {
      const markdownToSave = editorRef.current?.getMarkdown() ?? source
      const opened = await window.remark.saveDocumentAs(markdownToSave)
      if (opened) {
        sessionRef.current?.markSaved(markdownToSave)
        setVisualBaseline(markdownToSave)
        setSource(markdownToSave)
        setFileState(opened)
        setSavedSource(markdownToSave)
        setBootstrap((current) => current ? { ...current, filePath: opened.filePath, isNew: false } : current)
        document.title = opened.filePath.split('/').pop() ?? 'Remark'
      }
      return opened
    } catch {
      setErrorMessage('另存为失败，请检查目标目录权限。')
      return null
    }
  }, [source])

  useEffect(() => window.remark.onSave(() => void saveDocument()), [saveDocument])
  useEffect(() => window.remark.onSaveAs(() => void saveDocumentAs()), [saveDocumentAs])
  useEffect(() => window.remark.onExternalChange((opened) => {
    if (dirty) setExternalChange(opened)
    else {
      void window.remark.acceptExternal(opened).then(() => {
        sessionRef.current = new MarkdownDocumentSession(opened.filePath, opened.markdown, mode)
        setVisualBaseline(null)
        setFileState(opened)
        setSource(opened.markdown)
        setSavedSource(opened.markdown)
        setEpoch((value) => value + 1)
      })
    }
  }), [dirty, mode])

  useEffect(() => {
    if (!settings.autoSave || !dirty || !fileState) return
    const timer = window.setTimeout(() => void saveDocument(), 1200)
    return () => window.clearTimeout(timer)
  }, [dirty, fileState, saveDocument, settings.autoSave])

  useEffect(() => {
    if (!hasDocument) return
    void window.remark.setDirty(dirty)
    const timer = window.setTimeout(() => {
      void window.remark.writeRecovery({ markdown: source, savedMarkdown: savedSource, mode, dirty })
    }, 800)
    return () => window.clearTimeout(timer)
  }, [dirty, hasDocument, mode, savedSource, source])

  const acceptExternalChange = () => {
    if (!externalChange) return
    void window.remark.acceptExternal(externalChange).then(() => {
      sessionRef.current = new MarkdownDocumentSession(externalChange.filePath, externalChange.markdown, mode)
      setVisualBaseline(null)
      setFileState(externalChange)
      setSource(externalChange.markdown)
      setSavedSource(externalChange.markdown)
      setExternalChange(null)
      setEpoch((value) => value + 1)
    })
  }
  const changeMode = (nextMode: EditorMode) => {
    const readingAnchor = editorRef.current?.getViewportAnchor() ?? null
    const latestMarkdown = editorRef.current?.getMarkdown()
    if (latestMarkdown !== null && latestMarkdown !== undefined && latestMarkdown !== source) {
      const latestAnchor = anchor ?? { mode, sourceOffset: null, blockPath: null, inlineOffset: null }
      if (mode === 'visual') sessionRef.current?.updateVisual(latestMarkdown, latestAnchor)
      else sessionRef.current?.updateSource(latestMarkdown, latestAnchor)
      setSource(latestMarkdown)
    }
    const snapshot = sessionRef.current?.switchMode(nextMode, readingAnchor)
    setAnchor(snapshot?.anchor ?? null)
    setViewportAnchor(snapshot?.viewportAnchor ?? null)
    setMode(nextMode)
  }
  const handleEditorChange = useCallback((markdown: string, nextAnchor: EditorAnchor) => {
    if (mode === 'visual') sessionRef.current?.updateVisual(markdown, nextAnchor)
    else sessionRef.current?.updateSource(markdown, nextAnchor)
    setSource(markdown)
    setAnchor(nextAnchor)
  }, [mode])
  const handleVisualBaseline = useCallback((markdown: string, nextAnchor: EditorAnchor) => {
    if (sessionRef.current?.isDirty()) return
    const snapshot = sessionRef.current?.adoptCleanVisualBaseline(markdown, nextAnchor)
    if (!snapshot) return
    setVisualBaseline(markdown)
    setSource(snapshot.markdown)
    setAnchor(snapshot.anchor)
  }, [])
  const applySnapshot = useCallback((snapshot: DocumentSnapshot) => {
    setSource(snapshot.markdown)
    setMode(snapshot.mode)
    setAnchor(snapshot.anchor)
    setViewportAnchor(snapshot.viewportAnchor)
    setEpoch((value) => value + 1)
  }, [])
  const changeZoom = useCallback((next: number) => {
    void window.remark.setZoomFactor(next).then(setZoomFactor)
  }, [])
  const stepZoom = useCallback((direction: ZoomDirection) => {
    void window.remark.stepZoom(direction).then(setZoomFactor)
  }, [])
  const handleEditorKeyboard = useCallback((event: React.KeyboardEvent) => {
    if (!event.metaKey && !event.ctrlKey) return
    const key = event.key.toLowerCase()
    if (!event.altKey && (key === '=' || key === '+' || event.code === 'NumpadAdd')) {
      event.preventDefault()
      event.stopPropagation()
      stepZoom('in')
      return
    }
    if (!event.altKey && (key === '-' || event.code === 'NumpadSubtract')) {
      event.preventDefault()
      event.stopPropagation()
      stepZoom('out')
      return
    }
    if (!event.altKey && (key === '0' || event.code === 'Numpad0')) {
      event.preventDefault()
      event.stopPropagation()
      changeZoom(1)
      return
    }
    if (key === 'f') {
      event.preventDefault()
      event.stopPropagation()
      setOutlineOpen(false)
      setFindOpen(true)
      return
    }
    if (key !== 'z') return
    const session = sessionRef.current
    if (!session) return
    if (event.shiftKey) {
      if (editorRef.current?.canRedo()) return
      if (session.redoDepth() > 0) {
        event.preventDefault()
        event.stopPropagation()
        applySnapshot(session.redo())
      }
    } else {
      if (editorRef.current?.canUndo()) return
      if (session.undoDepth() > 0) {
        event.preventDefault()
        event.stopPropagation()
        applySnapshot(session.undo())
      }
    }
  }, [applySnapshot, changeZoom, stepZoom])
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleEditorKeyboard(event as unknown as React.KeyboardEvent)
    window.addEventListener('keydown', listener, true)
    return () => window.removeEventListener('keydown', listener, true)
  }, [handleEditorKeyboard])

  const headings = useMemo(() => documentHeadings(source), [source])
  const cursorOffset = Math.max(0, Math.min(source.length, anchor?.sourceOffset ?? 0))
  const beforeCursor = source.slice(0, cursorOffset)
  const cursorLine = beforeCursor.split('\n').length
  const cursorColumn = cursorOffset - beforeCursor.lastIndexOf('\n')
  const handleToolbarAction = (action: EditorAction) => {
    if (action === 'image') {
      void window.remark.importImages().then((paths) => {
        for (const assetPath of paths) editorRef.current?.insert(`\n![替代文字](${assetPath})\n`)
      })
      return
    }
    editorRef.current?.perform(action)
  }
  const updateSettings = (patch: Partial<AppSettings>) => void window.remark.updateSettings(patch).then(setSettings)
  const resolvedAppearance = settings.appearance === 'system' ? (systemDark ? 'dark' : 'light') : settings.appearance
  const settingsDialog = settingsOpen ? <SettingsPanel settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} /> : null
  const shellStyle = {
    '--document-width': `${settings.contentWidth}px`,
    '--document-font-size': `${settings.fontSize}px`,
    '--document-line-height': settings.lineHeight,
    '--document-font-family': fontFamilies[settings.fontFamily],
  } as React.CSSProperties
  const documentName = fileState?.filePath.split('/').pop() ?? bootstrap?.filePath?.split('/').pop() ?? (bootstrap?.demo ? '产品手记.md' : '未命名.md')

  if (!hasDocument) {
    return (
      <div className="app-shell empty-shell" data-theme={settings.theme} data-appearance={resolvedAppearance} style={shellStyle}>
        <div className="empty-titlebar"><span>Remark</span><button type="button" className="icon-button empty-settings" aria-label="设置" onClick={() => setSettingsOpen(true)}><Settings2 size={16} /></button></div>
        <EmptyState onOpen={() => void window.remark.requestOpen()} onNew={() => void window.remark.newDocument()} />
        {settingsDialog}
      </div>
    )
  }

  return (
    <div className="app-shell" data-theme={settings.theme} data-appearance={resolvedAppearance} style={shellStyle}>
      <header className="window-toolbar">
        <div className="document-identity"><span className="document-name">{documentName}</span>{dirty && <span className="dirty-dot" aria-label="未保存" />}</div>
        <EditorToolbar onAction={handleToolbarAction} onFind={() => { setOutlineOpen(false); setFindOpen(true) }} onOutline={() => { setFindOpen(false); setOutlineOpen((value) => !value) }} />
        <ModeSwitch mode={mode} onChange={changeMode} />
        <button type="button" className="icon-button settings-button" aria-label="设置" onClick={() => setSettingsOpen(true)}><Settings2 size={16} /></button>
      </header>

      <main className={`editor-surface ${mode === 'source' ? 'source-mode' : ''}`}>
        <EditorHost ref={editorRef} documentId={bootstrap?.windowId ?? -1} mode={mode} markdown={source} anchor={anchor} viewportAnchor={viewportAnchor} onBaselineReady={handleVisualBaseline} epoch={epoch} onChange={handleEditorChange} />
      </main>

      {findOpen && <FindReplace onFind={(query) => editorRef.current?.findNext(query) ?? false} onReplace={(query, replacement) => editorRef.current?.replaceCurrent(query, replacement) ?? false} onReplaceAll={(query, replacement) => editorRef.current?.replaceAll(query, replacement) ?? 0} onClose={() => setFindOpen(false)} />}
      {outlineOpen && <DocumentOutline headings={headings} onSelect={(heading) => { if (mode === 'source') editorRef.current?.goToSourceOffset(heading.offset); else editorRef.current?.findNext(heading.text); setOutlineOpen(false) }} onClose={() => setOutlineOpen(false)} />}

      {settings.showStatusBar && <footer className="status-bar">
        <span className="status-text">{source.length} 字符{mode === 'source' ? ` · 第 ${cursorLine} 行，第 ${cursorColumn} 列` : ''}</span>
        <div className="status-details"><span className="status-summary">{dirty ? '未保存' : '已保存于本机'}{' · CommonMark + GFM'}</span><ZoomControl factor={zoomFactor} onChange={changeZoom} onStep={stepZoom} /></div>
      </footer>}
      {errorMessage && <div className="save-error" role="alert">{errorMessage}<button type="button" onClick={() => setErrorMessage(null)}>关闭</button></div>}
      {settingsDialog}

      {closeRequested && <div className="settings-backdrop"><section className="document-dialog" role="alertdialog" aria-label="未保存的修改"><h2>要保存对“{documentName}”的修改吗？</h2><p>不保存的修改将无法从当前文档中恢复。</p><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setCloseRequested(false)}>取消</button><button type="button" className="secondary-button" onClick={() => void window.remark.closeWindow(true)}>不保存</button><button type="button" className="primary-button" onClick={() => void saveDocument().then((opened) => opened && window.remark.closeWindow(false))}>保存</button></div></section></div>}

      {externalChange && <div className="settings-backdrop"><section className="document-dialog" role="alertdialog" aria-label="文件已在外部修改"><h2>文件已被其他应用修改</h2><p>你的未保存修改仍然保留。可以重新加载磁盘版本，或把当前版本另存为副本。</p><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setExternalChange(null)}>保留我的版本</button><button type="button" className="secondary-button" onClick={() => void saveDocumentAs().then((opened) => opened && setExternalChange(null))}>另存副本</button><button type="button" className="primary-button" onClick={acceptExternalChange}>重新加载</button></div></section></div>}
    </div>
  )
}
