import type {
  Manifold as ManifoldSolid,
  ManifoldToplevel,
} from 'manifold-3d'
import type { Bounds3, FrustumPiece, ScenePiece } from './types'

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

  if (piece.kind === 'mesh') {
    const positions = new Float32Array(piece.positions)
    for (let index = 0; index < positions.length; index += 3) {
      positions[index] += piece.position[0]
      positions[index + 1] += piece.position[1]
      positions[index + 2] += piece.position[2]
    }
    return new kernel.Manifold(
      new kernel.Mesh({
        numProp: 3,
        vertProperties: positions,
        triVerts: new Uint32Array(piece.triangles),
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

async function withFusedManifold<Result>(
  pieces: readonly ScenePiece[],
  readResult: (result: ManifoldSolid) => Result,
): Promise<Result> {
  if (pieces.length < 2) {
    throw new RangeError('Fuse requires at least two scene pieces.')
  }

  const kernel = await loadSolidKernel()
  const operands: ManifoldSolid[] = []
  let result: ManifoldSolid | undefined
  try {
    for (const piece of pieces) operands.push(manifoldForPiece(kernel, piece))
    result = kernel.Manifold.union(operands)
    const status = result.status()
    if (status !== 'NoError') {
      throw new Error(`Solid-kernel union failed with status ${status}.`)
    }

    return readResult(result)
  } finally {
    result?.delete()
    for (const operand of operands) operand.delete()
  }
}

export async function fuseScenePieces(
  pieces: readonly ScenePiece[],
): Promise<SolidKernelMesh> {
  return withFusedManifold(pieces, (result) => {
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
        componentCount: components.length,
        groundContactMm2,
      }
    } finally {
      for (const component of components) component.delete()
    }
  })
}

export async function sectionScenePiecesAtZ(
  pieces: readonly ScenePiece[],
  zMm: number,
): Promise<SolidKernelSection> {
  if (!Number.isFinite(zMm)) {
    throw new RangeError('Section height must be finite.')
  }
  return withFusedManifold(pieces, (result) => {
    const section = result.slice(zMm)
    let simplified: ReturnType<ManifoldSolid['slice']> | undefined
    try {
      simplified = section.simplify()
      return {
        polygons: simplified.toPolygons(),
        areaMm2: simplified.area(),
      }
    } finally {
      simplified?.delete()
      section.delete()
    }
  })
}
