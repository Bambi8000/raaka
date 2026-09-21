import { MASS_DIVISIONS, MASS_PART_RULES, massPartAddress } from './massDivision'
import type {
  PilotiMassPartOverride,
  PilotiUpperMassDivision,
  PilotiFootOffsetOverride,
  PilotiFuseGroup,
  PilotiPartCopy,
  PilotiUpperFootprintMode,
  PilotiParameters,
  PilotiShoulderMode,
  PilotiSupportPositionOverride,
  PilotiSupportSizeOverride,
  PilotiUpperMassProfile,
} from './types'

export const MAX_SEED = 0xffff_ffff

interface ParameterRule {
  readonly minimum: number
  readonly maximum: number
  readonly integer?: boolean
}

type NumericPilotiParameter = Exclude<
  keyof PilotiParameters,
  | 'shoulderMode'
  | 'upperFootprintMode'
  | 'upperMassProfile'
  | 'upperMassDivision'
  | 'massPartOverrides'
  | 'footOffsetOverrides'
  | 'supportSizeOverrides'
  | 'supportPositionOverrides'
  | 'partCopies'
  | 'fuseGroups'
  | 'removedPartIds'
>

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

export const PILOTI_PARAMETER_RULES = {
  seed: { minimum: 0, maximum: MAX_SEED, integer: true },
  heightMm: { minimum: 1_000, maximum: 2_000 },
  supportCount: { minimum: 1, maximum: 6, integer: true },
  supportRowCount: { minimum: 1, maximum: 3, integer: true },
  rowSpacingMm: { minimum: 100, maximum: 800 },
  supportDepthRatio: { minimum: 0.25, maximum: 0.92 },
  supportHeightRatio: { minimum: 0.25, maximum: 0.58 },
  shoulderRatio: { minimum: 0.2, maximum: 0.8 },
  neckWidthRatio: { minimum: 0.18, maximum: 0.7 },
  upperWidthRatio: { minimum: 0.4, maximum: 1.1 },
  upperDepthRatio: { minimum: 0.2, maximum: 0.65 },
  upperOffsetXMm: { minimum: -400, maximum: 400 },
  upperOffsetYMm: { minimum: -400, maximum: 400 },
  upperTopWidthRatio: { minimum: 0.45, maximum: 1.25 },
  upperTopDepthRatio: { minimum: 0.45, maximum: 1.25 },
  upperTopOffsetXMm: { minimum: -400, maximum: 400 },
  upperTopOffsetYMm: { minimum: -400, maximum: 400 },
  asymmetry: { minimum: 0, maximum: 0.5 },
  footOffsetXMm: { minimum: -300, maximum: 300 },
  footOffsetYMm: { minimum: -300, maximum: 300 },
} satisfies Readonly<Record<NumericPilotiParameter, ParameterRule>>

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
  readonly row: number
  readonly column: number
}

export function pilotiSupportAddress(
  value: string,
): PilotiSupportAddress | undefined {
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
    upperWidthRatio: normalizeValue(input.upperWidthRatio, 'upperWidthRatio'),
    upperDepthRatio: normalizeValue(input.upperDepthRatio, 'upperDepthRatio'),
    upperFootprintMode: normalizeUpperFootprintMode(input.upperFootprintMode),
    upperOffsetXMm: normalizeValue(input.upperOffsetXMm, 'upperOffsetXMm'),
    upperOffsetYMm: normalizeValue(input.upperOffsetYMm, 'upperOffsetYMm'),
    upperMassProfile: normalizeUpperMassProfile(input.upperMassProfile),
    upperMassDivision: readMassDivision(input.upperMassDivision),
    massPartOverrides: readMassPartOverrides(input.massPartOverrides),
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

export class ProjectValidationError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'ProjectValidationError'
  }
}

function readMassDivision(value: unknown): PilotiUpperMassDivision {
  const choice = MASS_DIVISIONS.find((division) => division.value === value)
  if (!choice) throw new ProjectValidationError('Upper mass division must be whole, x2, y2 or xy4.')
  return choice.value
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
    upperWidthRatio: readParameter(record, 'upperWidthRatio'),
    upperDepthRatio: readParameter(record, 'upperDepthRatio'),
    upperFootprintMode: readUpperFootprintMode(record),
    upperOffsetXMm: readParameter(record, 'upperOffsetXMm'),
    upperOffsetYMm: readParameter(record, 'upperOffsetYMm'),
    upperMassProfile: readUpperMassProfile(record),
    upperMassDivision: readMassDivision(record.upperMassDivision),
    massPartOverrides: readMassPartOverrides(record.massPartOverrides),
    upperTopWidthRatio: readParameter(record, 'upperTopWidthRatio'),
    upperTopDepthRatio: readParameter(record, 'upperTopDepthRatio'),
    upperTopOffsetXMm: readParameter(record, 'upperTopOffsetXMm'),
    upperTopOffsetYMm: readParameter(record, 'upperTopOffsetYMm'),
    asymmetry: readParameter(record, 'asymmetry'),
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
