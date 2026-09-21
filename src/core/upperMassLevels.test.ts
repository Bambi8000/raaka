import { describe, expect, it } from 'vitest'
import { sceneBounds } from './bounds'
import { scenePieceVolume } from './pieceMetrics'
import { polygonFace, regularPolygon } from './polygonLoft'
import { finishScenePieces } from './solidKernel'
import type { BoxPiece, FrustumPiece, PolygonLoftPiece, Vec2 } from './types'
import { divideUpperMassLevels } from './upperMassLevels'

const block: BoxPiece = {
  kind: 'box',
  id: 'upper-mass',
  label: 'Upper mass',
  role: 'mass',
  position: [10, -20, 160],
  size: [100, 80, 120],
}

const tapered: FrustumPiece = {
  kind: 'frustum',
  id: 'upper-mass',
  label: 'Upper mass',
  role: 'mass',
  position: [10, 20, 150],
  height: 100,
  bottomSize: [100, 80],
  topSize: [60, 120],
  bottomOffset: [-10, 5],
  topOffset: [30, -15],
}

const hexagon: PolygonLoftPiece = {
  kind: 'polygon-loft',
  id: 'upper-mass',
  label: 'Hex upper mass',
  role: 'mass',
  position: [25, -40, 200],
  height: 160,
  footprint: regularPolygon(6, 120),
  bottomScale: 1,
  topScale: 0.7,
  bottomOffset: [-15, 8],
  topOffset: [35, -12],
}

function rectangularFace(
  piece: BoxPiece | FrustumPiece,
  top: boolean,
): { readonly centre: Vec2; readonly size: Vec2 } {
  if (piece.kind === 'box') {
    return {
      centre: [piece.position[0], piece.position[1]],
      size: [piece.size[0], piece.size[1]],
    }
  }
  const offset = top ? piece.topOffset : piece.bottomOffset
  return {
    centre: [piece.position[0] + offset[0], piece.position[1] + offset[1]],
    size: top ? piece.topSize : piece.bottomSize,
  }
}

function expectPointsClose(
  actual: readonly Vec2[],
  expected: readonly Vec2[],
): void {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((point, index) => {
    expect(point[0]).toBeCloseTo(expected[index][0], 10)
    expect(point[1]).toBeCloseTo(expected[index][1], 10)
  })
}

