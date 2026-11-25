import type { EditorAnchor } from '../../shared/documents'

export type EditorAction = 'bold' | 'italic' | 'strikethrough' | 'inlineCode' | 'link' | 'bulletList' | 'orderedList' | 'blockquote' | 'table' | 'image' | 'math' | 'paragraph' | 'heading1' | 'heading2' | 'heading3'

export interface EditorController {
  getMarkdown(): string | null
  canUndo(): boolean
  canRedo(): boolean
  perform(action: EditorAction): void
  insert(markdown: string): void
  findNext(query: string): boolean
  replaceCurrent(query: string, replacement: string): boolean
  replaceAll(query: string, replacement: string): number
  goToSourceOffset(offset: number): void
  getViewportAnchor(): EditorAnchor | null
  focus(): void
}

export interface EditorComponentProps {
  initialMarkdown: string
  initialAnchor: EditorAnchor | null
  initialViewportAnchor: EditorAnchor | null
  onBaselineReady?(markdown: string, anchor: EditorAnchor): void
  onChange(markdown: string, anchor: EditorAnchor): void
}
