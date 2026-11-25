import { forwardRef } from 'react'
import type { EditorAnchor, EditorMode } from '../../shared/documents'
import { SourceEditor } from './SourceEditor'
import { VisualEditor } from './VisualEditor'
import type { EditorController } from './types'

interface EditorHostProps {
  documentId: number
  mode: EditorMode
  markdown: string
  anchor: EditorAnchor | null
  viewportAnchor: EditorAnchor | null
  onBaselineReady(markdown: string, anchor: EditorAnchor): void
  epoch: number
  onChange(markdown: string, anchor: EditorAnchor): void
}

export const EditorHost = forwardRef<EditorController, EditorHostProps>(function EditorHost({ documentId, mode, markdown, anchor, viewportAnchor, onBaselineReady, epoch, onChange }, ref) {
  if (mode === 'visual') {
    return <VisualEditor key={`visual-${epoch}`} ref={ref} documentId={documentId} initialMarkdown={markdown} initialAnchor={anchor} initialViewportAnchor={viewportAnchor} onBaselineReady={onBaselineReady} onChange={onChange} />
  }
  return <SourceEditor key={`source-${epoch}`} ref={ref} initialMarkdown={markdown} initialAnchor={anchor} initialViewportAnchor={viewportAnchor} onChange={onChange} />
})