describe('stepped upper-mass levels', () => {
  it('reconstructs a block exactly when the step is neutral', () => {
    const levels = divideUpperMassLevels(block, 'rectangle', 'z3', 1, [0, 0], [])

    expect(levels.map((piece) => piece.id)).toEqual([
      'upper-mass-rect-level-1',
      'upper-mass-rect-level-2',
      'upper-mass-rect-level-3',
    ])
    expect(levels.every((piece) => piece.kind === 'box')).toBe(true)
    expect(levels.map((piece) => piece.position[2])).toEqual([120, 160, 200])
    expect(sceneBounds(levels)).toEqual(sceneBounds([block]))
    expect(levels.reduce((sum, piece) => sum + scenePieceVolume(piece), 0))
      .toBeCloseTo(scenePieceVolume(block), 10)
  })

  it('keeps the bearing face and total Z envelope while applying cumulative steps', () => {
    const levels = divideUpperMassLevels(block, 'rectangle', 'z4', 0.8, [10, -5], [])
    const first = levels[0]
    const last = levels[3]
    if (first.kind !== 'box' || last.kind !== 'box') {
      throw new Error('Expected stepped block levels.')
    }

    expect(first.position).toEqual([10, -20, 115])
    expect(first.size).toEqual([100, 80, 30])
    expect(last.position).toEqual([40, -35, 205])
    expect(last.size[0]).toBeCloseTo(100 * 0.8 ** 3, 12)
    expect(last.size[1]).toBeCloseTo(80 * 0.8 ** 3, 12)
    const bounds = sceneBounds(levels)
    expect(bounds.min[2]).toBe(100)
    expect(bounds.max[2]).toBe(220)
  })

  it('slices a tapered parent with coincident neutral interfaces', () => {
    const levels = divideUpperMassLevels(tapered, 'rectangle', 'z4', 1, [0, 0], [])
    for (let index = 0; index < levels.length - 1; index += 1) {
      const lower = levels[index]
      const upper = levels[index + 1]
      if (lower.kind === 'polygon-loft' || upper.kind === 'polygon-loft') {
        throw new Error('Expected rectangular levels.')
      }
      expect(rectangularFace(lower, true)).toEqual(rectangularFace(upper, false))
    }
    expect(sceneBounds(levels)).toEqual(sceneBounds([tapered]))
    expect(levels.reduce((sum, piece) => sum + scenePieceVolume(piece), 0))
      .toBeCloseTo(scenePieceVolume(tapered), 8)
  })

  it('slices a polygon loft with coincident neutral interfaces', () => {
    const levels = divideUpperMassLevels(hexagon, 'hexagon', 'z3', 1, [0, 0], [])
    for (let index = 0; index < levels.length - 1; index += 1) {
      const lower = levels[index]
      const upper = levels[index + 1]
      if (lower.kind !== 'polygon-loft' || upper.kind !== 'polygon-loft') {
        throw new Error('Expected polygon levels.')
      }
      expectPointsClose(polygonFace(lower, true), polygonFace(upper, false))
    }
    const actualBounds = sceneBounds(levels)
    const expectedBounds = sceneBounds([hexagon])
    actualBounds.min.forEach((value, axis) => {
      expect(value).toBeCloseTo(expectedBounds.min[axis], 10)
      expect(actualBounds.max[axis]).toBeCloseTo(expectedBounds.max[axis], 10)
    })
    expect(levels.reduce((sum, piece) => sum + scenePieceVolume(piece), 0))
      .toBeCloseTo(scenePieceVolume(hexagon), 8)
  })

  it('keeps level IDs stable as the count grows and distinct between plan shapes', () => {
    const rectTwo = divideUpperMassLevels(block, 'rectangle', 'z2', 0.86, [90, 0], [])
    const rectFour = divideUpperMassLevels(block, 'rectangle', 'z4', 0.86, [90, 0], [])
    const hexTwo = divideUpperMassLevels(hexagon, 'hexagon', 'z2', 0.86, [90, 0], [])

    expect(rectFour.slice(0, 2).map((piece) => piece.id))
      .toEqual(rectTwo.map((piece) => piece.id))
    expect(hexTwo.map((piece) => piece.id)).toEqual([
      'upper-mass-hex-level-1',
      'upper-mass-hex-level-2',
    ])
    expect(new Set([...rectTwo, ...hexTwo].map((piece) => piece.id)).size).toBe(4)
  })

  it('applies an independent top only to its addressed level', () => {
    const baseline = divideUpperMassLevels(block, 'rectangle', 'z3', 0.9, [20, 0], [])
    const edited = divideUpperMassLevels(block, 'rectangle', 'z3', 0.9, [20, 0], [{
      partId: 'upper-mass-rect-level-2',
      profile: 'tapered',
      topWidthRatio: 0.5,
      topDepthRatio: 0.8,
      topOffsetXMm: -15,
      topOffsetYMm: 12,
    }])

    expect(edited[0]).toEqual(baseline[0])
    expect(edited[2]).toEqual(baseline[2])
    expect(edited[1]).not.toEqual(baseline[1])
    expect(edited[1].kind).toBe('frustum')
    if (edited[1].kind !== 'frustum') throw new Error('Expected an edited frustum.')
    expect(edited[1].topSize[0]).toBeCloseTo(edited[1].bottomSize[0] * 0.5, 12)
    expect(edited[1].topOffset[0] - edited[1].bottomOffset[0]).toBe(-15)
    expect(edited[1].topOffset[1] - edited[1].bottomOffset[1]).toBe(12)
  })

  it('forms one connected solid with the default four-level step', async () => {
    const largeBlock: BoxPiece = {
      ...block,
      position: [0, 0, 1_065],
      size: [1_080, 510, 870],
    }
    const levels = divideUpperMassLevels(
      largeBlock,
      'rectangle',
      'z4',
      0.86,
      [90, 0],
      [],
    )
    const finished = await finishScenePieces(levels)

    expect(finished.componentCount).toBe(1)
    expect(finished.bounds.min[2]).toBeCloseTo(630, 5)
    expect(finished.bounds.max[2]).toBeCloseTo(1_500, 5)
  })
})
