import type {
  BoxPiece,
  FrustumPiece,
  PilotiMassPartOverride,
  PilotiPlanShape,
  PilotiPolygonMassDivision,
  PilotiUpperMassDivision,
  PilotiUpperMassLevelDivision,
  PolygonLoftPiece,
  Size2,
  Vec2,
} from './types'

type AnalyticUpperMass = BoxPiece | FrustumPiece | PolygonLoftPiece

export const UPPER_MASS_LEVEL_DIVISIONS = [
  { value: 'z2', label: '2 · Z', description: 'TWO LEVELS' },
  { value: 'z3', label: '3 · Z', description: 'THREE LEVELS' },
  { value: 'z4', label: '4 · Z', description: 'FOUR LEVELS' },
] as const

export function upperMassLevelCount(
  division: PilotiUpperMassDivision | PilotiPolygonMassDivision,
): 2 | 3 | 4 | undefined {
  if (division === 'z2') return 2
  if (division === 'z3') return 3
  if (division === 'z4') return 4
  return undefined
}

export function upperMassLevelPrefix(planShape: PilotiPlanShape): 'rect-level' | 'hex-level' | 'oct-level' {
  if (planShape === 'hexagon') return 'hex-level'
  if (planShape === 'octagon') return 'oct-level'
  return 'rect-level'
}

export function isUpperMassLevelDivision(
  value: unknown,
): value is PilotiUpperMassLevelDivision {
  return value === 'z2' || value === 'z3' || value === 'z4'
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpSize(a: Size2, b: Size2, t: number): Size2 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}

function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}

function scaledSize(size: Size2, scale: number): Size2 {
  return [size[0] * scale, size[1] * scale]
}

function pointWithStep(point: Vec2, level: number, offset: Vec2): Vec2 {
  return [point[0] + offset[0] * level, point[1] + offset[1] * level]
}

function rectangularLevel(
  parent: BoxPiece | FrustumPiece,
  level: number,
  count: number,
  stepScaleRatio: number,
  stepOffset: Vec2,
  override: PilotiMassPartOverride | undefined,
): BoxPiece | FrustumPiece {
  const t0 = level / count
  const t1 = (level + 1) / count
  const parentHeight = parent.kind === 'box' ? parent.size[2] : parent.height
  const parentBottomSize: Size2 = parent.kind === 'box' ? [parent.size[0], parent.size[1]] : parent.bottomSize
  const parentTopSize: Size2 = parent.kind === 'box' ? parentBottomSize : parent.topSize
  const parentBottomOffset: Vec2 = parent.kind === 'box' ? [0, 0] : parent.bottomOffset
  const parentTopOffset: Vec2 = parent.kind === 'box' ? [0, 0] : parent.topOffset
  const levelScale = stepScaleRatio ** level
  const inheritedBottomSize = scaledSize(lerpSize(parentBottomSize, parentTopSize, t0), levelScale)
  const inheritedTopSize = scaledSize(lerpSize(parentBottomSize, parentTopSize, t1), levelScale)
  const inheritedBottomOffset = pointWithStep(
    lerpPoint(parentBottomOffset, parentTopOffset, t0),
    level,
    stepOffset,
  )
  const inheritedTopOffset = pointWithStep(
    lerpPoint(parentBottomOffset, parentTopOffset, t1),
    level,
    stepOffset,
  )
  const levelHeight = parentHeight / count
  const id = `upper-mass-rect-level-${level + 1}`
  const label = `Upper level ${level + 1} / ${count}`
  const position = [
    parent.position[0],
    parent.position[1],
    parent.position[2] - parentHeight / 2 + levelHeight * (level + 0.5),
  ] as const
  const block = override?.profile === 'block'
  const bottomSize = inheritedBottomSize
  const topSize = override
    ? (block
        ? bottomSize
        : [
            bottomSize[0] * override.topWidthRatio,
            bottomSize[1] * override.topDepthRatio,
          ] as const)
    : inheritedTopSize
  const bottomOffset = inheritedBottomOffset
  const topOffset = override
    ? (block
        ? bottomOffset
        : [
            bottomOffset[0] + override.topOffsetXMm,
            bottomOffset[1] + override.topOffsetYMm,
          ] as const)
    : inheritedTopOffset
  const isBox = topSize[0] === bottomSize[0] && topSize[1] === bottomSize[1] &&
    topOffset[0] === bottomOffset[0] && topOffset[1] === bottomOffset[1]
  if (isBox) {
    return {
      kind: 'box',
      id,
      label,
      role: parent.role,
      position: [
        position[0] + bottomOffset[0],
        position[1] + bottomOffset[1],
        position[2],
      ],
      size: [bottomSize[0], bottomSize[1], levelHeight],
    }
  }
  return {
    kind: 'frustum',
    id,
    label,
    role: parent.role,
    position,
    height: levelHeight,
    bottomSize,
    topSize,
    bottomOffset,
    topOffset,
  }
}

