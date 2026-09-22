import { MASS_DIVISIONS, MASS_PART_RULES, massPartAddress } from './massDivision'
import type {
  NumericParameterDefinition,
  ParameterUnit,
  RecipeParameterSchema,
} from './parameterSchema'
import type {
  PilotiMassPartOverride,
  PilotiPolygonMassDivision,
  PilotiUpperMassDivision,
  PilotiFootOffsetOverride,
  PilotiFootOffsetSpace,
  PilotiFuseGroup,
  PilotiPartCopy,
  PilotiUpperFootprintMode,
  PilotiParameters,
  PilotiShoulderMode,
  PilotiSupportPositionOverride,
  PilotiSupportSizeOverride,
  PilotiUpperMassProfile,
  PilotiPlanShape,
  PilotiRandomLock,
  PilotiRetainedCoreMode,
} from './types'

export const MAX_SEED = 0xffff_ffff
export const DEFAULT_CONCRETE_DENSITY_KG_M3 = 2_400
export const DEFAULT_RETAINED_CORE_DENSITY_KG_M3 = 30

export const PILOTI_SUPPORT_SIZE_SCALE = {
  minimum: 0.55,
  maximum: 1.45,
} as const

export const PILOTI_SUPPORT_POSITION_MM = {
  minimum: -300,
  maximum: 300,
} as const

export const PILOTI_PART_COPY_LIMIT = 24
export const PILOTI_FUSE_GROUP_LIMIT = 12
export const PILOTI_FUSE_PART_LIMIT = 24
export const PILOTI_RANDOM_LOCK_LIMIT = 33

export const PILOTI_PART_COPY_OFFSET_MM = {
  minimum: -2_000,
  maximum: 2_000,
} as const

export function isPilotiShoulderMode(
  value: unknown,
): value is PilotiShoulderMode {
  return value === 'divided' || value === 'shared'
}

function normalizeShoulderMode(value: unknown): PilotiShoulderMode {
  if (!isPilotiShoulderMode(value)) {
    throw new RangeError(
      'Piloti parameter "shoulderMode" must be "divided" or "shared".',
    )
  }
  return value
}

export function isPilotiUpperFootprintMode(
  value: unknown,
): value is PilotiUpperFootprintMode {
  return value === 'linked' || value === 'detached'
}

function normalizeUpperFootprintMode(
  value: unknown,
): PilotiUpperFootprintMode {
  if (!isPilotiUpperFootprintMode(value)) {
    throw new RangeError(
      'Piloti parameter "upperFootprintMode" must be "linked" or "detached".',
    )
  }
  return value
}

export function isPilotiUpperMassProfile(
  value: unknown,
): value is PilotiUpperMassProfile {
  return value === 'block' || value === 'tapered'
}

function normalizeUpperMassProfile(value: unknown): PilotiUpperMassProfile {
  if (!isPilotiUpperMassProfile(value)) {
    throw new RangeError(
      'Piloti parameter "upperMassProfile" must be "block" or "tapered".',
    )
  }
  return value
}

function numericParameter(
  label: string,
  group: string,
  unit: ParameterUnit,
  minimum: number,
  maximum: number,
  integer = false,
): NumericParameterDefinition {
  return {
    kind: 'number',
    label,
    group,
    unit,
    minimum,
    maximum,
    ...(integer ? { integer: true } : {}),
  }
}

export const PILOTI_NUMERIC_PARAMETER_SCHEMA = {
  radialSpreadRatio: numericParameter('Radial spread', 'Plan', 'ratio', 0.55, 1.45),
  seed: numericParameter('Seed', 'Variation', 'seed', 0, MAX_SEED, true),
  heightMm: numericParameter('Design height', 'Composition', 'mm', 1_000, 2_000),
  supportCount: numericParameter('Columns', 'Support grid', 'count', 1, 6, true),
  supportRowCount: numericParameter('Rows', 'Support grid', 'count', 1, 3, true),
  rowSpacingMm: numericParameter('Row spacing', 'Support grid', 'mm', 100, 800),
  supportDepthRatio: numericParameter('Support depth', 'Support family', 'ratio', 0.25, 0.92),
  supportHeightRatio: numericParameter('Support height', 'Support family', 'ratio', 0.25, 0.58),
  shoulderRatio: numericParameter('Shoulder height', 'Support family', 'ratio', 0.2, 0.8),
  neckWidthRatio: numericParameter('Neck width', 'Support family', 'ratio', 0.18, 0.7),
  footFlareRatio: numericParameter('Foot flare', 'Support family', 'ratio', 0.6, 1.8),
  bearingScaleRatio: numericParameter('Bearing scale', 'Support family', 'ratio', 0.65, 1.25),
  upperWidthRatio: numericParameter('Upper width', 'Upper mass', 'ratio', 0.4, 1.1),
  upperDepthRatio: numericParameter('Upper depth', 'Upper mass', 'ratio', 0.2, 0.65),
  upperOffsetXMm: numericParameter('Upper offset X', 'Upper mass', 'mm', -400, 400),
  upperOffsetYMm: numericParameter('Upper offset Y', 'Upper mass', 'mm', -400, 400),
  upperTopWidthRatio: numericParameter('Top width', 'Upper mass profile', 'ratio', 0.45, 1.25),
  upperTopDepthRatio: numericParameter('Top depth', 'Upper mass profile', 'ratio', 0.45, 1.25),
  upperTopOffsetXMm: numericParameter('Top offset X', 'Upper mass profile', 'mm', -400, 400),
  upperTopOffsetYMm: numericParameter('Top offset Y', 'Upper mass profile', 'mm', -400, 400),
  upperStepScaleRatio: numericParameter('Level scale', 'Upper level step', 'ratio', 0.65, 1.15),
  upperStepOffsetXMm: numericParameter('Level step X', 'Upper level step', 'mm', -300, 300),
  upperStepOffsetYMm: numericParameter('Level step Y', 'Upper level step', 'mm', -300, 300),
  concreteDensityKgM3: numericParameter('Concrete density', 'Materials', 'kg/m3', 800, 4_000, true),
  retainedCoreScale: numericParameter('Core size', 'Retained core', 'ratio', 0.35, 0.85),
  retainedCoreDensityKgM3: numericParameter('Retained core density', 'Materials', 'kg/m3', 10, 500, true),
  asymmetry: numericParameter('Asymmetry', 'Variation', 'ratio', 0, 0.5),
  footOffsetXMm: numericParameter('Foot offset X', 'Support lean', 'mm', -300, 300),
  footOffsetYMm: numericParameter('Foot offset Y', 'Support lean', 'mm', -300, 300),
} as const

