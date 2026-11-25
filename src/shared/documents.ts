export type EditorMode = 'visual' | 'source'
export type SaveReason = 'manual' | 'auto' | 'close'

export interface EditorAnchor {
  mode: EditorMode
  sourceOffset: number | null
  blockPath: string | null
  inlineOffset: number | null
  blockViewportOffset?: number | null
}

export interface DocumentSnapshot {
  filePath: string | null
  markdown: string
  savedMarkdown: string
  mode: EditorMode
  anchor: EditorAnchor | null
  viewportAnchor: EditorAnchor | null
  scrollTop: number
  revision: number
}

export interface DocumentSession {
  getSnapshot(): DocumentSnapshot
  isDirty(): boolean
  updateVisual(markdown: string, anchor: EditorAnchor): void
  updateSource(markdown: string, anchor: EditorAnchor): void
  adoptCleanVisualBaseline(markdown: string, anchor: EditorAnchor): DocumentSnapshot
  switchMode(mode: EditorMode, viewportAnchor?: EditorAnchor | null): DocumentSnapshot
  undoDepth(): number
  redoDepth(): number
  undo(): DocumentSnapshot
  redo(): DocumentSnapshot
  markSaved(markdown: string): void
}

function copySnapshot(snapshot: DocumentSnapshot): DocumentSnapshot {
  return {
    ...snapshot,
    anchor: snapshot.anchor ? { ...snapshot.anchor } : null,
    viewportAnchor: snapshot.viewportAnchor ? { ...snapshot.viewportAnchor } : null,
  }
}

export class MarkdownDocumentSession implements DocumentSession {
  private snapshot: DocumentSnapshot
  private cleanVisualMarkdown: string | null = null
  private readonly undoStack: DocumentSnapshot[] = []
  private readonly redoStack: DocumentSnapshot[] = []

  constructor(filePath: string | null, markdown: string, mode: EditorMode, savedMarkdown = markdown) {
    this.snapshot = { filePath, markdown, savedMarkdown, mode, anchor: null, viewportAnchor: null, scrollTop: 0, revision: 0 }
  }

  getSnapshot(): DocumentSnapshot {
    return copySnapshot(this.snapshot)
  }

  isDirty(): boolean {
    return this.snapshot.markdown !== this.snapshot.savedMarkdown && this.snapshot.markdown !== this.cleanVisualMarkdown
  }

  updateVisual(markdown: string, anchor: EditorAnchor): void {
    this.update(markdown, anchor)
  }

  updateSource(markdown: string, anchor: EditorAnchor): void {
    this.update(markdown, anchor)
  }

  adoptCleanVisualBaseline(markdown: string, anchor: EditorAnchor): DocumentSnapshot {
    if (!this.isDirty()) {
      this.cleanVisualMarkdown = markdown
      this.snapshot = { ...this.snapshot, markdown, anchor: { ...anchor } }
    }
    return this.getSnapshot()
  }

  switchMode(mode: EditorMode, viewportAnchor?: EditorAnchor | null): DocumentSnapshot {
    if (mode === this.snapshot.mode) return this.getSnapshot()
    this.undoStack.push(this.getSnapshot())
    this.redoStack.length = 0
    this.snapshot = {
      ...this.snapshot,
      mode,
      anchor: this.snapshot.anchor ? { ...this.snapshot.anchor, mode } : null,
      viewportAnchor: viewportAnchor === undefined ? this.snapshot.viewportAnchor : viewportAnchor,
    }
    return this.getSnapshot()
  }

  undoDepth(): number {
    return this.undoStack.length
  }

  redoDepth(): number {
    return this.redoStack.length
  }

  undo(): DocumentSnapshot {
    const previous = this.undoStack.pop()
    if (!previous) return this.getSnapshot()
    this.redoStack.push(this.getSnapshot())
    this.snapshot = { ...previous, savedMarkdown: this.snapshot.savedMarkdown }
    return this.getSnapshot()
  }

  redo(): DocumentSnapshot {
    const next = this.redoStack.pop()
    if (!next) return this.getSnapshot()
    this.undoStack.push(this.getSnapshot())
    this.snapshot = { ...next, savedMarkdown: this.snapshot.savedMarkdown }
    return this.getSnapshot()
  }

  markSaved(markdown: string): void {
    this.snapshot.savedMarkdown = markdown
    this.cleanVisualMarkdown = markdown
  }

  private update(markdown: string, anchor: EditorAnchor): void {
    this.redoStack.length = 0
    const changed = markdown !== this.snapshot.markdown
    this.snapshot = {
      ...this.snapshot,
      markdown,
      anchor: { ...anchor },
      revision: this.snapshot.revision + (changed ? 1 : 0),
    }
  }
}
