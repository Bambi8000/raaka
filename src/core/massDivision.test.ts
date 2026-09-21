import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS as defaults, generatePiloti } from './generator'
import { divideUpperMass, massPartAddress, massPartProfile } from './massDivision'
import { scenePieceVolume } from './pieceMetrics'
import { sceneBounds } from './bounds'
import { fuseScenePieces, sectionScenePiecesAtZ } from './solidKernel'
import { resolveStudyFuses } from './studyFuses'
import { affectedPilotiControls } from './controlInfluence'
import { createProject, parseProject, serializeProject, writeRecovery, readRecovery } from './project'
import { createHistory, reduceHistory } from './history'
import { partIdForPiece, partInGrid, partLabel } from './partSelection'
import { scaleMassStudy, MODEL_SCALE_PRESETS } from './modelScale'
import type { BoxPiece, FrustumPiece, PilotiParameters, PilotiMassPartOverride } from './types'

const block: BoxPiece = {
  kind: 'box', id: 'upper-mass', label: 'Upper mass', role: 'mass',
  position: [75, -90, 750], size: [960, 600, 800],
}
const tapered: FrustumPiece = {
  kind: 'frustum', id: block.id, label: block.label, role: 'mass',
  position: block.position, height: block.size[2], bottomSize: [960, 600],
  topSize: [480, 720], bottomOffset: [10, -30], topOffset: [-180, 125],
}
const split: PilotiParameters = { ...defaults, upperMassDivision: 'xy4' }
const override: PilotiMassPartOverride = {
  partId: 'upper-mass-xy4-1', profile: 'tapered',
  topWidthRatio: 0.65, topDepthRatio: 0.8, topOffsetXMm: -200, topOffsetYMm: 110,
}