function choiceParameter<Option extends string>(
  label: string,
  group: string,
  options: readonly Option[],
) {
  return { kind: 'choice', label, group, options } as const
}

function collectionParameter(
  label: string,
  group: string,
  itemIdentity: string,
) {
  return { kind: 'collection', label, group, itemIdentity } as const
}

export const PILOTI_PARAMETER_SCHEMA = {
  ...PILOTI_NUMERIC_PARAMETER_SCHEMA,
  planShape: choiceParameter('Plan shape', 'Plan', ['rectangle', 'hexagon', 'octagon']),
  polygonMassDivision: choiceParameter('Polygon mass division', 'Upper mass', ['whole', 'sectors', 'z2', 'z3', 'z4']),
  shoulderMode: choiceParameter('Shoulder topology', 'Support family', ['divided', 'shared']),
  upperFootprintMode: choiceParameter('Upper footprint', 'Upper mass', ['linked', 'detached']),
  upperMassProfile: choiceParameter('Upper mass profile', 'Upper mass profile', ['block', 'tapered']),
  upperMassDivision: choiceParameter('Upper mass division', 'Upper mass', ['whole', 'x2', 'y2', 'xy4', 'z2', 'z3', 'z4']),
  retainedCoreMode: choiceParameter('Retained core', 'Retained core', ['none', 'upper-mass']),
  footOffsetSpace: choiceParameter('Foot offset space', 'Support lean', ['global', 'centered']),
  massPartOverrides: collectionParameter('Mass part overrides', 'Authored parts', 'partId'),
  randomLocks: collectionParameter('Variation locks', 'Variation', 'targetId'),
  footOffsetOverrides: collectionParameter('Support lean overrides', 'Authored supports', 'supportId'),
  supportSizeOverrides: collectionParameter('Support size overrides', 'Authored supports', 'supportId'),
  supportPositionOverrides: collectionParameter('Support position overrides', 'Authored supports', 'supportId'),
  partCopies: collectionParameter('Part copies', 'Composition', 'id'),
  fuseGroups: collectionParameter('Fuse groups', 'Composition', 'id'),
  removedPartIds: collectionParameter('Removed parts', 'Composition', 'value'),
} as const satisfies RecipeParameterSchema<PilotiParameters>

export type NumericPilotiParameter = keyof typeof PILOTI_NUMERIC_PARAMETER_SCHEMA

/** Compatibility name for consumers that need numeric bounds only. */
export const PILOTI_PARAMETER_RULES = PILOTI_NUMERIC_PARAMETER_SCHEMA

export function isPilotiRetainedCoreMode(
  value: unknown,
): value is PilotiRetainedCoreMode {
  return value === 'none' || value === 'upper-mass'
}

function readRetainedCoreMode(value: unknown): PilotiRetainedCoreMode {
  if (!isPilotiRetainedCoreMode(value)) {
    throw new ProjectValidationError(
      'Parameter "retainedCoreMode" must be "none" or "upper-mass".',
    )
  }
  return value
}

function normalizeValue(
  value: number,
  name: NumericPilotiParameter,
): number {
  const rule = PILOTI_PARAMETER_RULES[name]
  if (!Number.isFinite(value)) {
    throw new RangeError(`Piloti parameter "${name}" must be finite.`)
  }
  const constrained = Math.min(
    rule.maximum,
    Math.max(rule.minimum, value),
  )
  return 'integer' in rule && rule.integer
    ? Math.round(constrained)
    : constrained
}

export interface PilotiSupportAddress {
  readonly planShape?: 'hexagon' | 'octagon'
  readonly row: number
  readonly column: number
}

export function pilotiSupportAddress(
  value: string,
): PilotiSupportAddress | undefined {
  const radial = /^support-(hex|oct)-([1-8])$/.exec(value)
  if (radial) {
    const limit = radial[1] === 'hex' ? 6 : 8
    return Number(radial[2]) <= limit
      ? { row: 1, column: Number(radial[2]), planShape: radial[1] === 'hex' ? 'hexagon' : 'octagon' }
      : undefined
  }
  const firstRowMatch = /^support-(\d+)$/.exec(value)
  if (firstRowMatch) {
    const column = Number(firstRowMatch[1])
    if (
      Number.isInteger(column) &&
      column >= 1 &&
      column <= PILOTI_PARAMETER_RULES.supportCount.maximum &&
      value === `support-${column}`
    ) {
      return { row: 1, column }
    }
    return undefined
  }

  const gridMatch = /^support-r(\d+)-c(\d+)$/.exec(value)
  if (!gridMatch) return undefined
  const row = Number(gridMatch[1])
  const column = Number(gridMatch[2])
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(column) ||
    row < 2 ||
    row > PILOTI_PARAMETER_RULES.supportRowCount.maximum ||
    column < 1 ||
    column > PILOTI_PARAMETER_RULES.supportCount.maximum ||
    value !== `support-r${row}-c${column}`
  ) {
    return undefined
  }
  return { row, column }
}

