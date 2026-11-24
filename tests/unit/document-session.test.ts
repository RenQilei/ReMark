import { describe, expect, it } from 'vitest'
import { MarkdownDocumentSession } from '../../src/shared/documents'

function anchor(mode: 'visual' | 'source' = 'visual') {
  return { mode, sourceOffset: 0, blockPath: 'root.children.0', inlineOffset: 0 }
}

describe('MarkdownDocumentSession', () => {
  it('opens clean and switches modes without changing content or dirty state', () => {
    const session = new MarkdownDocumentSession(null, '# Original\n', 'visual')
    expect(session.isDirty()).toBe(false)
    session.switchMode('source')
    expect(session.getSnapshot().markdown).toBe('# Original\n')
    expect(session.getSnapshot().mode).toBe('source')
    expect(session.isDirty()).toBe(false)
    expect(session.getSnapshot().revision).toBe(0)
  })

  it('keeps unsaved edits consistent in both directions', () => {
    const session = new MarkdownDocumentSession('/tmp/a.md', '# One\n', 'visual')
    session.updateVisual('# Two\n', anchor())
    expect(session.isDirty()).toBe(true)
    session.switchMode('source')
    expect(session.getSnapshot().markdown).toBe('# Two\n')
    session.updateSource('# Three\n', anchor('source'))
    session.switchMode('visual')
    expect(session.getSnapshot().markdown).toBe('# Three\n')
    expect(session.isDirty()).toBe(true)
  })

  it('marks only successful saves as clean', () => {
    const session = new MarkdownDocumentSession(null, 'one', 'visual')
    session.updateVisual('two', anchor())
    session.markSaved('two')
    expect(session.isDirty()).toBe(false)
    session.switchMode('source')
    expect(session.isDirty()).toBe(false)
  })

  it('undoes and redoes across mode checkpoints', () => {
    const session = new MarkdownDocumentSession(null, 'one', 'visual')
    session.updateVisual('two', anchor())
    session.switchMode('source')
    session.updateSource('three', anchor('source'))
    session.switchMode('visual')

    expect(session.undoDepth()).toBe(2)
    const sourceCheckpoint = session.undo()
    expect(sourceCheckpoint.mode).toBe('source')
    expect(sourceCheckpoint.markdown).toBe('three')
    expect(session.undo().markdown).toBe('two')
    expect(session.undoDepth()).toBe(0)
    const redoneSource = session.redo()
    expect(redoneSource.mode).toBe('source')
    expect(redoneSource.markdown).toBe('three')
    expect(session.redo().mode).toBe('visual')
  })

  it('does not rewind the saved disk baseline when undoing', () => {
    const session = new MarkdownDocumentSession(null, 'one', 'visual')
    session.updateVisual('two', anchor())
    session.markSaved('two')
    session.switchMode('source')
    session.updateSource('three', anchor('source'))
    session.switchMode('visual')
    expect(session.undo().savedMarkdown).toBe('two')
  })

  it('clears redo checkpoints after a new edit branch', () => {
    const session = new MarkdownDocumentSession(null, 'one', 'visual')
    session.switchMode('source')
    session.undo()
    session.updateVisual('new branch', anchor())
    session.switchMode('source')
    expect(session.redoDepth()).toBe(0)
  })
})
