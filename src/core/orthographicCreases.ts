import type { Vec2, Vec3 } from './types'

export type OrthographicAxis = 'x' | 'y' | 'z'
export type Segment2 = readonly [start: Vec2, end: Vec2]

export interface OrthographicCreaseMesh {
  readonly positions: Float32Array
  readonly triangles: Uint32Array
  readonly mergeFromVert?: Uint32Array
  readonly mergeToVert?: Uint32Array
  readonly tolerance?: number
}

interface ProjectedVertex {
  readonly point: Vec2
  readonly depth: number
}

interface TriangleData {
  readonly vertices: readonly [Vec3, Vec3, Vec3]
  readonly projected: readonly [ProjectedVertex, ProjectedVertex, ProjectedVertex]
  readonly normal: Vec3
}

interface EdgeData {
  readonly startVertex: number
  readonly endVertex: number
  readonly triangles: number[]
}

type Interval = readonly [start: number, end: number]

const BARYCENTRIC_EPSILON = 1e-8
const NORMAL_EPSILON = 1e-8

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function length3(value: Vec3): number {
  return Math.hypot(value[0], value[1], value[2])
}

function normalize(value: Vec3): Vec3 {
  const length = length3(value)
  if (length === 0) return [0, 0, 0]
  return [value[0] / length, value[1] / length, value[2] / length]
}

function vertex(positions: Float32Array, index: number): Vec3 {
  return [
    positions[index * 3],
    positions[index * 3 + 1],
    positions[index * 3 + 2],
  ]
}

function project(value: Vec3, axis: OrthographicAxis): ProjectedVertex {
  if (axis === 'x') return { point: [value[1], value[2]], depth: value[0] }
  if (axis === 'y') return { point: [value[0], value[2]], depth: value[1] }
  return { point: [value[0], value[1]], depth: value[2] }
}

function axisComponent(value: Vec3, axis: OrthographicAxis): number {
  return value[axis === 'x' ? 0 : axis === 'y' ? 1 : 2]
}

function distance2(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

function lerp2(a: Vec2, b: Vec2, t: number): Vec2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function cross2(a: Vec2, b: Vec2): number {
  return a[0] * b[1] - a[1] * b[0]
}

function subtract2(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]]
}

function dot2(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1]
}

function triangleNormal(vertices: readonly [Vec3, Vec3, Vec3]): Vec3 {
  return normalize(cross(
    subtract(vertices[1], vertices[0]),
    subtract(vertices[2], vertices[0]),
  ))
}

function canonicalVertices(
  vertexCount: number,
  mergeFromVert?: Uint32Array,
  mergeToVert?: Uint32Array,
): Uint32Array {
  const parents = Uint32Array.from({ length: vertexCount }, (_, index) => index)
  if (mergeFromVert && mergeToVert) {
    const pairCount = Math.min(mergeFromVert.length, mergeToVert.length)
    for (let index = 0; index < pairCount; index += 1) {
      parents[mergeFromVert[index]] = mergeToVert[index]
    }
  }

  const root = (start: number): number => {
    let current = start
    while (parents[current] !== current) current = parents[current]
    let path = start
    while (parents[path] !== path) {
      const next = parents[path]
      parents[path] = current
      path = next
    }
    return current
  }
  for (let index = 0; index < parents.length; index += 1) parents[index] = root(index)
  return parents
}

function triangleData(mesh: OrthographicCreaseMesh, axis: OrthographicAxis): TriangleData[] {
  const triangles: TriangleData[] = []
  for (let index = 0; index < mesh.triangles.length; index += 3) {
    const vertices = [
      vertex(mesh.positions, mesh.triangles[index]),
      vertex(mesh.positions, mesh.triangles[index + 1]),
      vertex(mesh.positions, mesh.triangles[index + 2]),
    ] as const
    triangles.push({
      vertices,
      projected: vertices.map((point) => project(point, axis)) as unknown as readonly [
        ProjectedVertex,
        ProjectedVertex,
        ProjectedVertex,
      ],
      normal: triangleNormal(vertices),
    })
  }
  return triangles
}

