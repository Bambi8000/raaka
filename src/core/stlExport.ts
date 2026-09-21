import { finishScenePieces, type SolidKernelMesh } from './solidKernel'
import type { Bounds3, ScenePiece } from './types'

const HEADER_BYTES = 80
const FILE_HEADER_BYTES = 84
const TRIANGLE_BYTES = 50

export interface ManufacturingStl {
  readonly bytes: Uint8Array
  readonly bounds: Bounds3
  readonly volumeMm3: number
  readonly triangleCount: number
}

export class StlExportError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'StlExportError'
  }
}

function triangleNormal(
  positions: Float32Array,
  a: number,
  b: number,
  c: number,
): readonly [number, number, number] {
  const abX = positions[b] - positions[a]
  const abY = positions[b + 1] - positions[a + 1]
  const abZ = positions[b + 2] - positions[a + 2]
  const acX = positions[c] - positions[a]
  const acY = positions[c + 1] - positions[a + 1]
  const acZ = positions[c + 2] - positions[a + 2]
  const x = abY * acZ - abZ * acY
  const y = abZ * acX - abX * acZ
  const z = abX * acY - abY * acX
  const length = Math.hypot(x, y, z)
  if (!Number.isFinite(length) || length === 0) {
    throw new StlExportError(
      'STL export stopped: the finished solid contains a degenerate triangle.',
    )
  }
  return [x / length, y / length, z / length]
}

function writeFloat32(
  view: DataView,
  offset: number,
  values: readonly number[],
): number {
  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new StlExportError(
        'STL export stopped: the finished solid contains a non-finite coordinate.',
      )
    }
    view.setFloat32(offset, value, true)
    offset += 4
  }
  return offset
}

/** Encode an indexed, outward-wound millimetre mesh as binary STL. */
export function encodeBinaryStl(
  mesh: Pick<SolidKernelMesh, 'positions' | 'triangles'>,
  label: string,
): Uint8Array {
  if (mesh.triangles.length === 0 || mesh.triangles.length % 3 !== 0) {
    throw new StlExportError(
      'STL export stopped: the finished solid has no complete triangles.',
    )
  }
  const triangleCount = mesh.triangles.length / 3
  const byteLength = FILE_HEADER_BYTES + triangleCount * TRIANGLE_BYTES
  if (!Number.isSafeInteger(byteLength)) {
    throw new StlExportError(
      'STL export stopped: the finished solid is too large for binary STL.',
    )
  }

  const bytes = new Uint8Array(byteLength)
  const header = new TextEncoder().encode(`RAAKA | UNITS=MM | Z=UP | ${label}`)
  bytes.set(header.subarray(0, HEADER_BYTES))
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  view.setUint32(HEADER_BYTES, triangleCount, true)

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const indexOffset = triangle * 3
    const vertexIndices = [
      mesh.triangles[indexOffset],
      mesh.triangles[indexOffset + 1],
      mesh.triangles[indexOffset + 2],
    ]
    if (vertexIndices.some((index) => index * 3 + 2 >= mesh.positions.length)) {
      throw new StlExportError(
        'STL export stopped: the finished solid contains an invalid triangle index.',
      )
    }
    const vertices = vertexIndices.map((index) => index * 3)
    let offset = FILE_HEADER_BYTES + triangle * TRIANGLE_BYTES
    offset = writeFloat32(
      view,
      offset,
      triangleNormal(mesh.positions, vertices[0], vertices[1], vertices[2]),
    )
    for (const vertex of vertices) {
      offset = writeFloat32(view, offset, [
        mesh.positions[vertex],
        mesh.positions[vertex + 1],
        mesh.positions[vertex + 2],
      ])
    }
    view.setUint16(offset, 0, true)
  }
  return bytes
}

export async function createManufacturingStl(
  pieces: readonly ScenePiece[],
  label: string,
): Promise<ManufacturingStl> {
  if (pieces.length === 0) {
    throw new StlExportError(
      'STL export needs at least one visible part. Restore a part and try again.',
    )
  }
  const solid = await finishScenePieces(pieces)
  if (solid.componentCount !== 1) {
    throw new StlExportError(
      `STL export needs one connected solid; this study contains ${solid.componentCount} disconnected solids. Move parts until they touch or export them as separate studies.`,
    )
  }
  return {
    bytes: encodeBinaryStl(solid, label),
    bounds: solid.bounds,
    volumeMm3: solid.volumeMm3,
    triangleCount: solid.triangles.length / 3,
  }
}

export function manufacturingStlFilename(
  seed: number,
  scaleDenominator: number,
): string {
  return `raaka-piloti-${String(seed).padStart(4, '0')}-1to${scaleDenominator}-solid.stl`
}
