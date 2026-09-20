import type { Bounds3, ScenePiece, Vec3 } from './types'

export function scenePieceBounds(piece: ScenePiece): Bounds3 {
  if (piece.kind === 'box') {
    return {
      min: [
        piece.position[0] - piece.size[0] / 2,
        piece.position[1] - piece.size[1] / 2,
        piece.position[2] - piece.size[2] / 2,
      ],
      max: [
        piece.position[0] + piece.size[0] / 2,
        piece.position[1] + piece.size[1] / 2,
        piece.position[2] + piece.size[2] / 2,
      ],
    }
  }

  const bottomCentreX = piece.position[0] + piece.bottomOffset[0]
  const bottomCentreY = piece.position[1] + piece.bottomOffset[1]
  const topCentreX = piece.position[0] + piece.topOffset[0]
  const topCentreY = piece.position[1] + piece.topOffset[1]

  return {
    min: [
      Math.min(
        bottomCentreX - piece.bottomSize[0] / 2,
        topCentreX - piece.topSize[0] / 2,
      ),
      Math.min(
        bottomCentreY - piece.bottomSize[1] / 2,
        topCentreY - piece.topSize[1] / 2,
      ),
      piece.position[2] - piece.height / 2,
    ],
    max: [
      Math.max(
        bottomCentreX + piece.bottomSize[0] / 2,
        topCentreX + piece.topSize[0] / 2,
      ),
      Math.max(
        bottomCentreY + piece.bottomSize[1] / 2,
        topCentreY + piece.topSize[1] / 2,
      ),
      piece.position[2] + piece.height / 2,
    ],
  }
}

export function sceneBounds(pieces: readonly ScenePiece[]): Bounds3 {
  if (pieces.length === 0) {
    throw new RangeError('A mass study must contain at least one piece.')
  }

  const first = scenePieceBounds(pieces[0])
  const minimum = [...first.min] as [number, number, number]
  const maximum = [...first.max] as [number, number, number]

  for (const piece of pieces.slice(1)) {
    const bounds = scenePieceBounds(piece)
    for (let axis = 0; axis < 3; axis += 1) {
      minimum[axis] = Math.min(minimum[axis], bounds.min[axis])
      maximum[axis] = Math.max(maximum[axis], bounds.max[axis])
    }
  }

  return { min: minimum, max: maximum }
}

export function boundsSize(bounds: Bounds3): Vec3 {
  return [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ]
}
