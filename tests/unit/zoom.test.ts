import { describe, expect, it } from 'vitest'
import { clampZoomFactor, nextZoomFactor, zoomPercent } from '../../src/shared/zoom'

describe('document zoom', () => {
  it('clamps factors to the supported range and handles invalid values', () => {
    expect(clampZoomFactor(0)).toBe(0.5)
    expect(clampZoomFactor(3)).toBe(2)
    expect(clampZoomFactor(Number.NaN)).toBe(1)
    expect(clampZoomFactor(Number.POSITIVE_INFINITY)).toBe(1)
  })

  it.each([
    [1, 'in', 1.1], [1.1, 'in', 1.25], [1.1, 'out', 1], [1.25, 'out', 1.1],
    [0.5, 'out', 0.5], [2, 'in', 2], [1.19, 'in', 1.25], [1.19, 'out', 1.1],
  ])('moves from %s in direction %s to %s', (current, direction, expected) => {
    expect(nextZoomFactor(current, direction as 'in' | 'out')).toBe(expected)
  })

  it('rounds the displayed percentage', () => {
    expect(zoomPercent(1.25)).toBe(125)
    expect(zoomPercent(1.1)).toBe(110)
  })
})
