import { boundsSize, sceneBounds } from './bounds'
import type {
  MassStudy,
  ModelScale,
  ScenePiece,
  Size2,
  Vec3,
} from './types'

export const MODEL_SCALE_PRESETS = [1, 0.5, 0.25] as const satisfies readonly ModelScale[]

export function isModelScale(value: unknown): value is ModelScale {
  return MODEL_SCALE_PRESETS.some((preset) => preset === value)
}

function scaleVec3(value: Vec3, scale: ModelScale): Vec3 {
  return [value[0] * scale, value[1] * scale, value[2] * scale]
}

function scaleSize2(value: Size2, scale: ModelScale): Size2 {
  return [value[0] * scale, value[1] * scale]
}

function scalePiece(piece: ScenePiece, scale: ModelScale): ScenePiece {
  if (piece.kind === 'box') {
    return {
      ...piece,
      position: scaleVec3(piece.position, scale),
      size: scaleVec3(piece.size, scale),
    }
  }
  return {
    ...piece,
    position: scaleVec3(piece.position, scale),
    height: piece.height * scale,
    bottomSize: scaleSize2(piece.bottomSize, scale),
    topSize: scaleSize2(piece.topSize, scale),
    bottomOffset: scaleSize2(piece.bottomOffset, scale),
    topOffset: scaleSize2(piece.topOffset, scale),
  }
}

export function scaleMassStudy(
  masterStudy: MassStudy,
  modelScale: ModelScale,
): MassStudy {
  if (!isModelScale(modelScale)) {
    throw new RangeError('Model scale must be 1, 0.5 or 0.25.')
  }
  if (modelScale === 1) return masterStudy

  const pieces = masterStudy.pieces.map((piece) =>
    scalePiece(piece, modelScale),
  )
  const bounds = sceneBounds(pieces)
  const [widthMm, depthMm, heightMm] = boundsSize(bounds)
  const areaScale = modelScale ** 2
  const volumeScale = modelScale ** 3

  return {
    ...masterStudy,
    pieces,
    bounds,
    widthMm,
    depthMm,
    heightMm,
    concreteVolumeMm3: masterStudy.concreteVolumeMm3 * volumeScale,
    estimatedMassKg: masterStudy.estimatedMassKg * volumeScale,
    groundContactMm2: masterStudy.groundContactMm2 * areaScale,
  }
}