export function isPilotiSupportId(value: string): boolean {
  return pilotiSupportAddress(value) !== undefined
}

export function isPilotiRandomLockTargetId(value: string): boolean {
  return value === 'upper-mass' || isPilotiSupportId(value)
}

export function isPilotiPartCopyId(value: string): boolean {
  const match = /^copy-(\d+)$/.exec(value)
  if (!match) return false
  const number = Number(match[1])
  return (
    Number.isInteger(number) &&
    number >= 1 &&
    number <= 9_999 &&
    value === `copy-${number}`
  )
}

export function isPilotiPartCopySourceId(value: string): boolean {
  return value === 'upper-mass' || massPartAddress(value) !== undefined || isPilotiSupportId(value)
}

function readRemovedPartIds(
  value: unknown,
  copies: readonly PilotiPartCopy[],
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new ProjectValidationError('Parameter "removedPartIds" must be an array.')
  }
  const seen = new Set<string>()
  return value.map((id: unknown) => {
    if (
      typeof id !== 'string' ||
      (!isPilotiPartCopySourceId(id) && !copies.some((copy) => copy.id === id))
    ) {
      throw new ProjectValidationError(
        'Every removed part must name an upper mass, support or existing copy.',
      )
    }
    if (seen.has(id)) {
      throw new ProjectValidationError(`Removed part "${id}" is duplicated.`)
    }
    seen.add(id)
    return id
  })
}

export function isPilotiFuseGroupId(value: string): boolean {
  const match = /^fuse-(\d+)$/.exec(value)
  if (!match) return false
  const number = Number(match[1])
  return (
    Number.isInteger(number) &&
    number >= 1 &&
    number <= 9_999 &&
    value === `fuse-${number}`
  )
}

export function isPilotiFusePieceId(value: string): boolean {
  if (isPilotiPartCopySourceId(value)) return true
  if (
    value.startsWith('shoulder-') &&
    isPilotiSupportId(`support-${value.slice('shoulder-'.length)}`)
  ) {
    return true
  }
  const copyMatch = /^(?:upper-mass|support|shoulder)-(copy-\d+)$/.exec(value)
  return copyMatch !== null && isPilotiPartCopyId(copyMatch[1])
}

function normalizeFuseGroups(
  input: readonly PilotiFuseGroup[],
): readonly PilotiFuseGroup[] {
  if (!Array.isArray(input)) {
    throw new RangeError('Piloti fuse groups must be an array.')
  }
  if (input.length > PILOTI_FUSE_GROUP_LIMIT) {
    throw new RangeError(
      `Piloti supports at most ${PILOTI_FUSE_GROUP_LIMIT} fuse groups.`,
    )
  }

  const groups: readonly PilotiFuseGroup[] = input
  const groupIds = new Set<string>()
  const usedPieceIds = new Set<string>()
  return groups.map((group) => {
    if (
      typeof group !== 'object' ||
      group === null ||
      !isPilotiFuseGroupId(group.id)
    ) {
      throw new RangeError('Piloti fuse group has an invalid group ID.')
    }
    if (groupIds.has(group.id)) {
      throw new RangeError(`Piloti fuse group "${group.id}" is duplicated.`)
    }
    if (!Array.isArray(group.pieceIds)) {
      throw new RangeError(`Piloti fuse group "${group.id}" needs a piece list.`)
    }
    const inputPieceIds: readonly string[] = group.pieceIds
    if (
      inputPieceIds.length < 2 ||
      inputPieceIds.length > PILOTI_FUSE_PART_LIMIT
    ) {
      throw new RangeError(
        `Piloti fuse group "${group.id}" must contain 2–${PILOTI_FUSE_PART_LIMIT} pieces.`,
      )
    }

    const localIds = new Set<string>()
    const pieceIds = inputPieceIds.map((pieceId) => {
      if (!isPilotiFusePieceId(pieceId)) {
        throw new RangeError(
          `Piloti fuse group "${group.id}" has an invalid piece ID.`,
        )
      }
      if (localIds.has(pieceId)) {
        throw new RangeError(
          `Piloti fuse group "${group.id}" repeats piece "${pieceId}".`,
        )
      }
      if (usedPieceIds.has(pieceId)) {
        throw new RangeError(
          `Piloti fuse piece "${pieceId}" belongs to more than one group.`,
        )
      }
      localIds.add(pieceId)
      usedPieceIds.add(pieceId)
      return pieceId
    })
    groupIds.add(group.id)
    return { id: group.id, pieceIds }
  })
}

