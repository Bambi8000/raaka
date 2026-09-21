import {
  DEFAULT_CONCRETE_DENSITY_KG_M3,
  DEFAULT_RETAINED_CORE_DENSITY_KG_M3,
  parsePilotiParameters,
  ProjectValidationError,
} from './pilotiParameters'
import { isModelScale } from './modelScale'
import type { ModelScale, PilotiParameters } from './types'

export const PROJECT_FORMAT = 'raaka-project'
export const PROJECT_FORMAT_VERSION = 1
export const PILOTI_RECIPE_VERSION = 19
export const RECOVERY_STORAGE_KEY = 'raaka.recovery.v2'

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
      removedPartIds: [...parameters.removedPartIds],
      massPartOverrides: parameters.massPartOverrides.map((override) => ({ ...override })),
      footOffsetOverrides: parameters.footOffsetOverrides.map((override) => ({
        ...override,
      })),
      supportSizeOverrides: parameters.supportSizeOverrides.map((override) => ({
        ...override,
      })),
      supportPositionOverrides: parameters.supportPositionOverrides.map(
        (override) => ({ ...override }),
      ),
      partCopies: parameters.partCopies.map((copy) => ({ ...copy })),
      fuseGroups: parameters.fuseGroups.map((group) => ({
        ...group,
        pieceIds: [...group.pieceIds],
      })),
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
    input.recipeVersion !== 10 &&
    input.recipeVersion !== 11 &&
    input.recipeVersion !== 12 &&
    input.recipeVersion !== 13 &&
    input.recipeVersion !== 14 &&
    input.recipeVersion !== 15 &&
    input.recipeVersion !== 16 &&
    input.recipeVersion !== 17 &&
    input.recipeVersion !== 18 &&
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
  const partCopiesDefault = { partCopies: [] }
  const fuseGroupsDefault = { fuseGroups: [] }
  const legacyCompositionDefaults = {
    ...partCopiesDefault,
    ...fuseGroupsDefault,
  }
  const missingDefaults =
    input.recipeVersion === 1
      ? {
          ...legacyCompositionDefaults,
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
            ...legacyCompositionDefaults,
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
              ...legacyCompositionDefaults,
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
                ...legacyCompositionDefaults,
                ...upperFootprintModeDefault,
                ...upperMassProfileDefault,
                ...upperMassOffsetDefault,
                ...shoulderModeDefault,
                supportSizeOverrides: [],
                supportPositionOverrides: [],
              }
            : input.recipeVersion === 5
              ? {
                  ...legacyCompositionDefaults,
                  ...upperFootprintModeDefault,
                  ...upperMassProfileDefault,
                  ...upperMassOffsetDefault,
                  ...shoulderModeDefault,
                  supportPositionOverrides: [],
                }
              : input.recipeVersion === 6
                ? {
                    ...legacyCompositionDefaults,
                    ...upperFootprintModeDefault,
                    ...upperMassProfileDefault,
                    ...upperMassOffsetDefault,
                    ...shoulderModeDefault,
                  }
                : input.recipeVersion === 7
                  ? {
                      ...legacyCompositionDefaults,
                      ...upperFootprintModeDefault,
                      ...upperMassProfileDefault,
                      ...upperMassOffsetDefault,
                    }
                  : input.recipeVersion === 8
                    ? {
                        ...legacyCompositionDefaults,
                        ...upperFootprintModeDefault,
                        ...upperMassProfileDefault,
                      }
                    : input.recipeVersion === 9
                      ? {
                          ...legacyCompositionDefaults,
                          ...upperFootprintModeDefault,
                        }
                      : input.recipeVersion === 10
                        ? legacyCompositionDefaults
                        : input.recipeVersion === 11
                          ? fuseGroupsDefault
                          : undefined
  return createProject(
    parsePilotiParameters(input.parameters, {
      ...missingDefaults,
      ...(input.recipeVersion < 13 ? { removedPartIds: [] } : {}),
      ...(input.recipeVersion < 14 ? { upperMassDivision: 'whole', massPartOverrides: [] } : {}),
      ...(input.recipeVersion < 15 ? { planShape: 'rectangle', polygonMassDivision: 'whole', radialSpreadRatio: 1 } : {}),
      ...(input.recipeVersion < 16 ? { footOffsetSpace: 'global' } : {}),
      ...(input.recipeVersion < 17 ? {
        retainedCoreMode: 'none',
        retainedCoreScale: 0.72,
      } : {}),
      ...(input.recipeVersion < 18 ? {
        concreteDensityKgM3: DEFAULT_CONCRETE_DENSITY_KG_M3,
        retainedCoreDensityKgM3: DEFAULT_RETAINED_CORE_DENSITY_KG_M3,
      } : {}),
    }),
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
