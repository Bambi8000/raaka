import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PILOTI_PARAMETERS,
  generatePiloti,
  MAX_SEED,
  RECIPES,
} from './generator'
import { scenePieceBounds } from './bounds'
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
      supportCount: 6,
      asymmetry: 0.5,
      footOffsetXMm: 180,
      footOffsetYMm: -120,
    })

    for (let index = 1; index <= 6; index += 1) {
      const stem = study.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `support-${index}`,
      )
      const shoulder = study.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `shoulder-${index}`,
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

  it('keeps geometry finite at both ends of every supported range', () => {
    expectFiniteStudy({
      seed: 0,
      heightMm: 1_000,
      supportCount: 1,
      supportHeightRatio: 0.25,
      shoulderRatio: 0.2,
      neckWidthRatio: 0.18,
      upperWidthRatio: 0.4,
      upperDepthRatio: 0.2,
      asymmetry: 0,
      footOffsetXMm: -300,
      footOffsetYMm: -300,
    })
    expectFiniteStudy({
      seed: MAX_SEED,
      heightMm: 2_000,
      supportCount: 6,
      supportHeightRatio: 0.58,
      shoulderRatio: 0.8,
      neckWidthRatio: 0.7,
      upperWidthRatio: 1.1,
      upperDepthRatio: 0.65,
      asymmetry: 0.5,
      footOffsetXMm: 300,
      footOffsetYMm: 300,
    })
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite parameter value %s',
    (invalidValue) => {
      for (const key of Object.keys(
        DEFAULT_PILOTI_PARAMETERS,
      ) as (keyof PilotiParameters)[]) {
        expect(() =>
          generatePiloti({
            ...DEFAULT_PILOTI_PARAMETERS,
            [key]: invalidValue,
          }),
        ).toThrow(`Piloti parameter "${key}" must be finite.`)
      }
    },
  )

  it('exposes the six agreed recipe families with only Piloti enabled', () => {
    expect(RECIPES).toHaveLength(6)
    expect(RECIPES.filter((recipe) => recipe.available).map((recipe) => recipe.id)).toEqual([
      'piloti',
    ])
  })
})
