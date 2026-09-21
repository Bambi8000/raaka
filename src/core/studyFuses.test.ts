import { describe, expect, it } from 'vitest'
import { resolveStudyFuses, FuseResolutionError } from './studyFuses'
import { analyseStability } from './stability'
import type { BoxPiece, MassStudy } from './types'

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

function study(pieces: readonly BoxPiece[]): MassStudy {
  const retainedCore = {
    status: 'off' as const,
    pieces: [],
    volumeMm3: 0,
    massKg: 0,
    densityKgM3: 30,
    minimumCoverMm: 0,
    message: 'Retained core is disabled.',
  }
  return {
    recipe: 'piloti',
    seed: 1,
    pieces,
    bounds: { min: [-50, -50, 0], max: [350, 50, 200] },
    widthMm: 400,
    depthMm: 100,
    heightMm: 200,
    concreteVolumeMm3: pieces.length * 1_000_000,
    concreteDensityKgM3: 2_400,
    concreteMassKg: pieces.length * 2.4,
    retainedCore,
    estimatedMassKg: pieces.length * 2.4,
    groundContactMm2: 0,
    stability: analyseStability(pieces, 2_400, retainedCore),
  }
}

describe('study fuse resolution', () => {
  it('replaces overlapping sources with one measured solid', async () => {
    const untouched = box('untouched', [300, 0, 150])
    const resolution = await resolveStudyFuses(
      study([
        box('upper-mass', [0, 0, 50]),
        box('upper-mass-copy-1', [50, 0, 50]),
        untouched,
      ]),
      [
        {
          id: 'fuse-1',
          pieceIds: ['upper-mass', 'upper-mass-copy-1'],
        },
      ],
    )

    expect(resolution.dormantFuseGroupIds).toEqual([])
    expect(resolution.study.pieces).toHaveLength(2)
    expect(resolution.study.pieces[0]).toMatchObject({
      kind: 'mesh',
      id: 'fuse-1',
      label: 'Fuse 1 · 2 parts',
      sourcePieceIds: ['upper-mass', 'upper-mass-copy-1'],
      volumeMm3: 1_500_000,
      groundContactMm2: 15_000,
    })
    expect(resolution.study.pieces[1]).toBe(untouched)
    expect(resolution.study.concreteVolumeMm3).toBeCloseTo(2_500_000, 5)
    expect(resolution.study.estimatedMassKg).toBeCloseTo(6, 8)
    expect(resolution.study.groundContactMm2).toBeCloseTo(15_000, 8)
    expect(resolution.study.stability.centreOfMassMm).toEqual([135, 0, 90])
    expect(resolution.study.stability.status).toBe('outside')
    expect(resolution.study.stability.signedMarginMm).toBeCloseTo(-35, 8)
  })

  it('keeps a fuse dormant while any source piece is hidden', async () => {
    const source = box('upper-mass', [0, 0, 50])
    const original = study([source])
    const resolution = await resolveStudyFuses(original, [
      {
        id: 'fuse-2',
        pieceIds: ['upper-mass', 'support-3'],
      },
    ])

    expect(resolution.study).toBe(original)
    expect(resolution.dormantFuseGroupIds).toEqual(['fuse-2'])
  })

  it('recomputes a finished union with the authored concrete density', async () => {
    const authored: MassStudy = {
      ...study([
        box('upper-mass', [0, 0, 50]),
        box('upper-mass-copy-1', [50, 0, 50]),
      ]),
      concreteDensityKgM3: 1_600,
    }

    const resolution = await resolveStudyFuses(authored, [{
      id: 'fuse-5',
      pieceIds: ['upper-mass', 'upper-mass-copy-1'],
    }])

    expect(resolution.study.concreteDensityKgM3).toBe(1_600)
    expect(resolution.study.concreteVolumeMm3).toBeCloseTo(1_500_000, 5)
    expect(resolution.study.concreteMassKg).toBeCloseTo(2.4, 10)
    expect(resolution.study.estimatedMassKg).toBeCloseTo(2.4, 10)
  })

  it('keeps one retained core deduction after positive pieces are fused', async () => {
    const original = study([
      box('upper-mass', [0, 0, 50]),
      box('upper-mass-copy-1', [50, 0, 50]),
    ])
    const core = box('upper-retained-core', [0, 0, 50], [50, 50, 50])
    const cored: MassStudy = {
      ...original,
      retainedCore: {
        status: 'active',
        pieces: [{ ...core, role: 'core' }],
        volumeMm3: 125_000,
        massKg: 0.00375,
        densityKgM3: 30,
        minimumCoverMm: 25,
        message: 'Closed lightweight foam remains inside the cast.',
      },
    }

    const resolution = await resolveStudyFuses(cored, [{
      id: 'fuse-3',
      pieceIds: ['upper-mass', 'upper-mass-copy-1'],
    }])

    expect(resolution.study.concreteVolumeMm3).toBeCloseTo(1_375_000, 5)
    expect(resolution.study.concreteMassKg).toBeCloseTo(3.3, 10)
    expect(resolution.study.estimatedMassKg).toBeCloseTo(3.30375, 10)
    expect(resolution.study.retainedCore).toBe(cored.retainedCore)
  })

  it('refuses to present disconnected islands as one fused part', async () => {
    await expect(
      resolveStudyFuses(
        study([
          box('upper-mass', [-150, 0, 50]),
          box('upper-mass-copy-1', [150, 0, 50]),
        ]),
        [
          {
            id: 'fuse-4',
            pieceIds: ['upper-mass', 'upper-mass-copy-1'],
          },
        ],
      ),
    ).rejects.toEqual(
      new FuseResolutionError(
        'Fuse 4 is paused: its source pieces no longer touch or overlap.',
      ),
    )
  })
})
