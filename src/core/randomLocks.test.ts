import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS as defaults, generatePiloti } from './generator'
import { createHistory, reduceHistory } from './history'
import { featureRandom } from './random'
import {
  randomLockTargetForPiece,
  randomSeedForTarget,
  toggleRandomLockForTarget,
} from './randomLocks'
import type { MassStudy, PilotiParameters } from './types'

function piece(study: MassStudy, id: string) {
  const result = study.pieces.find((candidate) => candidate.id === id)
  if (!result) throw new Error(`Missing test piece ${id}.`)
  return result
}

describe('stable feature random streams', () => {
  it('keeps named streams independent from call order and other feature IDs', () => {
    const first = featureRandom(318, 'piloti/rectangle/support-2')
    const values = [first(), first(), first()]
    const unrelated = featureRandom(318, 'piloti/rectangle/support-1')
    unrelated()
    unrelated()
    const repeated = featureRandom(318, 'piloti/rectangle/support-2')

    expect(values).toEqual([
      0.6318296433892101,
      0.6122791934758425,
      0.8260207255370915,
    ])
    expect([repeated(), repeated(), repeated()]).toEqual(values)
    expect(featureRandom(318, 'piloti/rectangle/support-1')())
      .not.toBe(values[0])
    expect(featureRandom(319, 'piloti/rectangle/support-2')())
      .not.toBe(values[0])
  })

  it('locks one rectangular support while other supports follow a new seed', () => {
    const parameters: PilotiParameters = {
      ...defaults,
      seed: 318,
      asymmetry: 0.5,
      upperFootprintMode: 'detached',
      shoulderMode: 'divided',
      randomLocks: [{ targetId: 'support-2', seed: 318 }],
    }
    const before = generatePiloti(parameters)
    const after = generatePiloti({ ...parameters, seed: 919 })

    expect(piece(after, 'support-2')).toEqual(piece(before, 'support-2'))
    expect(piece(after, 'shoulder-2')).toEqual(piece(before, 'shoulder-2'))
    expect(piece(after, 'support-1')).not.toEqual(piece(before, 'support-1'))
  })

  it('keeps an existing second-row support stream when columns are added', () => {
    const narrowParameters: PilotiParameters = {
      ...defaults,
      seed: 742,
      supportCount: 2,
      supportRowCount: 2,
      asymmetry: 0.5,
    }
    const wideParameters: PilotiParameters = {
      ...narrowParameters,
      supportCount: 6,
    }
    const narrow = piece(
      generatePiloti(narrowParameters),
      'support-r2-c1',
    )
    const wide = piece(
      generatePiloti(wideParameters),
      'support-r2-c1',
    )
    if (narrow.kind !== 'frustum' || wide.kind !== 'frustum') {
      throw new Error('Expected rectangular support lofts.')
    }
    const bayWidth =
      defaults.heightMm * defaults.upperWidthRatio / 3
    const narrowUpperWidth = bayWidth * narrowParameters.supportCount
    const wideUpperWidth = bayWidth * wideParameters.supportCount
    const narrowNominalX = -narrowUpperWidth / 2 + bayWidth / 2
    const wideNominalX = -wideUpperWidth / 2 + bayWidth / 2

    expect(narrow.topOffset).toEqual(wide.topOffset)
    expect(narrow.position[0] - narrowNominalX)
      .toBeCloseTo(wide.position[0] - wideNominalX, 12)
  })

  it('locks the upper-mass stream without freezing support variation', () => {
    const parameters: PilotiParameters = {
      ...defaults,
      seed: 318,
      asymmetry: 0.5,
      randomLocks: [{ targetId: 'upper-mass', seed: 318 }],
    }
    const before = generatePiloti(parameters)
    const after = generatePiloti({ ...parameters, seed: 920 })

    expect(piece(after, 'upper-mass')).toEqual(piece(before, 'upper-mass'))
    expect(piece(after, 'support-1')).not.toEqual(piece(before, 'support-1'))
  })

  it.each(['hexagon', 'octagon'] as const)(
    'locks one %s support through both stem and shoulder jitter',
    (planShape) => {
      const code = planShape === 'hexagon' ? 'hex' : 'oct'
      const targetId = `support-${code}-2`
      const parameters: PilotiParameters = {
        ...defaults,
        planShape,
        seed: 318,
        asymmetry: 0.5,
        upperFootprintMode: 'detached',
        randomLocks: [{ targetId, seed: 318 }],
      }
      const before = generatePiloti(parameters)
      const after = generatePiloti({ ...parameters, seed: 921 })

      expect(piece(after, targetId)).toEqual(piece(before, targetId))
      expect(piece(after, `shoulder-${code}-2`))
        .toEqual(piece(before, `shoulder-${code}-2`))
      expect(piece(after, `support-${code}-1`))
        .not.toEqual(piece(before, `support-${code}-1`))
    },
  )
})

