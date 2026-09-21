import { scenePieceVolume } from './pieceMetrics'
import type {
  BoxPiece,
  FrustumPiece,
  PilotiParameters,
  PolygonLoftPiece,
  ScenePiece,
  Size2,
  Vec2,
} from './types'

export const RETAINED_CORE_ID = 'upper-retained-core'

type AnalyticUpperMass = BoxPiece | FrustumPiece | PolygonLoftPiece

export interface RetainedCoreAnalysis {
  readonly status: 'off' | 'active' | 'paused'
  readonly pieces: readonly ScenePiece[]
  readonly volumeMm3: number
  readonly massKg: number
  readonly densityKgM3: number
  readonly minimumCoverMm: number
  readonly message: string
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpSize(a: Size2, b: Size2, t: number): Size2 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}

function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}

function polygonInradius(footprint: readonly Vec2[]): number {
  let inradius = Infinity
  for (let index = 0; index < footprint.length; index += 1) {
    const a = footprint[index]
    const b = footprint[(index + 1) % footprint.length]
    const edgeX = b[0] - a[0]
    const edgeY = b[1] - a[1]
    const edgeLength = Math.hypot(edgeX, edgeY)
    const distance = Math.abs(a[0] * b[1] - a[1] * b[0]) / edgeLength
    inradius = Math.min(inradius, distance)
  }
  return inradius
}

/** Build a centred homothetic core that remains strictly inside its convex mass. */
export function retainedCorePiece(
  source: AnalyticUpperMass,
  scale: number,
): { readonly piece: ScenePiece; readonly minimumCoverMm: number } {
  const capFraction = (1 - scale) / 2
  const verticalCover = source.kind === 'box'
    ? source.size[2] * capFraction
    : source.height * capFraction

  if (source.kind === 'box') {
    const piece: BoxPiece = {
      ...source,
      id: RETAINED_CORE_ID,
      label: 'Retained upper core',
      role: 'core',
      size: [source.size[0] * scale, source.size[1] * scale, source.size[2] * scale],
    }
    return {
      piece,
      minimumCoverMm: Math.min(...source.size) * capFraction,
    }
  }

  const bottomFraction = capFraction
  const topFraction = 1 - capFraction
  if (source.kind === 'frustum') {
    const outerBottomSize = lerpSize(source.bottomSize, source.topSize, bottomFraction)
    const outerTopSize = lerpSize(source.bottomSize, source.topSize, topFraction)
    const piece: FrustumPiece = {
      ...source,
      id: RETAINED_CORE_ID,
      label: 'Retained upper core',
      role: 'core',
      height: source.height * scale,
      bottomSize: [outerBottomSize[0] * scale, outerBottomSize[1] * scale],
      topSize: [outerTopSize[0] * scale, outerTopSize[1] * scale],
      bottomOffset: lerpPoint(source.bottomOffset, source.topOffset, bottomFraction),
      topOffset: lerpPoint(source.bottomOffset, source.topOffset, topFraction),
    }
    return {
      piece,
      minimumCoverMm: Math.min(
        verticalCover,
        outerBottomSize[0] * capFraction,
        outerBottomSize[1] * capFraction,
        outerTopSize[0] * capFraction,
        outerTopSize[1] * capFraction,
      ),
    }
  }

  const outerBottomScale = lerp(source.bottomScale, source.topScale, bottomFraction)
  const outerTopScale = lerp(source.bottomScale, source.topScale, topFraction)
  const piece: PolygonLoftPiece = {
    ...source,
    id: RETAINED_CORE_ID,
    label: 'Retained upper core',
    role: 'core',
    height: source.height * scale,
    bottomScale: outerBottomScale * scale,
    topScale: outerTopScale * scale,
    bottomOffset: lerpPoint(source.bottomOffset, source.topOffset, bottomFraction),
    topOffset: lerpPoint(source.bottomOffset, source.topOffset, topFraction),
  }
  const radialCover = polygonInradius(source.footprint) *
    Math.min(outerBottomScale, outerTopScale) * (1 - scale)
  return {
    piece,
    minimumCoverMm: Math.min(verticalCover, radialCover),
  }
}

export function retainedCoreAnalysis(
  parameters: PilotiParameters,
  upperMass: ScenePiece,
): RetainedCoreAnalysis {
  const inactive = (status: 'off' | 'paused', message: string): RetainedCoreAnalysis => ({
    status,
    pieces: [],
    volumeMm3: 0,
    massKg: 0,
    densityKgM3: parameters.retainedCoreDensityKgM3,
    minimumCoverMm: 0,
    message,
  })
  if (parameters.retainedCoreMode === 'none') {
    return inactive('off', 'Retained core is disabled.')
  }
  const division = parameters.planShape === 'rectangle'
    ? parameters.upperMassDivision
    : parameters.polygonMassDivision
  if (division !== 'whole') {
    return inactive(
      'paused',
      'Retained core paused: choose Whole upper mass. The saved core settings are retained.',
    )
  }
  if (parameters.removedPartIds.includes('upper-mass')) {
    return inactive(
      'paused',
      'Retained core paused: restore Upper mass. The saved core settings are retained.',
    )
  }
  if (upperMass.kind === 'mesh') {
    return inactive(
      'paused',
      'Retained core paused: the upper mass has no supported analytic core shape.',
    )
  }

  const core = retainedCorePiece(upperMass, parameters.retainedCoreScale)
  const volumeMm3 = scenePieceVolume(core.piece)
  return {
    status: 'active',
    pieces: [core.piece],
    volumeMm3,
    massKg: volumeMm3 / 1_000_000_000 * parameters.retainedCoreDensityKgM3,
    densityKgM3: parameters.retainedCoreDensityKgM3,
    minimumCoverMm: core.minimumCoverMm,
    message: 'Closed lightweight foam remains inside the cast and displaces concrete.',
  }
}
