import { mulberry32, randomBetween } from './random'
import { normalizePilotiParameters } from './pilotiParameters'
import { divideUpperMass } from './massDivision'
import { composePiloti } from './composePiloti'
import { generateRadialPiloti } from './radialPiloti'
import type {
  MassStudy,
  BoxPiece,
  FrustumPiece,
  PilotiParameters,
  RecipeSummary,
  ScenePiece,
} from './types'

const LINKED_FOOTPRINT_REFERENCE_COLUMNS = 3
const MEASUREMENT_EPSILON_MM = 1e-9
export { MAX_SEED } from './pilotiParameters'

export const RECIPES: readonly RecipeSummary[] = [
  {
    id: 'monolith',
    name: 'Monolith',
    description: 'One dominant mass cut by planes and deep voids.',
    available: false,
  },
  {
    id: 'piloti',
    name: 'Piloti',
    description: 'A heavy upper mass carried by faceted funnel supports.',
    available: true,
  },
  {
    id: 'silos',
    name: 'Silos',
    description: 'Clusters of monumental faceted storage towers.',
    available: false,
  },
  {
    id: 'ziggurat',
    name: 'Ziggurat',
    description: 'Stepped masses that shift, taper and turn.',
    available: false,
  },
  {
    id: 'lamella-tower',
    name: 'Lamella tower',
    description: 'Slender vertical plates with deep articulation.',
    available: false,
  },
  {
    id: 'gate',
    name: 'Gate',
    description: 'Two uprights composed around one dominant void.',
    available: false,
  },
]

export const DEFAULT_PILOTI_PARAMETERS: PilotiParameters = {
  planShape: 'rectangle',
  polygonMassDivision: 'whole',
  radialSpreadRatio: 1,
  seed: 318,
  heightMm: 1_500,
  supportCount: 3,
  supportRowCount: 1,
  rowSpacingMm: 300,
  supportDepthRatio: 0.92,
  supportHeightRatio: 0.42,
  shoulderRatio: 0.48,
  shoulderMode: 'divided',
  neckWidthRatio: 0.34,
  upperWidthRatio: 0.72,
  upperDepthRatio: 0.34,
  upperFootprintMode: 'linked',
  upperOffsetXMm: 0,
  upperOffsetYMm: 0,
  upperMassProfile: 'block',
  upperMassDivision: 'whole',
  massPartOverrides: [],
  upperTopWidthRatio: 0.72,
  upperTopDepthRatio: 0.84,
  upperTopOffsetXMm: 120,
  upperTopOffsetYMm: 0,
  asymmetry: 0.12,
  footOffsetXMm: 0,
  footOffsetYMm: 0,
  footOffsetOverrides: [],
  supportSizeOverrides: [],
  supportPositionOverrides: [],
  partCopies: [],
  fuseGroups: [],
  removedPartIds: [],
}

function nonNegativeMeasurement(value: number): number {
  return value > MEASUREMENT_EPSILON_MM ? value : 0
}