describe('upper mass division', () => {
  it.each(['x2', 'y2', 'xy4'] as const)('preserves the complete block and tapered loft with %s', async (division) => {
    for (const parent of [block, tapered]) {
      const parts = divideUpperMass(parent, division, [])
      expect(parts).toHaveLength(division === 'xy4' ? 4 : 2)
      expect(sceneBounds(parts)).toEqual(sceneBounds([parent]))
      expect(parts.reduce((sum, part) => sum + scenePieceVolume(part), 0)).toBeCloseTo(scenePieceVolume(parent), 5)
      const fused = await fuseScenePieces(parts)
      expect(fused.componentCount).toBe(1)
      expect(fused.volumeMm3 / scenePieceVolume(parent)).toBeCloseTo(1, 6)
      const height = parent.kind === 'box' ? parent.size[2] : parent.height
      for (const fraction of [0.01, 0.25, 0.5, 0.75, 0.99]) {
        const z = parent.position[2] + height * (fraction - 0.5)
        const actual = await sectionScenePiecesAtZ(parts, z)
        const bottom = parent.kind === 'box' ? parent.size : parent.bottomSize
        const top = parent.kind === 'box' ? parent.size : parent.topSize
        const expectedArea = (bottom[0] + (top[0] - bottom[0]) * fraction) *
          (bottom[1] + (top[1] - bottom[1]) * fraction)
        expect(actual.areaMm2 / expectedArea).toBeCloseTo(1, 6)
        // Endpoints of every cell share the same plane, without internal gaps.
        expect(actual.polygons).toHaveLength(1)
      }
    }
  })

  it('preserves the original whole piece exactly', () => {
    expect(divideUpperMass(tapered, 'whole', [override])).toEqual([tapered])
  })

  it('edits one part without changing neighbours, supports or bearing faces', () => {
    const before = generatePiloti(split)
    const after = generatePiloti({ ...split, massPartOverrides: [override] })
    expect(after.pieces.filter((piece) => piece.id !== override.partId)).toEqual(
      before.pieces.filter((piece) => piece.id !== override.partId),
    )
    const part = after.pieces.find((piece) => piece.id === override.partId)!
    const source = before.pieces.find((piece) => piece.id === override.partId)!
    expect(part.kind).toBe('frustum')
    if (part.kind !== 'frustum' || source.kind !== 'box') throw new Error('Missing part')
    expect(part.bottomSize).toEqual(source.size.slice(0, 2))
    expect(part.position).toEqual(source.position)
    expect(part.topOffset).toEqual([-200, 110])
    expect(after.supportLayout).toEqual(before.supportLayout)
  })

  it('allows opposite tapers and restores the exact inherited profile', () => {
    const parameters = { ...split, upperMassProfile: 'tapered' as const }
    const initial = generatePiloti(parameters)
    const first = initial.pieces.find((piece) => piece.id === override.partId)!
    if (first.kind === 'mesh') throw new Error('Expected analytic part')
    const captured = massPartProfile(first)
    const capturedStudy = generatePiloti({ ...parameters, massPartOverrides: [captured] })
    expect(capturedStudy.pieces).toEqual(initial.pieces)
    const opposite = { ...override, partId: 'upper-mass-xy4-2', topOffsetXMm: 200, topOffsetYMm: -110 }
    const edited = { ...parameters, massPartOverrides: [override, opposite] }
    const study = generatePiloti(edited)
    expect(study.pieces.find((p) => p.id === opposite.partId)).toMatchObject({ topOffset: [200, -110] })
    expect(generatePiloti({ ...edited, massPartOverrides: [] })).toEqual(initial)
    const switched = parseProject(serializeProject(createProject({ ...edited, upperMassDivision: 'whole' })))
    expect(generatePiloti({ ...switched.parameters, upperMassDivision: 'xy4' })).toEqual(study)
  })

  it('keeps shared profile controls neutral for an independent top', () => {
    const affected = affectedPilotiControls({ ...split, massPartOverrides: [override] }, override.partId)
    expect(affected.has('upperWidthRatio')).toBe(true)
    expect(affected.has('heightMm')).toBe(true)
    expect(affected.has('upperMassDivision')).toBe(true)
    for (const key of ['upperMassProfile', 'upperTopWidthRatio', 'upperTopDepthRatio', 'upperTopOffsetXMm', 'upperTopOffsetYMm'] as const) {
      expect(affected.has(key)).toBe(false)
    }
  })

  it('removes individual cells without removing their live copies; whole copies stay whole', () => {
    const partCopies = [
      { id: 'copy-1', sourceId: override.partId, offsetXMm: 100, offsetYMm: 0, offsetZMm: 0 },
      { id: 'copy-2', sourceId: 'upper-mass', offsetXMm: 200, offsetYMm: 0, offsetZMm: 0 },
    ]
    const parameters = { ...split, massPartOverrides: [override], partCopies }
    const before = generatePiloti(parameters)
    const after = generatePiloti({ ...parameters, removedPartIds: [override.partId] })
    expect(after.pieces).toEqual(before.pieces.filter((p) => p.id !== override.partId))
    const parent = generatePiloti(defaults).pieces.find((p) => p.id === 'upper-mass') as BoxPiece
    expect(before.pieces.find((p) => p.id === 'upper-mass-copy-2')).toMatchObject({ kind: 'box', size: parent.size })
    const inactive = generatePiloti({ ...parameters, upperMassDivision: 'x2' })
    expect(inactive.pieces.some((p) => p.id === 'upper-mass-copy-1')).toBe(false)
    expect(inactive.pieces.some((p) => p.id === 'upper-mass-copy-2')).toBe(true)
    const noOriginal = generatePiloti({ ...parameters, removedPartIds: ['upper-mass'] })
    expect(noOriginal.pieces.some((p) => massPartAddress(p.id))).toBe(false)
    expect(noOriginal.pieces.filter((p) => p.id.includes('copy-'))).toHaveLength(2)
    expect(partIdForPiece(override.partId)).toBe(override.partId)
    expect(partLabel(override.partId)).toBe('Mass XY4 · 1')
    expect(partInGrid('copy-1', parameters)).toBe(true)
    expect(partInGrid('copy-1', { ...parameters, upperMassDivision: 'whole' })).toBe(false)
  })

  it('keeps vertical levels selectable, removable and copyable without repacking', () => {
    const sourceId = 'upper-mass-rect-level-2'
    const parameters: PilotiParameters = {
      ...defaults,
      upperMassDivision: 'z3',
      partCopies: [{
        id: 'copy-1',
        sourceId,
        offsetXMm: -240,
        offsetYMm: 0,
        offsetZMm: 0,
      }],
    }
    const complete = generatePiloti(parameters)
    const removed = generatePiloti({ ...parameters, removedPartIds: [sourceId] })

    expect(complete.pieces.filter((piece) => massPartAddress(piece.id))).toHaveLength(3)
    expect(removed.pieces.some((piece) => piece.id === sourceId)).toBe(false)
    expect(removed.pieces.some((piece) => piece.id === 'upper-mass-copy-1')).toBe(true)
    expect(partIdForPiece(sourceId)).toBe(sourceId)
    expect(partLabel(sourceId)).toBe('Upper level 2')
    expect(partInGrid(sourceId, parameters)).toBe(true)
    expect(partInGrid('upper-mass-rect-level-3', {
      ...parameters,
      upperMassDivision: 'z2',
    })).toBe(false)
    expect(partInGrid('upper-mass-rect-level-3', {
      ...parameters,
      upperMassDivision: 'z4',
    })).toBe(true)
  })

  it.each([
    ['xy4', ['upper-mass-xy4-1', 'upper-mass-xy4-2']],
    ['z3', ['upper-mass-rect-level-1', 'upper-mass-rect-level-2']],
  ] as const)('pauses and restores %s Fuses when their division is inactive', async (upperMassDivision, pieceIds) => {
    const parameters: PilotiParameters = { ...defaults, upperMassDivision }
    const fuseGroups = [{ id: 'fuse-1', pieceIds: [...pieceIds] }]
    const project = parseProject(serializeProject(createProject({ ...parameters, fuseGroups })))
    const active = await resolveStudyFuses(generatePiloti(project.parameters), fuseGroups)
    expect(active.dormantFuseGroupIds).toEqual([])
    expect(active.study.pieces.some((p) => p.id === 'fuse-1')).toBe(true)
    const paused = await resolveStudyFuses(generatePiloti({ ...parameters, upperMassDivision: 'whole' }), fuseGroups)
    expect(paused.dormantFuseGroupIds).toEqual(['fuse-1'])
  })

  it.each(MODEL_SCALE_PRESETS)('keeps divided geometry and volume correct at model scale %s', (scale) => {
    const study = generatePiloti({ ...split, massPartOverrides: [override] })
    const model = scaleMassStudy(study, scale)
    expect(model.concreteVolumeMm3).toBeCloseTo(study.concreteVolumeMm3 * scale ** 3)
    expect(model.pieces.map((p) => p.id)).toEqual(study.pieces.map((p) => p.id))
    expect(model.bounds.max[0]).toBeCloseTo(study.bounds.max[0] * scale)
  })

  it('round-trips division and individual tops through save, recovery and history', () => {
    const parameters = { ...split, massPartOverrides: [override], removedPartIds: ['upper-mass-xy4-4'] }
    const project = createProject(parameters, 0.25)
    expect(parseProject(serializeProject(project))).toEqual(project)
    expect(project.parameters.massPartOverrides[0]).not.toBe(override)
    const data = new Map<string, string>()
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
    writeRecovery(storage, project)
    expect(readRecovery(storage)).toEqual({ status: 'recovered', project })
    let history = reduceHistory(createHistory(defaults), { type: 'replace', value: parameters })
    history = reduceHistory(history, { type: 'undo' })
    expect(history.present).toEqual(defaults)
    history = reduceHistory(history, { type: 'redo' })
    expect(history.present).toEqual(parameters)
  })

  it.each([0.45, 1.25])('captures extreme inherited ratios %s within validation bounds', (ratio) => {
    const parameters: PilotiParameters = {
      ...split, upperMassProfile: 'tapered', heightMm: 2_000,
      supportCount: 6, supportRowCount: 3, rowSpacingMm: 800,
      upperWidthRatio: 1.1, upperDepthRatio: 0.65,
      upperTopWidthRatio: ratio, upperTopDepthRatio: ratio,
      upperTopOffsetXMm: -400, upperTopOffsetYMm: 400,
    }
    const before = generatePiloti(parameters)
    const massPartOverrides = before.pieces.filter((p) => massPartAddress(p.id)).map((p) => {
      if (p.kind === 'mesh') throw new Error('Expected analytic cell')
      return massPartProfile(p)
    })
    const parsed = parseProject(serializeProject(createProject({ ...parameters, massPartOverrides })))
    const after = generatePiloti(parsed.parameters)
    expect(after.concreteVolumeMm3 / before.concreteVolumeMm3).toBeCloseTo(1, 12)
    expect(after.bounds).toEqual(before.bounds)
  })

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])('migrates version %s without dividing geometry', (recipeVersion) => {
    const legacy = JSON.parse(serializeProject(createProject(defaults))) as { parameters: Record<string, unknown> }
    delete legacy.parameters.upperMassDivision
    delete legacy.parameters.massPartOverrides
    const migrated = parseProject(JSON.stringify({ ...legacy, recipeVersion }))
    expect(migrated.parameters.upperMassDivision).toBe('whole')
    expect(migrated.parameters.massPartOverrides).toEqual([])
    expect(generatePiloti(migrated.parameters)).toEqual(generatePiloti(defaults))
  })

  it.each([
    { upperMassDivision: 'z5' }, { upperMassDivision: undefined },
    { massPartOverrides: undefined }, { massPartOverrides: [override, override] },
    ...['upper-mass', 'upper-mass-x2-3', 'upper-mass-xy4-01', 'copy-1'].map((partId) => ({ massPartOverrides: [{ ...override, partId }] })),
    ...[NaN, Infinity, -1, 1.5, '0.8'].map((topWidthRatio) => ({ massPartOverrides: [{ ...override, topWidthRatio }] })),
    { massPartOverrides: [{ ...override, topOffsetXMm: 2_001 }] },
    { massPartOverrides: [{ ...override, profile: 'cone' }] },
  ])('rejects invalid division input %j', (invalid) => {
    const project = createProject(split)
    expect(() => parseProject(JSON.stringify({ ...project, parameters: { ...project.parameters, ...invalid } }))).toThrow()
  })
})
