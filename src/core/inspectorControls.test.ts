import { describe, expect, it } from 'vitest'
import { affectedPilotiControls } from './controlInfluence'
import { DEFAULT_PILOTI_PARAMETERS as defaults, generatePiloti } from './generator'
import { relevantPilotiControls } from './inspectorControls'
import type { PilotiParameters } from './types'

function relevant(parameters: PilotiParameters, id: string) {
  const study = generatePiloti(parameters)
  return relevantPilotiControls(parameters, id, [
    ...study.pieces,
    ...study.retainedCore.pieces,
  ], affectedPilotiControls(parameters, id))
}

describe('selection-focused inspector controls', () => {
  it('excludes leg-only controls from the upper mass', () => {
    const controls = relevant(defaults, 'upper-mass')
    for (const key of ['footOffsetXMm', 'footOffsetYMm', 'neckWidthRatio', 'footFlareRatio', 'bearingScaleRatio', 'shoulderMode', 'shoulderRatio', 'supportDepthRatio'] as const) {
      expect(controls.has(key), key).toBe(false)
    }
    for (const key of ['upperOffsetXMm', 'upperWidthRatio', 'upperFootprintMode', 'upperMassProfile', 'supportCount'] as const) {
      expect(controls.has(key), key).toBe(true)
    }
    expect(controls.has('retainedCoreMode')).toBe(true)
    expect(controls.has('retainedCoreScale')).toBe(true)
  })

  it('retains neutral enabling choices without falsely highlighting them', () => {
    const parameters = { ...defaults, asymmetry: 0, upperTopWidthRatio: 1,
      upperTopDepthRatio: 1, upperTopOffsetXMm: 0, upperTopOffsetYMm: 0 }
    const affected = affectedPilotiControls(parameters, 'upper-mass')
    expect(affected.has('upperFootprintMode')).toBe(false)
    expect(relevant(parameters, 'upper-mass').has('upperFootprintMode')).toBe(true)
    // A neutral tapered loft can have a different representation from a block.
    // Explicit reachability must not rely on that implementation detail.
    const noEffect = new Set(affected)
    noEffect.delete('upperMassProfile')
    expect(relevantPilotiControls(parameters, 'upper-mass', generatePiloti(parameters).pieces, noEffect).has('upperMassProfile')).toBe(true)
    expect(affected.has('retainedCoreMode')).toBe(false)
    expect(affected.has('retainedCoreScale')).toBe(false)
    expect(relevant(parameters, 'upper-mass').has('retainedCoreMode')).toBe(true)
    expect(relevant(parameters, 'upper-mass').has('retainedCoreScale')).toBe(true)
  })

  it('exposes the core controls as direct dependencies when the core is selected', () => {
    const parameters = {
      ...defaults,
      retainedCoreMode: 'upper-mass' as const,
    }
    const controls = relevant(parameters, 'upper-retained-core')

    expect(controls.has('retainedCoreMode')).toBe(true)
    expect(controls.has('retainedCoreScale')).toBe(true)
    expect(affectedPilotiControls(parameters, 'upper-retained-core').has('retainedCoreScale')).toBe(true)
    expect(controls.has('footOffsetXMm')).toBe(false)
  })

  it.each(['hexagon', 'octagon'] as const)('keeps offset space reachable at zero lean in %s', (planShape) => {
    const parameters = { ...defaults, planShape, footOffsetXMm: 0, footOffsetYMm: 0 }
    const id = planShape === 'hexagon' ? 'support-hex-1' : 'support-oct-1'
    expect(affectedPilotiControls(parameters, id).has('footOffsetSpace')).toBe(false)
    expect(relevant(parameters, id).has('footOffsetSpace')).toBe(true)
    expect(relevant(parameters, id.replace('support', 'shoulder')).has('footOffsetSpace')).toBe(false)
    expect(relevant(parameters, 'upper-mass').has('footOffsetSpace')).toBe(false)
  })

  it('follows live cell sources without offering a shared profile for independent tops', () => {
    const partId = 'upper-mass-xy4-1'
    const parameters: PilotiParameters = { ...defaults, upperMassDivision: 'xy4',
      partCopies: [{ id: 'copy-1', sourceId: partId, offsetXMm: 0, offsetYMm: 0, offsetZMm: 100 }],
      massPartOverrides: [{ partId, profile: 'block', topWidthRatio: 1, topDepthRatio: 1, topOffsetXMm: 0, topOffsetYMm: 0 }] }
    for (const id of [partId, 'upper-mass-copy-1']) {
      expect(relevant(parameters, id).has('upperMassProfile')).toBe(false)
      expect(relevant({ ...parameters, massPartOverrides: [] }, id).has('upperMassProfile')).toBe(true)
    }
  })

  it('combines live Fuse sources and falls back safely without a live target', () => {
    const parameters = { ...defaults, fuseGroups: [{ id: 'fuse-1', pieceIds: ['upper-mass', 'support-2'] }] }
    const controls = relevant(parameters, 'fuse-1')
    expect(controls.has('upperMassProfile')).toBe(true)
    expect(controls.has('footOffsetXMm')).toBe(true)
    expect(relevant({ ...parameters, removedPartIds: ['upper-mass', 'support-2'] }, 'fuse-1').size).toBe(0)
    expect(relevant(parameters, 'missing-piece').size).toBe(0)
  })

  it('keeps copied polygon stems on their source offset frame', () => {
    const parameters: PilotiParameters = { ...defaults, planShape: 'hexagon',
      footOffsetXMm: 0, footOffsetYMm: 0,
      footOffsetOverrides: [{ supportId: 'support-hex-1', footOffsetXMm: 0, footOffsetYMm: 0 }],
      partCopies: [{ id: 'copy-1', sourceId: 'support-hex-1', offsetXMm: 100, offsetYMm: 0, offsetZMm: 0 }] }
    const controls = relevant(parameters, 'support-copy-1')
    expect(controls.has('footOffsetSpace')).toBe(true)
    expect(controls.has('footOffsetXMm')).toBe(false)
    expect(controls.has('footOffsetYMm')).toBe(false)
  })
})
