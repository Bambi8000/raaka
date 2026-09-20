import {
  parsePilotiParameters,
  ProjectValidationError,
} from './pilotiParameters'
import { isModelScale } from './modelScale'
import type { ModelScale, PilotiParameters } from './types'

export const PROJECT_FORMAT = 'raaka-project'
export const PROJECT_FORMAT_VERSION = 1
export const PILOTI_RECIPE_VERSION = 10
export const RECOVERY_STORAGE_KEY = 'raaka.recovery.v1'

export interface RaakaProject {
  readonly format: typeof PROJECT_FORMAT
  readonly formatVersion: typeof PROJECT_FORMAT_VERSION
  readonly recipe: 'piloti'
  readonly recipeVersion: typeof PILOTI_RECIPE_VERSION
  readonly modelScale: ModelScale
  readonly parameters: PilotiParameters
}

interface StorageReader {
  getItem: (key: string) => string | null
}

interface StorageWriter {
  setItem: (key: string, value: string) => void
}

export type RecoveryResult =
  | { readonly status: 'empty' }
  | { readonly status: 'recovered'; readonly project: RaakaProject }
  | { readonly status: 'invalid'; readonly message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function createProject(
  parameters: PilotiParameters,
  modelScale: ModelScale = 1,
): RaakaProject {
  return {
    format: PROJECT_FORMAT,
    formatVersion: PROJECT_FORMAT_VERSION,
    recipe: 'piloti',
    recipeVersion: PILOTI_RECIPE_VERSION,
    modelScale,
    parameters: {
      ...parameters,
      footOffsetOverrides: parameters.footOffsetOverrides.map((override) => ({
        ...override,
      })),
      supportSizeOverrides: parameters.supportSizeOverrides.map((override) => ({
        ...override,
      })),
      supportPositionOverrides: parameters.supportPositionOverrides.map(
        (override) => ({ ...override }),
      ),
    },
  }
}

export function serializeProject(project: RaakaProject): string {
  return `${JSON.stringify(project, null, 2)}\n`
}

export function parseProject(serialized: string): RaakaProject {
  let input: unknown
  try {
    input = JSON.parse(serialized) as unknown
  } catch {
    throw new ProjectValidationError('The selected file is not valid JSON.')
  }
  if (!isRecord(input)) {
    throw new ProjectValidationError('The project root must be an object.')
  }
  if (input.format !== PROJECT_FORMAT) {
    throw new ProjectValidationError('The selected file is not a RAAKA project.')
  }
  if (input.formatVersion !== PROJECT_FORMAT_VERSION) {
    throw new ProjectValidationError(
      `Project format version ${String(input.formatVersion)} is not supported.`,
    )
  }
  if (input.recipe !== 'piloti') {
    throw new ProjectValidationError(
      `Recipe "${String(input.recipe)}" is not supported by this version.`,
    )
  }
  if (
    input.recipeVersion !== 1 &&
    input.recipeVersion !== 2 &&
    input.recipeVersion !== 3 &&
    input.recipeVersion !== 4 &&
    input.recipeVersion !== 5 &&
    input.recipeVersion !== 6 &&
    input.recipeVersion !== 7 &&
    input.recipeVersion !== 8 &&
    input.recipeVersion !== 9 &&
    input.recipeVersion !== PILOTI_RECIPE_VERSION
  ) {
    throw new ProjectValidationError(
      `Piloti recipe version ${String(input.recipeVersion)} is not supported.`,
    )
  }
  const modelScale = input.modelScale ?? 1
  if (!isModelScale(modelScale)) {
    throw new ProjectValidationError(
      'Model scale must be 1, 0.5 or 0.25.',
    )
  }

  const supportGridDefaults = {
    supportRowCount: 1,
    rowSpacingMm: 300,
    supportDepthRatio: 0.92,
  }
  const shoulderModeDefault = { shoulderMode: 'divided' as const }
  const upperMassOffsetDefault = {
    upperOffsetXMm: 0,
    upperOffsetYMm: 0,
  }
  const upperMassProfileDefault = {
    upperMassProfile: 'block' as const,
    upperTopWidthRatio: 0.72,
    upperTopDepthRatio: 0.84,
    upperTopOffsetXMm: 120,
    upperTopOffsetYMm: 0,
  }
  const upperFootprintModeDefault = {
    upperFootprintMode: 'detached' as const,
  }
  const missingDefaults =
    input.recipeVersion === 1
      ? {
          ...upperFootprintModeDefault,
          ...upperMassProfileDefault,
          ...upperMassOffsetDefault,
          ...shoulderModeDefault,
          ...supportGridDefaults,
          footOffsetXMm: 0,
          footOffsetYMm: 0,
          footOffsetOverrides: [],
          supportSizeOverrides: [],
          supportPositionOverrides: [],
        }
      : input.recipeVersion === 2
        ? {
            ...upperFootprintModeDefault,
            ...upperMassProfileDefault,
            ...upperMassOffsetDefault,
            ...shoulderModeDefault,
            ...supportGridDefaults,
            footOffsetOverrides: [],
            supportSizeOverrides: [],
            supportPositionOverrides: [],
          }
        : input.recipeVersion === 3
          ? {
              ...upperFootprintModeDefault,
              ...upperMassProfileDefault,
              ...upperMassOffsetDefault,
              ...shoulderModeDefault,
              ...supportGridDefaults,
              supportSizeOverrides: [],
              supportPositionOverrides: [],
            }
          : input.recipeVersion === 4
            ? {
                ...upperFootprintModeDefault,
                ...upperMassProfileDefault,
                ...upperMassOffsetDefault,
                ...shoulderModeDefault,
                supportSizeOverrides: [],
                supportPositionOverrides: [],
              }
            : input.recipeVersion === 5
              ? {
                  ...upperFootprintModeDefault,
                  ...upperMassProfileDefault,
                  ...upperMassOffsetDefault,
                  ...shoulderModeDefault,
                  supportPositionOverrides: [],
                }
              : input.recipeVersion === 6
                ? {
                    ...upperFootprintModeDefault,
                    ...upperMassProfileDefault,
                    ...upperMassOffsetDefault,
                    ...shoulderModeDefault,
                  }
                : input.recipeVersion === 7
                  ? {
                      ...upperFootprintModeDefault,
                      ...upperMassProfileDefault,
                      ...upperMassOffsetDefault,
                    }
                  : input.recipeVersion === 8
                    ? {
                        ...upperFootprintModeDefault,
                        ...upperMassProfileDefault,
                      }
                    : input.recipeVersion === 9
                      ? upperFootprintModeDefault
                      : undefined
  return createProject(
    parsePilotiParameters(input.parameters, missingDefaults),
    modelScale,
  )
}

export function readRecovery(storage: StorageReader): RecoveryResult {
  try {
    const serialized = storage.getItem(RECOVERY_STORAGE_KEY)
    if (serialized === null) return { status: 'empty' }
    return { status: 'recovered', project: parseProject(serialized) }
  } catch (error) {
    return {
      status: 'invalid',
      message:
        error instanceof Error
          ? error.message
          : 'The local recovery copy could not be read.',
    }
  }
}

export function writeRecovery(
  storage: StorageWriter,
  project: RaakaProject,
): void {
  storage.setItem(RECOVERY_STORAGE_KEY, serializeProject(project))
}
