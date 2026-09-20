import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PILOTI_PARAMETERS,
  generatePiloti,
  MAX_SEED,
  RECIPES,
} from './generator'
import { scenePieceBounds } from './bounds'
import { PILOTI_PARAMETER_RULES } from './pilotiParameters'
import type { FrustumPiece, PilotiParameters } from './types'

function expectFiniteStudy(parameters: PilotiParameters): void {
  const study = generatePiloti(parameters)
  const numericValues = [
    ...study.bounds.min,
    ...study.bounds.max,
    study.widthMm,
    study.depthMm,
    study.heightMm,
    study.concreteVolumeMm3,
    study.estimatedMassKg,
    study.groundContactMm2,
    ...study.pieces.flatMap((piece) => [
      ...piece.position,
      ...(piece.kind === 'box'
        ? piece.size
        : [
            piece.height,
            ...piece.bottomSize,
            ...piece.topSize,
            ...piece.bottomOffset,
            ...piece.topOffset,
          ]),
    ]),
  ]

  expect(numericValues.every(Number.isFinite)).toBe(true)
}

describe('generatePiloti', () => {
  it('is deterministic for an unchanged recipe', () => {
    expect(generatePiloti(DEFAULT_PILOTI_PARAMETERS)).toEqual(
      generatePiloti(DEFAULT_PILOTI_PARAMETERS),
    )
  })

  it('builds one stem and one shoulder for every support', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 4,
    })

    expect(study.pieces.filter((piece) => piece.role === 'support')).toHaveLength(
      8,
    )
    expect(study.pieces.at(-1)?.id).toBe('upper-mass')
  })

  it('builds a stable three-column by two-row support grid', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 3,
      supportRowCount: 2,
      rowSpacingMm: 320,
      supportDepthRatio: 0.5,
    })

    expect(study.pieces.filter((piece) => piece.role === 'support')).toHaveLength(
      12,
    )
    expect(study.pieces.map((piece) => piece.id)).toEqual([
      'support-1',
      'shoulder-1',
      'support-2',
      'shoulder-2',
      'support-3',
      'shoulder-3',
      'support-r2-c1',
      'shoulder-r2-c1',
      'support-r2-c2',
      'shoulder-r2-c2',
      'support-r2-c3',
      'shoulder-r2-c3',
      'upper-mass',
    ])
    expect(study.supportLayout).toMatchObject({
      columns: 3,
      rows: 2,
      totalSupports: 6,
      rowSpacingMm: 320,
      adjacentRowOverlapMm: 0,
    })
    expect(study.supportLayout?.shoulderDepthMm).toBeCloseTo(255, 10)
    expect(study.supportLayout?.bearingOverhangMm).toBeCloseTo(32.5, 10)
  })

  it('keeps first-row identities and authored shapes when rows are added', () => {
    const oneRow = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 932,
      supportRowCount: 1,
      rowSpacingMm: 280,
      supportDepthRatio: 0.44,
    })
    const threeRows = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 932,
      supportRowCount: 3,
      rowSpacingMm: 280,
      supportDepthRatio: 0.44,
    })

    for (const id of [
      'support-1',
      'shoulder-1',
      'support-2',
      'shoulder-2',
      'support-3',
      'shoulder-3',
    ]) {
      const original = oneRow.pieces.find((piece) => piece.id === id)
      const repeated = threeRows.pieces.find((piece) => piece.id === id)
      expect(original).toBeDefined()
      expect(repeated).toBeDefined()
      if (!original || !repeated) continue

      expect(repeated).toEqual({
        ...original,
        position: [original.position[0], -280, original.position[2]],
      })
    }
  })

  it('keeps the physical height inside the one-to-two metre design range', () => {
    expect(
      generatePiloti({ ...DEFAULT_PILOTI_PARAMETERS, heightMm: 400 }).heightMm,
    ).toBe(1_000)
    expect(
      generatePiloti({ ...DEFAULT_PILOTI_PARAMETERS, heightMm: 4_000 }).heightMm,
    ).toBe(2_000)
  })

  it('reports positive manufacturing estimates', () => {
    const study = generatePiloti(DEFAULT_PILOTI_PARAMETERS)

    expect(study.concreteVolumeMm3).toBeGreaterThan(0)
    expect(study.estimatedMassKg).toBeGreaterThan(0)
    expect(study.groundContactMm2).toBeGreaterThan(0)
  })

  it('measures the complete seed-319 envelope including shifted supports', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 319,
      supportCount: 1,
      neckWidthRatio: 0.18,
      asymmetry: 0.5,
    })

    expect(study.widthMm).toBeCloseTo(1_434.230572, 5)
    expect(study.widthMm).toBeGreaterThan(1_080)
    for (const piece of study.pieces) {
      const bounds = scenePieceBounds(piece)
      for (let axis = 0; axis < 3; axis += 1) {
        expect(bounds.min[axis]).toBeGreaterThanOrEqual(
          study.bounds.min[axis],
        )
        expect(bounds.max[axis]).toBeLessThanOrEqual(study.bounds.max[axis])
      }
    }
  })

  it('keeps every support on the ground and every stem joined to its shoulder', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 220,
      supportCount: 3,
      supportRowCount: 2,
      asymmetry: 0.5,
      footOffsetXMm: 180,
      footOffsetYMm: -120,
    })

    for (let row = 1; row <= 2; row += 1) {
      for (let column = 1; column <= 3; column += 1) {
        const suffix = row === 1 ? String(column) : `r${row}-c${column}`
        const stem = study.pieces.find(
          (piece): piece is FrustumPiece => piece.id === `support-${suffix}`,
        )
        const shoulder = study.pieces.find(
          (piece): piece is FrustumPiece => piece.id === `shoulder-${suffix}`,
        )

        expect(stem).toBeDefined()
        expect(shoulder).toBeDefined()
        if (!stem || !shoulder) continue

        expect(stem.position[2] - stem.height / 2).toBeCloseTo(0, 10)
        expect(stem.position[2] + stem.height / 2).toBeCloseTo(
          shoulder.position[2] - shoulder.height / 2,
          10,
        )
        expect(stem.position[0] + stem.topOffset[0]).toBeCloseTo(
          shoulder.position[0] + shoulder.bottomOffset[0],
          10,
        )
        expect(stem.position[1] + stem.topOffset[1]).toBeCloseTo(
          shoulder.position[1] + shoulder.bottomOffset[1],
          10,
        )
        expect(stem.topSize).toEqual(shoulder.bottomSize)
      }
    }
    expect(study.bounds.min[2]).toBeCloseTo(0, 10)
  })

  it('moves every foot without moving its neck or changing physical estimates', () => {
    const baseParameters = {
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 220,
      supportCount: 4,
      asymmetry: 0.5,
    }
    const straight = generatePiloti(baseParameters)
    const leaned = generatePiloti({
      ...baseParameters,
      footOffsetXMm: 120,
      footOffsetYMm: -80,
    })

    for (let index = 1; index <= baseParameters.supportCount; index += 1) {
      const straightStem = straight.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `support-${index}`,
      )
      const leanedStem = leaned.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `support-${index}`,
      )

      expect(straightStem).toBeDefined()
      expect(leanedStem).toBeDefined()
      if (!straightStem || !leanedStem) continue

      expect(
        leanedStem.position[0] + leanedStem.bottomOffset[0] -
          (straightStem.position[0] + straightStem.bottomOffset[0]),
      ).toBeCloseTo(120, 10)
      expect(
        leanedStem.position[1] + leanedStem.bottomOffset[1] -
          (straightStem.position[1] + straightStem.bottomOffset[1]),
      ).toBeCloseTo(-80, 10)
      expect(leanedStem.position[0] + leanedStem.topOffset[0]).toBeCloseTo(
        straightStem.position[0] + straightStem.topOffset[0],
        10,
      )
      expect(leanedStem.position[1] + leanedStem.topOffset[1]).toBeCloseTo(
        straightStem.position[1] + straightStem.topOffset[1],
        10,
      )
    }

    expect(leaned.concreteVolumeMm3).toBeCloseTo(
      straight.concreteVolumeMm3,
      10,
    )
    expect(leaned.estimatedMassKg).toBeCloseTo(straight.estimatedMassKg, 10)
    expect(leaned.groundContactMm2).toBeCloseTo(
      straight.groundContactMm2,
      10,
    )
    for (const piece of leaned.pieces) {
      const bounds = scenePieceBounds(piece)
      for (let axis = 0; axis < 3; axis += 1) {
        expect(bounds.min[axis]).toBeGreaterThanOrEqual(
          leaned.bounds.min[axis],
        )
        expect(bounds.max[axis]).toBeLessThanOrEqual(leaned.bounds.max[axis])
      }
    }
  })

  it('replaces the shared offset only for the named support', () => {
    const shared = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 3,
      footOffsetXMm: 40,
      footOffsetYMm: -20,
    })
    const overridden = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 3,
      footOffsetXMm: 40,
      footOffsetYMm: -20,
      footOffsetOverrides: [
        {
          supportId: 'support-2',
          footOffsetXMm: -160,
          footOffsetYMm: 90,
        },
      ],
    })

    for (let index = 1; index <= 3; index += 1) {
      const support = overridden.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `support-${index}`,
      )
      const sharedSupport = shared.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `support-${index}`,
      )

      expect(support).toBeDefined()
      expect(sharedSupport).toBeDefined()
      if (!support || !sharedSupport) continue

      expect(support.bottomOffset).toEqual(
        index === 2 ? [-160, 90] : [40, -20],
      )
      expect(support.position[0] + support.topOffset[0]).toBeCloseTo(
        sharedSupport.position[0] + sharedSupport.topOffset[0],
        10,
      )
      expect(support.position[1] + support.topOffset[1]).toBeCloseTo(
        sharedSupport.position[1] + sharedSupport.topOffset[1],
        10,
      )
    }

    expect(overridden.concreteVolumeMm3).toBeCloseTo(
      shared.concreteVolumeMm3,
      10,
    )
    expect(overridden.groundContactMm2).toBeCloseTo(
      shared.groundContactMm2,
      10,
    )
  })

  it('applies an override to a selected support in a later row', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 3,
      supportRowCount: 2,
      footOffsetXMm: 40,
      footOffsetYMm: -20,
      footOffsetOverrides: [
        {
          supportId: 'support-r2-c2',
          footOffsetXMm: -140,
          footOffsetYMm: 110,
        },
      ],
    })

    const selected = study.pieces.find(
      (piece): piece is FrustumPiece => piece.id === 'support-r2-c2',
    )
    const neighbour = study.pieces.find(
      (piece): piece is FrustumPiece => piece.id === 'support-r2-c1',
    )

    expect(selected?.bottomOffset).toEqual([-140, 110])
    expect(neighbour?.bottomOffset).toEqual([40, -20])
  })

  it('keeps geometry finite at both ends of every supported range', () => {
    expectFiniteStudy({
      seed: 0,
      heightMm: 1_000,
      supportCount: 1,
      supportRowCount: 1,
      rowSpacingMm: 100,
      supportDepthRatio: 0.25,
      supportHeightRatio: 0.25,
      shoulderRatio: 0.2,
      neckWidthRatio: 0.18,
      upperWidthRatio: 0.4,
      upperDepthRatio: 0.2,
      asymmetry: 0,
      footOffsetXMm: -300,
      footOffsetYMm: -300,
      footOffsetOverrides: [],
    })
    expectFiniteStudy({
      seed: MAX_SEED,
      heightMm: 2_000,
      supportCount: 6,
      supportRowCount: 3,
      rowSpacingMm: 800,
      supportDepthRatio: 0.92,
      supportHeightRatio: 0.58,
      shoulderRatio: 0.8,
      neckWidthRatio: 0.7,
      upperWidthRatio: 1.1,
      upperDepthRatio: 0.65,
      asymmetry: 0.5,
      footOffsetXMm: 300,
      footOffsetYMm: 300,
      footOffsetOverrides: [
        {
          supportId: 'support-r3-c6',
          footOffsetXMm: -300,
          footOffsetYMm: -300,
        },
      ],
    })
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite parameter value %s',
    (invalidValue) => {
      for (const key of Object.keys(
        PILOTI_PARAMETER_RULES,
      ) as (keyof typeof PILOTI_PARAMETER_RULES)[]) {
        expect(() =>
          generatePiloti({
            ...DEFAULT_PILOTI_PARAMETERS,
            [key]: invalidValue,
          }),
        ).toThrow(`Piloti parameter "${key}" must be finite.`)
      }
    },
  )

  it('rejects malformed or duplicated support overrides', () => {
    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        footOffsetOverrides: [
          {
            supportId: 'support-2',
            footOffsetXMm: Number.NaN,
            footOffsetYMm: 0,
          },
        ],
      }),
    ).toThrow('Piloti parameter "footOffsetXMm" must be finite.')

    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        footOffsetOverrides: [
          {
            supportId: 'support-02',
            footOffsetXMm: 10,
            footOffsetYMm: 20,
          },
        ],
      }),
    ).toThrow('Piloti foot offset override has an invalid support ID.')

    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        footOffsetOverrides: [
          {
            supportId: 'support-r1-c2',
            footOffsetXMm: 10,
            footOffsetYMm: 20,
          },
        ],
      }),
    ).toThrow('Piloti foot offset override has an invalid support ID.')

    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        footOffsetOverrides: [
          {
            supportId: 'support-2',
            footOffsetXMm: 10,
            footOffsetYMm: 20,
          },
          {
            supportId: 'support-2',
            footOffsetXMm: -10,
            footOffsetYMm: -20,
          },
        ],
      }),
    ).toThrow('Piloti foot offset override for "support-2" is duplicated.')
  })

  it('exposes the six agreed recipe families with only Piloti enabled', () => {
    expect(RECIPES).toHaveLength(6)
    expect(RECIPES.filter((recipe) => recipe.available).map((recipe) => recipe.id)).toEqual([
      'piloti',
    ])
  })
})
