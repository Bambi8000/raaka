import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS } from './generator'
import { ProjectValidationError } from './pilotiParameters'
import {
  createProject,
  parseProject,
  PILOTI_RECIPE_VERSION,
  readRecovery,
  RECOVERY_STORAGE_KEY,
  serializeProject,
  writeRecovery,
} from './project'

describe('RAAKA project files', () => {
  it('round-trips every Piloti parameter and version field', () => {
    const project = createProject(
      {
        ...DEFAULT_PILOTI_PARAMETERS,
        seed: 319,
        heightMm: 2_000,
        supportCount: 6,
        supportRowCount: 3,
        rowSpacingMm: 480,
        supportDepthRatio: 0.46,
        footOffsetXMm: 175,
        footOffsetYMm: -90,
        footOffsetOverrides: [
          {
            supportId: 'support-2',
            footOffsetXMm: -120,
            footOffsetYMm: 80,
          },
          {
            supportId: 'support-r3-c6',
            footOffsetXMm: 200,
            footOffsetYMm: 0,
          },
        ],
        supportSizeOverrides: [
          {
            supportId: 'support-2',
            widthScale: 1.25,
            depthScale: 0.8,
          },
          {
            supportId: 'support-r3-c6',
            widthScale: 0.7,
            depthScale: 1.4,
          },
        ],
      },
      0.25,
    )

    expect(parseProject(serializeProject(project))).toEqual(project)
  })

  it('migrates recipe version one files to zero foot offsets', () => {
    const legacy = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as {
      recipeVersion: number
      parameters: Record<string, unknown>
    }
    legacy.recipeVersion = 1
    delete legacy.parameters.supportRowCount
    delete legacy.parameters.rowSpacingMm
    delete legacy.parameters.supportDepthRatio
    delete legacy.parameters.footOffsetXMm
    delete legacy.parameters.footOffsetYMm
    delete legacy.parameters.footOffsetOverrides
    delete legacy.parameters.supportSizeOverrides

    const migrated = parseProject(JSON.stringify(legacy))

    expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
    expect(migrated.parameters.footOffsetXMm).toBe(0)
    expect(migrated.parameters.footOffsetYMm).toBe(0)
    expect(migrated.parameters.footOffsetOverrides).toEqual([])
    expect(migrated.parameters.supportSizeOverrides).toEqual([])
    expect(migrated.parameters.supportRowCount).toBe(1)
    expect(migrated.parameters.rowSpacingMm).toBe(300)
    expect(migrated.parameters.supportDepthRatio).toBe(0.92)
  })

  it('migrates recipe version two files to an empty override list', () => {
    const legacy = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as {
      recipeVersion: number
      parameters: Record<string, unknown>
    }
    legacy.recipeVersion = 2
    delete legacy.parameters.supportRowCount
    delete legacy.parameters.rowSpacingMm
    delete legacy.parameters.supportDepthRatio
    delete legacy.parameters.footOffsetOverrides
    delete legacy.parameters.supportSizeOverrides

    const migrated = parseProject(JSON.stringify(legacy))

    expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
    expect(migrated.parameters.footOffsetOverrides).toEqual([])
    expect(migrated.parameters.supportSizeOverrides).toEqual([])
    expect(migrated.parameters.supportRowCount).toBe(1)
  })

  it('migrates recipe version three files to the original one-row layout', () => {
    const legacy = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as {
      recipeVersion: number
      parameters: Record<string, unknown>
    }
    legacy.recipeVersion = 3
    delete legacy.parameters.supportRowCount
    delete legacy.parameters.rowSpacingMm
    delete legacy.parameters.supportDepthRatio
    delete legacy.parameters.supportSizeOverrides

    const migrated = parseProject(JSON.stringify(legacy))

    expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
    expect(migrated.parameters.supportRowCount).toBe(1)
    expect(migrated.parameters.rowSpacingMm).toBe(300)
    expect(migrated.parameters.supportDepthRatio).toBe(0.92)
    expect(migrated.parameters.supportSizeOverrides).toEqual([])
  })

  it('migrates recipe version four files to shared support sizes', () => {
    const legacy = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as {
      recipeVersion: number
      parameters: Record<string, unknown>
    }
    legacy.recipeVersion = 4
    delete legacy.parameters.supportSizeOverrides

    const migrated = parseProject(JSON.stringify(legacy))

    expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
    expect(migrated.parameters.supportSizeOverrides).toEqual([])
  })

  it('requires an override list in the current recipe version', () => {
    const current = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as { parameters: Record<string, unknown> }
    delete current.parameters.footOffsetOverrides

    expect(() => parseProject(JSON.stringify(current))).toThrow(
      'Parameter "footOffsetOverrides" must be an array.',
    )
  })

  it('requires a support size override list in the current recipe version', () => {
    const current = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as { parameters: Record<string, unknown> }
    delete current.parameters.supportSizeOverrides

    expect(() => parseProject(JSON.stringify(current))).toThrow(
      'Parameter "supportSizeOverrides" must be an array.',
    )
  })

  it('requires support-grid parameters in the current recipe version', () => {
    const current = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as { parameters: Record<string, unknown> }
    delete current.parameters.supportRowCount

    expect(() => parseProject(JSON.stringify(current))).toThrow(
      'Parameter "supportRowCount" must be a finite number.',
    )
  })

  it('defaults a missing model scale to one for older files', () => {
    const project = createProject(DEFAULT_PILOTI_PARAMETERS)
    const legacy = JSON.parse(serializeProject(project)) as Record<
      string,
      unknown
    >
    delete legacy.modelScale

    expect(parseProject(JSON.stringify(legacy)).modelScale).toBe(1)
  })

  it.each([
    ['invalid JSON', '{'],
    [
      'wrong format',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        format: 'other-project',
      }),
    ],
    [
      'future format',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        formatVersion: 2,
      }),
    ],
    [
      'unknown recipe',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        recipe: 'silos',
      }),
    ],
    [
      'unsupported model scale',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        modelScale: 0.75,
      }),
    ],
    [
      'missing parameter',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: { seed: 318 },
      }),
    ],
    [
      'out-of-range parameter',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: { ...DEFAULT_PILOTI_PARAMETERS, supportCount: 12 },
      }),
    ],
    [
      'duplicated selected support override',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: {
          ...DEFAULT_PILOTI_PARAMETERS,
          footOffsetOverrides: [
            {
              supportId: 'support-2',
              footOffsetXMm: 10,
              footOffsetYMm: 20,
            },
            {
              supportId: 'support-2',
              footOffsetXMm: -10,
              footOffsetYMm: -20,
            },
          ],
        },
      }),
    ],
    [
      'out-of-range selected support size',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: {
          ...DEFAULT_PILOTI_PARAMETERS,
          supportSizeOverrides: [
            {
              supportId: 'support-2',
              widthScale: 1.8,
              depthScale: 1,
            },
          ],
        },
      }),
    ],
  ])('rejects %s before it can replace the study', (_name, serialized) => {
    expect(() => parseProject(serialized)).toThrow(ProjectValidationError)
  })

  it('writes and recovers the same validated project', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const project = createProject(DEFAULT_PILOTI_PARAMETERS)

    writeRecovery(storage, project)

    expect(values.has(RECOVERY_STORAGE_KEY)).toBe(true)
    expect(readRecovery(storage)).toEqual({ status: 'recovered', project })
  })

  it('reports an invalid recovery without returning partial state', () => {
    const storage = { getItem: () => '{' }

    expect(readRecovery(storage)).toEqual({
      status: 'invalid',
      message: 'The selected file is not valid JSON.',
    })
  })
})
