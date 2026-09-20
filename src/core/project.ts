import {
  parsePilotiParameters,
  ProjectValidationError,
} from './pilotiParameters'
import type { PilotiParameters } from './types'

export const PROJECT_FORMAT = 'raaka-project'
export const PROJECT_FORMAT_VERSION = 1
export const PILOTI_RECIPE_VERSION = 2
export const RECOVERY_STORAGE_KEY = 'raaka.recovery.v1'

export interface RaakaProject {
  readonly format: typeof PROJECT_FORMAT
  readonly formatVersion: typeof PROJECT_FORMAT_VERSION
  readonly recipe: 'piloti'
  readonly recipeVersion: typeof PILOTI_RECIPE_VERSION
  readonly modelScale: 1
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

export function createProject(parameters: PilotiParameters): RaakaProject {
  return {
    format: PROJECT_FORMAT,
    formatVersion: PROJECT_FORMAT_VERSION,
    recipe: 'piloti',
    recipeVersion: PILOTI_RECIPE_VERSION,
    modelScale: 1,
    parameters: { ...parameters },
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
    input.recipeVersion !== PILOTI_RECIPE_VERSION
  ) {
    throw new ProjectValidationError(
      `Piloti recipe version ${String(input.recipeVersion)} is not supported.`,
    )
  }
  const modelScale = input.modelScale ?? 1
  if (modelScale !== 1) {
    throw new ProjectValidationError(
      'Only model scale 1 is supported by this version.',
    )
  }

  const missingDefaults =
    input.recipeVersion === 1
      ? { footOffsetXMm: 0, footOffsetYMm: 0 }
      : undefined
  return createProject(
    parsePilotiParameters(input.parameters, missingDefaults),
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
