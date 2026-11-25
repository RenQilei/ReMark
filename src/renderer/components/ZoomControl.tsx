import { Minus, Plus } from 'lucide-react'
import { ZOOM_PRESETS, zoomPercent } from '../../shared/zoom'
import type { ZoomDirection } from '../../shared/zoom'

interface ZoomControlProps {
  factor: number
  onChange(factor: number): void
  onStep(direction: ZoomDirection): void
}

export function ZoomControl({ factor, onChange, onStep }: ZoomControlProps) {
  const percentage = zoomPercent(factor)
  const options = Array.from(new Set([...ZOOM_PRESETS, percentage])).sort((left, right) => left - right)

  return (
    <div className="zoom-control" role="group" aria-label="页面缩放">
      <button type="button" className="icon-button zoom-button" aria-label="缩小" title="缩小 (⌘-)" onClick={() => onStep('out')}><Minus size={14} /></button>
      <select className="zoom-select" aria-label="缩放比例" value={String(percentage)} onChange={(event) => onChange(Number(event.target.value) / 100)}>
        {options.map((value) => <option key={value} value={value}>{value}%</option>)}
      </select>
      <button type="button" className="icon-button zoom-button" aria-label="放大" title="放大 (⌘+)" onClick={() => onStep('in')}><Plus size={14} /></button>
    </div>
  )
}
