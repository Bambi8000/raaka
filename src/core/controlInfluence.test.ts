import { describe, expect, it } from 'vitest'
import { affectedPilotiControls } from './controlInfluence'
import { DEFAULT_PILOTI_PARAMETERS } from './generator'

describe('selection control influence', () => {
  it('distinguishes upper proportions from leg-only edits', () => {
    const controls = affectedPilotiControls({ ...DEFAULT_PILOTI_PARAMETERS, upperMassProfile: 'tapered' }, 'upper-mass')
    for (const key of ['heightMm', 'upperWidthRatio', 'upperTopWidthRatio', 'upperTopOffsetXMm', 'supportHeightRatio', 'supportCount'] as const) expect(controls.has(key)).toBe(true)
    for (const key of ['neckWidthRatio', 'footFlareRatio', 'bearingScaleRatio', 'footOffsetXMm', 'shoulderRatio', 'supportDepthRatio'] as const) expect(controls.has(key)).toBe(false)
  })

  it('highlights linked placement for shoulders but not stems', () => {
    const stem = affectedPilotiControls(DEFAULT_PILOTI_PARAMETERS, 'support-2')
    const shoulder = affectedPilotiControls(DEFAULT_PILOTI_PARAMETERS, 'shoulder-2')
    expect(stem.has('upperOffsetXMm')).toBe(false)
    expect(stem.has('upperOffsetYMm')).toBe(false)
    expect(stem.has('footOffsetXMm')).toBe(true)
    expect(stem.has('footFlareRatio')).toBe(true)
    expect(stem.has('bearingScaleRatio')).toBe(false)
    expect(shoulder.has('footOffsetXMm')).toBe(false)
    expect(shoulder.has('footFlareRatio')).toBe(false)
    expect(shoulder.has('bearingScaleRatio')).toBe(true)
    expect(shoulder.has('upperOffsetXMm')).toBe(true)
    expect(shoulder.has('upperOffsetYMm')).toBe(true)
    const detached = affectedPilotiControls({ ...DEFAULT_PILOTI_PARAMETERS, upperFootprintMode: 'detached' }, 'shoulder-2')
    expect(detached.has('upperOffsetXMm')).toBe(false)
    expect(detached.has('upperOffsetYMm')).toBe(false)
  })

  it('does not highlight inherited lean when a selected override replaces it', () => {
    const parameters = {
      ...DEFAULT_PILOTI_PARAMETERS,
      footOffsetOverrides: [{ supportId: 'support-2', footOffsetXMm: 0, footOffsetYMm: 0 }],
      partCopies: [{ id: 'copy-1', sourceId: 'support-2', offsetXMm: 120, offsetYMm: 0, offsetZMm: 0 }],
    }
    for (const id of ['support-2', 'support-copy-1']) {
      const controls = affectedPilotiControls(parameters, id)
      expect(controls.has('footOffsetXMm')).toBe(false)
      expect(controls.has('footOffsetYMm')).toBe(false)
      expect(controls.has('neckWidthRatio')).toBe(true)
    }
    expect(affectedPilotiControls(parameters, 'support-1').has('footOffsetXMm')).toBe(true)
  })

  it('handles dormant controls, copies and Fuse sources', () => {
    expect(affectedPilotiControls(DEFAULT_PILOTI_PARAMETERS, 'upper-mass').has('upperTopWidthRatio')).toBe(false)
    expect(affectedPilotiControls(DEFAULT_PILOTI_PARAMETERS, 'support-2').has('rowSpacingMm')).toBe(false)
    const parameters = {
      ...DEFAULT_PILOTI_PARAMETERS,
      partCopies: [{ id: 'copy-1', sourceId: 'upper-mass', offsetXMm: 120, offsetYMm: 0, offsetZMm: 0 }],
      fuseGroups: [{ id: 'fuse-1', pieceIds: ['support-2', 'shoulder-2'] }],
    }
    const original = new Set(affectedPilotiControls(parameters, 'upper-mass'))
    expect(original.delete('upperMassDivision')).toBe(true)
    // Whole-mass copies retain the parent rather than following its division.
    expect(affectedPilotiControls(parameters, 'upper-mass-copy-1')).toEqual(original)
    const fused = affectedPilotiControls(parameters, 'fuse-1')
    expect(fused.has('upperOffsetYMm')).toBe(true)
    expect(fused.has('footOffsetXMm')).toBe(true)
    expect(fused.has('upperTopWidthRatio')).toBe(false)
    expect(affectedPilotiControls({ ...parameters, removedPartIds: ['upper-mass'] }, 'upper-mass').size).toBe(0)
  })

  it('keeps retained-core size neutral for the outer mass and active for the core', () => {
    const parameters = {
      ...DEFAULT_PILOTI_PARAMETERS,
      retainedCoreMode: 'upper-mass' as const,
    }

    expect(affectedPilotiControls(parameters, 'upper-mass').has('retainedCoreScale')).toBe(false)
    const core = affectedPilotiControls(parameters, 'upper-retained-core')
    expect(core.has('retainedCoreMode')).toBe(true)
    expect(core.has('retainedCoreScale')).toBe(true)
    expect(core.has('footOffsetXMm')).toBe(false)
  })

  it('exposes level steps only to active upper levels and their copies', () => {
    const sourceId = 'upper-mass-rect-level-2'
    const parameters = {
      ...DEFAULT_PILOTI_PARAMETERS,
      upperMassDivision: 'z3' as const,
      partCopies: [{
        id: 'copy-1',
        sourceId,
        offsetXMm: 0,
        offsetYMm: 0,
        offsetZMm: 100,
      }],
    }

    for (const id of [sourceId, 'upper-mass-copy-1']) {
      const controls = affectedPilotiControls(parameters, id)
      expect(controls.has('upperStepScaleRatio')).toBe(true)
      expect(controls.has('upperStepOffsetXMm')).toBe(true)
      expect(controls.has('upperStepOffsetYMm')).toBe(true)
      expect(controls.has('footFlareRatio')).toBe(false)
    }
    expect(
      affectedPilotiControls(DEFAULT_PILOTI_PARAMETERS, 'upper-mass')
        .has('upperStepScaleRatio'),
    ).toBe(false)
  })
})
