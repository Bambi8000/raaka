import { describe, expect, it } from 'vitest'
import { createFrustumGeometry } from './frustum'

describe('createFrustumGeometry', () => {
  it('creates eight corners and twelve triangles', () => {
    const geometry = createFrustumGeometry({
      height: 400,
      bottomSize: [180, 160],
      topSize: [420, 300],
      bottomOffset: [0, 0],
      topOffset: [30, 0],
    })

    expect(geometry.getAttribute('position').count).toBe(8)
    expect(geometry.getIndex()?.count).toBe(36)
    geometry.dispose()
  })
})
