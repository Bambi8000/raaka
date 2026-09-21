import { sceneBounds } from './bounds'
import { massPartAddress } from './massDivision'
import {
  PILOTI_PARAMETER_RULES,
  PILOTI_PART_COPY_OFFSET_MM,
  PILOTI_SUPPORT_POSITION_MM,
  pilotiSupportAddress,
} from './pilotiParameters'
import type { MassStudy, ModelScale, PilotiParameters, Vec3 } from './types'

export type TranslationGizmoTarget =
  | {
      readonly kind: 'upper-mass'
      readonly key: 'upper-mass'
      readonly label: 'UPPER MASS · SHARED XY'
      readonly axes: 'xy'
      readonly anchorModelMm: Vec3
      readonly valueDesignMm: Vec3
      readonly minimumDesignMm: Vec3
      readonly maximumDesignMm: Vec3
    }
  | {
      readonly kind: 'support'
      readonly key: string
      readonly supportId: string
      readonly label: 'COMPLETE LEG · XY'
      readonly axes: 'xy'
      readonly anchorModelMm: Vec3
      readonly valueDesignMm: Vec3
      readonly minimumDesignMm: Vec3
      readonly maximumDesignMm: Vec3
    }
  | {
      readonly kind: 'copy'
      readonly key: string
      readonly copyId: string
      readonly label: 'COPY · XYZ'
      readonly axes: 'xyz'
      readonly anchorModelMm: Vec3
      readonly valueDesignMm: Vec3
      readonly minimumDesignMm: Vec3
      readonly maximumDesignMm: Vec3
    }

function partCopyIdForPiece(pieceId: string): string | undefined {
  return /^(?:upper-mass|support|shoulder)-(copy-\d+)$/.exec(pieceId)?.[1]
}

function supportIdForPiece(pieceId: string): string | undefined {
  const supportId = pieceId.startsWith('shoulder-')
    ? `support-${pieceId.slice('shoulder-'.length)}`
    : pieceId
  return pilotiSupportAddress(supportId) ? supportId : undefined
}

function centreOfStudyPieces(
  study: MassStudy,
  pieceIds: ReadonlySet<string>,
): Vec3 | undefined {
  const pieces = study.pieces.filter((piece) => pieceIds.has(piece.id))
  if (pieces.length === 0) return undefined
  const bounds = sceneBounds(pieces)
  return [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ]
}

