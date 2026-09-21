import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS, generatePiloti } from './generator'
import { scaleMassStudy } from './modelScale'
import { analyseStability } from './stability'
import type { MassStudy, MeshPiece, ScenePiece } from './types'

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
    upperOffsetXMm: 220,
    upperOffsetYMm: -130,
    upperMassProfile: 'tapered',
    upperTopWidthRatio: 0.68,
    upperTopDepthRatio: 0.82,
    upperTopOffsetXMm: 190,
    upperTopOffsetYMm: -110,
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
    partCopies: [
      {
        id: 'copy-1',
        sourceId: 'upper-mass',
        offsetXMm: 540,
        offsetYMm: -260,
        offsetZMm: 180,
      },
      {
        id: 'copy-2',
        sourceId: 'support-r2-c2',
        offsetXMm: -420,
        offsetYMm: 240,
        offsetZMm: 0,
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
      expect(scaled.stability.status).toBe(master.stability.status)
      expect(scaled.stability.centreOfMassMm).toEqual(
        master.stability.centreOfMassMm?.map((value) => value * scale),
      )
      expect(scaled.stability.projectionMm).toEqual(
        master.stability.projectionMm?.map((value) => value * scale),
      )
      expect(scaled.stability.supportPolygonMm).toEqual(
        master.stability.supportPolygonMm.map((point) =>
          point.map((value) => value * scale),
        ),
      )
      expect(scaled.stability.signedMarginMm).toBeCloseTo(
        (master.stability.signedMarginMm ?? 0) * scale,
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

  it('scales retained core geometry, cover and both material masses', () => {
    const cored = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      planShape: 'octagon',
      retainedCoreMode: 'upper-mass',
      retainedCoreScale: 0.68,
    })
    const scaled = scaleMassStudy(cored, 0.25)

    expect(cored.retainedCore.status).toBe('active')
    expect(scaled.retainedCore.status).toBe('active')
    expect(scaled.retainedCore.pieces).toHaveLength(1)
    expectPieceScaled(
      cored.retainedCore.pieces[0],
      scaled.retainedCore.pieces[0],
      0.25,
    )
    expect(scaled.retainedCore.volumeMm3).toBeCloseTo(
      cored.retainedCore.volumeMm3 * 0.25 ** 3,
      10,
    )
    expect(scaled.retainedCore.massKg).toBeCloseTo(
      cored.retainedCore.massKg * 0.25 ** 3,
      10,
    )
    expect(scaled.retainedCore.minimumCoverMm).toBeCloseTo(
      cored.retainedCore.minimumCoverMm * 0.25,
      10,
    )
    expect(scaled.concreteMassKg).toBeCloseTo(
      cored.concreteMassKg * 0.25 ** 3,
      10,
    )
  })

  it('scales finished solid meshes without changing their topology', () => {
    const mesh: MeshPiece = {
      kind: 'mesh',
      id: 'fuse-1',
      label: 'Fuse 1',
      role: 'mass',
      position: [0, 0, 0],
      positions: new Float32Array([0, 0, 0, 100, 0, 0, 0, 80, 0, 0, 0, 60]),
      triangles: new Uint32Array([0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3]),
      volumeMm3: 80_000,
      groundContactMm2: 4_000,
      sourcePieceIds: ['upper-mass', 'upper-mass-copy-1'],
    }
    const retainedCore = {
      status: 'off' as const,
      pieces: [],
      volumeMm3: 0,
      massKg: 0,
      densityKgM3: 30,
      minimumCoverMm: 0,
      message: 'Retained core is disabled.',
    }
    const fusedStudy: MassStudy = {
      recipe: 'piloti',
      seed: 1,
      pieces: [mesh],
      bounds: { min: [0, 0, 0], max: [100, 80, 60] },
      widthMm: 100,
      depthMm: 80,
      heightMm: 60,
      concreteVolumeMm3: 80_000,
      concreteMassKg: 0.192,
      retainedCore,
      estimatedMassKg: 0.192,
      groundContactMm2: 4_000,
      stability: analyseStability([mesh], retainedCore),
    }

    const scaled = scaleMassStudy(fusedStudy, 0.25)
    const scaledMesh = scaled.pieces[0]

    expect(scaledMesh.kind).toBe('mesh')
    if (scaledMesh.kind !== 'mesh') return
    expect(scaledMesh.positions).toEqual(
      new Float32Array([0, 0, 0, 25, 0, 0, 0, 20, 0, 0, 0, 15]),
    )
    expect(scaledMesh.triangles).toBe(mesh.triangles)
    expect(scaledMesh.volumeMm3).toBe(1_250)
    expect(scaledMesh.groundContactMm2).toBe(250)
    expect(scaled.bounds).toEqual({ min: [0, 0, 0], max: [25, 20, 15] })
  })

  it('rejects unsupported scales at the core boundary', () => {
    expect(() => scaleMassStudy(master, 0.75 as 0.5)).toThrow(
      'Model scale must be 1, 0.5 or 0.25.',
    )
  })
})
