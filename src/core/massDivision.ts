import type {
  BoxPiece, FrustumPiece, PolygonLoftPiece, PilotiMassPartOverride, PilotiUpperMassDivision,
  Vec2,
} from './types'
import {
  divideUpperMassLevels,
  isUpperMassLevelDivision,
  UPPER_MASS_LEVEL_DIVISIONS,
} from './upperMassLevels'

export const MASS_DIVISIONS = [
  { value: 'whole', label: 'WHOLE', description: 'ONE MASS' },
  { value: 'x2', label: '2 · X', description: 'SIDE BY SIDE' },
  { value: 'y2', label: '2 · Y', description: 'FRONT / BACK' },
  { value: 'xy4', label: '4 · XY', description: 'TWO BY TWO' },
  ...UPPER_MASS_LEVEL_DIVISIONS,
] as const

export const MASS_PART_RULES = {
  topWidthRatio: { minimum: 0.45, maximum: 1.25 },
  topDepthRatio: { minimum: 0.45, maximum: 1.25 },
  topOffsetXMm: { minimum: -2_000, maximum: 2_000 },
  topOffsetYMm: { minimum: -2_000, maximum: 2_000 },
} as const

export function massPartAddress(id: string): {
  division:
    | 'x2'
    | 'y2'
    | 'xy4'
    | 'hex6'
    | 'oct8'
    | 'rect-level'
    | 'hex-level'
    | 'oct-level'
  index: number
} | undefined {
  const divided = /^upper-mass-(x2|y2|xy4|hex6|oct8)-([1-8])$/.exec(id)
  if (divided) {
    const division = divided[1] as 'x2' | 'y2' | 'xy4' | 'hex6' | 'oct8'
    const limit = { x2: 2, y2: 2, xy4: 4, hex6: 6, oct8: 8 }[division]
    return Number(divided[2]) <= limit
      ? { division, index: Number(divided[2]) }
      : undefined
  }
  const level = /^upper-mass-(rect-level|hex-level|oct-level)-([1-4])$/.exec(id)
  if (!level) return undefined
  return {
    division: level[1] as 'rect-level' | 'hex-level' | 'oct-level',
    index: Number(level[2]),
  }
}

/** Divide both end faces in matching proportions: the untouched loft is exact. */
export function divideUpperMass(
  parent: BoxPiece | FrustumPiece,
  division: PilotiUpperMassDivision,
  overrides: readonly PilotiMassPartOverride[],
  stepScaleRatio = 1,
  stepOffset: Vec2 = [0, 0],
): readonly (BoxPiece | FrustumPiece)[] {
  if (division === 'whole') return [parent]
  if (isUpperMassLevelDivision(division)) {
    return divideUpperMassLevels(
      parent,
      'rectangle',
      division,
      stepScaleRatio,
      stepOffset,
      overrides,
    ) as readonly (BoxPiece | FrustumPiece)[]
  }
  const columns = division === 'y2' ? 1 : 2
  const rows = division === 'x2' ? 1 : 2
  const bottom = parent.kind === 'box' ? parent.size : parent.bottomSize
  const top = parent.kind === 'box' ? parent.size : parent.topSize
  const bottomOffset = parent.kind === 'box' ? [0, 0] : parent.bottomOffset
  const topOffset = parent.kind === 'box' ? [0, 0] : parent.topOffset
  const height = parent.kind === 'box' ? parent.size[2] : parent.height
  return Array.from({ length: columns * rows }, (_, index) => {
    const x = (index % columns + 0.5) / columns - 0.5
    const y = (Math.floor(index / columns) + 0.5) / rows - 0.5
    const id = `upper-mass-${division}-${index + 1}`
    const override = overrides.find((entry) => entry.partId === id)
    const width = bottom[0] / columns
    const depth = bottom[1] / rows
    const position = [
      parent.position[0] + bottomOffset[0] + bottom[0] * x,
      parent.position[1] + bottomOffset[1] + bottom[1] * y,
      parent.position[2],
    ] as const
    const base = { id, label: `Mass ${division.toUpperCase()} · ${index + 1}`, role: parent.role, position }
    if (override?.profile === 'block' || (!override && parent.kind === 'box')) {
      return { ...base, kind: 'box', size: [width, depth, height] }
    }
    return {
      ...base, kind: 'frustum', height, bottomSize: [width, depth], bottomOffset: [0, 0],
      topSize: override
        ? [width * override.topWidthRatio, depth * override.topDepthRatio]
        : [top[0] / columns, top[1] / rows],
      topOffset: override
        ? [override.topOffsetXMm, override.topOffsetYMm]
        : [topOffset[0] - bottomOffset[0] + (top[0] - bottom[0]) * x,
          topOffset[1] - bottomOffset[1] + (top[1] - bottom[1]) * y],
    }
  })
}

/** Capture the current face before the first independent edit, without a jump. */
export function massPartProfile(piece: BoxPiece | FrustumPiece | PolygonLoftPiece, partId = piece.id): PilotiMassPartOverride {
  if (piece.kind === 'polygon-loft') {
    const ratio = Math.max(0.45, Math.min(1.25, piece.topScale / piece.bottomScale))
    const centre = [0, 1].map((axis) => piece.footprint.reduce((sum, p) => sum + p[axis], 0) / piece.footprint.length)
    const noDrift = piece.topOffset.every(
      (value, axis) => value === piece.bottomOffset[axis],
    )
    return { partId, profile: ratio === 1 && noDrift ? 'block' : 'tapered',
      topWidthRatio: ratio, topDepthRatio: ratio,
      topOffsetXMm: piece.topOffset[0] - piece.bottomOffset[0] +
        (piece.topScale - piece.bottomScale) * centre[0],
      topOffsetYMm: piece.topOffset[1] - piece.bottomOffset[1] +
        (piece.topScale - piece.bottomScale) * centre[1] }
  }
  return {
    partId,
    profile: piece.kind === 'box' ? 'block' : 'tapered',
    topWidthRatio: piece.kind === 'box' ? 1 : Math.max(0.45, Math.min(1.25, piece.topSize[0] / piece.bottomSize[0])),
    topDepthRatio: piece.kind === 'box' ? 1 : Math.max(0.45, Math.min(1.25, piece.topSize[1] / piece.bottomSize[1])),
    topOffsetXMm: piece.kind === 'box' ? 0 : piece.topOffset[0] - piece.bottomOffset[0],
    topOffsetYMm: piece.kind === 'box' ? 0 : piece.topOffset[1] - piece.bottomOffset[1],
  }
}