export function generatePiloti(input: PilotiParameters): MassStudy {
  const parameters = normalizePilotiParameters(input)
  if (parameters.planShape !== 'rectangle') return generateRadialPiloti(parameters)
  const random = mulberry32(parameters.seed)
  const height = parameters.heightMm
  const supportHeight = height * parameters.supportHeightRatio
  const shoulderHeight = supportHeight * parameters.shoulderRatio
  const stemHeight = supportHeight - shoulderHeight
  const upperHeight = height - supportHeight
  const baseUpperWidth = height * parameters.upperWidthRatio
  const baseUpperDepth = height * parameters.upperDepthRatio
  const upperWidth =
    parameters.upperFootprintMode === 'linked'
      ? baseUpperWidth *
        (parameters.supportCount / LINKED_FOOTPRINT_REFERENCE_COLUMNS)
      : baseUpperWidth
  const upperDepth =
    parameters.upperFootprintMode === 'linked'
      ? baseUpperDepth +
        parameters.rowSpacingMm * (parameters.supportRowCount - 1)
      : baseUpperDepth
  const shoulderDepth =
    (parameters.upperFootprintMode === 'linked'
      ? baseUpperDepth
      : upperDepth) * parameters.supportDepthRatio
  const bayWidth = upperWidth / parameters.supportCount
  const pieces: ScenePiece[] = []
  const removedPartIds = new Set(parameters.removedPartIds)
  const footOffsetOverrides = new Map(
    parameters.footOffsetOverrides.map((override) => [
      override.supportId,
      override,
    ]),
  )
  const supportSizeOverrides = new Map(
    parameters.supportSizeOverrides.map((override) => [
      override.supportId,
      override,
    ]),
  )
  const supportPositionOverrides = new Map(
    parameters.supportPositionOverrides.map((override) => [
      override.supportId,
      override,
    ]),
  )
  const shoulderBearings: {
    readonly row: number
    readonly column: number
    readonly centreX: number
    readonly centreY: number
    readonly width: number
    readonly depth: number
  }[] = []
  const supportShift =
    randomBetween(random, -1, 1) * parameters.asymmetry * bayWidth * 0.45
  const massShift =
    randomBetween(random, -1, 1) * parameters.asymmetry * bayWidth * 0.65
  const upperCentreX = massShift + parameters.upperOffsetXMm
  const upperCentreY = parameters.upperOffsetYMm

  for (let rowIndex = 0; rowIndex < parameters.supportRowCount; rowIndex += 1) {
    const rowNumber = rowIndex + 1
    const rowCentre =
      (rowIndex - (parameters.supportRowCount - 1) / 2) *
      parameters.rowSpacingMm

    for (let columnIndex = 0; columnIndex < parameters.supportCount; columnIndex += 1) {
      const columnNumber = columnIndex + 1
      const supportSuffix =
        rowNumber === 1
          ? String(columnNumber)
          : `r${rowNumber}-c${columnNumber}`
      const supportId = `support-${supportSuffix}`
      const footOffsetOverride = footOffsetOverrides.get(supportId)
      const supportSizeOverride = supportSizeOverrides.get(supportId)
      const supportPositionOverride = supportPositionOverrides.get(supportId)
      const widthScale = supportSizeOverride?.widthScale ?? 1
      const depthScale = supportSizeOverride?.depthScale ?? 1
      const positionX = supportPositionOverride?.positionXMm ?? 0
      const positionY = supportPositionOverride?.positionYMm ?? 0
      const bayCentre =
        -upperWidth / 2 + bayWidth * (columnIndex + 0.5) + supportShift
      const massBayCentre =
        -upperWidth / 2 + bayWidth * (columnIndex + 0.5) + upperCentreX
      const supportCentreX = bayCentre + positionX
      const supportCentreY = rowCentre + positionY
      const individualShift =
        randomBetween(random, -1, 1) * parameters.asymmetry * bayWidth * 0.16
      const neckWidth = bayWidth * parameters.neckWidthRatio * widthScale
      const neckDepth =
        shoulderDepth *
        ((0.34 + parameters.neckWidthRatio * 0.32) / 0.92) *
        depthScale
      const footWidth = neckWidth * 1.18
      const footDepth = neckDepth * 1.16
      const shoulderTopWidth =
        bayWidth * (parameters.shoulderMode === 'shared' ? 1 : 0.92) * widthScale
      const shoulderTopDepth = shoulderDepth * depthScale
      const shoulderBasePositionX = bayCentre + individualShift * 0.8
      const shoulderPositionX = shoulderBasePositionX + positionX
      const shoulderTopOffsetX =
        parameters.upperFootprintMode === 'linked' ||
        parameters.shoulderMode === 'shared'
          ? massBayCentre - shoulderBasePositionX
          : -individualShift * 0.45
      const shoulderTopOffsetY =
        parameters.upperFootprintMode === 'linked' ? upperCentreY : 0
      const shoulderCentreX = shoulderPositionX + shoulderTopOffsetX
      const shoulderCentreY = supportCentreY + shoulderTopOffsetY

      pieces.push({
        kind: 'frustum',
        id: supportId,
        label: `Support C${columnNumber} / R${rowNumber}`,
        role: 'support',
        position: [
          supportCentreX + individualShift,
          supportCentreY,
          stemHeight / 2,
        ],
        height: stemHeight,
        bottomSize: [footWidth, footDepth],
        topSize: [neckWidth, neckDepth],
        bottomOffset: [
          footOffsetOverride?.footOffsetXMm ?? parameters.footOffsetXMm,
          footOffsetOverride?.footOffsetYMm ?? parameters.footOffsetYMm,
        ],
        topOffset: [-individualShift * 0.2, 0],
      })

      pieces.push({
        kind: 'frustum',
        id: `shoulder-${supportSuffix}`,
        label: `Shoulder C${columnNumber} / R${rowNumber}`,
        role: 'support',
        position: [
          shoulderPositionX,
          supportCentreY,
          stemHeight + shoulderHeight / 2,
        ],
        height: shoulderHeight,
        bottomSize: [neckWidth, neckDepth],
        topSize: [shoulderTopWidth, shoulderTopDepth],
        bottomOffset: [0, 0],
        topOffset: [shoulderTopOffsetX, shoulderTopOffsetY],
      })
      if (!removedPartIds.has(supportId)) shoulderBearings.push({
        row: rowNumber,
        column: columnNumber,
        centreX: shoulderCentreX,
        centreY: shoulderCentreY,
        width: shoulderTopWidth,
        depth: shoulderTopDepth,
      })
    }
  }

  const upperMass: BoxPiece | FrustumPiece =
    parameters.upperMassProfile === 'block'
      ? {
          kind: 'box',
          id: 'upper-mass',
          label: 'Upper mass',
          role: 'mass',
          position: [
            upperCentreX,
            upperCentreY,
            supportHeight + upperHeight / 2,
          ],
          size: [upperWidth, upperDepth, upperHeight],
        }
      : {
          kind: 'frustum',
          id: 'upper-mass',
          label: 'Upper mass',
          role: 'mass',
          position: [
            upperCentreX,
            upperCentreY,
            supportHeight + upperHeight / 2,
          ],
          height: upperHeight,
          bottomSize: [upperWidth, upperDepth],
          topSize: [
            upperWidth * parameters.upperTopWidthRatio,
            upperDepth * parameters.upperTopDepthRatio,
          ],
          bottomOffset: [0, 0],
          topOffset: [
            parameters.upperTopOffsetXMm,
            parameters.upperTopOffsetYMm,
          ],
        }
  pieces.push(...divideUpperMass(upperMass, parameters.upperMassDivision, parameters.massPartOverrides))

  const study = composePiloti(parameters, pieces, upperMass)
  const intervalOverlap = (
    firstCentre: number,
    firstSize: number,
    secondCentre: number,
    secondSize: number,
  ) =>
    nonNegativeMeasurement(
      Math.min(firstCentre + firstSize / 2, secondCentre + secondSize / 2) -
        Math.max(firstCentre - firstSize / 2, secondCentre - secondSize / 2),
    )
  const intervalGap = (
    firstCentre: number,
    firstSize: number,
    secondCentre: number,
    secondSize: number,
  ) =>
    nonNegativeMeasurement(
      Math.abs(secondCentre - firstCentre) - (firstSize + secondSize) / 2,
    )
  let adjacentRowOverlapMm = 0
  let adjacentColumnOverlapMm = 0
  let adjacentColumnGapMm = 0
  let nonAdjacentBearingOverlapMm = 0
  for (let firstIndex = 0; firstIndex < shoulderBearings.length; firstIndex += 1) {
    const first = shoulderBearings[firstIndex]
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < shoulderBearings.length;
      secondIndex += 1
    ) {
      const second = shoulderBearings[secondIndex]
      const overlapX = intervalOverlap(
        first.centreX,
        first.width,
        second.centreX,
        second.width,
      )
      const overlapY = intervalOverlap(
        first.centreY,
        first.depth,
        second.centreY,
        second.depth,
      )
      const isAdjacentRow =
        Math.abs(second.row - first.row) === 1 &&
        second.column === first.column
      const isAdjacentColumn =
        Math.abs(second.column - first.column) === 1 &&
        second.row === first.row

      if (isAdjacentColumn) {
        adjacentColumnGapMm = Math.max(
          adjacentColumnGapMm,
          Math.hypot(
            intervalGap(
              first.centreX,
              first.width,
              second.centreX,
              second.width,
            ),
            intervalGap(
              first.centreY,
              first.depth,
              second.centreY,
              second.depth,
            ),
          ),
        )
      }

      if (overlapX === 0 || overlapY === 0) continue

      if (isAdjacentRow) {
        adjacentRowOverlapMm = Math.max(
          adjacentRowOverlapMm,
          overlapY,
        )
      } else if (isAdjacentColumn) {
        adjacentColumnOverlapMm = Math.max(
          adjacentColumnOverlapMm,
          overlapX,
        )
      } else {
        nonAdjacentBearingOverlapMm = Math.max(
          nonAdjacentBearingOverlapMm,
          Math.min(overlapX, overlapY),
        )
      }
    }
  }
  const massMinX = upperCentreX - upperWidth / 2
  const massMaxX = upperCentreX + upperWidth / 2
  const massMinY = upperCentreY - upperDepth / 2
  const massMaxY = upperCentreY + upperDepth / 2
  const bearingOverhangMm = nonNegativeMeasurement(
    shoulderBearings.reduce(
      (maximum, bearing) =>
        Math.max(
          maximum,
          massMinY - (bearing.centreY - bearing.depth / 2),
          bearing.centreY + bearing.depth / 2 - massMaxY,
        ),
      0,
    ),
  )
  const sideBearingOverhangMm = nonNegativeMeasurement(
    shoulderBearings.reduce(
      (maximum, bearing) =>
        Math.max(
          maximum,
          massMinX - (bearing.centreX - bearing.width / 2),
          bearing.centreX + bearing.width / 2 - massMaxX,
        ),
      0,
    ),
  )

  return {
    ...study,
    supportLayout: {
      columns: parameters.supportCount,
      rows: parameters.supportRowCount,
      totalSupports: shoulderBearings.length,
      rowSpacingMm: parameters.rowSpacingMm,
      shoulderDepthMm: shoulderDepth,
      adjacentRowOverlapMm,
      adjacentColumnOverlapMm,
      adjacentColumnGapMm,
      nonAdjacentBearingOverlapMm,
      bearingOverhangMm: removedPartIds.has('upper-mass') ? 0 : bearingOverhangMm,
      sideBearingOverhangMm: removedPartIds.has('upper-mass') ? 0 : sideBearingOverhangMm,
    },
  }
}
