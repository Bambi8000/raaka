import * as THREE from 'three'
import type { FrustumPiece } from '../core/types'

/** Build a flat-shaded rectangular loft with Z as the vertical axis. */
export function createFrustumGeometry(
  piece: Pick<
    FrustumPiece,
    | 'height'
    | 'bottomSize'
    | 'topSize'
    | 'bottomOffset'
    | 'topOffset'
  >,
): THREE.BufferGeometry {
  const [bottomWidth, bottomDepth] = piece.bottomSize
  const [topWidth, topDepth] = piece.topSize
  const [bottomX, bottomY] = piece.bottomOffset
  const [topX, topY] = piece.topOffset
  const bottomZ = -piece.height / 2
  const topZ = piece.height / 2
  const vertices = [
    bottomX - bottomWidth / 2,
    bottomY - bottomDepth / 2,
    bottomZ,
    bottomX + bottomWidth / 2,
    bottomY - bottomDepth / 2,
    bottomZ,
    bottomX + bottomWidth / 2,
    bottomY + bottomDepth / 2,
    bottomZ,
    bottomX - bottomWidth / 2,
    bottomY + bottomDepth / 2,
    bottomZ,
    topX - topWidth / 2,
    topY - topDepth / 2,
    topZ,
    topX + topWidth / 2,
    topY - topDepth / 2,
    topZ,
    topX + topWidth / 2,
    topY + topDepth / 2,
    topZ,
    topX - topWidth / 2,
    topY + topDepth / 2,
    topZ,
  ]
  const indices = [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1,
    6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  ]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
}
