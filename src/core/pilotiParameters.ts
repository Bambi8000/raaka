import type {
  PilotiFootOffsetOverride,
  PilotiParameters,
} from './types'

export const MAX_SEED = 0xffff_ffff

interface ParameterRule {
  readonly minimum: number
  readonly maximum: number
  readonly integer?: boolean
}

type NumericPilotiParameter = Exclude<
  keyof PilotiParameters,
  'footOffsetOverrides'
>

export const PILOTI_PARAMETER_RULES = {
  seed: { minimum: 0, maximum: MAX_SEED, integer: true },
  heightMm: { minimum: 1_000, maximum: 2_000 },
  supportCount: { minimum: 1, maximum: 6, integer: true },
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

export function isPilotiSupportId(value: string): boolean {
  const match = /^support-(\d+)$/.exec(value)
  if (!match) return false
  const index = Number(match[1])
  return (
    Number.isInteger(index) &&
    index >= 1 &&
    index <= PILOTI_PARAMETER_RULES.supportCount.maximum &&
    value === `support-${index}`
  )
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

export function normalizePilotiParameters(
  input: PilotiParameters,
): PilotiParameters {
  return {
    seed: normalizeValue(input.seed, 'seed'),
    heightMm: normalizeValue(input.heightMm, 'heightMm'),
    supportCount: normalizeValue(input.supportCount, 'supportCount'),
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
    supportHeightRatio: readParameter(record, 'supportHeightRatio'),
    shoulderRatio: readParameter(record, 'shoulderRatio'),
    neckWidthRatio: readParameter(record, 'neckWidthRatio'),
    upperWidthRatio: readParameter(record, 'upperWidthRatio'),
    upperDepthRatio: readParameter(record, 'upperDepthRatio'),
    asymmetry: readParameter(record, 'asymmetry'),
    footOffsetXMm: readParameter(record, 'footOffsetXMm'),
    footOffsetYMm: readParameter(record, 'footOffsetYMm'),
    footOffsetOverrides: readFootOffsetOverrides(record),
  }
}