function normalizePartCopyOffset(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Piloti part copy "${name}" must be finite.`)
  }
  return Math.min(
    PILOTI_PART_COPY_OFFSET_MM.maximum,
    Math.max(PILOTI_PART_COPY_OFFSET_MM.minimum, value),
  )
}

function normalizePartCopies(
  input: readonly PilotiPartCopy[],
): readonly PilotiPartCopy[] {
  if (!Array.isArray(input)) {
    throw new RangeError('Piloti part copies must be an array.')
  }
  if (input.length > PILOTI_PART_COPY_LIMIT) {
    throw new RangeError(
      `Piloti supports at most ${PILOTI_PART_COPY_LIMIT} part copies.`,
    )
  }

  const copies: readonly PilotiPartCopy[] = input
  const copyIds = new Set<string>()
  return copies.map((copy) => {
    if (
      typeof copy !== 'object' ||
      copy === null ||
      !isPilotiPartCopyId(copy.id)
    ) {
      throw new RangeError('Piloti part copy has an invalid copy ID.')
    }
    if (!isPilotiPartCopySourceId(copy.sourceId)) {
      throw new RangeError('Piloti part copy has an invalid source ID.')
    }
    if (copyIds.has(copy.id)) {
      throw new RangeError(`Piloti part copy "${copy.id}" is duplicated.`)
    }
    copyIds.add(copy.id)
    return {
      id: copy.id,
      sourceId: copy.sourceId,
      offsetXMm: normalizePartCopyOffset(copy.offsetXMm, 'offsetXMm'),
      offsetYMm: normalizePartCopyOffset(copy.offsetYMm, 'offsetYMm'),
      offsetZMm: normalizePartCopyOffset(copy.offsetZMm, 'offsetZMm'),
    }
  })
}

function normalizeRandomLocks(
  input: readonly PilotiRandomLock[],
): readonly PilotiRandomLock[] {
  if (!Array.isArray(input)) {
    throw new RangeError('Piloti random locks must be an array.')
  }
  if (input.length > PILOTI_RANDOM_LOCK_LIMIT) {
    throw new RangeError(
      `Piloti supports at most ${PILOTI_RANDOM_LOCK_LIMIT} random locks.`,
    )
  }
  const locks: readonly PilotiRandomLock[] = input
  const targetIds = new Set<string>()
  return locks.map((lock) => {
    if (
      typeof lock !== 'object' ||
      lock === null ||
      !isPilotiRandomLockTargetId(lock.targetId)
    ) {
      throw new RangeError('Piloti random lock has an invalid target ID.')
    }
    if (targetIds.has(lock.targetId)) {
      throw new RangeError(
        `Piloti random lock for "${lock.targetId}" is duplicated.`,
      )
    }
    targetIds.add(lock.targetId)
    return {
      targetId: lock.targetId,
      seed: normalizeValue(lock.seed, 'seed'),
    }
  })
}

function normalizeFootOffsetOverrides(
  input: readonly PilotiFootOffsetOverride[],
): readonly PilotiFootOffsetOverride[] {
  if (!Array.isArray(input)) {
    throw new RangeError('Piloti foot offset overrides must be an array.')
  }

  const overrides: readonly PilotiFootOffsetOverride[] = input
  const supportIds = new Set<string>()
  return overrides.map((override) => {
    if (
      typeof override !== 'object' ||
      override === null ||
      !isPilotiSupportId(override.supportId)
    ) {
      throw new RangeError('Piloti foot offset override has an invalid support ID.')
    }
    if (supportIds.has(override.supportId)) {
      throw new RangeError(
        `Piloti foot offset override for "${override.supportId}" is duplicated.`,
      )
    }
    supportIds.add(override.supportId)
    return {
      supportId: override.supportId,
      footOffsetXMm: normalizeValue(override.footOffsetXMm, 'footOffsetXMm'),
      footOffsetYMm: normalizeValue(override.footOffsetYMm, 'footOffsetYMm'),
    }
  })
}

function normalizeSupportSizeScale(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Piloti support size override "${name}" must be finite.`)
  }
  return Math.min(
    PILOTI_SUPPORT_SIZE_SCALE.maximum,
    Math.max(PILOTI_SUPPORT_SIZE_SCALE.minimum, value),
  )
}

function normalizeSupportSizeOverrides(
  input: readonly PilotiSupportSizeOverride[],
): readonly PilotiSupportSizeOverride[] {
  if (!Array.isArray(input)) {
    throw new RangeError('Piloti support size overrides must be an array.')
  }

  const overrides: readonly PilotiSupportSizeOverride[] = input
  const supportIds = new Set<string>()
  return overrides.map((override) => {
    if (
      typeof override !== 'object' ||
      override === null ||
      !isPilotiSupportId(override.supportId)
    ) {
      throw new RangeError('Piloti support size override has an invalid support ID.')
    }
    if (supportIds.has(override.supportId)) {
      throw new RangeError(
        `Piloti support size override for "${override.supportId}" is duplicated.`,
      )
    }
    supportIds.add(override.supportId)
    return {
      supportId: override.supportId,
      widthScale: normalizeSupportSizeScale(
        override.widthScale,
        'widthScale',
      ),
      depthScale: normalizeSupportSizeScale(
        override.depthScale,
        'depthScale',
      ),
    }
  })
}

function normalizeSupportPositionValue(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      `Piloti support position override "${name}" must be finite.`,
    )
  }
  return Math.min(
    PILOTI_SUPPORT_POSITION_MM.maximum,
    Math.max(PILOTI_SUPPORT_POSITION_MM.minimum, value),
  )
}

function normalizeSupportPositionOverrides(
  input: readonly PilotiSupportPositionOverride[],
): readonly PilotiSupportPositionOverride[] {
  if (!Array.isArray(input)) {
    throw new RangeError('Piloti support position overrides must be an array.')
  }

  const overrides: readonly PilotiSupportPositionOverride[] = input
  const supportIds = new Set<string>()
  return overrides.map((override) => {
    if (
      typeof override !== 'object' ||
      override === null ||
      !isPilotiSupportId(override.supportId)
    ) {
      throw new RangeError(
        'Piloti support position override has an invalid support ID.',
      )
    }
    if (supportIds.has(override.supportId)) {
      throw new RangeError(
        `Piloti support position override for "${override.supportId}" is duplicated.`,
      )
    }
    supportIds.add(override.supportId)
    return {
      supportId: override.supportId,
      positionXMm: normalizeSupportPositionValue(
        override.positionXMm,
        'positionXMm',
      ),
      positionYMm: normalizeSupportPositionValue(
        override.positionYMm,
        'positionYMm',
      ),
    }
  })
}

