import { scenePieceGroundContact, scenePieceVolume } from './pieceMetrics'
import { polygonArea, polygonFace } from './polygonLoft'
import type { FrustumPiece, ScenePiece, StabilityAnalysis, Vec2, Vec3 } from './types'

const GEOMETRY_EPSILON = 1e-6

export interface PieceMassProperties {
  readonly volumeMm3: number
  readonly centroidMm: Vec3
}

interface RetainedMaterial {
  readonly status: 'off' | 'active' | 'paused'
  readonly pieces: readonly ScenePiece[]
  readonly densityKgM3: number
}

function cross2(a: Vec2, b: Vec2, p: Vec2): number {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
}

function polygonCentroid(points: readonly Vec2[]): Vec2 {
  let twiceArea = 0
  let xMoment = 0
  let yMoment = 0
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index]
    const b = points[(index + 1) % points.length]
    const cross = a[0] * b[1] - b[0] * a[1]
    twiceArea += cross
    xMoment += (a[0] + b[0]) * cross
    yMoment += (a[1] + b[1]) * cross
  }
  if (Math.abs(twiceArea) <= GEOMETRY_EPSILON) {
    return points.reduce<Vec2>(
      (sum, point) => [sum[0] + point[0] / points.length, sum[1] + point[1] / points.length],
      [0, 0],
    )
  }
  return [xMoment / (3 * twiceArea), yMoment / (3 * twiceArea)]
}

function areaIntegrals(a0: number, a1: number, a2: number): readonly [number, number] {
  return [a0 + a1 / 2 + a2 / 3, a0 / 2 + a1 / 3 + a2 / 4]
}

function frustumMassProperties(piece: FrustumPiece): PieceMassProperties {
  const [bottomWidth, bottomDepth] = piece.bottomSize
  const widthDelta = piece.topSize[0] - bottomWidth
  const depthDelta = piece.topSize[1] - bottomDepth
  const [areaIntegral, firstAreaIntegral] = areaIntegrals(
    bottomWidth * bottomDepth,
    bottomWidth * depthDelta + bottomDepth * widthDelta,
    widthDelta * depthDelta,
  )
  const weightedHeight = firstAreaIntegral / areaIntegral
  const bottomX = piece.position[0] + piece.bottomOffset[0]
  const bottomY = piece.position[1] + piece.bottomOffset[1]
  const bottomZ = piece.position[2] - piece.height / 2
  return {
    volumeMm3: piece.height * areaIntegral,
    centroidMm: [
      bottomX + (piece.topOffset[0] - piece.bottomOffset[0]) * weightedHeight,
      bottomY + (piece.topOffset[1] - piece.bottomOffset[1]) * weightedHeight,
      bottomZ + piece.height * weightedHeight,
    ],
  }
}

function meshCentroid(piece: Extract<ScenePiece, { readonly kind: 'mesh' }>): Vec3 {
  const { positions, triangles } = piece
  if (triangles.length === 0 || positions.length < 3) return piece.position
  const reference: Vec3 = [
    positions[0] + piece.position[0],
    positions[1] + piece.position[1],
    positions[2] + piece.position[2],
  ]
  let signedVolume = 0
  const moment = [0, 0, 0]
  for (let index = 0; index < triangles.length; index += 3) {
    const vertices = [triangles[index], triangles[index + 1], triangles[index + 2]].map(
      (vertex): Vec3 => [
        positions[vertex * 3] + piece.position[0],
        positions[vertex * 3 + 1] + piece.position[1],
        positions[vertex * 3 + 2] + piece.position[2],
      ],
    )
    const a = vertices[0].map((value, axis) => value - reference[axis])
    const b = vertices[1].map((value, axis) => value - reference[axis])
    const c = vertices[2].map((value, axis) => value - reference[axis])
    const tetraVolume = (
      a[0] * (b[1] * c[2] - b[2] * c[1]) -
      a[1] * (b[0] * c[2] - b[2] * c[0]) +
      a[2] * (b[0] * c[1] - b[1] * c[0])
    ) / 6
    signedVolume += tetraVolume
    for (let axis = 0; axis < 3; axis += 1) {
      moment[axis] += tetraVolume * (
        reference[axis] + vertices[0][axis] + vertices[1][axis] + vertices[2][axis]
      ) / 4
    }
  }
  if (Math.abs(signedVolume) <= GEOMETRY_EPSILON) return piece.position
  return [moment[0] / signedVolume, moment[1] / signedVolume, moment[2] / signedVolume]
}

/** Exact volume centroid for every current semantic or finished-solid piece. */
export function scenePieceMassProperties(piece: ScenePiece): PieceMassProperties {
  if (piece.kind === 'box') {
    return { volumeMm3: scenePieceVolume(piece), centroidMm: piece.position }
  }
  if (piece.kind === 'frustum') return frustumMassProperties(piece)
  if (piece.kind === 'mesh') {
    return { volumeMm3: piece.volumeMm3, centroidMm: meshCentroid(piece) }
  }

  const footprintCentroid = polygonCentroid(piece.footprint)
  const scaleDelta = piece.topScale - piece.bottomScale
  const [areaIntegral, firstAreaIntegral] = areaIntegrals(
    piece.bottomScale ** 2,
    2 * piece.bottomScale * scaleDelta,
    scaleDelta ** 2,
  )
  const weightedHeight = firstAreaIntegral / areaIntegral
  const bottomZ = piece.position[2] - piece.height / 2
  return {
    volumeMm3: polygonArea(piece.footprint) * piece.height * areaIntegral,
    centroidMm: [
      piece.position[0] + piece.bottomOffset[0] + footprintCentroid[0] * piece.bottomScale +
        ((piece.topOffset[0] - piece.bottomOffset[0]) + footprintCentroid[0] * scaleDelta) * weightedHeight,
      piece.position[1] + piece.bottomOffset[1] + footprintCentroid[1] * piece.bottomScale +
        ((piece.topOffset[1] - piece.bottomOffset[1]) + footprintCentroid[1] * scaleDelta) * weightedHeight,
      bottomZ + piece.height * weightedHeight,
    ],
  }
}

