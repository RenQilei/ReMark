import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { AppSettings, DocumentFont, ThemeId } from '../../shared/settings'

interface SettingsPanelProps {
  settings: AppSettings
  onChange(patch: Partial<AppSettings>): void
  onClose(): void
}

const themes: { id: ThemeId; name: string; colors: string[] }[] = [
  { id: 'native', name: '原生', colors: ['#f3f3f0', '#ffffff', '#356e52'] },
  { id: 'github', name: 'GitHub', colors: ['#f6f8fa', '#ffffff', '#0969da'] },
  { id: 'solarized', name: 'Solarized', colors: ['#eee8d5', '#fdf6e3', '#268bd2'] },
  { id: 'nord', name: 'Nord', colors: ['#3b4252', '#2e3440', '#88c0d0'] },
]

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-panel" role="dialog" aria-modal="true" aria-label="全局设置">
        <header className="settings-heading"><div><h2>全局设置</h2><p>应用于全部文档、标签页和窗口。</p></div><button type="button" className="icon-button" aria-label="关闭设置" onClick={onClose}><X size={18} /></button></header>
        <div className="settings-content">
          <section className="settings-section">
            <h3>通用</h3>
            <label className="setting-row"><span><strong>默认编辑模式</strong><small>打开新文档时使用</small></span><select value={settings.defaultMode} onChange={(event) => onChange({ defaultMode: event.target.value as AppSettings['defaultMode'] })}><option value="visual">所见即所得</option><option value="source">源码</option></select></label>
            <label className="setting-row"><span><strong>打开文件时</strong><small>也可遵循 macOS 的标签页偏好</small></span><select value={settings.openWindowBehavior} onChange={(event) => onChange({ openWindowBehavior: event.target.value as AppSettings['openWindowBehavior'] })}><option value="tab">在当前窗口新建标签</option><option value="window">新建独立窗口</option><option value="system">遵循系统设置</option></select></label>
            <label className="setting-row"><span><strong>自动保存</strong><small>停止输入后保存到当前文件</small></span><input type="checkbox" role="switch" checked={settings.autoSave} onChange={(event) => onChange({ autoSave: event.target.checked })} /></label>
            <label className="setting-row"><span><strong>记住每份文件的模式</strong><small>优先于全局默认编辑模式</small></span><input type="checkbox" role="switch" checked={settings.rememberModePerFile} onChange={(event) => onChange({ rememberModePerFile: event.target.checked })} /></label>
          </section>

          <section className="settings-section">
            <h3>外观</h3>
            <div className="setting-row"><span><strong>明暗模式</strong></span><div className="settings-segmented">{(['system', 'light', 'dark'] as const).map((appearance) => <button type="button" key={appearance} className={settings.appearance === appearance ? 'active' : ''} onClick={() => onChange({ appearance })}>{appearance === 'system' ? '跟随系统' : appearance === 'light' ? '浅色' : '深色'}</button>)}</div></div>
            <div className="theme-setting"><span><strong>主题皮肤</strong><small>同时应用于窗口、正文、代码和组件</small></span><div className="theme-grid">{themes.map((theme) => <button type="button" key={theme.id} className={`theme-card ${settings.theme === theme.id ? 'active' : ''}`} aria-label={theme.name} aria-pressed={settings.theme === theme.id} onClick={() => onChange({ theme: theme.id })}><span className="theme-preview">{theme.colors.map((color) => <i key={color} style={{ background: color }} />)}</span><span>{theme.name}</span></button>)}</div></div>
          </section>

          <section className="settings-section">
            <h3>排版</h3>
            <label className="setting-row"><span><strong>正文字体</strong></span><select value={settings.fontFamily} onChange={(event) => onChange({ fontFamily: event.target.value as DocumentFont })}><option value="system">系统无衬线</option><option value="serif">宋体 / 衬线</option><option value="mono">等宽字体</option></select></label>
            <label className="setting-row"><span><strong>正文字号</strong></span><span className="range-control"><input type="range" min="12" max="32" value={settings.fontSize} onChange={(event) => onChange({ fontSize: Number(event.target.value) })} /><output>{settings.fontSize}px</output></span></label>
            <label className="setting-row"><span><strong>正文宽度</strong></span><span className="range-control"><input type="range" min="560" max="1100" step="20" value={settings.contentWidth} onChange={(event) => onChange({ contentWidth: Number(event.target.value) })} /><output>{settings.contentWidth}px</output></span></label>
            <label className="setting-row"><span><strong>行高</strong></span><span className="range-control"><input type="range" min="1.3" max="2.2" step="0.05" value={settings.lineHeight} onChange={(event) => onChange({ lineHeight: Number(event.target.value) })} /><output>{settings.lineHeight.toFixed(2)}</output></span></label>
            <label className="setting-row"><span><strong>显示状态栏</strong></span><input type="checkbox" role="switch" checked={settings.showStatusBar} onChange={(event) => onChange({ showStatusBar: event.target.checked })} /></label>
          </section>
        </div>
      </section>
    </div>
  )
}