export function normalizePilotiParameters(
  input: PilotiParameters,
): PilotiParameters {
  const partCopies = normalizePartCopies(input.partCopies)
  return {
    planShape: readPlanShape(input.planShape),
    footOffsetSpace: readFootOffsetSpace(input.footOffsetSpace),
    polygonMassDivision: readPolygonDivision(input.polygonMassDivision),
    radialSpreadRatio: normalizeValue(input.radialSpreadRatio, 'radialSpreadRatio'),
    seed: normalizeValue(input.seed, 'seed'),
    heightMm: normalizeValue(input.heightMm, 'heightMm'),
    supportCount: normalizeValue(input.supportCount, 'supportCount'),
    supportRowCount: normalizeValue(
      input.supportRowCount,
      'supportRowCount',
    ),
    rowSpacingMm: normalizeValue(input.rowSpacingMm, 'rowSpacingMm'),
    supportDepthRatio: normalizeValue(
      input.supportDepthRatio,
      'supportDepthRatio',
    ),
    supportHeightRatio: normalizeValue(
      input.supportHeightRatio,
      'supportHeightRatio',
    ),
    shoulderRatio: normalizeValue(input.shoulderRatio, 'shoulderRatio'),
    shoulderMode: normalizeShoulderMode(input.shoulderMode),
    neckWidthRatio: normalizeValue(input.neckWidthRatio, 'neckWidthRatio'),
    footFlareRatio: normalizeValue(input.footFlareRatio, 'footFlareRatio'),
    bearingScaleRatio: normalizeValue(
      input.bearingScaleRatio,
      'bearingScaleRatio',
    ),
    upperWidthRatio: normalizeValue(input.upperWidthRatio, 'upperWidthRatio'),
    upperDepthRatio: normalizeValue(input.upperDepthRatio, 'upperDepthRatio'),
    upperFootprintMode: normalizeUpperFootprintMode(input.upperFootprintMode),
    upperOffsetXMm: normalizeValue(input.upperOffsetXMm, 'upperOffsetXMm'),
    upperOffsetYMm: normalizeValue(input.upperOffsetYMm, 'upperOffsetYMm'),
    upperMassProfile: normalizeUpperMassProfile(input.upperMassProfile),
    upperMassDivision: readMassDivision(input.upperMassDivision),
    upperStepScaleRatio: normalizeValue(
      input.upperStepScaleRatio,
      'upperStepScaleRatio',
    ),
    upperStepOffsetXMm: normalizeValue(
      input.upperStepOffsetXMm,
      'upperStepOffsetXMm',
    ),
    upperStepOffsetYMm: normalizeValue(
      input.upperStepOffsetYMm,
      'upperStepOffsetYMm',
    ),
    massPartOverrides: readMassPartOverrides(input.massPartOverrides),
    concreteDensityKgM3: normalizeValue(
      input.concreteDensityKgM3,
      'concreteDensityKgM3',
    ),
    retainedCoreMode: readRetainedCoreMode(input.retainedCoreMode),
    retainedCoreScale: normalizeValue(
      input.retainedCoreScale,
      'retainedCoreScale',
    ),
    retainedCoreDensityKgM3: normalizeValue(
      input.retainedCoreDensityKgM3,
      'retainedCoreDensityKgM3',
    ),
    upperTopWidthRatio: normalizeValue(
      input.upperTopWidthRatio,
      'upperTopWidthRatio',
    ),
    upperTopDepthRatio: normalizeValue(
      input.upperTopDepthRatio,
      'upperTopDepthRatio',
    ),
    upperTopOffsetXMm: normalizeValue(
      input.upperTopOffsetXMm,
      'upperTopOffsetXMm',
    ),
    upperTopOffsetYMm: normalizeValue(
      input.upperTopOffsetYMm,
      'upperTopOffsetYMm',
    ),
    asymmetry: normalizeValue(input.asymmetry, 'asymmetry'),
    randomLocks: normalizeRandomLocks(input.randomLocks),
    footOffsetXMm: normalizeValue(input.footOffsetXMm, 'footOffsetXMm'),
    footOffsetYMm: normalizeValue(input.footOffsetYMm, 'footOffsetYMm'),
    footOffsetOverrides: normalizeFootOffsetOverrides(
      input.footOffsetOverrides,
    ),
    supportSizeOverrides: normalizeSupportSizeOverrides(
      input.supportSizeOverrides,
    ),
    supportPositionOverrides: normalizeSupportPositionOverrides(
      input.supportPositionOverrides,
    ),
    partCopies,
    fuseGroups: normalizeFuseGroups(input.fuseGroups),
    removedPartIds: readRemovedPartIds(input.removedPartIds, partCopies),
  }
}

function readParameter(
  input: Record<string, unknown>,
  name: NumericPilotiParameter,
): number {
  const value = input[name]
  const rule = PILOTI_PARAMETER_RULES[name]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ProjectValidationError(`Parameter "${name}" must be a finite number.`)
  }
  if (value < rule.minimum || value > rule.maximum) {
    throw new ProjectValidationError(
      `Parameter "${name}" must be between ${rule.minimum} and ${rule.maximum}.`,
    )
  }
  if ('integer' in rule && rule.integer && !Number.isInteger(value)) {
    throw new ProjectValidationError(`Parameter "${name}" must be an integer.`)
  }
  return value
}

function readShoulderMode(input: Record<string, unknown>): PilotiShoulderMode {
  const value = input.shoulderMode
  if (!isPilotiShoulderMode(value)) {
    throw new ProjectValidationError(
      'Parameter "shoulderMode" must be "divided" or "shared".',
    )
  }
  return value
}

function readUpperFootprintMode(
  input: Record<string, unknown>,
): PilotiUpperFootprintMode {
  const value = input.upperFootprintMode
  if (!isPilotiUpperFootprintMode(value)) {
    throw new ProjectValidationError(
      'Parameter "upperFootprintMode" must be "linked" or "detached".',
    )
  }
  return value
}

function readUpperMassProfile(
  input: Record<string, unknown>,
): PilotiUpperMassProfile {
  const value = input.upperMassProfile
  if (!isPilotiUpperMassProfile(value)) {
    throw new ProjectValidationError(
      'Parameter "upperMassProfile" must be "block" or "tapered".',
    )
  }
  return value
}

