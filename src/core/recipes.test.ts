import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS, generatePiloti } from './generator'
import {
  PILOTI_NUMERIC_PARAMETER_SCHEMA,
  PILOTI_PARAMETER_SCHEMA,
} from './pilotiParameters'
import {
  PILOTI_RECIPE,
  RECIPE_DEFINITIONS,
  recipeDefinition,
} from './recipes'

describe('shared recipe definitions', () => {
  it('defines all six agreed families and executes only Piloti', () => {
    expect(RECIPE_DEFINITIONS.map((recipe) => recipe.id)).toEqual([
      'monolith',
      'piloti',
      'silos',
      'ziggurat',
      'lamella-tower',
      'gate',
    ])
    expect(
      RECIPE_DEFINITIONS
        .filter((recipe) => recipe.status === 'active')
        .map((recipe) => recipe.id),
    ).toEqual(['piloti'])
    for (const recipe of RECIPE_DEFINITIONS) {
      if (recipe.status === 'planned') {
        expect(recipe.unavailableReason).toBe(
          'This recipe generator is not implemented yet.',
        )
        expect('generate' in recipe).toBe(false)
      }
    }
  })

  it('resolves every registered ID to the same durable definition', () => {
    for (const recipe of RECIPE_DEFINITIONS) {
      expect(recipeDefinition(recipe.id)).toBe(recipe)
    }
  })

  it('wires Piloti defaults, normalization and generation into one contract', () => {
    expect(PILOTI_RECIPE.defaultParameters).toBe(DEFAULT_PILOTI_PARAMETERS)
    expect(PILOTI_RECIPE.parameterSchema).toBe(PILOTI_PARAMETER_SCHEMA)
    expect(PILOTI_RECIPE.normalizeParameters({
      ...DEFAULT_PILOTI_PARAMETERS,
      heightMm: 4_000,
    }).heightMm).toBe(2_000)
    expect(PILOTI_RECIPE.generate(DEFAULT_PILOTI_PARAMETERS)).toEqual(
      generatePiloti(DEFAULT_PILOTI_PARAMETERS),
    )
  })
})

describe('Piloti parameter schema', () => {
  it('describes every persisted parameter exactly once', () => {
    expect(Object.keys(PILOTI_PARAMETER_SCHEMA).sort()).toEqual(
      Object.keys(DEFAULT_PILOTI_PARAMETERS).sort(),
    )
  })

  it('contains valid defaults for every numeric, choice and collection field', () => {
    for (const [key, definition] of Object.entries(PILOTI_PARAMETER_SCHEMA)) {
      const value = DEFAULT_PILOTI_PARAMETERS[
        key as keyof typeof DEFAULT_PILOTI_PARAMETERS
      ]
      if (definition.kind === 'number') {
        expect(value).toEqual(expect.any(Number))
        expect(value as number).toBeGreaterThanOrEqual(definition.minimum)
        expect(value as number).toBeLessThanOrEqual(definition.maximum)
        if (definition.integer) expect(Number.isInteger(value)).toBe(true)
      } else if (definition.kind === 'choice') {
        expect(definition.options).toContain(value)
      } else {
        expect(Array.isArray(value)).toBe(true)
        expect(definition.itemIdentity.length).toBeGreaterThan(0)
      }
    }
  })

  it('derives numeric bounds from the shared schema', () => {
    for (const key of Object.keys(PILOTI_NUMERIC_PARAMETER_SCHEMA) as
      (keyof typeof PILOTI_NUMERIC_PARAMETER_SCHEMA)[]) {
      expect(PILOTI_PARAMETER_SCHEMA[key]).toBe(
        PILOTI_NUMERIC_PARAMETER_SCHEMA[key],
      )
    }
  })
})
