export type EditorMode = 'visual' | 'source'
export type SaveReason = 'manual' | 'auto' | 'close'

export interface EditorAnchor {
  mode: EditorMode
  sourceOffset: number | null
  blockPath: string | null
  inlineOffset: number | null
}

export interface DocumentSnapshot {
  filePath: string | null
  markdown: string
  savedMarkdown: string
  mode: EditorMode
  anchor: EditorAnchor | null
  scrollTop: number
  revision: number
}

export interface DocumentSession {
  getSnapshot(): DocumentSnapshot
  isDirty(): boolean
  updateVisual(markdown: string, anchor: EditorAnchor): void
  updateSource(markdown: string, anchor: EditorAnchor): void
  switchMode(mode: EditorMode): DocumentSnapshot
  undoDepth(): number
  redoDepth(): number
  undo(): DocumentSnapshot
  redo(): DocumentSnapshot
  markSaved(markdown: string): void
}

function copySnapshot(snapshot: DocumentSnapshot): DocumentSnapshot {
  return { ...snapshot, anchor: snapshot.anchor ? { ...snapshot.anchor } : null }
}

export class MarkdownDocumentSession implements DocumentSession {
  private snapshot: DocumentSnapshot
  private readonly undoStack: DocumentSnapshot[] = []
  private readonly redoStack: DocumentSnapshot[] = []

  constructor(filePath: string | null, markdown: string, mode: EditorMode, savedMarkdown = markdown) {
    this.snapshot = { filePath, markdown, savedMarkdown, mode, anchor: null, scrollTop: 0, revision: 0 }
  }

  getSnapshot(): DocumentSnapshot {
    return copySnapshot(this.snapshot)
  }

  isDirty(): boolean {
    return this.snapshot.markdown !== this.snapshot.savedMarkdown
  }

  updateVisual(markdown: string, anchor: EditorAnchor): void {
    this.update(markdown, anchor)
  }

  updateSource(markdown: string, anchor: EditorAnchor): void {
    this.update(markdown, anchor)
  }

  switchMode(mode: EditorMode): DocumentSnapshot {
    if (mode === this.snapshot.mode) return this.getSnapshot()
    this.undoStack.push(this.getSnapshot())
    this.redoStack.length = 0
    this.snapshot = {
      ...this.snapshot,
      mode,
      anchor: this.snapshot.anchor ? { ...this.snapshot.anchor, mode } : null,
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
