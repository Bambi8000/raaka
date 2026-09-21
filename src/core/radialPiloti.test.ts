import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS as defaults, generatePiloti } from './generator'
import { polygonArea, polygonFace, polygonLoftMesh, polygonLoftVertices, polygonIntersectionArea, polygonOverhang } from './polygonLoft'
import { scenePieceBounds } from './bounds'
import { scenePieceVolume, scenePieceGroundContact } from './pieceMetrics'
import { fuseScenePieces, sectionScenePiecesAtZ } from './solidKernel'
import { resolveStudyFuses } from './studyFuses'
import { massPartProfile } from './massDivision'
import { partIdForPiece, partInGrid, partLabel } from './partSelection'
import { affectedPilotiControls } from './controlInfluence'
import { createProject, serializeProject, parseProject, readRecovery, writeRecovery } from './project'
import { createHistory, reduceHistory } from './history'
import { MODEL_SCALE_PRESETS, scaleMassStudy } from './modelScale'
import { PILOTI_PARAMETER_RULES } from './pilotiParameters'
import type { PilotiParameters, PolygonLoftPiece, ScenePiece, Vec3 } from './types'

function polygon(piece: ScenePiece | undefined): PolygonLoftPiece {
  if (piece?.kind !== 'polygon-loft') throw new Error('Expected polygon loft')
  return piece
}
function subtract(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] }
function cross(a: Vec3, b: Vec3): Vec3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] }
function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }

