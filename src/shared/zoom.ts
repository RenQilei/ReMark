export type ZoomDirection = 'in' | 'out'

export const ZOOM_PRESETS: readonly number[] = [50, 75, 90, 100, 110, 125, 150, 175, 200]

export function clampZoomFactor(factor: number): number {
  if (!Number.isFinite(factor)) return 1
  return Math.min(2, Math.max(0.5, factor))
}

export function nextZoomFactor(current: number, direction: ZoomDirection): number {
  const currentFactor = clampZoomFactor(current)
  const percentage = Math.round(currentFactor * 100)
  const candidates = ZOOM_PRESETS.filter((preset) => direction === 'in' ? preset > percentage : preset < percentage)
  const next = direction === 'in' ? candidates[0] : candidates.at(-1)
  return next === undefined ? currentFactor : next / 100
}

export function zoomPercent(factor: number): number {
  return Math.round(clampZoomFactor(factor) * 100)
}
