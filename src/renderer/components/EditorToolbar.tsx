import { Bold, Code2, Image, Italic, Link2, List, ListOrdered, ListTree, Plus, Quote, Search, Sigma, Strikethrough, Table2 } from 'lucide-react'
import type { EditorAction } from '../editor/types'

const tools: { label: string; icon: typeof Bold; action: EditorAction }[] = [
  { label: '粗体', icon: Bold, action: 'bold' },
  { label: '斜体', icon: Italic, action: 'italic' },
  { label: '删除线', icon: Strikethrough, action: 'strikethrough' },
  { label: '行内代码', icon: Code2, action: 'inlineCode' },
  { label: '链接', icon: Link2, action: 'link' },
]

const blocks: { label: string; icon: typeof Bold; action: EditorAction }[] = [
  { label: '无序列表', icon: List, action: 'bulletList' },
  { label: '有序列表', icon: ListOrdered, action: 'orderedList' },
  { label: '引用', icon: Quote, action: 'blockquote' },
  { label: '表格', icon: Table2, action: 'table' },
  { label: '图片', icon: Image, action: 'image' },
  { label: '数学公式', icon: Sigma, action: 'math' },
]

interface EditorToolbarProps {
  onAction(action: EditorAction): void
  onFind(): void
  onOutline(): void
}

export function EditorToolbar({ onAction, onFind, onOutline }: EditorToolbarProps) {
  return (
    <div className="format-tools" role="toolbar" aria-label="文档格式">
      <select className="paragraph-style" aria-label="段落样式" defaultValue="paragraph" onChange={(event) => onAction(event.target.value as EditorAction)}>
        <option value="paragraph">正文</option>
        <option value="heading1">标题 1</option>
        <option value="heading2">标题 2</option>
        <option value="heading3">标题 3</option>
      </select>
      <span className="toolbar-separator" />
      {tools.map(({ label, icon: Icon, action }) => (
        <button type="button" className="icon-button" aria-label={label} title={label} key={label} data-action={action} onClick={() => onAction(action)}>
          <Icon size={16} strokeWidth={1.8} />
        </button>
      ))}
      <span className="toolbar-separator" />
      {blocks.map(({ label, icon: Icon, action }) => (
        <button type="button" className="icon-button" aria-label={label} title={label} key={label} data-action={action} onClick={() => onAction(action)}>
          <Icon size={16} strokeWidth={1.8} />
        </button>
      ))}
      <span className="toolbar-separator" />
      <button type="button" className="icon-button" aria-label="插入" title="插入" data-action="table" onClick={() => onAction('table')}><Plus size={17} /></button>
      <div className="toolbar-spacer" />
      <button type="button" className="icon-button" aria-label="查找" title="查找" onClick={onFind}><Search size={16} /></button>
      <button type="button" className="icon-button" aria-label="大纲" title="大纲" onClick={onOutline}><ListTree size={16} /></button>
    </div>
  )
}
