import type { PolygonLoftPiece, Vec2, Vec3 } from './types'

export function polygonArea(points: readonly Vec2[]): number {
  return Math.abs(points.reduce((sum, a, i) => {
    const b = points[(i + 1) % points.length]
    return sum + a[0] * b[1] - a[1] * b[0]
  }, 0)) / 2
}

export function regularPolygon(sides: 6 | 8, radius: number): readonly Vec2[] {
  return Array.from({ length: sides }, (_, i) => {
    const angle = (2 * i - 1) * Math.PI / sides
    return [radius * Math.cos(angle), radius * Math.sin(angle)]
  })
}

export function polygonFace(piece: PolygonLoftPiece, top: boolean): readonly Vec2[] {
  const scale = top ? piece.topScale : piece.bottomScale
  const offset = top ? piece.topOffset : piece.bottomOffset
  return piece.footprint.map(([x, y]) => [
    piece.position[0] + x * scale + offset[0],
    piece.position[1] + y * scale + offset[1],
  ])
}

export function polygonLoftVertices(piece: PolygonLoftPiece): readonly Vec3[] {
  return [false, true].flatMap((top) => polygonFace(piece, top).map(([x, y]): Vec3 =>
    [x, y, piece.position[2] + (top ? 1 : -1) * piece.height / 2],
  ))
}

/** Local indexed mesh shared by rendering and the solid kernel, never serialized. */
export function polygonLoftMesh(piece: PolygonLoftPiece, world = false): {
  positions: Float32Array
  triangles: Uint32Array
} {
  const worldPositions = new Float32Array(polygonLoftVertices(piece).flat())
  const positions = world ? worldPositions : new Float32Array(polygonLoftVertices({ ...piece, position: [0, 0, 0] }).flat())
  const count = piece.footprint.length
  const triangles: number[] = []
  for (let i = 1; i < count - 1; i += 1) {
    triangles.push(0, i + 1, i, count, count + i, count + i + 1)
  }
  for (let i = 0; i < count; i += 1) {
    const j = (i + 1) % count
    // Adjacent lofts traverse their shared edge in opposite directions. Pick
    // the same physical diagonal so Float32 rounding cannot open a thin seam.
    const order = worldPositions[i * 3] - worldPositions[j * 3] ||
      worldPositions[i * 3 + 1] - worldPositions[j * 3 + 1]
    if (order <= 0) triangles.push(i, j, count + j, i, count + j, count + i)
    else triangles.push(i, j, count + i, j, count + j, count + i)
  }
  return { positions, triangles: new Uint32Array(triangles) }
}

function side(a: Vec2, b: Vec2, p: Vec2): number {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
}

/** Maximum violation of the convex boundary's supporting half-planes. */
export function polygonOverhang(points: readonly Vec2[], boundary: readonly Vec2[]): number {
  return Math.max(0, ...boundary.flatMap((a, i) => {
    const b = boundary[(i + 1) % boundary.length]
    return points.map((p) => -side(a, b, p) / Math.hypot(b[0] - a[0], b[1] - a[1]))
  }))
}

/** Sutherland–Hodgman clipping of two convex CCW rings. */
export function polygonIntersectionArea(first: readonly Vec2[], boundary: readonly Vec2[]): number {
  let output = [...first]
  boundary.forEach((a, i) => {
    const b = boundary[(i + 1) % boundary.length]
    const input = output
    output = []
    input.forEach((p, j) => {
      const q = input[(j + 1) % input.length]
      const dp = side(a, b, p)
      const dq = side(a, b, q)
      if (dp >= 0) output.push(p)
      if ((dp >= 0) !== (dq >= 0)) {
        const t = dp / (dp - dq)
        output.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])])
      }
    })
  })
  return polygonArea(output)
}