function meshEdges(mesh: OrthographicCreaseMesh, canonical: Uint32Array): EdgeData[] {
  const edges = new Map<string, EdgeData>()
  for (let triangle = 0; triangle < mesh.triangles.length / 3; triangle += 1) {
    const vertices = [
      canonical[mesh.triangles[triangle * 3]],
      canonical[mesh.triangles[triangle * 3 + 1]],
      canonical[mesh.triangles[triangle * 3 + 2]],
    ]
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex += 1) {
      const first = vertices[edgeIndex]
      const second = vertices[(edgeIndex + 1) % 3]
      const startVertex = Math.min(first, second)
      const endVertex = Math.max(first, second)
      if (startVertex === endVertex) continue
      const key = `${startVertex}:${endVertex}`
      const existing = edges.get(key)
      if (existing) {
        if (!existing.triangles.includes(triangle)) existing.triangles.push(triangle)
      } else {
        edges.set(key, { startVertex, endVertex, triangles: [triangle] })
      }
    }
  }
  return [...edges.values()]
}

function barycentric(point: Vec2, triangle: TriangleData): readonly [number, number, number] | undefined {
  const [a, b, c] = triangle.projected.map((item) => item.point) as unknown as readonly [
    Vec2,
    Vec2,
    Vec2,
  ]
  const denominator = (b[1] - c[1]) * (a[0] - c[0])
    + (c[0] - b[0]) * (a[1] - c[1])
  if (Math.abs(denominator) <= BARYCENTRIC_EPSILON) return undefined
  const first = ((b[1] - c[1]) * (point[0] - c[0])
    + (c[0] - b[0]) * (point[1] - c[1])) / denominator
  const second = ((c[1] - a[1]) * (point[0] - c[0])
    + (a[0] - c[0]) * (point[1] - c[1])) / denominator
  return [first, second, 1 - first - second]
}

function segmentTriangleInterval(
  start: Vec2,
  end: Vec2,
  triangle: TriangleData,
): Interval | undefined {
  const atStart = barycentric(start, triangle)
  const atEnd = barycentric(end, triangle)
  if (!atStart || !atEnd) return undefined
  let minimum = 0
  let maximum = 1
  for (let index = 0; index < 3; index += 1) {
    const origin = atStart[index]
    const slope = atEnd[index] - origin
    if (Math.abs(slope) <= BARYCENTRIC_EPSILON) {
      if (origin < -BARYCENTRIC_EPSILON) return undefined
      continue
    }
    const crossing = (-BARYCENTRIC_EPSILON - origin) / slope
    if (slope > 0) minimum = Math.max(minimum, crossing)
    else maximum = Math.min(maximum, crossing)
    if (maximum <= minimum) return undefined
  }
  return [Math.max(0, minimum), Math.min(1, maximum)]
}

function triangleDepth(point: Vec2, triangle: TriangleData): number | undefined {
  const weights = barycentric(point, triangle)
  if (!weights) return undefined
  return weights[0] * triangle.projected[0].depth
    + weights[1] * triangle.projected[1].depth
    + weights[2] * triangle.projected[2].depth
}

function occludedInterval(
  interval: Interval,
  edgeStart: ProjectedVertex,
  edgeEnd: ProjectedVertex,
  triangle: TriangleData,
  depthTolerance: number,
): Interval | undefined {
  const depthDifference = (t: number): number => {
    const point = lerp2(edgeStart.point, edgeEnd.point, t)
    const surfaceDepth = triangleDepth(point, triangle)
    if (surfaceDepth === undefined) return -Infinity
    return surfaceDepth - lerp(edgeStart.depth, edgeEnd.depth, t) - depthTolerance
  }
  const differenceStart = depthDifference(interval[0])
  const differenceEnd = depthDifference(interval[1])
  if (differenceStart <= 0 && differenceEnd <= 0) return undefined
  if (differenceStart > 0 && differenceEnd > 0) return interval
  const crossing = interval[0]
    + (interval[1] - interval[0])
      * (-differenceStart / (differenceEnd - differenceStart))
  return differenceStart > 0
    ? [interval[0], crossing]
    : [crossing, interval[1]]
}

