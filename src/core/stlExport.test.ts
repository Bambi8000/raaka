import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS, generatePiloti } from './generator'
import { scaleMassStudy } from './modelScale'
import {
  createManufacturingStl,
  manufacturingStlFilename,
} from './stlExport'
import type { Bounds3, BoxPiece, ModelScale } from './types'

interface ParsedBinaryStl {
  readonly positions: Float64Array
  readonly normals: Float64Array
  readonly triangleCount: number
  readonly bounds: Bounds3
}

function parseBinaryStl(bytes: Uint8Array): ParsedBinaryStl {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const triangleCount = view.getUint32(80, true)
  expect(bytes.byteLength).toBe(84 + triangleCount * 50)
  const positions = new Float64Array(triangleCount * 9)
  const normals = new Float64Array(triangleCount * 3)
  const minimum: [number, number, number] = [Infinity, Infinity, Infinity]
  const maximum: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  let positionIndex = 0
  let normalIndex = 0
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    let offset = 84 + triangle * 50
    for (let axis = 0; axis < 3; axis += 1) {
      normals[normalIndex] = view.getFloat32(offset, true)
      normalIndex += 1
      offset += 4
    }
    for (let vertex = 0; vertex < 3; vertex += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = view.getFloat32(offset, true)
        positions[positionIndex] = value
        positionIndex += 1
        minimum[axis] = Math.min(minimum[axis], value)
        maximum[axis] = Math.max(maximum[axis], value)
        offset += 4
      }
    }
    expect(view.getUint16(offset, true)).toBe(0)
  }
  return {
    positions,
    normals,
    triangleCount,
    bounds: { min: minimum, max: maximum },
  }
}

function signedVolume(positions: Float64Array): number {
  let sixTimesVolume = 0
  for (let index = 0; index < positions.length; index += 9) {
    const ax = positions[index]
    const ay = positions[index + 1]
    const az = positions[index + 2]
    const bx = positions[index + 3]
    const by = positions[index + 4]
    const bz = positions[index + 5]
    const cx = positions[index + 6]
    const cy = positions[index + 7]
    const cz = positions[index + 8]
    sixTimesVolume +=
      ax * (by * cz - bz * cy) -
      ay * (bx * cz - bz * cx) +
      az * (bx * cy - by * cx)
  }
  return sixTimesVolume / 6
}

function openEdgeCount(positions: Float64Array): number {
  const counts = new Map<string, number>()
  const point = (offset: number) =>
    `${positions[offset].toFixed(4)},${positions[offset + 1].toFixed(4)},${positions[offset + 2].toFixed(4)}`
  for (let triangle = 0; triangle < positions.length; triangle += 9) {
    for (const [a, b] of [[0, 3], [3, 6], [6, 0]] as const) {
      const first = point(triangle + a)
      const second = point(triangle + b)
      const key = first < second ? `${first}|${second}` : `${second}|${first}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts.values()].filter((count) => count !== 2).length
}

function expectBoundsClose(actual: Bounds3, expected: Bounds3): void {
  for (let axis = 0; axis < 3; axis += 1) {
    expect(actual.min[axis]).toBeCloseTo(expected.min[axis], 3)
    expect(actual.max[axis]).toBeCloseTo(expected.max[axis], 3)
  }
}

function expectRelativeClose(actual: number, expected: number): void {
  expect(Math.abs(actual - expected) / expected).toBeLessThan(1e-6)
}

function box(id: string, x: number): BoxPiece {
  return {
    kind: 'box',
    id,
    label: id,
    role: 'mass',
    position: [x, 0, 50],
    size: [100, 80, 100],
  }
}

describe('manufacturing STL export', () => {
  it('writes one physical box as a finite, outward-wound binary millimetre STL', async () => {
    const exported = await createManufacturingStl([box('box', 25)], 'BOX TEST')
    const parsed = parseBinaryStl(exported.bytes)
    const header = new TextDecoder().decode(exported.bytes.subarray(0, 80))

    expect(header).toContain('RAAKA | UNITS=MM | Z=UP | BOX TEST')
    expect(parsed.triangleCount).toBe(exported.triangleCount)
    expectBoundsClose(parsed.bounds, {
      min: [-25, -40, 0],
      max: [75, 40, 100],
    })
    expect(openEdgeCount(parsed.positions)).toBe(0)
    expectRelativeClose(signedVolume(parsed.positions), exported.volumeMm3)
    for (let index = 0; index < parsed.normals.length; index += 3) {
      expect(Math.hypot(
        parsed.normals[index],
        parsed.normals[index + 1],
        parsed.normals[index + 2],
      )).toBeCloseTo(1, 6)
    }
  })

  it('round-trips a six-leg authored Piloti at every manufacturing scale', async () => {
    const master = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      heightMm: 2_000,
      supportCount: 3,
      supportRowCount: 2,
      rowSpacingMm: 420,
      shoulderMode: 'shared',
      footOffsetXMm: 140,
      footOffsetYMm: -90,
      footOffsetOverrides: [{
        supportId: 'support-r2-c2',
        footOffsetXMm: -170,
        footOffsetYMm: 65,
      }],
      upperMassProfile: 'tapered',
      upperTopWidthRatio: 0.72,
      upperTopDepthRatio: 0.81,
      upperTopOffsetXMm: 110,
      upperTopOffsetYMm: -75,
    })
    expect(master.supportLayout?.totalSupports).toBe(6)

    let fullScaleVolume = 0
    for (const scale of [1, 0.5, 0.25] as const satisfies readonly ModelScale[]) {
      const study = scaleMassStudy(master, scale)
      const exported = await createManufacturingStl(
        study.pieces,
        `PILOTI 0318 SCALE 1:${1 / scale}`,
      )
      const parsed = parseBinaryStl(exported.bytes)
      expectBoundsClose(exported.bounds, study.bounds)
      expectBoundsClose(parsed.bounds, study.bounds)
      expect(openEdgeCount(parsed.positions)).toBe(0)
      expectRelativeClose(signedVolume(parsed.positions), exported.volumeMm3)
      if (scale === 1) fullScaleVolume = exported.volumeMm3
      else expectRelativeClose(exported.volumeMm3, fullScaleVolume * scale ** 3)
    }
  })

  it('refuses empty and disconnected studies instead of exporting ambiguous parts', async () => {
    await expect(createManufacturingStl([], 'EMPTY')).rejects.toThrow(
      'at least one visible part',
    )
    await expect(createManufacturingStl([
      box('left', -200),
      box('right', 200),
    ], 'DISCONNECTED')).rejects.toThrow('2 disconnected solids')
  })

  it('names the physical solid with its seed and model scale', () => {
    expect(manufacturingStlFilename(318, 4)).toBe(
      'raaka-piloti-0318-1to4-solid.stl',
    )
  })
})
