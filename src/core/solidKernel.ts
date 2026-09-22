import type {
  Manifold as ManifoldSolid,
  ManifoldToplevel,
} from 'manifold-3d'
import type { Bounds3, FrustumPiece, ScenePiece } from './types'
import { polygonLoftMesh } from './polygonLoft'

const FRUSTUM_TRIANGLES = new Uint32Array([
  0, 2, 1,
  0, 3, 2,
  4, 5, 6,
  4, 6, 7,
  0, 1, 5,
  0, 5, 4,
  1, 2, 6,
  1, 6, 5,
  2, 3, 7,
  2, 7, 6,
  3, 0, 4,
  3, 4, 7,
])

export interface SolidKernelMesh {
  readonly positions: Float32Array
  readonly triangles: Uint32Array
  readonly bounds: Bounds3
  readonly volumeMm3: number
  readonly componentCount: number
  readonly groundContactMm2: number
}

export interface SolidKernelSection {
  readonly polygons: readonly (readonly (readonly [number, number])[])[]
  readonly areaMm2: number
}

export type SolidKernelSectionAxis = 'x' | 'y' | 'z'

export interface SolidKernelSectionPlane {
  readonly axis: SolidKernelSectionAxis
  readonly offsetMm: number
}

let kernelPromise: Promise<ManifoldToplevel> | undefined

export function loadSolidKernel(): Promise<ManifoldToplevel> {
  kernelPromise ??= import('manifold-3d')
    .then(({ default: createModule }) => createModule())
    .then((kernel) => {
      kernel.setup()
      return kernel
    })
  return kernelPromise
}

function frustumVertices(piece: FrustumPiece): Float32Array {
  const [bottomWidth, bottomDepth] = piece.bottomSize
  const [topWidth, topDepth] = piece.topSize
  const bottomX = piece.position[0] + piece.bottomOffset[0]
  const bottomY = piece.position[1] + piece.bottomOffset[1]
  const topX = piece.position[0] + piece.topOffset[0]
  const topY = piece.position[1] + piece.topOffset[1]
  const bottomZ = piece.position[2] - piece.height / 2
  const topZ = piece.position[2] + piece.height / 2

  return new Float32Array([
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
  ])
}

function manifoldForPiece(
  kernel: ManifoldToplevel,
  piece: ScenePiece,
): ManifoldSolid {
  if (piece.kind === 'box') {
    const cube = kernel.Manifold.cube(piece.size, true)
    try {
      return cube.translate(piece.position)
    } finally {
      cube.delete()
    }
  }

  if (piece.kind === 'mesh' || piece.kind === 'polygon-loft') {
    const mesh = piece.kind === 'mesh' ? piece : polygonLoftMesh(piece, true)
    const positions = new Float32Array(mesh.positions)
    for (let index = 0; piece.kind === 'mesh' && index < positions.length; index += 3) {
      positions[index] += piece.position[0]
      positions[index + 1] += piece.position[1]
      positions[index + 2] += piece.position[2]
    }
    return new kernel.Manifold(
      new kernel.Mesh({
        numProp: 3,
        vertProperties: positions,
        triVerts: new Uint32Array(mesh.triangles),
      }),
    )
  }

  return new kernel.Manifold(
    new kernel.Mesh({
      numProp: 3,
      vertProperties: frustumVertices(piece),
      triVerts: new Uint32Array(FRUSTUM_TRIANGLES),
    }),
  )
}

function copyPositions(
  vertProperties: Float32Array,
  numProp: number,
): Float32Array {
  const positions = new Float32Array((vertProperties.length / numProp) * 3)
  for (let vertex = 0; vertex < positions.length / 3; vertex += 1) {
    positions[vertex * 3] = vertProperties[vertex * numProp]
    positions[vertex * 3 + 1] = vertProperties[vertex * numProp + 1]
    positions[vertex * 3 + 2] = vertProperties[vertex * numProp + 2]
  }
  return positions
}

