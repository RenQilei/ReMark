import type { BrowserWindow } from 'electron'
import { clampZoomFactor, nextZoomFactor } from '../shared/zoom'
import type { ZoomDirection } from '../shared/zoom'

export function installWindowZoom(window: BrowserWindow): void {
  window.webContents.setZoomMode('isolated')
}

export function setWindowZoom(window: BrowserWindow, factor: number): number {
  const next = clampZoomFactor(factor)
  window.webContents.setZoomFactor(next)
  const actual = window.webContents.getZoomFactor()
  window.webContents.send('zoom:changed', actual)
  return actual
}

export function stepWindowZoom(window: BrowserWindow, direction: ZoomDirection): number {
  return setWindowZoom(window, nextZoomFactor(window.webContents.getZoomFactor(), direction))
}