function groundedPoints(piece: ScenePiece): readonly Vec2[] {
  if (scenePieceGroundContact(piece) <= 0) return []
  if (piece.kind === 'frustum') {
    const x = piece.position[0] + piece.bottomOffset[0]
    const y = piece.position[1] + piece.bottomOffset[1]
    const halfWidth = piece.bottomSize[0] / 2
    const halfDepth = piece.bottomSize[1] / 2
    return [
      [x - halfWidth, y - halfDepth],
      [x + halfWidth, y - halfDepth],
      [x + halfWidth, y + halfDepth],
      [x - halfWidth, y + halfDepth],
    ]
  }
  if (piece.kind === 'polygon-loft') return polygonFace(piece, false)
  if (piece.kind === 'mesh') {
    const points: Vec2[] = []
    for (let index = 0; index < piece.positions.length; index += 3) {
      if (Math.abs(piece.positions[index + 2] + piece.position[2]) <= GEOMETRY_EPSILON) {
        points.push([
          piece.positions[index] + piece.position[0],
          piece.positions[index + 1] + piece.position[1],
        ])
      }
    }
    return points
  }
  return []
}

/** Monotonic-chain convex hull without a repeated closing point. */
export function convexHull(points: readonly Vec2[]): readonly Vec2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const unique = sorted.filter((point, index) => index === 0 ||
    Math.abs(point[0] - sorted[index - 1][0]) > GEOMETRY_EPSILON ||
    Math.abs(point[1] - sorted[index - 1][1]) > GEOMETRY_EPSILON)
  if (unique.length <= 2) return unique
  const half = (input: readonly Vec2[]) => {
    const output: Vec2[] = []
    for (const point of input) {
      while (output.length >= 2 && cross2(output.at(-2)!, output.at(-1)!, point) <= GEOMETRY_EPSILON) {
        output.pop()
      }
      output.push(point)
    }
    return output
  }
  const lower = half(unique)
  const upper = half([...unique].reverse())
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

export function signedSupportMargin(point: Vec2, polygon: readonly Vec2[]): number {
  return Math.min(...polygon.map((a, index) => {
    const b = polygon[(index + 1) % polygon.length]
    return cross2(a, b, point) / Math.hypot(b[0] - a[0], b[1] - a[1])
  }))
}

/** Static mass projection against the convex hull of actual grounded support faces. */
export function analyseStability(
  pieces: readonly ScenePiece[],
  concreteDensityKgM3: number,
  retainedMaterial: RetainedMaterial,
): StabilityAnalysis {
  let totalMassKg = 0
  const massMoment = [0, 0, 0]
  const addMaterial = (piece: ScenePiece, densityKgM3: number) => {
    const properties = scenePieceMassProperties(piece)
    const massKg = properties.volumeMm3 / 1_000_000_000 * densityKgM3
    totalMassKg += massKg
    for (let axis = 0; axis < 3; axis += 1) {
      massMoment[axis] += properties.centroidMm[axis] * massKg
    }
  }
  for (const piece of pieces) addMaterial(piece, concreteDensityKgM3)
  if (retainedMaterial.status === 'active') {
    for (const piece of retainedMaterial.pieces) {
      addMaterial(piece, retainedMaterial.densityKgM3 - concreteDensityKgM3)
    }
  }

  const supportPolygonMm = convexHull(pieces.flatMap(groundedPoints))
  if (totalMassKg <= GEOMETRY_EPSILON) {
    return {
      status: 'unavailable',
      centreOfMassMm: null,
      projectionMm: null,
      supportPolygonMm,
      signedMarginMm: null,
      message: 'No manufactured material is available for a mass-centre reading.',
    }
  }
  const centreOfMassMm: Vec3 = [
    massMoment[0] / totalMassKg,
    massMoment[1] / totalMassKg,
    massMoment[2] / totalMassKg,
  ]
  const projectionMm: Vec2 = [centreOfMassMm[0], centreOfMassMm[1]]
  if (supportPolygonMm.length < 3 || polygonArea(supportPolygonMm) <= GEOMETRY_EPSILON) {
    return {
      status: 'unavailable',
      centreOfMassMm,
      projectionMm,
      supportPolygonMm,
      signedMarginMm: null,
      message: 'No closed grounded support footprint is available.',
    }
  }
  const signedMarginMm = signedSupportMargin(projectionMm, supportPolygonMm)
  if (signedMarginMm < -GEOMETRY_EPSILON) {
    return {
      status: 'outside', centreOfMassMm, projectionMm, supportPolygonMm, signedMarginMm,
      message: 'The mass projection falls outside the convex support boundary.',
    }
  }
  if (signedMarginMm <= GEOMETRY_EPSILON) {
    return {
      status: 'edge', centreOfMassMm, projectionMm, supportPolygonMm, signedMarginMm: 0,
      message: 'The mass projection lies on the convex support boundary.',
    }
  }
  return {
    status: 'inside', centreOfMassMm, projectionMm, supportPolygonMm, signedMarginMm,
    message: 'The mass projection falls inside the convex support boundary.',
  }
}
