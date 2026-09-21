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
  if (piece.kind === 'polygon-loft') {
    return { ...piece, position: scaleVec3(piece.position, scale), height: piece.height * scale,
      footprint: piece.footprint.map((point) => scaleSize2(point, scale)),
      bottomOffset: scaleSize2(piece.bottomOffset, scale), topOffset: scaleSize2(piece.topOffset, scale) }
  }
  if (piece.kind === 'box') {
    return {
      ...piece,
      position: scaleVec3(piece.position, scale),
      size: scaleVec3(piece.size, scale),
    }
  }
  if (piece.kind === 'mesh') {
    return {
      ...piece,
      position: scaleVec3(piece.position, scale),
      positions: piece.positions.map((value) => value * scale),
      volumeMm3: piece.volumeMm3 * scale ** 3,
      groundContactMm2: piece.groundContactMm2 * scale ** 2,
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
    concreteMassKg: masterStudy.concreteMassKg * volumeScale,
    retainedCore: {
      ...masterStudy.retainedCore,
      pieces: masterStudy.retainedCore.pieces.map((piece) =>
        scalePiece(piece, modelScale),
      ),
      volumeMm3: masterStudy.retainedCore.volumeMm3 * volumeScale,
      massKg: masterStudy.retainedCore.massKg * volumeScale,
      minimumCoverMm: masterStudy.retainedCore.minimumCoverMm * modelScale,
    },
    estimatedMassKg: masterStudy.estimatedMassKg * volumeScale,
    groundContactMm2: masterStudy.groundContactMm2 * areaScale,
    stability: {
      ...masterStudy.stability,
      centreOfMassMm: masterStudy.stability.centreOfMassMm
        ? scaleVec3(masterStudy.stability.centreOfMassMm, modelScale)
        : null,
      projectionMm: masterStudy.stability.projectionMm
        ? scaleSize2(masterStudy.stability.projectionMm, modelScale)
        : null,
      supportPolygonMm: masterStudy.stability.supportPolygonMm.map((point) =>
        scaleSize2(point, modelScale),
      ),
      signedMarginMm: masterStudy.stability.signedMarginMm === null
        ? null
        : masterStudy.stability.signedMarginMm * modelScale,
    },
    radialLayout: masterStudy.radialLayout ? {
      ...masterStudy.radialLayout,
      bearingOverhangMm: masterStudy.radialLayout.bearingOverhangMm * modelScale,
      shoulderOverlapMm2: masterStudy.radialLayout.shoulderOverlapMm2 * areaScale,
    } : undefined,
    supportLayout: masterStudy.supportLayout
      ? {
          ...masterStudy.supportLayout,
          rowSpacingMm: masterStudy.supportLayout.rowSpacingMm * modelScale,
          shoulderDepthMm:
            masterStudy.supportLayout.shoulderDepthMm * modelScale,
          adjacentRowOverlapMm:
            masterStudy.supportLayout.adjacentRowOverlapMm * modelScale,
          adjacentColumnOverlapMm:
            masterStudy.supportLayout.adjacentColumnOverlapMm * modelScale,
          adjacentColumnGapMm:
            masterStudy.supportLayout.adjacentColumnGapMm * modelScale,
          nonAdjacentBearingOverlapMm:
            masterStudy.supportLayout.nonAdjacentBearingOverlapMm * modelScale,
          bearingOverhangMm:
            masterStudy.supportLayout.bearingOverhangMm * modelScale,
          sideBearingOverhangMm:
            masterStudy.supportLayout.sideBearingOverhangMm * modelScale,
        }
      : undefined,
  }
}