/** Derive direct-manipulation intent from model truth; Three.js never owns it. */
export function translationGizmoTarget(
  parameters: PilotiParameters,
  selectedPieceId: string,
  study: MassStudy,
): TranslationGizmoTarget | undefined {
  const copyId = partCopyIdForPiece(selectedPieceId)
  if (copyId) {
    const copy = parameters.partCopies.find((candidate) => candidate.id === copyId)
    const anchor = centreOfStudyPieces(study, new Set([
      `upper-mass-${copyId}`,
      `support-${copyId}`,
      `shoulder-${copyId}`,
    ]))
    if (!copy || !anchor) return undefined
    return {
      kind: 'copy', key: `copy:${copyId}`, copyId, label: 'COPY · XYZ', axes: 'xyz',
      anchorModelMm: anchor,
      valueDesignMm: [copy.offsetXMm, copy.offsetYMm, copy.offsetZMm],
      minimumDesignMm: [
        PILOTI_PART_COPY_OFFSET_MM.minimum,
        PILOTI_PART_COPY_OFFSET_MM.minimum,
        PILOTI_PART_COPY_OFFSET_MM.minimum,
      ],
      maximumDesignMm: [
        PILOTI_PART_COPY_OFFSET_MM.maximum,
        PILOTI_PART_COPY_OFFSET_MM.maximum,
        PILOTI_PART_COPY_OFFSET_MM.maximum,
      ],
    }
  }

  const selectedPiece = study.pieces.find((piece) => piece.id === selectedPieceId)
  if (!selectedPiece) return undefined
  if (selectedPieceId === 'upper-mass' || massPartAddress(selectedPieceId)) {
    const ruleX = PILOTI_PARAMETER_RULES.upperOffsetXMm
    const ruleY = PILOTI_PARAMETER_RULES.upperOffsetYMm
    return {
      kind: 'upper-mass', key: 'upper-mass', label: 'UPPER MASS · SHARED XY', axes: 'xy',
      anchorModelMm: centreOfStudyPieces(study, new Set([selectedPieceId]))!,
      valueDesignMm: [parameters.upperOffsetXMm, parameters.upperOffsetYMm, 0],
      minimumDesignMm: [ruleX.minimum, ruleY.minimum, 0],
      maximumDesignMm: [ruleX.maximum, ruleY.maximum, 0],
    }
  }

  const supportId = supportIdForPiece(selectedPieceId)
  if (!supportId) return undefined
  const suffix = supportId.slice('support-'.length)
  const anchor = centreOfStudyPieces(study, new Set([supportId, `shoulder-${suffix}`]))
  if (!anchor) return undefined
  const position = parameters.supportPositionOverrides.find(
    (override) => override.supportId === supportId,
  )
  return {
    kind: 'support', key: `support:${supportId}`, supportId,
    label: 'COMPLETE LEG · XY', axes: 'xy', anchorModelMm: anchor,
    valueDesignMm: [position?.positionXMm ?? 0, position?.positionYMm ?? 0, 0],
    minimumDesignMm: [
      PILOTI_SUPPORT_POSITION_MM.minimum,
      PILOTI_SUPPORT_POSITION_MM.minimum,
      0,
    ],
    maximumDesignMm: [
      PILOTI_SUPPORT_POSITION_MM.maximum,
      PILOTI_SUPPORT_POSITION_MM.maximum,
      0,
    ],
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function compareSupportIds(
  left: { readonly supportId: string },
  right: { readonly supportId: string },
): number {
  const leftAddress = pilotiSupportAddress(left.supportId)
  const rightAddress = pilotiSupportAddress(right.supportId)
  if (!leftAddress || !rightAddress) return 0
  return (
    (leftAddress.planShape ?? '').localeCompare(rightAddress.planShape ?? '') ||
    leftAddress.row - rightAddress.row ||
    leftAddress.column - rightAddress.column
  )
}

/** Apply one absolute gizmo position to the parametric source of truth. */
export function applyTranslationGizmoValue(
  parameters: PilotiParameters,
  target: TranslationGizmoTarget,
  valueDesignMm: Vec3,
): PilotiParameters {
  if (target.kind === 'upper-mass') {
    return {
      ...parameters,
      upperOffsetXMm: valueDesignMm[0],
      upperOffsetYMm: valueDesignMm[1],
    }
  }

  if (target.kind === 'copy') {
    if (!parameters.partCopies.some((copy) => copy.id === target.copyId)) {
      return parameters
    }
    return {
      ...parameters,
      partCopies: parameters.partCopies.map((copy) => copy.id === target.copyId
        ? {
            ...copy,
            offsetXMm: valueDesignMm[0],
            offsetYMm: valueDesignMm[1],
            offsetZMm: valueDesignMm[2],
          }
        : copy),
    }
  }

  const foot = parameters.footOffsetOverrides.find(
    (override) => override.supportId === target.supportId,
  )
  const size = parameters.supportSizeOverrides.find(
    (override) => override.supportId === target.supportId,
  )
  const retainedFootOffsets = parameters.footOffsetOverrides.filter(
    (override) => override.supportId !== target.supportId,
  )
  const retainedSizes = parameters.supportSizeOverrides.filter(
    (override) => override.supportId !== target.supportId,
  )
  const retainedPositions = parameters.supportPositionOverrides.filter(
    (override) => override.supportId !== target.supportId,
  )
  return {
    ...parameters,
    footOffsetOverrides: [
      ...retainedFootOffsets,
      {
        supportId: target.supportId,
        footOffsetXMm: foot?.footOffsetXMm ?? parameters.footOffsetXMm,
        footOffsetYMm: foot?.footOffsetYMm ?? parameters.footOffsetYMm,
      },
    ].sort(compareSupportIds),
    supportSizeOverrides: [
      ...retainedSizes,
      {
        supportId: target.supportId,
        widthScale: size?.widthScale ?? 1,
        depthScale: size?.depthScale ?? 1,
      },
    ].sort(compareSupportIds),
    supportPositionOverrides: [
      ...retainedPositions,
      {
        supportId: target.supportId,
        positionXMm: valueDesignMm[0],
        positionYMm: valueDesignMm[1],
      },
    ].sort(compareSupportIds),
  }
}

/** Convert a physical viewport displacement back to snapped design millimetres. */
export function translatedGizmoValue(
  target: TranslationGizmoTarget,
  anchorModelMm: Vec3,
  modelScale: ModelScale,
): Vec3 {
  const translated = target.valueDesignMm.map((start, axis) => {
    if (target.axes === 'xy' && axis === 2) return start
    const deltaDesignMm =
      (anchorModelMm[axis] - target.anchorModelMm[axis]) / modelScale
    return clamp(
      Math.round(start + deltaDesignMm),
      target.minimumDesignMm[axis],
      target.maximumDesignMm[axis],
    )
  })
  return [translated[0], translated[1], translated[2]]
}