function polygonLevel(
  parent: PolygonLoftPiece,
  planShape: Exclude<PilotiPlanShape, 'rectangle'>,
  level: number,
  count: number,
  stepScaleRatio: number,
  stepOffset: Vec2,
  override: PilotiMassPartOverride | undefined,
): PolygonLoftPiece {
  const t0 = level / count
  const t1 = (level + 1) / count
  const levelScale = stepScaleRatio ** level
  const inheritedBottomScale = lerp(parent.bottomScale, parent.topScale, t0) * levelScale
  const inheritedTopScale = lerp(parent.bottomScale, parent.topScale, t1) * levelScale
  const inheritedBottomOffset = pointWithStep(
    lerpPoint(parent.bottomOffset, parent.topOffset, t0),
    level,
    stepOffset,
  )
  const inheritedTopOffset = pointWithStep(
    lerpPoint(parent.bottomOffset, parent.topOffset, t1),
    level,
    stepOffset,
  )
  const levelHeight = parent.height / count
  const block = override?.profile === 'block'
  const topScale = override
    ? (block ? inheritedBottomScale : inheritedBottomScale * override.topWidthRatio)
    : inheritedTopScale
  const topOffset: Vec2 = override
    ? (block
        ? inheritedBottomOffset
        : [
            inheritedBottomOffset[0] + override.topOffsetXMm,
            inheritedBottomOffset[1] + override.topOffsetYMm,
          ])
    : inheritedTopOffset
  return {
    ...parent,
    id: `upper-mass-${upperMassLevelPrefix(planShape)}-${level + 1}`,
    label: `Upper level ${level + 1} / ${count}`,
    position: [
      parent.position[0],
      parent.position[1],
      parent.position[2] - parent.height / 2 + levelHeight * (level + 0.5),
    ],
    height: levelHeight,
    bottomScale: inheritedBottomScale,
    topScale,
    bottomOffset: inheritedBottomOffset,
    topOffset,
  }
}

/** Slice the parent in Z, then apply one cumulative planar step per level. */
export function divideUpperMassLevels(
  parent: AnalyticUpperMass,
  planShape: PilotiPlanShape,
  division: PilotiUpperMassLevelDivision,
  stepScaleRatio: number,
  stepOffset: Vec2,
  overrides: readonly PilotiMassPartOverride[],
): readonly AnalyticUpperMass[] {
  const count = upperMassLevelCount(division)
  if (count === undefined) return [parent]
  const prefix = upperMassLevelPrefix(planShape)
  return Array.from({ length: count }, (_, level) => {
    const id = `upper-mass-${prefix}-${level + 1}`
    const override = overrides.find((entry) => entry.partId === id)
    if (parent.kind === 'polygon-loft') {
      if (planShape === 'rectangle') {
        throw new RangeError('A polygon upper mass requires a polygon plan shape.')
      }
      return polygonLevel(
        parent,
        planShape,
        level,
        count,
        stepScaleRatio,
        stepOffset,
        override,
      )
    }
    if (planShape !== 'rectangle') {
      throw new RangeError('A rectangular upper mass requires the rectangle plan shape.')
    }
    return rectangularLevel(
      parent,
      level,
      count,
      stepScaleRatio,
      stepOffset,
      override,
    )
  })
}
