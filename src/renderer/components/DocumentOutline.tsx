import { X } from 'lucide-react'
import type { DocumentHeading } from '../editor/markdown/outline'

interface DocumentOutlineProps {
  headings: DocumentHeading[]
  onSelect(heading: DocumentHeading): void
  onClose(): void
}

export function DocumentOutline({ headings, onSelect, onClose }: DocumentOutlineProps) {
  return (
    <aside className="document-outline" aria-label="文档大纲">
      <header><strong>大纲</strong><button type="button" className="icon-button" aria-label="关闭大纲" onClick={onClose}><X size={15} /></button></header>
      <nav>
        {headings.length === 0 ? <p>文档中还没有标题。</p> : headings.map((heading) => (
          <button type="button" key={`${heading.offset}-${heading.text}`} className={`outline-level-${heading.level}`} onClick={() => onSelect(heading)}>{heading.text || '未命名标题'}</button>
        ))}
      </nav>
    </aside>
  )
}