describe('random lock targets', () => {
  const parameters: PilotiParameters = {
    ...defaults,
    upperMassDivision: 'z3',
    partCopies: [
      {
        id: 'copy-1',
        sourceId: 'upper-mass-rect-level-2',
        offsetXMm: 0,
        offsetYMm: 0,
        offsetZMm: 0,
      },
      {
        id: 'copy-2',
        sourceId: 'support-hex-3',
        offsetXMm: 0,
        offsetYMm: 0,
        offsetZMm: 0,
      },
    ],
    randomLocks: [
      { targetId: 'upper-mass', seed: 12 },
      { targetId: 'support-hex-3', seed: 34 },
    ],
  }

  it.each([
    ['upper-mass', 'upper-mass'],
    ['upper-mass-rect-level-2', 'upper-mass'],
    ['upper-retained-core', 'upper-mass'],
    ['copy-1', 'upper-mass'],
    ['upper-mass-copy-1', 'upper-mass'],
    ['support-hex-3', 'support-hex-3'],
    ['shoulder-hex-3', 'support-hex-3'],
    ['copy-2', 'support-hex-3'],
    ['support-copy-2', 'support-hex-3'],
    ['shoulder-copy-2', 'support-hex-3'],
    ['fuse-1', undefined],
  ])('maps %s to %s', (pieceId, targetId) => {
    expect(randomLockTargetForPiece(parameters, pieceId)).toBe(targetId)
  })

  it('uses a target lock without changing the global project seed', () => {
    expect(randomSeedForTarget(parameters, 'upper-mass')).toBe(12)
    expect(randomSeedForTarget(parameters, 'support-hex-3')).toBe(34)
    expect(randomSeedForTarget(parameters, 'support-2')).toBe(defaults.seed)
    expect(parameters.seed).toBe(defaults.seed)
  })

  it('locks to the current seed, sorts targets and unlocks only that target', () => {
    const base = {
      ...defaults,
      seed: 920,
      randomLocks: [{ targetId: 'support-3', seed: 44 }],
    }
    const locked = toggleRandomLockForTarget(base, 'support-1')
    expect(locked).toEqual([
      { targetId: 'support-1', seed: 920 },
      { targetId: 'support-3', seed: 44 },
    ])
    expect(toggleRandomLockForTarget({ ...base, randomLocks: locked }, 'support-1'))
      .toEqual([{ targetId: 'support-3', seed: 44 }])
  })

  it('keeps locking and unlocking in ordinary undo/redo history', () => {
    const locked = {
      ...defaults,
      randomLocks: [{ targetId: 'support-2', seed: defaults.seed }],
    }
    let history = reduceHistory(createHistory(defaults), {
      type: 'replace',
      value: locked,
    })
    history = reduceHistory(history, { type: 'undo' })
    expect(history.present.randomLocks).toEqual([])
    history = reduceHistory(history, { type: 'redo' })
    expect(history.present.randomLocks).toEqual(locked.randomLocks)
  })
})