function mergeIntervals(intervals: readonly Interval[], tolerance: number): Interval[] {
  const sorted = [...intervals]
    .filter(([start, end]) => end - start > tolerance)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: Interval[] = []
  for (const interval of sorted) {
    const previous = merged.at(-1)
    if (!previous || interval[0] > previous[1] + tolerance) {
      merged.push([interval[0], interval[1]])
    } else {
      merged[merged.length - 1] = [previous[0], Math.max(previous[1], interval[1])]
    }
  }
  return merged
}

function subtractIntervals(intervals: readonly Interval[], removed: readonly Interval[]): Interval[] {
  let remaining = [...intervals]
  for (const [removeStart, removeEnd] of removed) {
    const next: Interval[] = []
    for (const [start, end] of remaining) {
      if (removeEnd <= start || removeStart >= end) {
        next.push([start, end])
        continue
      }
      if (removeStart > start) next.push([start, Math.min(removeStart, end)])
      if (removeEnd < end) next.push([Math.max(removeEnd, start), end])
    }
    remaining = next
  }
  return remaining
}

function outlineOverlapIntervals(
  start: Vec2,
  end: Vec2,
  outlines: readonly (readonly Vec2[])[],
  tolerance: number,
): Interval[] {
  const direction = subtract2(end, start)
  const lengthSquared = dot2(direction, direction)
  const length = Math.sqrt(lengthSquared)
  if (length <= tolerance) return []
  const intervals: Interval[] = []
  for (const polygon of outlines) {
    for (let index = 0; index < polygon.length; index += 1) {
      const outlineStart = polygon[index]
      const outlineEnd = polygon[(index + 1) % polygon.length]
      const outlineDirection = subtract2(outlineEnd, outlineStart)
      const outlineLength = Math.hypot(outlineDirection[0], outlineDirection[1])
      if (outlineLength <= tolerance) continue
      const parallel = Math.abs(cross2(direction, outlineDirection))
        <= BARYCENTRIC_EPSILON * length * outlineLength
      const collinear = Math.abs(cross2(direction, subtract2(outlineStart, start)))
        <= tolerance * length
      if (!parallel || !collinear) continue
      const first = dot2(subtract2(outlineStart, start), direction) / lengthSquared
      const second = dot2(subtract2(outlineEnd, start), direction) / lengthSquared
      const overlapStart = Math.max(0, Math.min(first, second))
      const overlapEnd = Math.min(1, Math.max(first, second))
      if (overlapEnd > overlapStart) intervals.push([overlapStart, overlapEnd])
    }
  }
  return mergeIntervals(intervals, tolerance / length)
}

function meshDiagonal(positions: Float32Array): number {
  if (positions.length < 3) return 0
  const minimum = [positions[0], positions[1], positions[2]]
  const maximum = [...minimum]
  for (let index = 3; index < positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      minimum[axis] = Math.min(minimum[axis], positions[index + axis])
      maximum[axis] = Math.max(maximum[axis], positions[index + axis])
    }
  }
  return Math.hypot(
    maximum[0] - minimum[0],
    maximum[1] - minimum[1],
    maximum[2] - minimum[2],
  )
}

function segmentKey(segment: Segment2, tolerance: number): string {
  const quantize = ([x, y]: Vec2) => `${Math.round(x / tolerance)},${Math.round(y / tolerance)}`
  const first = quantize(segment[0])
  const second = quantize(segment[1])
  return first < second ? `${first}:${second}` : `${second}:${first}`
}

/**
 * Extract view-facing, non-occluded crease segments from a finished triangle
 * mesh. Coplanar triangle diagonals remain below the authored angle threshold.
 */
