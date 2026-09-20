import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS, generatePiloti } from './generator'
import { scaleMassStudy } from './modelScale'
import type { ScenePiece } from './types'

function expectPieceScaled(
  master: ScenePiece,
  scaled: ScenePiece,
  scale: 0.5 | 0.25,
): void {
  expect(scaled.id).toBe(master.id)
  expect(scaled.kind).toBe(master.kind)
  expect(scaled.position).toEqual(master.position.map((value) => value * scale))
  if (master.kind === 'box' && scaled.kind === 'box') {
    expect(scaled.size).toEqual(master.size.map((value) => value * scale))
  }
  if (master.kind === 'frustum' && scaled.kind === 'frustum') {
    expect(scaled.height).toBeCloseTo(master.height * scale, 10)
    expect(scaled.bottomSize).toEqual(
      master.bottomSize.map((value) => value * scale),
    )
    expect(scaled.topSize).toEqual(
      master.topSize.map((value) => value * scale),
    )
    expect(scaled.bottomOffset).toEqual(
      master.bottomOffset.map((value) => value * scale),
    )
    expect(scaled.topOffset).toEqual(
      master.topOffset.map((value) => value * scale),
    )
  }
}

describe('scaleMassStudy', () => {
  const master = generatePiloti({
    ...DEFAULT_PILOTI_PARAMETERS,
    heightMm: 2_000,
    supportRowCount: 2,
    rowSpacingMm: 360,
    supportDepthRatio: 0.48,
    footOffsetXMm: 120,
    footOffsetYMm: -80,
    footOffsetOverrides: [
      {
        supportId: 'support-r2-c2',
        footOffsetXMm: -180,
        footOffsetYMm: 60,
      },
    ],
    supportSizeOverrides: [
      {
        supportId: 'support-r2-c2',
        widthScale: 1.3,
        depthScale: 0.7,
      },
    ],
    supportPositionOverrides: [
      {
        supportId: 'support-r2-c2',
        positionXMm: 140,
        positionYMm: -90,
      },
    ],
  })

  it.each([0.5, 0.25] as const)(
    'scales geometry and physical readings once at %s',
    (scale) => {
      const scaled = scaleMassStudy(master, scale)

      expect(scaled.pieces).toHaveLength(master.pieces.length)
      scaled.pieces.forEach((piece, index) => {
        expectPieceScaled(master.pieces[index], piece, scale)
      })
      expect(scaled.bounds.min).toEqual(
        master.bounds.min.map((value) => value * scale),
      )
      expect(scaled.bounds.max).toEqual(
        master.bounds.max.map((value) => value * scale),
      )
      expect(scaled.widthMm).toBeCloseTo(master.widthMm * scale, 10)
      expect(scaled.depthMm).toBeCloseTo(master.depthMm * scale, 10)
      expect(scaled.heightMm).toBeCloseTo(master.heightMm * scale, 10)
      expect(scaled.groundContactMm2).toBeCloseTo(
        master.groundContactMm2 * scale ** 2,
        10,
      )
      expect(scaled.concreteVolumeMm3).toBeCloseTo(
        master.concreteVolumeMm3 * scale ** 3,
        10,
      )
      expect(scaled.estimatedMassKg).toBeCloseTo(
        master.estimatedMassKg * scale ** 3,
        10,
      )
      expect(scaled.bounds.min[2]).toBeCloseTo(0, 10)
      expect(scaled.supportLayout).toEqual({
        ...master.supportLayout,
        rowSpacingMm: (master.supportLayout?.rowSpacingMm ?? 0) * scale,
        shoulderDepthMm:
          (master.supportLayout?.shoulderDepthMm ?? 0) * scale,
        adjacentRowOverlapMm:
          (master.supportLayout?.adjacentRowOverlapMm ?? 0) * scale,
        adjacentColumnOverlapMm:
          (master.supportLayout?.adjacentColumnOverlapMm ?? 0) * scale,
        adjacentColumnGapMm:
          (master.supportLayout?.adjacentColumnGapMm ?? 0) * scale,
        nonAdjacentBearingOverlapMm:
          (master.supportLayout?.nonAdjacentBearingOverlapMm ?? 0) * scale,
        bearingOverhangMm:
          (master.supportLayout?.bearingOverhangMm ?? 0) * scale,
        sideBearingOverhangMm:
          (master.supportLayout?.sideBearingOverhangMm ?? 0) * scale,
      })
    },
  )

  it('returns to the exact master without cumulative scale drift', () => {
    const firstQuarter = scaleMassStudy(master, 0.25)
    const restored = scaleMassStudy(master, 1)
    const secondQuarter = scaleMassStudy(restored, 0.25)

    expect(restored).toBe(master)
    expect(secondQuarter).toEqual(firstQuarter)
  })

  it('rejects unsupported scales at the core boundary', () => {
    expect(() => scaleMassStudy(master, 0.75 as 0.5)).toThrow(
      'Model scale must be 1, 0.5 or 0.25.',
    )
  })
})
