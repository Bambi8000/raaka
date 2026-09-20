import type { FrustumPiece, ScenePiece } from './types'

export const CONCRETE_DENSITY_KG_M3 = 2_400

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

export function scenePieceVolume(piece: ScenePiece): number {
  if (piece.kind === 'box') {
    return piece.size[0] * piece.size[1] * piece.size[2]
  }
  return piece.kind === 'frustum' ? frustumVolume(piece) : piece.volumeMm3
}

export function scenePieceGroundContact(piece: ScenePiece): number {
  if (piece.kind === 'mesh') return piece.groundContactMm2
  if (piece.kind === 'box') return 0
  return piece.id.startsWith('support-') &&
    Math.abs(piece.position[2] - piece.height / 2) < 1e-9
    ? piece.bottomSize[0] * piece.bottomSize[1]
    : 0
}
