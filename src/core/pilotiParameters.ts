import type { PilotiParameters } from './types'

export const MAX_SEED = 0xffff_ffff

interface ParameterRule {
  readonly minimum: number
  readonly maximum: number
  readonly integer?: boolean
}

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
} satisfies Readonly<Record<keyof PilotiParameters, ParameterRule>>

function normalizeValue(
  value: number,
  name: keyof PilotiParameters,
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
  }
}

function readParameter(
  input: Record<string, unknown>,
  name: keyof PilotiParameters,
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

export class ProjectValidationError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'ProjectValidationError'
  }
}

export function parsePilotiParameters(input: unknown): PilotiParameters {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ProjectValidationError('Project parameters must be an object.')
  }
  const record = input as Record<string, unknown>
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
  }
}