function readFootOffsetOverrides(
  input: Record<string, unknown>,
): readonly PilotiFootOffsetOverride[] {
  const value = input.footOffsetOverrides
  if (!Array.isArray(value)) {
    throw new ProjectValidationError(
      'Parameter "footOffsetOverrides" must be an array.',
    )
  }

  const supportIds = new Set<string>()
  return value.map((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      throw new ProjectValidationError(
        'Every foot offset override must be an object.',
      )
    }
    const override = candidate as Record<string, unknown>
    if (
      typeof override.supportId !== 'string' ||
      !isPilotiSupportId(override.supportId)
    ) {
      throw new ProjectValidationError(
        'Every foot offset override must name a supported support ID.',
      )
    }
    if (supportIds.has(override.supportId)) {
      throw new ProjectValidationError(
        `Foot offset override for "${override.supportId}" is duplicated.`,
      )
    }
    supportIds.add(override.supportId)
    return {
      supportId: override.supportId,
      footOffsetXMm: readParameter(override, 'footOffsetXMm'),
      footOffsetYMm: readParameter(override, 'footOffsetYMm'),
    }
  })
}

function readSupportSizeScale(
  input: Record<string, unknown>,
  name: 'widthScale' | 'depthScale',
): number {
  const value = input[name]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ProjectValidationError(
      `Support size override "${name}" must be a finite number.`,
    )
  }
  if (
    value < PILOTI_SUPPORT_SIZE_SCALE.minimum ||
    value > PILOTI_SUPPORT_SIZE_SCALE.maximum
  ) {
    throw new ProjectValidationError(
      `Support size override "${name}" must be between ${PILOTI_SUPPORT_SIZE_SCALE.minimum} and ${PILOTI_SUPPORT_SIZE_SCALE.maximum}.`,
    )
  }
  return value
}

function readSupportSizeOverrides(
  input: Record<string, unknown>,
): readonly PilotiSupportSizeOverride[] {
  const value = input.supportSizeOverrides
  if (!Array.isArray(value)) {
    throw new ProjectValidationError(
      'Parameter "supportSizeOverrides" must be an array.',
    )
  }

  const supportIds = new Set<string>()
  return value.map((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      throw new ProjectValidationError(
        'Every support size override must be an object.',
      )
    }
    const override = candidate as Record<string, unknown>
    if (
      typeof override.supportId !== 'string' ||
      !isPilotiSupportId(override.supportId)
    ) {
      throw new ProjectValidationError(
        'Every support size override must name a supported support ID.',
      )
    }
    if (supportIds.has(override.supportId)) {
      throw new ProjectValidationError(
        `Support size override for "${override.supportId}" is duplicated.`,
      )
    }
    supportIds.add(override.supportId)
    return {
      supportId: override.supportId,
      widthScale: readSupportSizeScale(override, 'widthScale'),
      depthScale: readSupportSizeScale(override, 'depthScale'),
    }
  })
}

function readSupportPositionValue(
  input: Record<string, unknown>,
  name: 'positionXMm' | 'positionYMm',
): number {
  const value = input[name]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ProjectValidationError(
      `Support position override "${name}" must be a finite number.`,
    )
  }
  if (
    value < PILOTI_SUPPORT_POSITION_MM.minimum ||
    value > PILOTI_SUPPORT_POSITION_MM.maximum
  ) {
    throw new ProjectValidationError(
      `Support position override "${name}" must be between ${PILOTI_SUPPORT_POSITION_MM.minimum} and ${PILOTI_SUPPORT_POSITION_MM.maximum}.`,
    )
  }
  return value
}

function readSupportPositionOverrides(
  input: Record<string, unknown>,
): readonly PilotiSupportPositionOverride[] {
  const value = input.supportPositionOverrides
  if (!Array.isArray(value)) {
    throw new ProjectValidationError(
      'Parameter "supportPositionOverrides" must be an array.',
    )
  }

  const supportIds = new Set<string>()
  return value.map((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      throw new ProjectValidationError(
        'Every support position override must be an object.',
      )
    }
    const override = candidate as Record<string, unknown>
    if (
      typeof override.supportId !== 'string' ||
      !isPilotiSupportId(override.supportId)
    ) {
      throw new ProjectValidationError(
        'Every support position override must name a supported support ID.',
      )
    }
    if (supportIds.has(override.supportId)) {
      throw new ProjectValidationError(
        `Support position override for "${override.supportId}" is duplicated.`,
      )
    }
    supportIds.add(override.supportId)
    return {
      supportId: override.supportId,
      positionXMm: readSupportPositionValue(override, 'positionXMm'),
      positionYMm: readSupportPositionValue(override, 'positionYMm'),
    }
  })
}

function readPartCopyOffset(
  input: Record<string, unknown>,
  name: 'offsetXMm' | 'offsetYMm' | 'offsetZMm',
): number {
  const value = input[name]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ProjectValidationError(
      `Part copy "${name}" must be a finite number.`,
    )
  }
  if (
    value < PILOTI_PART_COPY_OFFSET_MM.minimum ||
    value > PILOTI_PART_COPY_OFFSET_MM.maximum
  ) {
    throw new ProjectValidationError(
      `Part copy "${name}" must be between ${PILOTI_PART_COPY_OFFSET_MM.minimum} and ${PILOTI_PART_COPY_OFFSET_MM.maximum}.`,
    )
  }
  return value
}

