import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PILOTI_PARAMETERS,
  generatePiloti,
  RECIPES,
} from './generator'

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

  it('exposes the six agreed recipe families with only Piloti enabled', () => {
    expect(RECIPES).toHaveLength(6)
    expect(RECIPES.filter((recipe) => recipe.available).map((recipe) => recipe.id)).toEqual([
      'piloti',
    ])
  })
})
