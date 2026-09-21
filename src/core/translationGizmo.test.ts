import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS as defaults, generatePiloti } from './generator'
import { scaleMassStudy } from './modelScale'
import {
  applyTranslationGizmoValue,
  translatedGizmoValue,
  translationGizmoTarget,
} from './translationGizmo'
import type { ModelScale, PilotiParameters } from './types'

function target(parameters: PilotiParameters, selectedPieceId: string, scale: ModelScale = 1) {
  return translationGizmoTarget(parameters, selectedPieceId,
    scaleMassStudy(generatePiloti(parameters), scale))
}

describe('translation gizmo targets', () => {
  it('moves a whole upper mass and every original cell through shared XY placement', () => {
    const whole = target(defaults, 'upper-mass')
    expect(whole).toMatchObject({ kind: 'upper-mass', axes: 'xy', valueDesignMm: [0, 0, 0] })

    const divided = { ...defaults, upperMassDivision: 'xy4' as const }
    const cell = target(divided, 'upper-mass-xy4-1')
    expect(cell).toMatchObject({ kind: 'upper-mass', key: 'upper-mass', axes: 'xy' })
    const position = generatePiloti(divided).pieces.find(
      (piece) => piece.id === 'upper-mass-xy4-1',
    )!.position
    cell?.anchorModelMm.forEach((value, axis) => expect(value).toBeCloseTo(position[axis], 10))
  })

  it('uses one complete-leg anchor and existing selected placement', () => {
    const parameters = { ...defaults, supportPositionOverrides: [
      { supportId: 'support-2', positionXMm: 40, positionYMm: -30 },
    ] }
    const stem = target(parameters, 'support-2')
    const shoulder = target(parameters, 'shoulder-2')
    expect(stem).toEqual(shoulder)
    expect(stem).toMatchObject({
      kind: 'support', supportId: 'support-2', axes: 'xy',
      valueDesignMm: [40, -30, 0],
    })
    expect(stem?.anchorModelMm[2]).toBeGreaterThan(0)
  })

  it('supports radial legs without changing the centred offset semantics', () => {
    const parameters = {
      ...defaults,
      planShape: 'hexagon' as const,
      footOffsetSpace: 'centered' as const,
    }
    expect(target(parameters, 'support-hex-4')).toMatchObject({
      kind: 'support',
      supportId: 'support-hex-4',
      axes: 'xy',
      valueDesignMm: [0, 0, 0],
    })
  })

  it('gives mass and support copies one shared XYZ translation target', () => {
    const parameters: PilotiParameters = { ...defaults, partCopies: [
      { id: 'copy-1', sourceId: 'support-2', offsetXMm: 120, offsetYMm: -40, offsetZMm: 80 },
      { id: 'copy-2', sourceId: 'upper-mass', offsetXMm: -100, offsetYMm: 50, offsetZMm: 200 },
    ] }
    expect(target(parameters, 'support-copy-1')).toEqual(target(parameters, 'shoulder-copy-1'))
    expect(target(parameters, 'support-copy-1')).toMatchObject({
      kind: 'copy', copyId: 'copy-1', axes: 'xyz', valueDesignMm: [120, -40, 80],
    })
    expect(target(parameters, 'upper-mass-copy-2')).toMatchObject({
      kind: 'copy', copyId: 'copy-2', axes: 'xyz', valueDesignMm: [-100, 50, 200],
    })
  })

  it('does not offer handles for Fuses, absent parts or dormant copies', () => {
    const parameters: PilotiParameters = { ...defaults,
      fuseGroups: [{ id: 'fuse-1', pieceIds: ['upper-mass', 'support-2'] }],
      partCopies: [{ id: 'copy-1', sourceId: 'support-r2-c1', offsetXMm: 0, offsetYMm: 0, offsetZMm: 0 }],
    }
    const study = generatePiloti(parameters)
    expect(translationGizmoTarget(parameters, 'fuse-1', study)).toBeUndefined()
    expect(translationGizmoTarget(parameters, 'missing', study)).toBeUndefined()
    expect(translationGizmoTarget(parameters, 'support-copy-1', study)).toBeUndefined()
  })

  it('converts physical movement to design millimetres and clamps every axis', () => {
    const parameters: PilotiParameters = { ...defaults, partCopies: [
      { id: 'copy-1', sourceId: 'upper-mass', offsetXMm: 100, offsetYMm: -100, offsetZMm: 0 },
    ] }
    const gizmo = target(parameters, 'upper-mass-copy-1', 0.25)!
    expect(translatedGizmoValue(gizmo, [
      gizmo.anchorModelMm[0] + 25,
      gizmo.anchorModelMm[1] - 12.5,
      gizmo.anchorModelMm[2] + 50,
    ], 0.25)).toEqual([200, -150, 200])
    expect(translatedGizmoValue(gizmo, [10_000, -10_000, 10_000], 0.25))
      .toEqual([2_000, -2_000, 2_000])
  })


  it('moves the shared upper mass using its existing design parameters', () => {
    const gizmo = target(defaults, 'upper-mass')!
    const before = generatePiloti(defaults).pieces.find((piece) => piece.id === 'upper-mass')!
    const parameters = applyTranslationGizmoValue(defaults, gizmo, [37, -22, 0])
    const after = generatePiloti(parameters).pieces.find((piece) => piece.id === 'upper-mass')!
    expect(parameters).toMatchObject({ upperOffsetXMm: 37, upperOffsetYMm: -22 })
    expect(after.position[0] - before.position[0]).toBeCloseTo(37, 10)
    expect(after.position[1] - before.position[1]).toBeCloseTo(-22, 10)
  })

  it('creates a complete selected-leg override and translates stem and shoulder together', () => {
    const gizmo = target(defaults, 'support-2')!
    const before = generatePiloti(defaults)
    const parameters = applyTranslationGizmoValue(defaults, gizmo, [65, -35, 0])
    const after = generatePiloti(parameters)
    expect(parameters.footOffsetOverrides).toContainEqual({
      supportId: 'support-2',
      footOffsetXMm: defaults.footOffsetXMm,
      footOffsetYMm: defaults.footOffsetYMm,
    })
    expect(parameters.supportSizeOverrides).toContainEqual({
      supportId: 'support-2', widthScale: 1, depthScale: 1,
    })
    expect(parameters.supportPositionOverrides).toContainEqual({
      supportId: 'support-2', positionXMm: 65, positionYMm: -35,
    })
    for (const pieceId of ['support-2', 'shoulder-2']) {
      const start = before.pieces.find((piece) => piece.id === pieceId)!
      const moved = after.pieces.find((piece) => piece.id === pieceId)!
      expect(moved.position[0] - start.position[0]).toBeCloseTo(65, 10)
      expect(moved.position[1] - start.position[1]).toBeCloseTo(-35, 10)
    }
  })

  it('translates a copy in XYZ without moving its source', () => {
    const initial: PilotiParameters = { ...defaults, partCopies: [{
      id: 'copy-1', sourceId: 'support-2',
      offsetXMm: 10, offsetYMm: 20, offsetZMm: 30,
    }] }
    const gizmo = target(initial, 'support-copy-1')!
    const before = generatePiloti(initial)
    const parameters = applyTranslationGizmoValue(initial, gizmo, [80, -45, 120])
    const after = generatePiloti(parameters)
    expect(parameters.partCopies[0]).toMatchObject({
      offsetXMm: 80, offsetYMm: -45, offsetZMm: 120,
    })
    const sourceBefore = before.pieces.find((piece) => piece.id === 'support-2')!
    const sourceAfter = after.pieces.find((piece) => piece.id === 'support-2')!
    expect(sourceAfter.position).toEqual(sourceBefore.position)
    for (const pieceId of ['support-copy-1', 'shoulder-copy-1']) {
      const start = before.pieces.find((piece) => piece.id === pieceId)!
      const moved = after.pieces.find((piece) => piece.id === pieceId)!
      expect(moved.position[0] - start.position[0]).toBeCloseTo(70, 10)
      expect(moved.position[1] - start.position[1]).toBeCloseTo(-65, 10)
      expect(moved.position[2] - start.position[2]).toBeCloseTo(90, 10)
    }
  })
})
