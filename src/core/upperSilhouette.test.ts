import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS as defaults, generatePiloti } from './generator'
import { createHistory, reduceHistory } from './history'
import { polygonFace } from './polygonLoft'
import { createProject, parseProject, serializeProject } from './project'
import { applyUpperSilhouettePreset, UPPER_SILHOUETTE_RATIOS } from './upperSilhouette'
import type { PilotiParameters, Vec2 } from './types'

const shifted: PilotiParameters = {
  ...defaults,
  upperMassProfile: 'tapered',
  upperTopWidthRatio: 0.63,
  upperTopDepthRatio: 0.91,
  upperTopOffsetXMm: 120,
  upperTopOffsetYMm: -75,
  upperOffsetXMm: 80,
  upperOffsetYMm: -40,
}

function average(points: readonly Vec2[]): Vec2 {
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length,
  ]
}

describe('shared upper silhouette actions', () => {
  it('starts new tapered studies without a latent sideways drift', () => {
    expect(defaults.upperTopOffsetXMm).toBe(0)
    expect(defaults.upperTopOffsetYMm).toBe(0)
    // The default block itself is unchanged; drift is only active on a taper.
    expect(generatePiloti(defaults)).toEqual(generatePiloti({ ...defaults, upperTopOffsetXMm: 120 }))
  })

  it.each(['rectangle', 'hexagon', 'octagon'] as const)('centres and sizes both %s taper directions without moving the base or legs', (planShape) => {
    const before = generatePiloti({ ...shifted, planShape })
    const originalMass = before.pieces.find((piece) => piece.id === 'upper-mass')!
    for (const preset of ['narrow', 'wide'] as const) {
      const parameters = applyUpperSilhouettePreset({ ...shifted, planShape }, preset)
      const after = generatePiloti(parameters)
      const mass = after.pieces.find((piece) => piece.id === 'upper-mass')!
      const ratio = UPPER_SILHOUETTE_RATIOS[preset]
      expect(after.pieces.filter((piece) => piece.role === 'support')).toEqual(before.pieces.filter((piece) => piece.role === 'support'))
      expect(mass.position).toEqual(originalMass.position)
      expect(parameters.upperMassProfile).toBe('tapered')
      if (mass.kind === 'polygon-loft' && originalMass.kind === 'polygon-loft') {
        expect(mass.height).toBe(originalMass.height)
        const bottom = polygonFace(mass, false)
        const top = polygonFace(mass, true)
        expect(bottom).toEqual(polygonFace(originalMass, false))
        const bottomCentre = average(bottom)
        const topCentre = average(top)
        expect(topCentre[0]).toBeCloseTo(bottomCentre[0], 9)
        expect(topCentre[1]).toBeCloseTo(bottomCentre[1], 9)
        top.forEach((point, index) => {
          const bottomRadius = Math.hypot(bottom[index][0] - bottomCentre[0], bottom[index][1] - bottomCentre[1])
          const topRadius = Math.hypot(point[0] - topCentre[0], point[1] - topCentre[1])
          expect(topRadius / bottomRadius).toBeCloseTo(ratio, 10)
        })
      } else if (mass.kind === 'frustum' && originalMass.kind === 'frustum') {
        expect(mass.height).toBe(originalMass.height)
        expect(mass.bottomSize).toEqual(originalMass.bottomSize)
        expect(mass.bottomOffset).toEqual(originalMass.bottomOffset)
        expect(mass.topOffset).toEqual(mass.bottomOffset)
        expect(mass.topSize).toEqual(mass.bottomSize.map((size) => size * ratio))
      } else {
        throw new Error('Expected a tapered upper mass')
      }
      expect(ratio > 1).toBe(preset === 'wide')
    }
  })

  it('keeps all authored data outside the shared top intact', () => {
    const parameters: PilotiParameters = {
      ...shifted,
      planShape: 'hexagon',
      polygonMassDivision: 'sectors',
      massPartOverrides: [{ partId: 'upper-mass-hex6-1', profile: 'tapered', topWidthRatio: 0.5, topDepthRatio: 0.6, topOffsetXMm: -90, topOffsetYMm: 40 }],
      footOffsetOverrides: [{ supportId: 'support-hex-1', footOffsetXMm: 35, footOffsetYMm: 20 }],
      supportSizeOverrides: [{ supportId: 'support-hex-1', widthScale: 0.8, depthScale: 1.1 }],
      supportPositionOverrides: [{ supportId: 'support-hex-1', positionXMm: 20, positionYMm: -10 }],
      randomLocks: [{ targetId: 'upper-mass', seed: 97 }],
      removedPartIds: ['support-hex-2'],
      partCopies: [{ id: 'copy-1', sourceId: 'upper-mass', offsetXMm: 200, offsetYMm: 0, offsetZMm: 0 }],
      fuseGroups: [{ id: 'fuse-1', pieceIds: ['support-hex-1', 'shoulder-hex-1'] }],
    }
    const original = structuredClone(parameters)
    const result = applyUpperSilhouettePreset(parameters, 'wide')
    expect(result).toEqual({
      ...parameters,
      upperMassProfile: 'tapered',
      upperTopWidthRatio: UPPER_SILHOUETTE_RATIOS.wide,
      upperTopDepthRatio: UPPER_SILHOUETTE_RATIOS.wide,
      upperTopOffsetXMm: 0,
      upperTopOffsetYMm: 0,
    })
    expect(parameters).toEqual(original)
    const sourcePart = (value: PilotiParameters) => generatePiloti({ ...value, fuseGroups: [] }).pieces.find((piece) => piece.id === 'upper-mass-hex6-1')
    expect(sourcePart(result)).toEqual(sourcePart(parameters))
  })

  it('centres a custom top without changing either ratio or the profile', () => {
    expect(applyUpperSilhouettePreset(shifted, 'center')).toEqual({
      ...shifted, upperTopOffsetXMm: 0, upperTopOffsetYMm: 0,
    })
    expect(applyUpperSilhouettePreset({ ...shifted, upperMassProfile: 'block' }, 'center').upperMassProfile).toBe('block')
  })

  it('retains an independent level profile while its base follows shared centering', () => {
    const parameters: PilotiParameters = {
      ...shifted,
      planShape: 'hexagon',
      polygonMassDivision: 'z2',
      massPartOverrides: [{ partId: 'upper-mass-hex-level-2', profile: 'tapered', topWidthRatio: 0.6, topDepthRatio: 0.6, topOffsetXMm: 50, topOffsetYMm: 10 }],
    }
    const result = applyUpperSilhouettePreset(parameters, 'center')
    expect(result.massPartOverrides).toBe(parameters.massPartOverrides)
    const level = (value: PilotiParameters) => generatePiloti(value).pieces.find((piece) => piece.id === 'upper-mass-hex-level-2')!
    const before = level(parameters)
    const after = level(result)
    if (before.kind !== 'polygon-loft' || after.kind !== 'polygon-loft') throw new Error('Expected polygon level')
    expect(after.bottomOffset).not.toEqual(before.bottomOffset)
    expect(after.topOffset[0] - after.bottomOffset[0]).toBe(parameters.massPartOverrides[0].topOffsetXMm)
    expect(after.topOffset[1] - after.bottomOffset[1]).toBe(parameters.massPartOverrides[0].topOffsetYMm)
    expect(after.topScale / after.bottomScale).toBeCloseTo(parameters.massPartOverrides[0].topWidthRatio)
  })

  it.each(['narrow', 'wide', 'center'] as const)('does not create a duplicate update for the same %s action', (preset) => {
    const next = applyUpperSilhouettePreset(shifted, preset)
    expect(applyUpperSilhouettePreset(next, preset)).toBe(next)
  })

  it('undoes every preset field together and round-trips through project files', () => {
    const before = { parameters: shifted, modelScale: 0.25 as const }
    const after = { ...before, parameters: applyUpperSilhouettePreset(shifted, 'wide') }
    const history = reduceHistory(createHistory(before), { type: 'replace', value: after })
    expect(history.past).toEqual([before])
    const undone = reduceHistory(history, { type: 'undo' })
    expect(undone.present).toEqual(before)
    expect(reduceHistory(undone, { type: 'redo' }).present).toEqual(after)
    const project = parseProject(serializeProject(createProject(after.parameters, after.modelScale)))
    expect(project.parameters).toEqual(after.parameters)
    expect(project.modelScale).toBe(after.modelScale)
    // Opening an existing shifted study must not silently apply centring.
    expect(parseProject(serializeProject(createProject(shifted))).parameters).toEqual(shifted)
  })
})
