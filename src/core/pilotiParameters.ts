import type {
  PilotiFootOffsetOverride,
  PilotiParameters,
  PilotiSupportPositionOverride,
  PilotiSupportSizeOverride,
} from './types'

export const MAX_SEED = 0xffff_ffff

interface ParameterRule {
  readonly minimum: number
  readonly maximum: number
  readonly integer?: boolean
}

type NumericPilotiParameter = Exclude<
  keyof PilotiParameters,
  | 'footOffsetOverrides'
  | 'supportSizeOverrides'
  | 'supportPositionOverrides'
>

export const PILOTI_SUPPORT_SIZE_SCALE = {
  minimum: 0.55,
  maximum: 1.45,
} as const

export const PILOTI_SUPPORT_POSITION_MM = {
  minimum: -300,
  maximum: 300,
} as const

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
    neckWidthRatio: normalizeValue(input.neckWidthRatio, 'neckWidthRatio'),
    upperWidthRatio: normalizeValue(input.upperWidthRatio, 'upperWidthRatio'),
    upperDepthRatio: normalizeValue(input.upperDepthRatio, 'upperDepthRatio'),
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

export class ProjectValidationError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'ProjectValidationError'
  }
}

export function parsePilotiParameters(
  input: unknown,
  missingDefaults: Partial<PilotiParameters> = {},
): PilotiParameters {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ProjectValidationError('Project parameters must be an object.')
  }
  const record = { ...missingDefaults, ...(input as Record<string, unknown>) }
  return {
    seed: readParameter(record, 'seed'),
    heightMm: readParameter(record, 'heightMm'),
    supportCount: readParameter(record, 'supportCount'),
    supportRowCount: readParameter(record, 'supportRowCount'),
    rowSpacingMm: readParameter(record, 'rowSpacingMm'),
    supportDepthRatio: readParameter(record, 'supportDepthRatio'),
    supportHeightRatio: readParameter(record, 'supportHeightRatio'),
    shoulderRatio: readParameter(record, 'shoulderRatio'),
    neckWidthRatio: readParameter(record, 'neckWidthRatio'),
    upperWidthRatio: readParameter(record, 'upperWidthRatio'),
    upperDepthRatio: readParameter(record, 'upperDepthRatio'),
    asymmetry: readParameter(record, 'asymmetry'),
    footOffsetXMm: readParameter(record, 'footOffsetXMm'),
    footOffsetYMm: readParameter(record, 'footOffsetYMm'),
    footOffsetOverrides: readFootOffsetOverrides(record),
    supportSizeOverrides: readSupportSizeOverrides(record),
    supportPositionOverrides: readSupportPositionOverrides(record),
  }
}