async function withSceneManifold<Result>(
  pieces: readonly ScenePiece[],
  readResult: (
    result: ManifoldSolid,
    positiveComponentCount?: number,
  ) => Result,
  subtractors: readonly ScenePiece[] = [],
): Promise<Result> {
  if (pieces.length === 0) {
    throw new RangeError('A solid operation requires at least one scene piece.')
  }

  const kernel = await loadSolidKernel()
  const operands: ManifoldSolid[] = []
  const subtractorOperands: ManifoldSolid[] = []
  let positive: ManifoldSolid | undefined
  let negative: ManifoldSolid | undefined
  let result: ManifoldSolid | undefined
  let positiveComponentCount: number | undefined
  try {
    for (const piece of pieces) operands.push(manifoldForPiece(kernel, piece))
    positive = operands.length === 1
      ? operands.pop()
      : kernel.Manifold.union(operands)
    if (!positive) throw new Error('The solid kernel returned no positive result.')
    if (subtractors.length > 0) {
      const positiveComponents = positive.decompose()
      try {
        positiveComponentCount = positiveComponents.length
      } finally {
        for (const component of positiveComponents) component.delete()
      }
      for (const piece of subtractors) {
        subtractorOperands.push(manifoldForPiece(kernel, piece))
      }
      negative = subtractorOperands.length === 1
        ? subtractorOperands.pop()
        : kernel.Manifold.union(subtractorOperands)
      if (!negative) throw new Error('The solid kernel returned no subtractor result.')
      result = kernel.Manifold.difference(positive, negative)
    } else {
      result = positive
      positive = undefined
    }
    const status = result.status()
    if (status !== 'NoError') {
      throw new Error(`Solid-kernel operation failed with status ${status}.`)
    }

    return readResult(result, positiveComponentCount)
  } finally {
    result?.delete()
    positive?.delete()
    negative?.delete()
    for (const operand of operands) operand.delete()
    for (const operand of subtractorOperands) operand.delete()
  }
}

function readSolidKernelMesh(
  result: ManifoldSolid,
  positiveComponentCount?: number,
): SolidKernelMesh {
  const mesh = result.getMesh()
  const components = result.decompose()
  try {
    const kernelBounds = result.boundingBox()
    const groundSection =
      Math.abs(kernelBounds.min[2]) < 1e-6 ? result.slice(0) : undefined
    let groundContactMm2 = 0
    try {
      groundContactMm2 = groundSection?.area() ?? 0
    } finally {
      groundSection?.delete()
    }
    return {
      positions: copyPositions(mesh.vertProperties, mesh.numProp),
      triangles: new Uint32Array(mesh.triVerts),
      bounds: {
        min: [...kernelBounds.min],
        max: [...kernelBounds.max],
      },
      volumeMm3: result.volume(),
      componentCount: positiveComponentCount ?? components.length,
      groundContactMm2,
    }
  } finally {
    for (const component of components) component.delete()
  }
}

/** Resolve one or more semantic pieces into one finished indexed kernel mesh. */
export async function finishScenePieces(
  pieces: readonly ScenePiece[],
  subtractors: readonly ScenePiece[] = [],
): Promise<SolidKernelMesh> {
  return withSceneManifold(pieces, readSolidKernelMesh, subtractors)
}

export async function fuseScenePieces(
  pieces: readonly ScenePiece[],
): Promise<SolidKernelMesh> {
  if (pieces.length < 2) {
    throw new RangeError('Fuse requires at least two scene pieces.')
  }
  return finishScenePieces(pieces)
}

export async function sectionScenePiecesAtZ(
  pieces: readonly ScenePiece[],
  zMm: number,
): Promise<SolidKernelSection> {
  return sectionScenePiecesAtPlane(pieces, { axis: 'z', offsetMm: zMm })
}

/**
 * Slice the finished scene on a world-axis plane. Returned points use the
 * drawing axes X/Y, X/Z or Y/Z, with the vertical Z coordinate kept positive.
 */
export async function sectionScenePiecesAtPlane(
  pieces: readonly ScenePiece[],
  plane: SolidKernelSectionPlane,
  subtractors: readonly ScenePiece[] = [],
): Promise<SolidKernelSection> {
  if (!Number.isFinite(plane.offsetMm)) {
    throw new RangeError('Section plane offset must be finite.')
  }
  return withSceneManifold(pieces, (result) => {
    let oriented: ManifoldSolid | undefined
    const height = plane.offsetMm
    let mapPoint: (point: readonly [number, number]) => readonly [number, number]
    if (plane.axis === 'x') {
      oriented = result.rotate(0, -90, 0)
      mapPoint = ([negativeZ, y]) => [y, -negativeZ]
    } else if (plane.axis === 'y') {
      oriented = result.rotate(90, 0, 0)
      mapPoint = ([x, negativeZ]) => [x, -negativeZ]
    } else {
      mapPoint = ([x, y]) => [x, y]
    }
    const section = (oriented ?? result).slice(height)
    let simplified: ReturnType<ManifoldSolid['slice']> | undefined
    try {
      simplified = section.simplify()
      return {
        polygons: simplified.toPolygons().map((polygon) =>
          polygon.map((point) => mapPoint(point)),
        ),
        areaMm2: simplified.area(),
      }
    } finally {
      simplified?.delete()
      section.delete()
      oriented?.delete()
    }
  }, subtractors)
}