export function visibleOrthographicCreases(
  mesh: OrthographicCreaseMesh,
  axis: OrthographicAxis,
  outlinePolygons: readonly (readonly Vec2[])[],
  minimumAngleDegrees: number,
): readonly Segment2[] {
  if (!Number.isFinite(minimumAngleDegrees)
    || minimumAngleDegrees <= 0
    || minimumAngleDegrees >= 180) {
    throw new RangeError('Crease angle must be between 0 and 180 degrees.')
  }
  if (mesh.positions.length % 3 !== 0 || mesh.triangles.length % 3 !== 0) {
    throw new RangeError('Crease extraction requires complete triangle positions and indices.')
  }

  const diagonal = meshDiagonal(mesh.positions)
  const coordinateTolerance = Math.max(mesh.tolerance ?? 0, diagonal * 1e-7, 1e-6)
  const depthTolerance = Math.max(coordinateTolerance * 4, 1e-5)
  const intervalTolerance = diagonal > 0 ? coordinateTolerance / diagonal : 1e-8
  const canonical = canonicalVertices(
    mesh.positions.length / 3,
    mesh.mergeFromVert,
    mesh.mergeToVert,
  )
  const triangles = triangleData(mesh, axis)
  const edges = meshEdges(mesh, canonical)
  const cosineThreshold = Math.cos(minimumAngleDegrees * Math.PI / 180)
  const segments: Segment2[] = []

  for (const edge of edges) {
    if (edge.triangles.length !== 2) continue
    const firstTriangle = triangles[edge.triangles[0]]
    const secondTriangle = triangles[edge.triangles[1]]
    if (dot3(firstTriangle.normal, secondTriangle.normal) > cosineThreshold) continue

    const firstFacing = axisComponent(firstTriangle.normal, axis)
    const secondFacing = axisComponent(secondTriangle.normal, axis)
    if (firstFacing < -NORMAL_EPSILON || secondFacing < -NORMAL_EPSILON) continue
    if (firstFacing <= NORMAL_EPSILON && secondFacing <= NORMAL_EPSILON) continue

    const edgeStart = project(vertex(mesh.positions, edge.startVertex), axis)
    const edgeEnd = project(vertex(mesh.positions, edge.endVertex), axis)
    const projectedLength = distance2(edgeStart.point, edgeEnd.point)
    if (projectedLength <= coordinateTolerance) continue

    const occluded: Interval[] = []
    for (let triangleIndex = 0; triangleIndex < triangles.length; triangleIndex += 1) {
      if (edge.triangles.includes(triangleIndex)) continue
      const triangle = triangles[triangleIndex]
      if (axisComponent(triangle.normal, axis) <= NORMAL_EPSILON) continue
      const overlap = segmentTriangleInterval(edgeStart.point, edgeEnd.point, triangle)
      if (!overlap) continue
      const hidden = occludedInterval(
        overlap,
        edgeStart,
        edgeEnd,
        triangle,
        depthTolerance,
      )
      if (hidden) occluded.push(hidden)
    }

    const outlineOverlap = outlineOverlapIntervals(
      edgeStart.point,
      edgeEnd.point,
      outlinePolygons,
      coordinateTolerance,
    )
    const removed = mergeIntervals([...occluded, ...outlineOverlap], intervalTolerance)
    const visible = subtractIntervals([[0, 1]], removed)
    for (const interval of visible) {
      const start = lerp2(edgeStart.point, edgeEnd.point, interval[0])
      const end = lerp2(edgeStart.point, edgeEnd.point, interval[1])
      if (distance2(start, end) > coordinateTolerance) segments.push([start, end])
    }
  }

  const unique = new Map<string, Segment2>()
  for (const segment of segments) unique.set(segmentKey(segment, coordinateTolerance), segment)
  return [...unique.values()].sort((first, second) =>
    first[0][0] - second[0][0]
      || first[0][1] - second[0][1]
      || first[1][0] - second[1][0]
      || first[1][1] - second[1][1],
  )
}
