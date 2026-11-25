import type { EditorMode } from '../../shared/documents'

interface ModeSwitchProps {
  mode: EditorMode
  onChange(mode: EditorMode): void
}

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className="mode-switch" role="group" aria-label="编辑模式">
      <button type="button" className={mode === 'visual' ? 'active' : ''} aria-pressed={mode === 'visual'} onClick={() => onChange('visual')}>
        预览
      </button>
      <button type="button" className={mode === 'source' ? 'active' : ''} aria-pressed={mode === 'source'} onClick={() => onChange('source')}>
        源码
      </button>
    </div>
  )
}
