import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS, generatePiloti } from './generator'
import { partIdForPiece } from './partSelection'
import { scenePieceGroundContact, scenePieceVolume } from './pieceMetrics'
import { MODEL_SCALE_PRESETS, scaleMassStudy } from './modelScale'
import { createProject, parseProject, serializeProject, readRecovery, writeRecovery } from './project'
import { createHistory, reduceHistory } from './history'
import { resolveStudyFuses } from './studyFuses'

const grid = { ...DEFAULT_PILOTI_PARAMETERS, supportRowCount: 2 }
const removedPartIds = ['support-2', 'support-r2-c2']
const fourLegs = { ...grid, removedPartIds }

describe('semantic part removal', () => {
  it('leaves two holes in a six-leg grid without moving or rerolling the survivors', () => {
    const before = generatePiloti(grid)
    const after = generatePiloti(fourLegs)
    const remaining = before.pieces.filter((piece) => !removedPartIds.includes(partIdForPiece(piece.id) ?? ''))
    expect(after.pieces).toEqual(remaining)
    expect(after.supportLayout?.totalSupports).toBe(4)
    expect(after.supportLayout?.columns).toBe(3)
    expect(after.supportLayout?.rows).toBe(2)
    expect(after.concreteVolumeMm3).toBe(remaining.reduce((sum, piece) => sum + scenePieceVolume(piece), 0))
    expect(after.groundContactMm2).toBe(remaining.reduce((sum, piece) => sum + scenePieceGroundContact(piece), 0))
    expect(after.estimatedMassKg).toBeLessThan(before.estimatedMassKg)
  })

  it('excludes removed shoulder bearings from overlap and overhang feedback', () => {
    const parameters = {
      ...DEFAULT_PILOTI_PARAMETERS,
      supportPositionOverrides: [{ supportId: 'support-2', positionXMm: 300, positionYMm: 300 }],
    }
    expect(generatePiloti(parameters).supportLayout?.bearingOverhangMm).toBeGreaterThan(0)
    const study = generatePiloti({ ...parameters, removedPartIds: ['support-2'] })
    expect(study.supportLayout?.bearingOverhangMm).toBe(0)
    expect(study.supportLayout?.adjacentColumnOverlapMm).toBe(0)
  })

  it('retains removed source shapes for independent copies', () => {
    const parameters = {
      ...grid,
      partCopies: [
        { id: 'copy-1', sourceId: 'support-2', offsetXMm: 300, offsetYMm: 0, offsetZMm: 0 },
        { id: 'copy-2', sourceId: 'upper-mass', offsetXMm: 100, offsetYMm: 0, offsetZMm: 200 },
      ],
    }
    const before = generatePiloti(parameters)
    const after = generatePiloti({ ...parameters, removedPartIds: ['support-2', 'upper-mass'] })
    expect(after.pieces.filter((piece) => piece.id.includes('copy-'))).toEqual(
      before.pieces.filter((piece) => piece.id.includes('copy-')),
    )
    const removedCopy = generatePiloti({ ...parameters, removedPartIds: ['copy-1'] })
    expect(removedCopy.pieces.some((piece) => piece.id.includes('copy-1'))).toBe(false)
    expect(removedCopy.pieces.find((piece) => piece.id === 'support-2')).toEqual(
      before.pieces.find((piece) => piece.id === 'support-2'),
    )
  })

  it('keeps removal intent across grid changes and restores exact authored overrides', () => {
    const parameters = {
      ...fourLegs,
      supportPositionOverrides: [{ supportId: 'support-r2-c2', positionXMm: 70, positionYMm: -50 }],
    }
    const restored = { ...parameters, removedPartIds: [] }
    const smallGrid = { ...parameters, supportCount: 1, supportRowCount: 1 }
    const reopened = parseProject(serializeProject(createProject(smallGrid)))
    expect(generatePiloti({ ...reopened.parameters, supportCount: 3, supportRowCount: 2 })).toEqual(generatePiloti(parameters))
    expect(generatePiloti(restored).pieces).toHaveLength(13)
    const restoredLeg = generatePiloti(restored).pieces.find((piece) => piece.id === 'support-r2-c2')!
    const originalLeg = generatePiloti(grid).pieces.find((piece) => piece.id === 'support-r2-c2')!
    expect(restoredLeg.position[0] - originalLeg.position[0]).toBeCloseTo(70)
    expect(restoredLeg.position[1] - originalLeg.position[1]).toBeCloseTo(-50)
  })

  it.each(MODEL_SCALE_PRESETS)('supports a completely empty study at scale %s', (scale) => {
    const empty = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      removedPartIds: ['upper-mass', 'support-1', 'support-2', 'support-3'],
    })
    const physical = scaleMassStudy(empty, scale)
    expect(physical.pieces).toEqual([])
    expect(physical.bounds).toEqual({ min: [0, 0, 0], max: [0, 0, 0] })
    expect(physical.concreteVolumeMm3).toBe(0)
    expect(physical.groundContactMm2).toBe(0)
    expect(physical.supportLayout?.totalSupports).toBe(0)
  })

  it.each(MODEL_SCALE_PRESETS)('scales the remaining four legs at %s', (scale) => {
    const master = generatePiloti(fourLegs)
    const physical = scaleMassStudy(master, scale)
    expect(physical.pieces.map((piece) => piece.id)).toEqual(master.pieces.map((piece) => piece.id))
    expect(physical.concreteVolumeMm3).toBeCloseTo(master.concreteVolumeMm3 * scale ** 3)
    expect(physical.groundContactMm2).toBeCloseTo(master.groundContactMm2 * scale ** 2)
  })

  it('round-trips removal through project, recovery and undo/redo', () => {
    const project = createProject(fourLegs, 0.25)
    expect(parseProject(serializeProject(project))).toEqual(project)
    const data = new Map<string, string>()
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
    writeRecovery(storage, project)
    expect(readRecovery(storage)).toEqual({ status: 'recovered', project })
    let history = reduceHistory(createHistory(grid), { type: 'replace', value: fourLegs })
    history = reduceHistory(history, { type: 'undo' })
    expect(generatePiloti(history.present)).toEqual(generatePiloti(grid))
    history = reduceHistory(history, { type: 'redo' })
    expect(generatePiloti(history.present)).toEqual(generatePiloti(fourLegs))
  })

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])('migrates version %s without removing anything', (recipeVersion) => {
    const project = createProject(grid)
    const { removedPartIds: ignored, ...parameters } = project.parameters
    expect(ignored).toEqual([])
    const parsed = parseProject(JSON.stringify({ ...project, recipeVersion, parameters }))
    expect(parsed.parameters.removedPartIds).toEqual([])
    expect(generatePiloti(parsed.parameters)).toEqual(generatePiloti(grid))
  })

  it.each([undefined, ['shoulder-2'], ['support-02'], ['support-7'], ['copy-1'], ['fuse-1'], ['support-2', 'support-2'], [42]])('rejects invalid removed parts %j', (ids) => {
    const project = createProject(grid)
    expect(() => parseProject(JSON.stringify({ ...project, parameters: { ...project.parameters, removedPartIds: ids } }))).toThrow()
  })

  it('pauses affected Fuses and reactivates them on restore', async () => {
    const fuseGroups = [{ id: 'fuse-1', pieceIds: ['support-2', 'shoulder-2'] }]
    const missing = await resolveStudyFuses(generatePiloti(fourLegs), fuseGroups)
    expect(missing.dormantFuseGroupIds).toEqual(['fuse-1'])
    expect(missing.study.pieces.some((piece) => piece.id === 'fuse-1')).toBe(false)
    const restored = await resolveStudyFuses(generatePiloti(grid), fuseGroups)
    expect(restored.dormantFuseGroupIds).toEqual([])
    expect(restored.study.pieces.some((piece) => piece.id === 'fuse-1')).toBe(true)
  })
})
