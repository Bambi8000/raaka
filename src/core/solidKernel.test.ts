import { describe, expect, it } from 'vitest'
import {
  fuseScenePieces,
  sectionScenePiecesAtZ,
  type SolidKernelMesh,
} from './solidKernel'
import type { BoxPiece, FrustumPiece } from './types'

function box(
  id: string,
  position: readonly [number, number, number],
  size: readonly [number, number, number] = [100, 100, 100],
): BoxPiece {
  return {
    kind: 'box',
    id,
    label: id,
    role: 'mass',
    position,
    size,
  }
}

function edgeUseCounts(mesh: SolidKernelMesh): readonly number[] {
  const counts = new Map<string, number>()
  for (let index = 0; index < mesh.triangles.length; index += 3) {
    const triangle = [
      mesh.triangles[index],
      mesh.triangles[index + 1],
      mesh.triangles[index + 2],
    ]
    for (let edge = 0; edge < 3; edge += 1) {
      const a = triangle[edge]
      const b = triangle[(edge + 1) % 3]
      const key = a < b ? `${a}:${b}` : `${b}:${a}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts.values()]
}

function signedMeshVolume(mesh: SolidKernelMesh): number {
  let sixTimesVolume = 0
  for (let index = 0; index < mesh.triangles.length; index += 3) {
    const a = mesh.triangles[index] * 3
    const b = mesh.triangles[index + 1] * 3
    const c = mesh.triangles[index + 2] * 3
    const ax = mesh.positions[a]
    const ay = mesh.positions[a + 1]
    const az = mesh.positions[a + 2]
    const bx = mesh.positions[b]
    const by = mesh.positions[b + 1]
    const bz = mesh.positions[b + 2]
    const cx = mesh.positions[c]
    const cy = mesh.positions[c + 1]
    const cz = mesh.positions[c + 2]
    sixTimesVolume +=
      ax * (by * cz - bz * cy) -
      ay * (bx * cz - bz * cx) +
      az * (bx * cy - by * cx)
  }
  return sixTimesVolume / 6
}

function expectClosed(mesh: SolidKernelMesh): void {
  expect(mesh.triangles.length).toBeGreaterThan(0)
  expect(mesh.triangles.length % 3).toBe(0)
  expect(edgeUseCounts(mesh).every((count) => count === 2)).toBe(true)
  expect(
    Math.abs(signedMeshVolume(mesh) - mesh.volumeMm3) / mesh.volumeMm3,
  ).toBeLessThan(1e-6)
}

describe('solid-kernel gate', () => {
  it('unions overlapping boxes without double-counting their intersection', async () => {
    const fused = await fuseScenePieces([
      box('left', [0, 0, 0]),
      box('right', [50, 0, 0]),
    ])

    expect(fused.volumeMm3).toBeCloseTo(1_500_000, 5)
    expect(fused.bounds).toEqual({
      min: [-50, -50, -50],
      max: [100, 50, 50],
    })
    expect(fused.componentCount).toBe(1)
    expectClosed(fused)
  })

  it('removes a full coplanar contact face between touching boxes', async () => {
    const fused = await fuseScenePieces([
      box('left', [-50, 0, 0]),
      box('right', [50, 0, 0]),
    ])

    expect(fused.volumeMm3).toBeCloseTo(2_000_000, 5)
    expect(fused.componentCount).toBe(1)
    expect(fused.triangles.length / 3).toBeLessThan(24)
    expectClosed(fused)
  })

  it('does not duplicate coincident solids', async () => {
    const fused = await fuseScenePieces([
      box('first', [0, 0, 0]),
      box('second', [0, 0, 0]),
    ])

    expect(fused.volumeMm3).toBeCloseTo(1_000_000, 5)
    expect(fused.componentCount).toBe(1)
    expectClosed(fused)
  })

  it('reports disconnected output components for a future UI refusal', async () => {
    const fused = await fuseScenePieces([
      box('first', [-150, 0, 0]),
      box('second', [150, 0, 0]),
    ])

    expect(fused.volumeMm3).toBeCloseTo(2_000_000, 5)
    expect(fused.componentCount).toBe(2)
    expectClosed(fused)
  })

  it('preserves an authored rectangular loft and its analytic volume', async () => {
    const frustum: FrustumPiece = {
      kind: 'frustum',
      id: 'loft',
      label: 'Loft',
      role: 'mass',
      position: [40, -30, 100],
      height: 200,
      bottomSize: [100, 80],
      topSize: [60, 40],
      bottomOffset: [-20, 10],
      topOffset: [30, -15],
    }
    const expectedFrustumVolume =
      (frustum.height / 6) *
      (2 * 100 * 80 + 100 * 40 + 60 * 80 + 2 * 60 * 40)
    const fused = await fuseScenePieces([
      frustum,
      box('contained', [40, -30, 100], [10, 10, 10]),
    ])

    expect(fused.volumeMm3).toBeCloseTo(expectedFrustumVolume, 5)
    expect(fused.bounds).toEqual({
      min: [-30, -65, 0],
      max: [100, 20, 200],
    })
    expect(fused.componentCount).toBe(1)
    expectClosed(fused)
  })

  it('returns an exact horizontal section through an overlapping union', async () => {
    const section = await sectionScenePiecesAtZ(
      [box('left', [0, 0, 0]), box('right', [50, 0, 0])],
      0,
    )

    expect(section.areaMm2).toBeCloseTo(15_000, 8)
    expect(section.polygons).toHaveLength(1)
    expect(section.polygons[0]).toHaveLength(4)
  })

  it('keeps a thin positive overlap as one deterministic solid', async () => {
    const pieces = [
      box('left', [0, 0, 0]),
      box('right', [99.95, 0, 0]),
    ] as const
    const expectedVolume = 2_000_000 - 0.05 * 100 * 100
    const first = await fuseScenePieces(pieces)

    expect(first.volumeMm3).toBeCloseTo(expectedVolume, 4)
    expect(first.componentCount).toBe(1)
    expectClosed(first)

    for (let iteration = 0; iteration < 50; iteration += 1) {
      const repeated = await fuseScenePieces(pieces)
      expect(repeated.volumeMm3).toBeCloseTo(first.volumeMm3, 8)
      expect(repeated.positions).toEqual(first.positions)
      expect(repeated.triangles).toEqual(first.triangles)
    }
  })

  it('refuses an incomplete fuse request before loading geometry', async () => {
    await expect(fuseScenePieces([box('only', [0, 0, 0])])).rejects.toThrow(
      'Fuse requires at least two scene pieces.',
    )
  })
})
