import { describe, expect, it } from 'vitest'
import { resolveStudyFuses, FuseResolutionError } from './studyFuses'
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
  return {
    recipe: 'piloti',
    seed: 1,
    pieces,
    bounds: { min: [-50, -50, 0], max: [350, 50, 200] },
    widthMm: 400,
    depthMm: 100,
    heightMm: 200,
    concreteVolumeMm3: pieces.length * 1_000_000,
    estimatedMassKg: pieces.length * 2.4,
    groundContactMm2: 0,
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