function readPartCopies(
  input: Record<string, unknown>,
): readonly PilotiPartCopy[] {
  const value = input.partCopies
  if (!Array.isArray(value)) {
    throw new ProjectValidationError('Parameter "partCopies" must be an array.')
  }
  if (value.length > PILOTI_PART_COPY_LIMIT) {
    throw new ProjectValidationError(
      `Part copies must contain at most ${PILOTI_PART_COPY_LIMIT} entries.`,
    )
  }

  const copyIds = new Set<string>()
  return value.map((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      throw new ProjectValidationError('Every part copy must be an object.')
    }
    const copy = candidate as Record<string, unknown>
    if (typeof copy.id !== 'string' || !isPilotiPartCopyId(copy.id)) {
      throw new ProjectValidationError(
        'Every part copy must name a supported copy ID.',
      )
    }
    if (
      typeof copy.sourceId !== 'string' ||
      !isPilotiPartCopySourceId(copy.sourceId)
    ) {
      throw new ProjectValidationError(
        'Every part copy must name an upper-mass or support source ID.',
      )
    }
    if (copyIds.has(copy.id)) {
      throw new ProjectValidationError(
        `Part copy "${copy.id}" is duplicated.`,
      )
    }
    copyIds.add(copy.id)
    return {
      id: copy.id,
      sourceId: copy.sourceId,
      offsetXMm: readPartCopyOffset(copy, 'offsetXMm'),
      offsetYMm: readPartCopyOffset(copy, 'offsetYMm'),
      offsetZMm: readPartCopyOffset(copy, 'offsetZMm'),
    }
  })
}

function readFuseGroups(
  input: Record<string, unknown>,
): readonly PilotiFuseGroup[] {
  const value = input.fuseGroups
  if (!Array.isArray(value)) {
    throw new ProjectValidationError('Parameter "fuseGroups" must be an array.')
  }
  if (value.length > PILOTI_FUSE_GROUP_LIMIT) {
    throw new ProjectValidationError(
      `Fuse groups must contain at most ${PILOTI_FUSE_GROUP_LIMIT} entries.`,
    )
  }

  const groupIds = new Set<string>()
  const usedPieceIds = new Set<string>()
  return value.map((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      throw new ProjectValidationError('Every fuse group must be an object.')
    }
    const group = candidate as Record<string, unknown>
    if (typeof group.id !== 'string' || !isPilotiFuseGroupId(group.id)) {
      throw new ProjectValidationError(
        'Every fuse group must name a supported group ID.',
      )
    }
    const groupId = group.id
    if (groupIds.has(groupId)) {
      throw new ProjectValidationError(
        `Fuse group "${groupId}" is duplicated.`,
      )
    }
    if (!Array.isArray(group.pieceIds)) {
      throw new ProjectValidationError(
        `Fuse group "${groupId}" must contain a piece list.`,
      )
    }
    const inputPieceIds: readonly unknown[] = group.pieceIds
    if (
      inputPieceIds.length < 2 ||
      inputPieceIds.length > PILOTI_FUSE_PART_LIMIT
    ) {
      throw new ProjectValidationError(
        `Fuse group "${groupId}" must contain 2–${PILOTI_FUSE_PART_LIMIT} pieces.`,
      )
    }

    const localIds = new Set<string>()
    const pieceIds = inputPieceIds.map((pieceId) => {
      if (typeof pieceId !== 'string' || !isPilotiFusePieceId(pieceId)) {
        throw new ProjectValidationError(
          `Fuse group "${groupId}" contains an invalid piece ID.`,
        )
      }
      const validatedPieceId = pieceId
      if (localIds.has(validatedPieceId)) {
        throw new ProjectValidationError(
          `Fuse group "${groupId}" repeats piece "${validatedPieceId}".`,
        )
      }
      if (usedPieceIds.has(validatedPieceId)) {
        throw new ProjectValidationError(
          `Fuse piece "${validatedPieceId}" belongs to more than one group.`,
        )
      }
      localIds.add(validatedPieceId)
      usedPieceIds.add(validatedPieceId)
      return validatedPieceId
    })
    groupIds.add(groupId)
    return { id: groupId, pieceIds }
  })
}

function readRandomLocks(
  input: Record<string, unknown>,
): readonly PilotiRandomLock[] {
  const value = input.randomLocks
  if (!Array.isArray(value)) {
    throw new ProjectValidationError('Parameter "randomLocks" must be an array.')
  }
  if (value.length > PILOTI_RANDOM_LOCK_LIMIT) {
    throw new ProjectValidationError(
      `Random locks must contain at most ${PILOTI_RANDOM_LOCK_LIMIT} entries.`,
    )
  }
  const targetIds = new Set<string>()
  return value.map((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      throw new ProjectValidationError('Every random lock must be an object.')
    }
    const lock = candidate as Record<string, unknown>
    if (
      typeof lock.targetId !== 'string' ||
      !isPilotiRandomLockTargetId(lock.targetId)
    ) {
      throw new ProjectValidationError(
        'Every random lock must name an upper mass or support source ID.',
      )
    }
    if (targetIds.has(lock.targetId)) {
      throw new ProjectValidationError(
        `Random lock for "${lock.targetId}" is duplicated.`,
      )
    }
    if (
      typeof lock.seed !== 'number' ||
      !Number.isInteger(lock.seed) ||
      lock.seed < 0 ||
      lock.seed > MAX_SEED
    ) {
      throw new ProjectValidationError(
        `Random lock for "${lock.targetId}" must contain an integer seed from 0 to ${MAX_SEED}.`,
      )
    }
    targetIds.add(lock.targetId)
    return { targetId: lock.targetId, seed: lock.seed }
  })
}

export class ProjectValidationError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'ProjectValidationError'
  }
}

function readMassDivision(value: unknown): PilotiUpperMassDivision {
  const choice = MASS_DIVISIONS.find((division) => division.value === value)
  if (!choice) {
    throw new ProjectValidationError(
      'Upper mass division must be whole, x2, y2, xy4, z2, z3 or z4.',
    )
  }
  return choice.value
}

