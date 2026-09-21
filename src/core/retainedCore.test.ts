import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS } from './generator'
import { scenePieceVolume } from './pieceMetrics'
import {
  retainedCoreAnalysis,
  retainedCorePiece,
  RETAINED_CORE_DENSITY_KG_M3,
  RETAINED_CORE_ID,
} from './retainedCore'
import type { BoxPiece, FrustumPiece, PolygonLoftPiece } from './types'

describe('retained upper core', () => {
  it('creates a centred box core with cubic volume scaling and measured cover', () => {
    const source: BoxPiece = {
      kind: 'box',
      id: 'upper-mass',
      label: 'Upper mass',
      role: 'mass',
      position: [40, -20, 300],
      size: [1_000, 500, 400],
    }
    const { piece, minimumCoverMm } = retainedCorePiece(source, 0.7)

    expect(piece).toMatchObject({
      id: RETAINED_CORE_ID,
      role: 'core',
      position: source.position,
      size: [700, 350, 280],
    })
    expect(scenePieceVolume(piece)).toBeCloseTo(
      scenePieceVolume(source) * 0.7 ** 3,
      6,
    )
    expect(minimumCoverMm).toBeCloseTo(60, 8)
  })

  it('follows a tapered mass centreline while staying inside both end faces', () => {
    const source: FrustumPiece = {
      kind: 'frustum',
      id: 'upper-mass',
      label: 'Upper mass',
      role: 'mass',
      position: [20, -10, 500],
      height: 600,
      bottomSize: [1_000, 600],
      topSize: [600, 300],
      bottomOffset: [0, 0],
      topOffset: [180, -90],
    }
    const { piece, minimumCoverMm } = retainedCorePiece(source, 0.6)
    expect(piece.kind).toBe('frustum')
    if (piece.kind !== 'frustum') throw new Error('Expected a frustum core.')

    expect(piece.height).toBe(360)
    expect(piece.bottomOffset).toEqual([36, -18])
    expect(piece.topOffset).toEqual([144, -72])
    expect(piece.bottomSize).toEqual([552, 324])
    expect(piece.topSize).toEqual([408, 216])
    expect(minimumCoverMm).toBeCloseTo(72, 8)
    expect(scenePieceVolume(piece)).toBeGreaterThan(0)
    expect(scenePieceVolume(piece)).toBeLessThan(scenePieceVolume(source))
  })

  it('uses polygon inradius for a conservative radial cover reading', () => {
    const source: PolygonLoftPiece = {
      kind: 'polygon-loft',
      id: 'upper-mass',
      label: 'Hex upper mass',
      role: 'mass',
      position: [0, 0, 400],
      height: 400,
      footprint: [
        [200, 0], [100, 173.2050807569], [-100, 173.2050807569],
        [-200, 0], [-100, -173.2050807569], [100, -173.2050807569],
      ],
      bottomScale: 1,
      topScale: 0.8,
      bottomOffset: [0, 0],
      topOffset: [60, -20],
    }
    const { piece, minimumCoverMm } = retainedCorePiece(source, 0.5)
    expect(piece.kind).toBe('polygon-loft')
    if (piece.kind !== 'polygon-loft') {
      throw new Error('Expected a polygon core.')
    }

    expect(piece.height).toBe(200)
    expect(piece.bottomScale).toBeCloseTo(0.475, 8)
    expect(piece.topScale).toBeCloseTo(0.425, 8)
    expect(piece.bottomOffset).toEqual([15, -5])
    expect(piece.topOffset).toEqual([45, -15])
    expect(minimumCoverMm).toBeCloseTo(73.612, 3)
  })

  it('keeps disabled and divided core intent explicit without producing geometry', () => {
    const upper: BoxPiece = {
      kind: 'box', id: 'upper-mass', label: 'Upper mass', role: 'mass',
      position: [0, 0, 500], size: [1_000, 500, 500],
    }
    const off = retainedCoreAnalysis(DEFAULT_PILOTI_PARAMETERS, upper)
    const paused = retainedCoreAnalysis({
      ...DEFAULT_PILOTI_PARAMETERS,
      retainedCoreMode: 'upper-mass',
      upperMassDivision: 'x2',
    }, upper)

    expect(off.status).toBe('off')
    expect(off.pieces).toEqual([])
    expect(paused.status).toBe('paused')
    expect(paused.message).toContain('choose Whole')
    expect(paused.volumeMm3).toBe(0)
  })

  it('reports foam volume and mass separately when active', () => {
    const upper: BoxPiece = {
      kind: 'box', id: 'upper-mass', label: 'Upper mass', role: 'mass',
      position: [0, 0, 500], size: [1_000, 500, 500],
    }
    const active = retainedCoreAnalysis({
      ...DEFAULT_PILOTI_PARAMETERS,
      retainedCoreMode: 'upper-mass',
      retainedCoreScale: 0.5,
    }, upper)

    expect(active.status).toBe('active')
    expect(active.volumeMm3).toBeCloseTo(31_250_000, 5)
    expect(active.densityKgM3).toBe(RETAINED_CORE_DENSITY_KG_M3)
    expect(active.massKg).toBeCloseTo(0.9375, 8)
  })
})