function expectClosedPlanar(piece: PolygonLoftPiece): void {
  const vertices = polygonLoftVertices(piece)
  const mesh = polygonLoftMesh(piece)
  const counts = new Map<string, number>()
  let volume = 0
  for (let i = 0; i < mesh.triangles.length; i += 3) {
    const triangle = [...mesh.triangles.slice(i, i + 3)]
    triangle.forEach((a, j) => {
      const b = triangle[(j + 1) % 3]
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    volume += dot(vertices[triangle[0]], cross(vertices[triangle[1]], vertices[triangle[2]])) / 6
  }
  expect([...counts.values()].every((count) => count === 2)).toBe(true)
  expect(volume / scenePieceVolume(piece)).toBeCloseTo(1, 9)
  const n = piece.footprint.length
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n
    const normal = cross(subtract(vertices[j], vertices[i]), subtract(vertices[n + i], vertices[i]))
    const distance = dot(normal, subtract(vertices[n + j], vertices[i])) / Math.hypot(...normal)
    expect(Math.abs(distance)).toBeLessThan(1e-8)
  }
}

describe.each(['hexagon', 'octagon'] as const)('%s Piloti', (planShape) => {
  const sides = planShape === 'hexagon' ? 6 : 8
  const code = sides === 6 ? 'hex' : 'oct'
  const sector = `upper-mass-${code}${sides}-1`
  const support = `support-${code}-1`
  const base: PilotiParameters = { ...defaults, planShape }

  it('creates one joined, grounded leg per side and a regular polygon mass', () => {
    const study = generatePiloti(base)
    expect(study.pieces).toHaveLength(2 * sides + 1)
    expect(study.radialLayout).toMatchObject({ sides, totalSupports: sides, bearingOverhangMm: 0, shoulderOverlapMm2: 0 })
    expect(study.supportLayout).toBeUndefined()
    expect(generatePiloti(base)).toEqual(study)
    const mass = polygon(study.pieces.find((p) => p.id === 'upper-mass'))
    expect(mass.footprint).toHaveLength(sides)
    const radius = base.heightMm * base.upperWidthRatio / 2
    mass.footprint.forEach((point) => expect(Math.hypot(...point)).toBeCloseTo(radius))
    expect(polygonArea(mass.footprint)).toBeCloseTo(sides * radius ** 2 * Math.sin(2 * Math.PI / sides) / 2)
    for (let i = 1; i <= sides; i += 1) {
      const stem = polygon(study.pieces.find((p) => p.id === `support-${code}-${i}`))
      const shoulder = polygon(study.pieces.find((p) => p.id === `shoulder-${code}-${i}`))
      expect(polygonFace(stem, true)).toEqual(polygonFace(shoulder, false))
      expect(scenePieceBounds(stem).min[2]).toBe(0)
      expect(scenePieceGroundContact(stem)).toBeCloseTo(polygonArea(stem.footprint) * stem.bottomScale ** 2)
    }
    study.pieces.forEach((piece) => expectClosedPlanar(polygon(piece)))
  })

  it.each(['block', 'tapered'] as const)('tiles the %s mass with radial sectors and one connected union', async (upperMassProfile) => {
    const parameters = { ...base, upperMassProfile, upperTopWidthRatio: 0.45, upperTopOffsetXMm: -250, upperTopOffsetYMm: 170 }
    const whole = generatePiloti(parameters)
    const mass = polygon(whole.pieces.find((p) => p.id === 'upper-mass'))
    const divided = generatePiloti({ ...parameters, polygonMassDivision: 'sectors' })
    const sectors = divided.pieces.filter((p) => p.role === 'mass').map(polygon)
    expect(sectors).toHaveLength(sides)
    expect(divided.pieces.filter((p) => p.role === 'support')).toEqual(whole.pieces.filter((p) => p.role === 'support'))
    expect(divided.concreteVolumeMm3 / whole.concreteVolumeMm3).toBeCloseTo(1, 12)
    sectors.forEach((part, i) => {
      const points = polygonLoftMesh(part, true).positions
      const next = polygonLoftMesh(sectors[(i + 1) % sides], true).positions
      // Both ends of each shared radial face must survive Float32 identically.
      for (const [a, b] of [[0, 0], [2, 1], [3, 3], [5, 4]]) {
        expect(points.slice(a * 3, a * 3 + 3)).toEqual(next.slice(b * 3, b * 3 + 3))
      }
    })
    const union = await fuseScenePieces(sectors)
    expect(union.componentCount).toBe(1)
    expect(union.volumeMm3 / scenePieceVolume(mass)).toBeCloseTo(1, 6)
    for (const fraction of [0.01, 0.25, 0.5, 0.75, 0.99]) {
      const z = mass.position[2] + (fraction - 0.5) * mass.height
      const section = await sectionScenePiecesAtZ(sectors, z)
      const scale = mass.bottomScale + (mass.topScale - mass.bottomScale) * fraction
      expect(section.areaMm2 / (polygonArea(mass.footprint) * scale ** 2)).toBeCloseTo(1, 6)
      expect(section.polygons).toHaveLength(1)
    }
    sectors.forEach(expectClosedPlanar)
  })

  it('builds shape-specific stepped levels as connected semantic parts', async () => {
    const levelId = `upper-mass-${code}-level-2`
    const parameters: PilotiParameters = {
      ...base,
      polygonMassDivision: 'z3',
      upperMassProfile: 'tapered',
      upperTopWidthRatio: 0.8,
    }
    const study = generatePiloti(parameters)
    const levels = study.pieces.filter((piece) => piece.role === 'mass').map(polygon)

    expect(levels.map((piece) => piece.id)).toEqual([
      `upper-mass-${code}-level-1`,
      levelId,
      `upper-mass-${code}-level-3`,
    ])
    levels.forEach(expectClosedPlanar)
    expect((await fuseScenePieces(study.pieces)).componentCount).toBe(1)
    expect(partLabel(levelId)).toBe('Upper level 2')
    expect(partInGrid(levelId, parameters)).toBe(true)
    expect(partInGrid(levelId, {
      ...parameters,
      planShape: planShape === 'hexagon' ? 'octagon' : 'hexagon',
    })).toBe(false)

    const copied = generatePiloti({
      ...parameters,
      removedPartIds: [levelId],
      partCopies: [{
        id: 'copy-1',
        sourceId: levelId,
        offsetXMm: 0,
        offsetYMm: 0,
        offsetZMm: 200,
      }],
    })
    expect(copied.pieces.some((piece) => piece.id === levelId)).toBe(false)
    expect(copied.pieces.some((piece) => piece.id === 'upper-mass-copy-1')).toBe(true)
  })

  it('edits and re-links one sector without changing neighbours or supports', () => {
    const parameters: PilotiParameters = { ...base, polygonMassDivision: 'sectors', upperMassProfile: 'tapered' }
    const before = generatePiloti(parameters)
    const piece = polygon(before.pieces.find((p) => p.id === sector))
    const snapshot = massPartProfile(piece)
    const frozen = generatePiloti({ ...parameters, massPartOverrides: [snapshot] })
    frozen.pieces.forEach((part, i) => polygonLoftVertices(polygon(part)).forEach((point, j) =>
      point.forEach((value, axis) => expect(value).toBeCloseTo(polygonLoftVertices(polygon(before.pieces[i]))[j][axis], 10)),
    ))
    const edited = generatePiloti({ ...parameters, massPartOverrides: [{ ...snapshot, topOffsetXMm: -200, topOffsetYMm: 200, topWidthRatio: 0.65 }] })
    expect(edited.pieces.filter((p) => p.id !== sector)).toEqual(before.pieces.filter((p) => p.id !== sector))
    expect(polygonFace(polygon(edited.pieces.find((p) => p.id === sector)), false)).toEqual(polygonFace(piece, false))
    expectClosedPlanar(polygon(edited.pieces.find((p) => p.id === sector)))
  })

  it('keeps linked bearings inside the polygon at both radial-spread limits and follows XY only', () => {
    for (const radialSpreadRatio of [0.55, 1.45]) {
      const parameters = { ...base, radialSpreadRatio, upperOffsetXMm: 400, upperOffsetYMm: -400 }
      const linked = generatePiloti(parameters)
      const neutral = generatePiloti({ ...parameters, upperOffsetXMm: 0, upperOffsetYMm: 0 })
      expect(linked.radialLayout?.bearingOverhangMm).toBe(0)
      expect(linked.heightMm).toBe(neutral.heightMm)
      expect(linked.pieces.filter((p) => p.id.startsWith('support-'))).toEqual(neutral.pieces.filter((p) => p.id.startsWith('support-')))
      expect(generatePiloti({ ...parameters, upperFootprintMode: 'detached' }).radialLayout!.bearingOverhangMm).toBeGreaterThan(0)
    }
  })

  it('preserves shared radial seams and reports selected overhang and overlap', () => {
    const parameters: PilotiParameters = { ...base, shoulderMode: 'shared' }
    const shared = generatePiloti(parameters)
    expect(shared.radialLayout?.shoulderOverlapMm2).toBe(0)
    expect(shared.radialLayout?.bearingOverhangMm).toBe(0)
    const changed = generatePiloti({ ...parameters,
      supportSizeOverrides: [{ supportId: support, widthScale: 1.45, depthScale: 1.45 }],
    })
    expect(changed.radialLayout!.bearingOverhangMm).toBeGreaterThan(0)
    expect(changed.radialLayout!.shoulderOverlapMm2).toBeGreaterThan(0)
    expect(changed.pieces.filter((p) => partIdForPiece(p.id) !== support)).toEqual(shared.pieces.filter((p) => partIdForPiece(p.id) !== support))
    expect(generatePiloti({ ...parameters, removedPartIds: [support] }).radialLayout?.totalSupports).toBe(sides - 1)
  })

  it('preserves source-linked copies after removal and retains intent across shape changes', () => {
    const parameters: PilotiParameters = { ...base, polygonMassDivision: 'sectors', partCopies: [
      { id: 'copy-1', sourceId: sector, offsetXMm: 100, offsetYMm: 0, offsetZMm: 0 },
      { id: 'copy-2', sourceId: support, offsetXMm: 0, offsetYMm: 100, offsetZMm: 0 },
    ] }
    const before = generatePiloti(parameters)
    const after = generatePiloti({ ...parameters, removedPartIds: [sector, support] })
    expect(after.pieces.filter((p) => p.id.includes('copy-'))).toEqual(before.pieces.filter((p) => p.id.includes('copy-')))
    expect(partIdForPiece(`shoulder-${code}-1`)).toBe(support)
    expect(partLabel(support)).toContain('leg 1')
    expect(partInGrid(support, parameters)).toBe(true)
    expect(partInGrid(sector, { ...parameters, planShape: 'rectangle' })).toBe(false)
    const dormant = parseProject(serializeProject(createProject({ ...parameters, planShape: 'rectangle' })))
    expect(generatePiloti(dormant.parameters).pieces.some((p) => p.id.includes('copy-'))).toBe(false)
    expect(generatePiloti({ ...dormant.parameters, planShape })).toEqual(before)
    const lifted = generatePiloti({ ...parameters, partCopies: [{ ...parameters.partCopies[1], offsetZMm: 100 }] })
    expect(scenePieceGroundContact(lifted.pieces.find((p) => p.id === 'support-copy-2')!)).toBe(0)
  })

  it('keeps selected lean, size and placement local with connected live copies', () => {
    const parameters: PilotiParameters = { ...base, partCopies: [
      { id: 'copy-1', sourceId: support, offsetXMm: 180, offsetYMm: -220, offsetZMm: 0 },
    ] }
    const before = generatePiloti(parameters)
    const changed = generatePiloti({ ...parameters,
      footOffsetOverrides: [{ supportId: support, footOffsetXMm: 170, footOffsetYMm: -90 }],
      supportSizeOverrides: [{ supportId: support, widthScale: 1.25, depthScale: 0.65 }],
      supportPositionOverrides: [{ supportId: support, positionXMm: 140, positionYMm: -160 }],
    })
    const untouched = (p: ScenePiece) => partIdForPiece(p.id) !== support && !p.id.includes('copy-')
    expect(changed.pieces.filter(untouched)).toEqual(before.pieces.filter(untouched))
    for (const suffix of [`${code}-1`, 'copy-1']) {
      const stem = polygon(changed.pieces.find((p) => p.id === `support-${suffix}`))
      const shoulder = polygon(changed.pieces.find((p) => p.id === `shoulder-${suffix}`))
      expect(polygonFace(stem, true)).toEqual(polygonFace(shoulder, false))
      expect(scenePieceBounds(stem).min[2]).toBe(0)
      expect(stem.bottomOffset).toEqual([170, -90])
      expectClosedPlanar(stem)
      expectClosedPlanar(shoulder)
    }
    const original = polygon(changed.pieces.find((p) => p.id === support))
    const copy = polygon(changed.pieces.find((p) => p.id === 'support-copy-1'))
    polygonLoftVertices(copy).forEach((point, i) => {
      expect(point[0]).toBeCloseTo(polygonLoftVertices(original)[i][0] + 180)
      expect(point[1]).toBeCloseTo(polygonLoftVertices(original)[i][1] - 220)
    })
  })

  it.each(['divided', 'shared'] as const)('fuses the complete %s-shoulder study into one connected solid', async (shoulderMode) => {
    const study = generatePiloti({ ...base, shoulderMode, polygonMassDivision: 'sectors', upperMassProfile: 'tapered' })
    const union = await fuseScenePieces(study.pieces)
    expect(union.componentCount).toBe(1)
    expect(union.volumeMm3 / study.concreteVolumeMm3).toBeCloseTo(1, 6)
  })

  it('supports Fuse and dormant groups across plan changes', async () => {
    const fuseGroups = [{ id: 'fuse-1', pieceIds: [sector, `upper-mass-${code}${sides}-2`] }]
    const parameters: PilotiParameters = { ...base, polygonMassDivision: 'sectors', fuseGroups }
    const resolved = await resolveStudyFuses(generatePiloti(parameters), fuseGroups)
    expect(resolved.dormantFuseGroupIds).toEqual([])
    expect(resolved.study.pieces.some((p) => p.id === 'fuse-1')).toBe(true)
    const dormant = await resolveStudyFuses(generatePiloti({ ...parameters, planShape: 'rectangle' }), fuseGroups)
    expect(dormant.dormantFuseGroupIds).toEqual(['fuse-1'])
  })

  it.each(MODEL_SCALE_PRESETS)('scales polygon geometry, contact and analysis at %s', (scale) => {
    const study = generatePiloti({ ...base, polygonMassDivision: 'sectors', shoulderMode: 'shared',
      supportSizeOverrides: [{ supportId: support, widthScale: 1.45, depthScale: 1.45 }],
    })
    const scaled = scaleMassStudy(study, scale)
    expect(scaled.concreteVolumeMm3).toBeCloseTo(study.concreteVolumeMm3 * scale ** 3)
    expect(scaled.groundContactMm2).toBeCloseTo(study.groundContactMm2 * scale ** 2)
    expect(study.radialLayout!.bearingOverhangMm).toBeGreaterThan(0)
    expect(study.radialLayout!.shoulderOverlapMm2).toBeGreaterThan(0)
    expect(scaled.radialLayout!.bearingOverhangMm).toBeCloseTo(study.radialLayout!.bearingOverhangMm * scale)
    expect(scaled.radialLayout!.shoulderOverlapMm2).toBeCloseTo(study.radialLayout!.shoulderOverlapMm2 * scale ** 2)
    scaled.pieces.forEach((piece, i) => {
      const vertices = polygonLoftVertices(polygon(study.pieces[i]))
      polygonLoftVertices(polygon(piece)).forEach((v, j) => v.forEach((value, axis) => expect(value).toBeCloseTo(vertices[j][axis] * scale)))
    })
  })

  it('keeps irrelevant rectangular controls neutral and highlights radial dependencies', () => {
    const controls = affectedPilotiControls(base, 'upper-mass')
    expect(controls.has('radialSpreadRatio')).toBe(true)
    expect(controls.has('polygonMassDivision')).toBe(true)
    for (const key of ['supportCount', 'supportRowCount', 'rowSpacingMm', 'upperDepthRatio', 'upperTopDepthRatio', 'upperMassDivision'] as const) expect(controls.has(key)).toBe(false)
  })

  it('round-trips geometry through project, recovery and undo/redo', () => {
    const parameters: PilotiParameters = { ...base, polygonMassDivision: 'sectors', removedPartIds: [support], radialSpreadRatio: 1.2 }
    const project = createProject(parameters, 0.25)
    expect(parseProject(serializeProject(project))).toEqual(project)
    const data = new Map<string, string>()
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) } }
    writeRecovery(storage, project)
    expect(readRecovery(storage)).toEqual({ status: 'recovered', project })
    let history = reduceHistory(createHistory(defaults), { type: 'replace', value: parameters })
    history = reduceHistory(history, { type: 'undo' })
    expect(generatePiloti(history.present)).toEqual(generatePiloti(defaults))
    history = reduceHistory(history, { type: 'redo' })
    expect(generatePiloti(history.present)).toEqual(generatePiloti(parameters))
  })

  it('keeps every planar mesh finite at the allowed numeric extremes', () => {
    for (const end of ['minimum', 'maximum'] as const) {
      const numeric = Object.fromEntries(Object.entries(PILOTI_PARAMETER_RULES).map(([key, rule]) => [key, rule[end]]))
      const study = generatePiloti({ ...base, ...numeric, polygonMassDivision: 'sectors', upperMassProfile: 'tapered' })
      study.pieces.forEach((p) => {
        expect(polygonLoftVertices(polygon(p)).flat().every(Number.isFinite)).toBe(true)
        expectClosedPlanar(polygon(p))
      })
    }
  })
})

