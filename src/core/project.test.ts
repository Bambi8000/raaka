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
        shoulderMode: 'shared',
        upperFootprintMode: 'detached',
        upperOffsetXMm: 240,
        upperOffsetYMm: -170,
        upperMassProfile: 'tapered',
        upperTopWidthRatio: 0.61,
        upperTopDepthRatio: 0.83,
        upperTopOffsetXMm: 210,
        upperTopOffsetYMm: -130,
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
        supportPositionOverrides: [
          {
            supportId: 'support-2',
            positionXMm: 75,
            positionYMm: -45,
          },
          {
            supportId: 'support-r3-c6',
            positionXMm: -160,
            positionYMm: 220,
          },
        ],
        partCopies: [
          {
            id: 'copy-1',
            sourceId: 'upper-mass',
            offsetXMm: 480,
            offsetYMm: -220,
            offsetZMm: 160,
          },
          {
            id: 'copy-2',
            sourceId: 'support-r3-c6',
            offsetXMm: -360,
            offsetYMm: 190,
            offsetZMm: 0,
          },
        ],
        fuseGroups: [
          {
            id: 'fuse-1',
            pieceIds: ['upper-mass', 'upper-mass-copy-1'],
          },
          {
            id: 'fuse-2',
            pieceIds: ['support-r3-c6', 'support-copy-2'],
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
    delete legacy.parameters.supportPositionOverrides
    delete legacy.parameters.shoulderMode
    delete legacy.parameters.upperOffsetXMm
    delete legacy.parameters.upperOffsetYMm

    const migrated = parseProject(JSON.stringify(legacy))

    expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
    expect(migrated.parameters.footOffsetXMm).toBe(0)
    expect(migrated.parameters.footOffsetYMm).toBe(0)
    expect(migrated.parameters.footOffsetOverrides).toEqual([])
    expect(migrated.parameters.supportSizeOverrides).toEqual([])
    expect(migrated.parameters.supportPositionOverrides).toEqual([])
    expect(migrated.parameters.shoulderMode).toBe('divided')
    expect(migrated.parameters.upperOffsetXMm).toBe(0)
    expect(migrated.parameters.upperOffsetYMm).toBe(0)
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
    delete legacy.parameters.supportPositionOverrides
    delete legacy.parameters.shoulderMode
    delete legacy.parameters.upperOffsetXMm
    delete legacy.parameters.upperOffsetYMm

    const migrated = parseProject(JSON.stringify(legacy))

    expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
    expect(migrated.parameters.footOffsetOverrides).toEqual([])
    expect(migrated.parameters.supportSizeOverrides).toEqual([])
    expect(migrated.parameters.supportPositionOverrides).toEqual([])
    expect(migrated.parameters.shoulderMode).toBe('divided')
    expect(migrated.parameters.upperOffsetXMm).toBe(0)
    expect(migrated.parameters.upperOffsetYMm).toBe(0)
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
    delete legacy.parameters.supportPositionOverrides
    delete legacy.parameters.shoulderMode
    delete legacy.parameters.upperOffsetXMm
    delete legacy.parameters.upperOffsetYMm

    const migrated = parseProject(JSON.stringify(legacy))

    expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
    expect(migrated.parameters.supportRowCount).toBe(1)
    expect(migrated.parameters.rowSpacingMm).toBe(300)
    expect(migrated.parameters.supportDepthRatio).toBe(0.92)
    expect(migrated.parameters.supportSizeOverrides).toEqual([])
    expect(migrated.parameters.supportPositionOverrides).toEqual([])
    expect(migrated.parameters.shoulderMode).toBe('divided')
    expect(migrated.parameters.upperOffsetXMm).toBe(0)
    expect(migrated.parameters.upperOffsetYMm).toBe(0)
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
    delete legacy.parameters.supportPositionOverrides
    delete legacy.parameters.shoulderMode
    delete legacy.parameters.upperOffsetXMm
    delete legacy.parameters.upperOffsetYMm

    const migrated = parseProject(JSON.stringify(legacy))

    expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
    expect(migrated.parameters.supportSizeOverrides).toEqual([])
    expect(migrated.parameters.supportPositionOverrides).toEqual([])
    expect(migrated.parameters.shoulderMode).toBe('divided')
    expect(migrated.parameters.upperOffsetXMm).toBe(0)
    expect(migrated.parameters.upperOffsetYMm).toBe(0)
  })

  it('migrates recipe version five files to generated grid positions', () => {
    const legacy = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as {
      recipeVersion: number
      parameters: Record<string, unknown>
    }
    legacy.recipeVersion = 5
    delete legacy.parameters.supportPositionOverrides
    delete legacy.parameters.shoulderMode
    delete legacy.parameters.upperOffsetXMm
    delete legacy.parameters.upperOffsetYMm

    const migrated = parseProject(JSON.stringify(legacy))

    expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
    expect(migrated.parameters.supportPositionOverrides).toEqual([])
    expect(migrated.parameters.shoulderMode).toBe('divided')
    expect(migrated.parameters.upperOffsetXMm).toBe(0)
    expect(migrated.parameters.upperOffsetYMm).toBe(0)
  })

  it('migrates recipe version six files to divided shoulders', () => {
    const legacy = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as {
      recipeVersion: number
      parameters: Record<string, unknown>
    }
    legacy.recipeVersion = 6
    delete legacy.parameters.shoulderMode
    delete legacy.parameters.upperOffsetXMm
    delete legacy.parameters.upperOffsetYMm

    const migrated = parseProject(JSON.stringify(legacy))

    expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
    expect(migrated.parameters.shoulderMode).toBe('divided')
    expect(migrated.parameters.upperOffsetXMm).toBe(0)
    expect(migrated.parameters.upperOffsetYMm).toBe(0)
  })

  it('migrates recipe version seven files to a centred upper mass', () => {
    const legacy = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as {
      recipeVersion: number
      parameters: Record<string, unknown>
    }
    legacy.recipeVersion = 7
    delete legacy.parameters.upperOffsetXMm
    delete legacy.parameters.upperOffsetYMm

    const migrated = parseProject(JSON.stringify(legacy))

    expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
    expect(migrated.parameters.upperOffsetXMm).toBe(0)
    expect(migrated.parameters.upperOffsetYMm).toBe(0)
  })

  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    'migrates recipe version %i files to a block upper-mass profile',
    (recipeVersion) => {
      const legacy = JSON.parse(
        serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
      ) as {
        recipeVersion: number
        parameters: Record<string, unknown>
      }
      legacy.recipeVersion = recipeVersion
      delete legacy.parameters.upperMassProfile
      delete legacy.parameters.upperTopWidthRatio
      delete legacy.parameters.upperTopDepthRatio
      delete legacy.parameters.upperTopOffsetXMm
      delete legacy.parameters.upperTopOffsetYMm

      const migrated = parseProject(JSON.stringify(legacy))

      expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
      expect(migrated.parameters.upperMassProfile).toBe('block')
      expect(migrated.parameters.upperTopWidthRatio).toBe(0.72)
      expect(migrated.parameters.upperTopDepthRatio).toBe(0.84)
      expect(migrated.parameters.upperTopOffsetXMm).toBe(120)
      expect(migrated.parameters.upperTopOffsetYMm).toBe(0)
    },
  )

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])(
    'migrates recipe version %i files to a detached upper footprint',
    (recipeVersion) => {
      const legacy = JSON.parse(
        serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
      ) as {
        recipeVersion: number
        parameters: Record<string, unknown>
      }
      legacy.recipeVersion = recipeVersion
      delete legacy.parameters.upperFootprintMode

      const migrated = parseProject(JSON.stringify(legacy))

      expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
      expect(migrated.parameters.upperFootprintMode).toBe('detached')
    },
  )

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])(
    'migrates recipe version %i files to no part copies',
    (recipeVersion) => {
      const legacy = JSON.parse(
        serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
      ) as {
        recipeVersion: number
        parameters: Record<string, unknown>
      }
      legacy.recipeVersion = recipeVersion
      delete legacy.parameters.partCopies

      const migrated = parseProject(JSON.stringify(legacy))

      expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
      expect(migrated.parameters.partCopies).toEqual([])
    },
  )

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])(
    'migrates recipe version %i files to no fuse groups',
    (recipeVersion) => {
      const legacy = JSON.parse(
        serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
      ) as {
        recipeVersion: number
        parameters: Record<string, unknown>
      }
      legacy.recipeVersion = recipeVersion
      delete legacy.parameters.fuseGroups

      const migrated = parseProject(JSON.stringify(legacy))

      expect(migrated.recipeVersion).toBe(PILOTI_RECIPE_VERSION)
      expect(migrated.parameters.fuseGroups).toEqual([])
    },
  )

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

  it('requires a support position override list in the current recipe version', () => {
    const current = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as { parameters: Record<string, unknown> }
    delete current.parameters.supportPositionOverrides

    expect(() => parseProject(JSON.stringify(current))).toThrow(
      'Parameter "supportPositionOverrides" must be an array.',
    )
  })

  it('requires a part-copy list in the current recipe version', () => {
    const current = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as { parameters: Record<string, unknown> }
    delete current.parameters.partCopies

    expect(() => parseProject(JSON.stringify(current))).toThrow(
      'Parameter "partCopies" must be an array.',
    )
  })

  it('requires a fuse-group list in the current recipe version', () => {
    const current = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as { parameters: Record<string, unknown> }
    delete current.parameters.fuseGroups

    expect(() => parseProject(JSON.stringify(current))).toThrow(
      'Parameter "fuseGroups" must be an array.',
    )
  })

  it('requires a shoulder topology in the current recipe version', () => {
    const current = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as { parameters: Record<string, unknown> }
    delete current.parameters.shoulderMode

    expect(() => parseProject(JSON.stringify(current))).toThrow(
      'Parameter "shoulderMode" must be "divided" or "shared".',
    )
  })

  it('requires upper-mass offsets in the current recipe version', () => {
    const current = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as { parameters: Record<string, unknown> }
    delete current.parameters.upperOffsetXMm

    expect(() => parseProject(JSON.stringify(current))).toThrow(
      'Parameter "upperOffsetXMm" must be a finite number.',
    )
  })

  it('requires an upper-mass profile in the current recipe version', () => {
    const current = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as { parameters: Record<string, unknown> }
    delete current.parameters.upperMassProfile

    expect(() => parseProject(JSON.stringify(current))).toThrow(
      'Parameter "upperMassProfile" must be "block" or "tapered".',
    )
  })

  it('requires an upper-footprint relationship in the current recipe version', () => {
    const current = JSON.parse(
      serializeProject(createProject(DEFAULT_PILOTI_PARAMETERS)),
    ) as { parameters: Record<string, unknown> }
    delete current.parameters.upperFootprintMode

    expect(() => parseProject(JSON.stringify(current))).toThrow(
      'Parameter "upperFootprintMode" must be "linked" or "detached".',
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
    [
      'out-of-range selected support position',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: {
          ...DEFAULT_PILOTI_PARAMETERS,
          supportPositionOverrides: [
            {
              supportId: 'support-2',
              positionXMm: 301,
              positionYMm: 0,
            },
          ],
        },
      }),
    ],
    [
      'unsupported shoulder topology',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: {
          ...DEFAULT_PILOTI_PARAMETERS,
          shoulderMode: 'merged',
        },
      }),
    ],
    [
      'unsupported upper-mass profile',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: {
          ...DEFAULT_PILOTI_PARAMETERS,
          upperMassProfile: 'wedge',
        },
      }),
    ],
    [
      'unsupported part-copy source',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: {
          ...DEFAULT_PILOTI_PARAMETERS,
          partCopies: [
            {
              id: 'copy-1',
              sourceId: 'shoulder-1',
              offsetXMm: 0,
              offsetYMm: 0,
              offsetZMm: 0,
            },
          ],
        },
      }),
    ],
    [
      'out-of-range part-copy offset',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: {
          ...DEFAULT_PILOTI_PARAMETERS,
          partCopies: [
            {
              id: 'copy-1',
              sourceId: 'upper-mass',
              offsetXMm: 2_001,
              offsetYMm: 0,
              offsetZMm: 0,
            },
          ],
        },
      }),
    ],
    [
      'duplicated part-copy ID',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: {
          ...DEFAULT_PILOTI_PARAMETERS,
          partCopies: [
            {
              id: 'copy-1',
              sourceId: 'upper-mass',
              offsetXMm: 0,
              offsetYMm: 0,
              offsetZMm: 0,
            },
            {
              id: 'copy-1',
              sourceId: 'support-1',
              offsetXMm: 100,
              offsetYMm: 0,
              offsetZMm: 0,
            },
          ],
        },
      }),
    ],
    [
      'invalid fuse-group piece ID',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: {
          ...DEFAULT_PILOTI_PARAMETERS,
          fuseGroups: [
            {
              id: 'fuse-1',
              pieceIds: ['upper-mass', 'fuse-9'],
            },
          ],
        },
      }),
    ],
    [
      'repeated piece inside a fuse group',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: {
          ...DEFAULT_PILOTI_PARAMETERS,
          fuseGroups: [
            {
              id: 'fuse-1',
              pieceIds: ['upper-mass', 'upper-mass'],
            },
          ],
        },
      }),
    ],
    [
      'piece shared by two fuse groups',
      JSON.stringify({
        ...createProject(DEFAULT_PILOTI_PARAMETERS),
        parameters: {
          ...DEFAULT_PILOTI_PARAMETERS,
          fuseGroups: [
            {
              id: 'fuse-1',
              pieceIds: ['upper-mass', 'support-1'],
            },
            {
              id: 'fuse-2',
              pieceIds: ['upper-mass', 'support-2'],
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
