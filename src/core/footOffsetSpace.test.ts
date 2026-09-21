import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS as defaults, generatePiloti } from './generator'
import { affectedPilotiControls } from './controlInfluence'
import { createHistory, reduceHistory } from './history'
import { MODEL_SCALE_PRESETS, scaleMassStudy } from './modelScale'
import { polygonFace, polygonLoftVertices } from './polygonLoft'
import { scenePieceBounds } from './bounds'
import { scenePieceGroundContact, scenePieceVolume } from './pieceMetrics'
import { createProject, parseProject, readRecovery, serializeProject, writeRecovery } from './project'
import { fuseScenePieces } from './solidKernel'
import type { PilotiParameters, PolygonLoftPiece, ScenePiece } from './types'

function polygon(piece: ScenePiece | undefined): PolygonLoftPiece {
  if (piece?.kind !== 'polygon-loft') throw new Error('Expected a polygon loft')
  return piece
}

describe.each(['hexagon', 'octagon'] as const)('%s foot offset space', (planShape) => {
  const code = planShape === 'hexagon' ? 'hex' : 'oct'
  const base: PilotiParameters = { ...defaults, planShape, footOffsetXMm: 120, footOffsetYMm: -60 }
  const supportId = `support-${code}-2`

  it('preserves the global compass and maps centered values to each actual neck direction', () => {
    const global = generatePiloti(base)
    const centered = generatePiloti({ ...base, footOffsetSpace: 'centered' })
    global.pieces.filter((p) => p.id.startsWith('support-')).forEach((piece) => {
      const before = polygon(piece)
      const after = polygon(centered.pieces.find((p) => p.id === piece.id))
      expect(before.bottomOffset).toEqual([120, -60])
      const r = Math.hypot(after.position[0], after.position[1])
      const ux = after.position[0] / r
      const uy = after.position[1] / r
      expect(after.bottomOffset[0] * ux + after.bottomOffset[1] * uy).toBeCloseTo(120)
      expect(-after.bottomOffset[0] * uy + after.bottomOffset[1] * ux).toBeCloseTo(-60)
      expect(Math.hypot(...after.bottomOffset)).toBeCloseTo(Math.hypot(120, -60))
      expect(polygonFace(after, true)).toEqual(polygonFace(before, true))
      expect(scenePieceBounds(after).min[2]).toBe(0)
      expect(scenePieceVolume(after)).toBe(scenePieceVolume(before))
      expect(scenePieceGroundContact(after)).toBe(scenePieceGroundContact(before))
      expect(polygonFace(after, true)).toEqual(polygonFace(polygon(centered.pieces.find(
        (p) => p.id === piece.id.replace('support-', 'shoulder-'),
      )), false))
    })
    expect(centered.pieces.filter((p) => !p.id.startsWith('support-'))).toEqual(global.pieces.filter((p) => !p.id.startsWith('support-')))
    expect(centered.radialLayout).toEqual(global.radialLayout)
    expect(generatePiloti({ ...base, footOffsetSpace: 'centered' })).toEqual(centered)
  })

  it.each([-300, 0, 300])('moves every foot radially by %s without a tangential component', (offset) => {
    const study = generatePiloti({ ...base, footOffsetSpace: 'centered', footOffsetXMm: offset, footOffsetYMm: 0 })
    study.pieces.filter((p) => p.id.startsWith('support-')).map(polygon).forEach((stem) => {
      const [x, y] = stem.position
      const [dx, dy] = stem.bottomOffset
      expect(x * dy - y * dx).toBeCloseTo(0, 8)
      expect((x * dx + y * dy) / Math.hypot(x, y)).toBeCloseTo(offset)
      expect(polygonLoftVertices(stem).flat().every(Number.isFinite)).toBe(true)
    })
  })

  it('uses selected values in the same space and retains copied source direction', () => {
    const parameters: PilotiParameters = { ...base, footOffsetSpace: 'centered', partCopies: [
      { id: 'copy-1', sourceId: supportId, offsetXMm: 250, offsetYMm: -300, offsetZMm: 0 },
    ] }
    const before = generatePiloti(parameters)
    const after = generatePiloti({ ...parameters,
      footOffsetOverrides: [{ supportId, footOffsetXMm: -80, footOffsetYMm: 150 }],
    })
    const stem = polygon(after.pieces.find((p) => p.id === supportId))
    const copy = polygon(after.pieces.find((p) => p.id === 'support-copy-1'))
    const r = Math.hypot(stem.position[0], stem.position[1])
    expect((stem.position[0] * stem.bottomOffset[0] + stem.position[1] * stem.bottomOffset[1]) / r).toBeCloseTo(-80)
    expect((-stem.position[1] * stem.bottomOffset[0] + stem.position[0] * stem.bottomOffset[1]) / r).toBeCloseTo(150)
    expect(copy.bottomOffset).toEqual(stem.bottomOffset)
    expect(after.pieces.filter((p) => p.id !== supportId && p.id !== 'support-copy-1')).toEqual(
      before.pieces.filter((p) => p.id !== supportId && p.id !== 'support-copy-1'),
    )
    const removed = generatePiloti({ ...parameters, removedPartIds: [supportId] })
    expect(removed.pieces.find((p) => p.id === 'support-copy-1')).toEqual(before.pieces.find((p) => p.id === 'support-copy-1'))
  })

  it('follows selected neck placement but never the offset upper mass or already-offset foot', () => {
    const parameters: PilotiParameters = { ...base, footOffsetSpace: 'centered',
      supportPositionOverrides: [{ supportId, positionXMm: 170, positionYMm: -110 }],
    }
    const before = generatePiloti(parameters)
    const stem = polygon(before.pieces.find((p) => p.id === supportId))
    const r = Math.hypot(stem.position[0], stem.position[1])
    expect((stem.position[0] * stem.bottomOffset[0] + stem.position[1] * stem.bottomOffset[1]) / r).toBeCloseTo(120)
    const after = generatePiloti({ ...parameters, upperOffsetXMm: 400, upperOffsetYMm: -400 })
    expect(after.pieces.filter((p) => p.id.startsWith('support-'))).toEqual(before.pieces.filter((p) => p.id.startsWith('support-')))
    const twice = polygon(generatePiloti({ ...parameters, footOffsetXMm: 240, footOffsetYMm: -120 }).pieces.find((p) => p.id === supportId))
    twice.bottomOffset.forEach((v, i) => expect(v).toBeCloseTo(stem.bottomOffset[i] * 2))
  })

  it('uses a finite bay-axis fallback when a selected neck is placed exactly at the centre', () => {
    const parameters: PilotiParameters = { ...base, asymmetry: 0, footOffsetSpace: 'centered' }
    const original = polygon(generatePiloti(parameters).pieces.find((p) => p.id === supportId))
    const stem = polygon(generatePiloti({ ...parameters, supportPositionOverrides: [
      { supportId, positionXMm: -original.position[0], positionYMm: -original.position[1] },
    ] }).pieces.find((p) => p.id === supportId))
    expect(stem.position.slice(0, 2)).toEqual([0, 0])
    stem.bottomOffset.forEach((v, i) => expect(v).toBeCloseTo(original.bottomOffset[i]))
  })

  it.each(MODEL_SCALE_PRESETS)('preserves centered geometry and physical readings at scale %s', (scale) => {
    const study = generatePiloti({ ...base, footOffsetSpace: 'centered' })
    const scaled = scaleMassStudy(study, scale)
    scaled.pieces.forEach((p, i) => polygonLoftVertices(polygon(p)).forEach((point, j) => {
      const original = polygonLoftVertices(polygon(study.pieces[i]))[j]
      point.forEach((v, axis) => expect(v).toBeCloseTo(original[axis] * scale))
    }))
    expect(scaled.groundContactMm2).toBeCloseTo(study.groundContactMm2 * scale ** 2)
    expect(scaled.concreteVolumeMm3).toBeCloseTo(study.concreteVolumeMm3 * scale ** 3)
  })

  it('highlights the actual affected stems, copies and Fuse sources but not shoulders or masses', () => {
    const parameters: PilotiParameters = { ...base, partCopies: [
      { id: 'copy-1', sourceId: supportId, offsetXMm: 200, offsetYMm: 0, offsetZMm: 0 },
    ], fuseGroups: [{ id: 'fuse-1', pieceIds: [supportId, supportId.replace('support-', 'shoulder-')] }] }
    for (const id of [supportId, 'support-copy-1', 'fuse-1']) expect(affectedPilotiControls(parameters, id).has('footOffsetSpace')).toBe(true)
    for (const id of ['upper-mass', supportId.replace('support-', 'shoulder-')]) expect(affectedPilotiControls(parameters, id).has('footOffsetSpace')).toBe(false)
    expect(affectedPilotiControls({ ...base, footOffsetXMm: 0, footOffsetYMm: 0 }, supportId).has('footOffsetSpace')).toBe(false)
  })

  it('fuses a centered study with joined necks and unchanged solid volume', async () => {
    const study = generatePiloti({ ...base, footOffsetSpace: 'centered', footOffsetYMm: 0 })
    const fused = await fuseScenePieces(study.pieces)
    expect(fused.componentCount).toBe(1)
    expect(fused.volumeMm3 / study.concreteVolumeMm3).toBeCloseTo(1, 6)
  })

  it('round-trips mode and overrides through projects, recovery and Undo/Redo', () => {
    const parameters: PilotiParameters = { ...base, footOffsetSpace: 'centered', footOffsetOverrides: [
      { supportId, footOffsetXMm: -45, footOffsetYMm: 15 },
    ] }
    const project = createProject(parameters, 0.25)
    expect(parseProject(serializeProject(project))).toEqual(project)
    const data = new Map<string, string>()
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
    writeRecovery(storage, project)
    expect(readRecovery(storage)).toEqual({ status: 'recovered', project })
    let history = reduceHistory(createHistory(base), { type: 'replace', value: parameters })
    history = reduceHistory(history, { type: 'undo' })
    expect(generatePiloti(history.present)).toEqual(generatePiloti(base))
    history = reduceHistory(history, { type: 'redo' })
    expect(generatePiloti(history.present)).toEqual(generatePiloti(parameters))
  })
})

