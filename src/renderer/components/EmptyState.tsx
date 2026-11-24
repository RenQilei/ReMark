import { FileText, FolderOpen, SquarePen } from 'lucide-react'

interface EmptyStateProps {
  onOpen(): void
  onNew(): void
}

export function EmptyState({ onOpen, onNew }: EmptyStateProps) {
  return (
    <main className="empty-state">
      <div className="empty-icon"><FileText size={34} strokeWidth={1.35} /></div>
      <h1>打开一份 Markdown</h1>
      <p>直接阅读和编辑本地文件，不需要创建仓库或导入项目。</p>
      <div className="empty-actions">
        <button type="button" className="primary-button" onClick={onOpen}><FolderOpen size={16} />打开文件…</button>
        <button type="button" className="secondary-button" onClick={onNew}><SquarePen size={16} />新建文档</button>
      </div>
      <span className="empty-hint">支持 .md、.markdown、.mdown 和 .mkd</span>
    </main>
  )
}