function readPlanShape(value: unknown): PilotiPlanShape {
  if (value !== 'rectangle' && value !== 'hexagon' && value !== 'octagon') {
    throw new ProjectValidationError('Plan shape must be rectangle, hexagon or octagon.')
  }
  return value
}

function readFootOffsetSpace(value: unknown): PilotiFootOffsetSpace {
  if (value !== 'global' && value !== 'centered') {
    throw new ProjectValidationError('Foot offset space must be global or centered.')
  }
  return value
}

function readPolygonDivision(value: unknown): PilotiPolygonMassDivision {
  if (
    value !== 'whole' &&
    value !== 'sectors' &&
    value !== 'z2' &&
    value !== 'z3' &&
    value !== 'z4'
  ) {
    throw new ProjectValidationError(
      'Polygon mass division must be whole, sectors, z2, z3 or z4.',
    )
  }
  return value
}

function readMassPartOverrides(value: unknown): readonly PilotiMassPartOverride[] {
  if (!Array.isArray(value)) throw new ProjectValidationError('Mass part overrides must be an array.')
  const seen = new Set<string>()
  return value.map((candidate: unknown) => {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
      throw new ProjectValidationError('Every mass part override must be an object.')
    }
    const entry = candidate as Record<string, unknown>
    if (typeof entry.partId !== 'string' || !massPartAddress(entry.partId) || seen.has(entry.partId)) {
      throw new ProjectValidationError('Mass part overrides need unique, supported part IDs.')
    }
    seen.add(entry.partId)
    if (!isPilotiUpperMassProfile(entry.profile)) throw new ProjectValidationError('Invalid mass part profile.')
    const read = (key: keyof typeof MASS_PART_RULES): number => {
      const number = entry[key]
      const rule = MASS_PART_RULES[key]
      if (typeof number !== 'number' || !Number.isFinite(number) || number < rule.minimum || number > rule.maximum) {
        throw new ProjectValidationError(`Mass part ${key} must be between ${rule.minimum} and ${rule.maximum}.`)
      }
      return number
    }
    return { partId: entry.partId, profile: entry.profile,
      topWidthRatio: read('topWidthRatio'), topDepthRatio: read('topDepthRatio'),
      topOffsetXMm: read('topOffsetXMm'), topOffsetYMm: read('topOffsetYMm') }
  })
}

export function parsePilotiParameters(
  input: unknown,
  missingDefaults: Partial<PilotiParameters> = {},
): PilotiParameters {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ProjectValidationError('Project parameters must be an object.')
  }
  const record = { ...missingDefaults, ...(input as Record<string, unknown>) }
  const partCopies = readPartCopies(record)
  return {
    planShape: readPlanShape(record.planShape),
    footOffsetSpace: readFootOffsetSpace(record.footOffsetSpace),
    polygonMassDivision: readPolygonDivision(record.polygonMassDivision),
    radialSpreadRatio: readParameter(record, 'radialSpreadRatio'),
    seed: readParameter(record, 'seed'),
    heightMm: readParameter(record, 'heightMm'),
    supportCount: readParameter(record, 'supportCount'),
    supportRowCount: readParameter(record, 'supportRowCount'),
    rowSpacingMm: readParameter(record, 'rowSpacingMm'),
    supportDepthRatio: readParameter(record, 'supportDepthRatio'),
    supportHeightRatio: readParameter(record, 'supportHeightRatio'),
    shoulderRatio: readParameter(record, 'shoulderRatio'),
    shoulderMode: readShoulderMode(record),
    neckWidthRatio: readParameter(record, 'neckWidthRatio'),
    footFlareRatio: readParameter(record, 'footFlareRatio'),
    bearingScaleRatio: readParameter(record, 'bearingScaleRatio'),
    upperWidthRatio: readParameter(record, 'upperWidthRatio'),
    upperDepthRatio: readParameter(record, 'upperDepthRatio'),
    upperFootprintMode: readUpperFootprintMode(record),
    upperOffsetXMm: readParameter(record, 'upperOffsetXMm'),
    upperOffsetYMm: readParameter(record, 'upperOffsetYMm'),
    upperMassProfile: readUpperMassProfile(record),
    upperMassDivision: readMassDivision(record.upperMassDivision),
    upperStepScaleRatio: readParameter(record, 'upperStepScaleRatio'),
    upperStepOffsetXMm: readParameter(record, 'upperStepOffsetXMm'),
    upperStepOffsetYMm: readParameter(record, 'upperStepOffsetYMm'),
    massPartOverrides: readMassPartOverrides(record.massPartOverrides),
    concreteDensityKgM3: readParameter(record, 'concreteDensityKgM3'),
    retainedCoreMode: readRetainedCoreMode(record.retainedCoreMode),
    retainedCoreScale: readParameter(record, 'retainedCoreScale'),
    retainedCoreDensityKgM3: readParameter(
      record,
      'retainedCoreDensityKgM3',
    ),
    upperTopWidthRatio: readParameter(record, 'upperTopWidthRatio'),
    upperTopDepthRatio: readParameter(record, 'upperTopDepthRatio'),
    upperTopOffsetXMm: readParameter(record, 'upperTopOffsetXMm'),
    upperTopOffsetYMm: readParameter(record, 'upperTopOffsetYMm'),
    asymmetry: readParameter(record, 'asymmetry'),
    randomLocks: readRandomLocks(record),
    footOffsetXMm: readParameter(record, 'footOffsetXMm'),
    footOffsetYMm: readParameter(record, 'footOffsetYMm'),
    footOffsetOverrides: readFootOffsetOverrides(record),
    supportSizeOverrides: readSupportSizeOverrides(record),
    supportPositionOverrides: readSupportPositionOverrides(record),
    partCopies,
    fuseGroups: readFuseGroups(record),
    removedPartIds: readRemovedPartIds(record.removedPartIds, partCopies),
  }
}
