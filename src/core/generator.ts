import { mulberry32, randomBetween } from './random'
import { boundsSize, sceneBounds } from './bounds'
import { normalizePilotiParameters } from './pilotiParameters'
import type {
  BoxPiece,
  FrustumPiece,
  MassStudy,
  PilotiParameters,
  RecipeSummary,
  ScenePiece,
} from './types'

const CONCRETE_DENSITY_KG_M3 = 2_400
export { MAX_SEED } from './pilotiParameters'

export const RECIPES: readonly RecipeSummary[] = [
  {
    id: 'monolith',
    name: 'Monolith',
    description: 'One dominant mass cut by planes and deep voids.',
    available: false,
  },
  {
    id: 'piloti',
    name: 'Piloti',
    description: 'A heavy upper mass carried by faceted funnel supports.',
    available: true,
  },
  {
    id: 'silos',
    name: 'Silos',
    description: 'Clusters of monumental faceted storage towers.',
    available: false,
  },
  {
    id: 'ziggurat',
    name: 'Ziggurat',
    description: 'Stepped masses that shift, taper and turn.',
    available: false,
  },
  {
    id: 'lamella-tower',
    name: 'Lamella tower',
    description: 'Slender vertical plates with deep articulation.',
    available: false,
  },
  {
    id: 'gate',
    name: 'Gate',
    description: 'Two uprights composed around one dominant void.',
    available: false,
  },
]

export const DEFAULT_PILOTI_PARAMETERS: PilotiParameters = {
  seed: 318,
  heightMm: 1_500,
  supportCount: 3,
  supportHeightRatio: 0.42,
  shoulderRatio: 0.48,
  neckWidthRatio: 0.34,
  upperWidthRatio: 0.72,
  upperDepthRatio: 0.34,
  asymmetry: 0.12,
  footOffsetXMm: 0,
  footOffsetYMm: 0,
  footOffsetOverrides: [],
}

function boxVolume(piece: BoxPiece): number {
  return piece.size[0] * piece.size[1] * piece.size[2]
}

/** Volume of a rectangular loft whose width and depth vary linearly. */
function frustumVolume(piece: FrustumPiece): number {
  const [bottomWidth, bottomDepth] = piece.bottomSize
  const [topWidth, topDepth] = piece.topSize
  const widthDelta = topWidth - bottomWidth
  const depthDelta = topDepth - bottomDepth

  return (
    piece.height *
    (bottomWidth * bottomDepth +
      (bottomWidth * depthDelta + bottomDepth * widthDelta) / 2 +
      (widthDelta * depthDelta) / 3)
  )
}

export function generatePiloti(input: PilotiParameters): MassStudy {
  const parameters = normalizePilotiParameters(input)
  const random = mulberry32(parameters.seed)
  const height = parameters.heightMm
  const supportHeight = height * parameters.supportHeightRatio
  const shoulderHeight = supportHeight * parameters.shoulderRatio
  const stemHeight = supportHeight - shoulderHeight
  const upperHeight = height - supportHeight
  const upperWidth = height * parameters.upperWidthRatio
  const upperDepth = height * parameters.upperDepthRatio
  const bayWidth = upperWidth / parameters.supportCount
  const pieces: ScenePiece[] = []
  const footOffsetOverrides = new Map(
    parameters.footOffsetOverrides.map((override) => [
      override.supportId,
      override,
    ]),
  )
  const supportShift =
    randomBetween(random, -1, 1) * parameters.asymmetry * bayWidth * 0.45
  const massShift =
    randomBetween(random, -1, 1) * parameters.asymmetry * bayWidth * 0.65

  for (let index = 0; index < parameters.supportCount; index += 1) {
    const supportId = `support-${index + 1}`
    const footOffsetOverride = footOffsetOverrides.get(supportId)
    const bayCentre =
      -upperWidth / 2 + bayWidth * (index + 0.5) + supportShift
    const individualShift =
      randomBetween(random, -1, 1) * parameters.asymmetry * bayWidth * 0.16
    const neckWidth = bayWidth * parameters.neckWidthRatio
    const neckDepth = upperDepth * (0.34 + parameters.neckWidthRatio * 0.32)
    const footWidth = neckWidth * 1.18
    const footDepth = neckDepth * 1.16

    pieces.push({
      kind: 'frustum',
      id: supportId,
      label: `Support ${index + 1}`,
      role: 'support',
      position: [bayCentre + individualShift, 0, stemHeight / 2],
      height: stemHeight,
      bottomSize: [footWidth, footDepth],
      topSize: [neckWidth, neckDepth],
      bottomOffset: [
        footOffsetOverride?.footOffsetXMm ?? parameters.footOffsetXMm,
        footOffsetOverride?.footOffsetYMm ?? parameters.footOffsetYMm,
      ],
      topOffset: [-individualShift * 0.2, 0],
    })

    pieces.push({
      kind: 'frustum',
      id: `shoulder-${index + 1}`,
      label: `Shoulder ${index + 1}`,
      role: 'support',
      position: [
        bayCentre + individualShift * 0.8,
        0,
        stemHeight + shoulderHeight / 2,
      ],
      height: shoulderHeight,
      bottomSize: [neckWidth, neckDepth],
      topSize: [bayWidth * 0.92, upperDepth * 0.92],
      bottomOffset: [0, 0],
      topOffset: [-individualShift * 0.45, 0],
    })
  }

  pieces.push({
    kind: 'box',
    id: 'upper-mass',
    label: 'Upper mass',
    role: 'mass',
    position: [massShift, 0, supportHeight + upperHeight / 2],
    size: [upperWidth, upperDepth, upperHeight],
  })

  const concreteVolumeMm3 = pieces.reduce(
    (sum, piece) =>
      sum + (piece.kind === 'box' ? boxVolume(piece) : frustumVolume(piece)),
    0,
  )
  const groundContactMm2 = pieces
    .filter((piece): piece is FrustumPiece => piece.kind === 'frustum')
    .filter((piece) => piece.id.startsWith('support-'))
    .reduce(
      (sum, piece) => sum + piece.bottomSize[0] * piece.bottomSize[1],
      0,
    )
  const bounds = sceneBounds(pieces)
  const [widthMm, depthMm, heightMm] = boundsSize(bounds)

  return {
    recipe: 'piloti',
    seed: parameters.seed,
    pieces,
    bounds,
    widthMm,
    depthMm,
    heightMm,
    concreteVolumeMm3,
    estimatedMassKg:
      (concreteVolumeMm3 / 1_000_000_000) * CONCRETE_DENSITY_KG_M3,
    groundContactMm2,
  }
}