describe('polygon parameter boundary', () => {
  it.each(Array.from({ length: 14 }, (_, i) => i + 1))('migrates recipe %s to the identical rectangular model', (recipeVersion) => {
    const project = JSON.parse(serializeProject(createProject(defaults))) as { parameters: Record<string, unknown> }
    delete project.parameters.planShape
    delete project.parameters.polygonMassDivision
    delete project.parameters.radialSpreadRatio
    const migrated = parseProject(JSON.stringify({ ...project, recipeVersion }))
    expect(migrated.parameters.planShape).toBe('rectangle')
    expect(generatePiloti(migrated.parameters)).toEqual(generatePiloti(defaults))
  })
  it.each([
    { planShape: 'circle' }, { planShape: undefined }, { polygonMassDivision: 'x2' },
    { radialSpreadRatio: 0 }, { radialSpreadRatio: null }, { radialSpreadRatio: 2 },
    { removedPartIds: ['support-hex-7'] }, { removedPartIds: ['support-oct-9'] },
    { removedPartIds: ['upper-mass-hex6-7'] }, { removedPartIds: ['upper-mass-oct8-09'] },
  ])('rejects invalid polygon state %j', (invalid) => {
    const project = createProject(defaults)
    expect(() => parseProject(JSON.stringify({ ...project, parameters: { ...project.parameters, ...invalid } }))).toThrow()
  })
  it('clips convex footprints and measures sloped polygon edges, not bounding boxes', () => {
    const boundary = [[0, 0], [10, 0], [5, 10]] as const
    expect(polygonIntersectionArea(boundary, boundary)).toBe(50)
    expect(polygonIntersectionArea([[20, 0], [30, 0], [25, 10]], boundary)).toBe(0)
    expect(polygonOverhang([[0, 9]], boundary)).toBeGreaterThan(0)
    expect(polygonOverhang([[5, 5]], boundary)).toBe(0)
  })
})
