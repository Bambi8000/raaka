import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createFrustumGeometry } from './frustum'

const FIXTURE = {
  height: 400,
  bottomSize: [180, 160] as const,
  topSize: [420, 300] as const,
  bottomOffset: [-25, 12] as const,
  topOffset: [30, -18] as const,
}

function geometryTriangles(
  geometry: THREE.BufferGeometry,
): readonly (readonly [number, number, number])[] {
  const index = geometry.getIndex()
  if (!index) throw new Error('Expected indexed geometry.')
  const triangles: [number, number, number][] = []
  for (let offset = 0; offset < index.count; offset += 3) {
    triangles.push([
      index.getX(offset),
      index.getX(offset + 1),
      index.getX(offset + 2),
    ])
  }
  return triangles
}

function vertex(geometry: THREE.BufferGeometry, index: number): THREE.Vector3 {
  return new THREE.Vector3().fromBufferAttribute(
    geometry.getAttribute('position'),
    index,
  )
}

describe('createFrustumGeometry', () => {
  it('creates eight corners and twelve triangles', () => {
    const geometry = createFrustumGeometry(FIXTURE)

    expect(geometry.getAttribute('position').count).toBe(8)
    expect(geometry.getIndex()?.count).toBe(36)
    geometry.dispose()
  })

  it('uses every closed edge twice in opposite directions', () => {
    const geometry = createFrustumGeometry(FIXTURE)
    const edges = new Map<string, { count: number; balance: number }>()

    for (const triangle of geometryTriangles(geometry)) {
      for (let corner = 0; corner < 3; corner += 1) {
        const start = triangle[corner]
        const end = triangle[(corner + 1) % 3]
        const key = start < end ? `${start}:${end}` : `${end}:${start}`
        const edge = edges.get(key) ?? { count: 0, balance: 0 }
        edge.count += 1
        edge.balance += start < end ? 1 : -1
        edges.set(key, edge)
      }
    }

    expect([...edges.values()].every((edge) => edge.count === 2)).toBe(true)
    expect([...edges.values()].every((edge) => edge.balance === 0)).toBe(true)
    geometry.dispose()
  })

  it('has outward winding and the analytic signed volume', () => {
    const geometry = createFrustumGeometry(FIXTURE)
    const centre = new THREE.Vector3()
    for (let index = 0; index < 8; index += 1) {
      centre.add(vertex(geometry, index))
    }
    centre.multiplyScalar(1 / 8)

    let signedVolume = 0
    for (const [aIndex, bIndex, cIndex] of geometryTriangles(geometry)) {
      const a = vertex(geometry, aIndex)
      const b = vertex(geometry, bIndex)
      const c = vertex(geometry, cIndex)
      const normal = b.clone().sub(a).cross(c.clone().sub(a))
      const triangleCentre = a.clone().add(b).add(c).multiplyScalar(1 / 3)

      expect(normal.dot(triangleCentre.sub(centre))).toBeGreaterThan(0)
      signedVolume += a.dot(b.clone().cross(c)) / 6
    }

    const [bottomWidth, bottomDepth] = FIXTURE.bottomSize
    const [topWidth, topDepth] = FIXTURE.topSize
    const widthDelta = topWidth - bottomWidth
    const depthDelta = topDepth - bottomDepth
    const analyticVolume =
      FIXTURE.height *
      (bottomWidth * bottomDepth +
        (bottomWidth * depthDelta + bottomDepth * widthDelta) / 2 +
        (widthDelta * depthDelta) / 3)

    expect(signedVolume).toBeCloseTo(analyticVolume, 3)
    geometry.dispose()
  })
})
