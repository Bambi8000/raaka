import { describe, expect, it } from 'vitest'
import { analyseStability, convexHull, scenePieceMassProperties, signedSupportMargin } from './stability'
import type { BoxPiece, FrustumPiece, MeshPiece, PolygonLoftPiece, ScenePiece } from './types'

const noCore = {
  status: 'off' as const,
  pieces: [],
  densityKgM3: 30,
}
const concreteDensityKgM3 = 2_400

function support(id: string, x: number, y: number): FrustumPiece {
  return {
    kind: 'frustum', id, label: id, role: 'support', position: [x, y, 50], height: 100,
    bottomSize: [50, 50], topSize: [50, 50], bottomOffset: [0, 0], topOffset: [0, 0],
  }
}

function mass(id: string, x: number, size = 100): BoxPiece {
  return {
    kind: 'box', id, label: id, role: 'mass', position: [x, 0, 200], size: [size, size, size],
  }
}

describe('mass properties and static support analysis', () => {
  it('integrates a sheared rectangular prism along its constant-area centreline', () => {
    const piece: FrustumPiece = {
      kind: 'frustum', id: 'support-1', label: 'Support 1', role: 'support',
      position: [100, 50, 50], height: 100,
      bottomSize: [100, 80], topSize: [100, 80],
      bottomOffset: [-20, 10], topOffset: [20, -10],
    }

    expect(scenePieceMassProperties(piece)).toEqual({
      volumeMm3: 800_000,
      centroidMm: [100, 50, 50],
    })
  })

  it('places a square pyramid centroid one quarter of its height above the base', () => {
    const piece: FrustumPiece = {
      kind: 'frustum', id: 'pyramid', label: 'Pyramid', role: 'mass',
      position: [0, 0, 50], height: 100,
      bottomSize: [100, 100], topSize: [0, 0],
      bottomOffset: [0, 0], topOffset: [0, 0],
    }
    const properties = scenePieceMassProperties(piece)

    expect(properties.volumeMm3).toBeCloseTo(1_000_000 / 3, 8)
    expect(properties.centroidMm[0]).toBe(0)
    expect(properties.centroidMm[1]).toBe(0)
    expect(properties.centroidMm[2]).toBeCloseTo(25, 10)
  })

  it('uses the actual centroid of an off-origin polygon footprint', () => {
    const piece: PolygonLoftPiece = {
      kind: 'polygon-loft', id: 'sector', label: 'Sector', role: 'mass',
      position: [10, 20, 50], height: 100,
      footprint: [[0, 0], [100, 0], [0, 100]],
      bottomScale: 1, topScale: 1, bottomOffset: [0, 0], topOffset: [0, 0],
    }
    const properties = scenePieceMassProperties(piece)

    expect(properties.volumeMm3).toBe(500_000)
    expect(properties.centroidMm[0]).toBeCloseTo(10 + 100 / 3, 10)
    expect(properties.centroidMm[1]).toBeCloseTo(20 + 100 / 3, 10)
    expect(properties.centroidMm[2]).toBe(50)
  })

  it('derives the centroid of a finished indexed solid independently of its origin', () => {
    const piece: MeshPiece = {
      kind: 'mesh', id: 'fuse-1', label: 'Fuse 1', role: 'mass', position: [40, -20, 10],
      positions: new Float32Array([0, 0, 0, 100, 0, 0, 0, 80, 0, 0, 0, 60]),
      triangles: new Uint32Array([0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3]),
      volumeMm3: 80_000, groundContactMm2: 0, sourcePieceIds: ['a', 'b'],
    }
    const properties = scenePieceMassProperties(piece)

    expect(properties.centroidMm).toEqual([65, 0, 25])
  })

  it('forms a CCW convex boundary and reports signed edge distance', () => {
    const hull = convexHull([[1, 1], [-1, -1], [1, -1], [-1, 1], [0, 0], [1, 1]])

    expect(hull).toEqual([[-1, -1], [1, -1], [1, 1], [-1, 1]])
    expect(signedSupportMargin([0, 0], hull)).toBe(1)
    expect(signedSupportMargin([2, 0], hull)).toBe(-1)
  })

  it('reports an inside projection and the nearest support-boundary reserve', () => {
    const pieces: readonly ScenePiece[] = [support('support-1', -100, 0), support('support-2', 100, 0), mass('upper-mass', 0)]
    const analysis = analyseStability(pieces, concreteDensityKgM3, noCore)

    expect(analysis.status).toBe('inside')
    expect(analysis.centreOfMassMm?.[0]).toBe(0)
    expect(analysis.projectionMm).toEqual([0, 0])
    expect(analysis.supportPolygonMm).toEqual([[-125, -25], [125, -25], [125, 25], [-125, 25]])
    expect(analysis.signedMarginMm).toBe(25)
  })

  it('warns when a dominant cantilever moves the mass projection beyond the feet', () => {
    const analysis = analyseStability([
      support('support-1', -100, 0),
      support('support-2', 100, 0),
      mass('upper-mass', 300),
    ], concreteDensityKgM3, noCore)

    expect(analysis.status).toBe('outside')
    expect(analysis.centreOfMassMm?.[0]).toBeCloseTo(200, 10)
    expect(analysis.signedMarginMm).toBeCloseTo(-75, 10)
  })

  it('uses retained foam mass instead of the concrete displaced by its core', () => {
    const pieces: readonly ScenePiece[] = [
      support('support-1', 0, 0),
      mass('upper-mass', 100, 200),
    ]
    const solid = analyseStability(pieces, concreteDensityKgM3, noCore)
    const core: BoxPiece = {
      kind: 'box', id: 'upper-retained-core', label: 'Retained core', role: 'core',
      position: [100, 0, 200], size: [160, 160, 160],
    }
    const cored = analyseStability(pieces, concreteDensityKgM3, {
      status: 'active', pieces: [core], densityKgM3: 30,
    })

    expect(cored.centreOfMassMm?.[0]).toBeLessThan(solid.centreOfMassMm?.[0] ?? 0)
    expect(cored.centreOfMassMm?.[2]).toBeLessThan(solid.centreOfMassMm?.[2] ?? 0)
  })

  it('reweights the mixed-material centre when concrete density changes', () => {
    const pieces: readonly ScenePiece[] = [
      support('support-1', 0, 0),
      mass('upper-mass', 100, 200),
    ]
    const core: BoxPiece = {
      kind: 'box', id: 'upper-retained-core', label: 'Retained core', role: 'core',
      position: [100, 0, 200], size: [160, 160, 160],
    }
    const retainedMaterial = {
      status: 'active' as const, pieces: [core], densityKgM3: 500,
    }

    const lightweightConcrete = analyseStability(pieces, 800, retainedMaterial)
    const heavyweightConcrete = analyseStability(pieces, 4_000, retainedMaterial)

    expect(lightweightConcrete.centreOfMassMm?.[0]).toBeGreaterThan(
      heavyweightConcrete.centreOfMassMm?.[0] ?? Infinity,
    )
    expect(lightweightConcrete.centreOfMassMm?.[2]).toBeGreaterThan(
      heavyweightConcrete.centreOfMassMm?.[2] ?? Infinity,
    )
  })

  it('keeps a mass-centre reading but refuses support feedback without grounded legs', () => {
    const analysis = analyseStability(
      [mass('upper-mass', 0)],
      concreteDensityKgM3,
      noCore,
    )

    expect(analysis.status).toBe('unavailable')
    expect(analysis.centreOfMassMm).toEqual([0, 0, 200])
    expect(analysis.signedMarginMm).toBeNull()
    expect(analysis.message).toContain('No closed grounded support footprint')
  })
})
