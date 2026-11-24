import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

interface FindReplaceProps {
  onFind(query: string): boolean
  onReplace(query: string, replacement: string): boolean
  onReplaceAll(query: string, replacement: string): number
  onClose(): void
}

export function FindReplace({ onFind, onReplace, onReplaceAll, onClose }: FindReplaceProps) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [message, setMessage] = useState('')
  const queryRef = useRef<HTMLInputElement>(null)

  useEffect(() => queryRef.current?.focus(), [])
  return (
    <section className="find-panel" role="search" aria-label="查找和替换" onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
      <div className="find-row">
        <input ref={queryRef} aria-label="查找内容" placeholder="查找当前文档" value={query} onChange={(event) => { setQuery(event.target.value); setMessage('') }} onKeyDown={(event) => { if (event.key === 'Enter') setMessage(onFind(query) ? '' : '未找到') }} />
        <button type="button" className="icon-button" aria-label="查找下一个" title="查找下一个" onClick={() => setMessage(onFind(query) ? '' : '未找到')}><ChevronDown size={16} /></button>
        <button type="button" className="icon-button" aria-label="关闭查找" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="find-row">
        <input aria-label="替换为" placeholder="替换为" value={replacement} onChange={(event) => setReplacement(event.target.value)} />
        <button type="button" className="find-action" onClick={() => setMessage(onReplace(query, replacement) ? '已替换' : '请先查找匹配项')}>替换</button>
        <button type="button" className="find-action" onClick={() => { const count = onReplaceAll(query, replacement); setMessage(`已替换 ${count} 处`) }}>全部替换</button>
      </div>
      {message && <span className="find-message" role="status">{message}</span>}
    </section>
  )
}