describe('offset space compatibility', () => {
  it('leaves rectangular geometry unchanged while retaining the latent mode', () => {
    const parameters = { ...defaults, footOffsetXMm: 140, footOffsetYMm: -70 }
    expect(generatePiloti({ ...parameters, footOffsetSpace: 'centered' })).toEqual(generatePiloti(parameters))
    expect(affectedPilotiControls(parameters, 'support-2').has('footOffsetSpace')).toBe(false)
    expect(parseProject(serializeProject(createProject({ ...parameters, footOffsetSpace: 'centered' }))).parameters.footOffsetSpace).toBe('centered')
  })

  it.each(Array.from({ length: 15 }, (_, i) => i + 1))('migrates recipe %s to Global without changing geometry', (recipeVersion) => {
    const parameters = { ...defaults, footOffsetXMm: 120, footOffsetYMm: 30 }
    const project = JSON.parse(serializeProject(createProject(parameters))) as { parameters: Record<string, unknown> }
    delete project.parameters.footOffsetSpace
    const restored = parseProject(JSON.stringify({ ...project, recipeVersion }))
    expect(restored.parameters.footOffsetSpace).toBe('global')
    expect(generatePiloti(restored.parameters)).toEqual(generatePiloti(parameters))
  })

  it.each(['hexagon', 'octagon'] as const)('preserves a version-15 %s with non-zero offsets', (planShape) => {
    const parameters = { ...defaults, planShape, footOffsetXMm: 120, footOffsetYMm: -30 }
    const project = JSON.parse(serializeProject(createProject(parameters))) as { parameters: Record<string, unknown> }
    delete project.parameters.footOffsetSpace
    const restored = parseProject(JSON.stringify({ ...project, recipeVersion: 15 }))
    expect(restored.parameters.footOffsetSpace).toBe('global')
    expect(generatePiloti(restored.parameters)).toEqual(generatePiloti(parameters))
  })

  it.each([undefined, null, 'radial', 1, {}, []])('rejects invalid current offset space %j', (footOffsetSpace) => {
    const project = createProject(defaults)
    expect(() => parseProject(JSON.stringify({ ...project, parameters: { ...project.parameters, footOffsetSpace } }))).toThrow('Foot offset space must be global or centered.')
  })
})
