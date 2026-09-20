import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PILOTI_PARAMETERS,
  generatePiloti,
  MAX_SEED,
  RECIPES,
} from './generator'
import { scenePieceBounds } from './bounds'
import { PILOTI_PARAMETER_RULES } from './pilotiParameters'
import type { FrustumPiece, PilotiParameters } from './types'

function expectFiniteStudy(parameters: PilotiParameters): void {
  const study = generatePiloti(parameters)
  const numericValues = [
    ...study.bounds.min,
    ...study.bounds.max,
    study.widthMm,
    study.depthMm,
    study.heightMm,
    study.concreteVolumeMm3,
    study.estimatedMassKg,
    study.groundContactMm2,
    ...(study.supportLayout
      ? [
          study.supportLayout.columns,
          study.supportLayout.rows,
          study.supportLayout.totalSupports,
          study.supportLayout.rowSpacingMm,
          study.supportLayout.shoulderDepthMm,
          study.supportLayout.adjacentRowOverlapMm,
          study.supportLayout.adjacentColumnOverlapMm,
          study.supportLayout.adjacentColumnGapMm,
          study.supportLayout.nonAdjacentBearingOverlapMm,
          study.supportLayout.bearingOverhangMm,
          study.supportLayout.sideBearingOverhangMm,
        ]
      : []),
    ...study.pieces.flatMap((piece) => [
      ...piece.position,
      ...(piece.kind === 'box'
        ? piece.size
        : [
            piece.height,
            ...piece.bottomSize,
            ...piece.topSize,
            ...piece.bottomOffset,
            ...piece.topOffset,
          ]),
    ]),
  ]

  expect(numericValues.every(Number.isFinite)).toBe(true)
}

describe('generatePiloti', () => {
  it('is deterministic for an unchanged recipe', () => {
    expect(generatePiloti(DEFAULT_PILOTI_PARAMETERS)).toEqual(
      generatePiloti(DEFAULT_PILOTI_PARAMETERS),
    )
  })

  it('builds one stem and one shoulder for every support', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 4,
    })

    expect(study.pieces.filter((piece) => piece.role === 'support')).toHaveLength(
      8,
    )
    expect(study.pieces.at(-1)?.id).toBe('upper-mass')
  })

  it('builds a stable three-column by two-row support grid', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 3,
      supportRowCount: 2,
      rowSpacingMm: 320,
      supportDepthRatio: 0.5,
    })

    expect(study.pieces.filter((piece) => piece.role === 'support')).toHaveLength(
      12,
    )
    expect(study.pieces.map((piece) => piece.id)).toEqual([
      'support-1',
      'shoulder-1',
      'support-2',
      'shoulder-2',
      'support-3',
      'shoulder-3',
      'support-r2-c1',
      'shoulder-r2-c1',
      'support-r2-c2',
      'shoulder-r2-c2',
      'support-r2-c3',
      'shoulder-r2-c3',
      'upper-mass',
    ])
    expect(study.supportLayout).toMatchObject({
      columns: 3,
      rows: 2,
      totalSupports: 6,
      rowSpacingMm: 320,
      adjacentRowOverlapMm: 0,
    })
    expect(study.supportLayout?.shoulderDepthMm).toBeCloseTo(255, 10)
    expect(study.supportLayout?.bearingOverhangMm).toBeCloseTo(0, 10)
  })

  it('links the upper X/Y footprint to support columns, rows and spacing', () => {
    const base = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 440,
      asymmetry: 0,
      upperFootprintMode: 'linked',
      supportCount: 3,
      supportRowCount: 1,
      rowSpacingMm: 360,
    })
    const expanded = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 440,
      asymmetry: 0,
      upperFootprintMode: 'linked',
      supportCount: 5,
      supportRowCount: 3,
      rowSpacingMm: 360,
    })
    const baseMass = base.pieces.find((piece) => piece.id === 'upper-mass')
    const expandedMass = expanded.pieces.find(
      (piece) => piece.id === 'upper-mass',
    )
    const baseStem = base.pieces.find(
      (piece): piece is FrustumPiece => piece.id === 'support-1',
    )
    const expandedStem = expanded.pieces.find(
      (piece): piece is FrustumPiece => piece.id === 'support-1',
    )

    expect(baseMass?.kind).toBe('box')
    expect(expandedMass?.kind).toBe('box')
    expect(baseStem).toBeDefined()
    expect(expandedStem).toBeDefined()
    if (
      !baseMass ||
      baseMass.kind !== 'box' ||
      !expandedMass ||
      expandedMass.kind !== 'box' ||
      !baseStem ||
      !expandedStem
    ) {
      return
    }

    expect(expandedMass.size[0]).toBeCloseTo(baseMass.size[0] * (5 / 3), 10)
    expect(expandedMass.size[1]).toBeCloseTo(baseMass.size[1] + 720, 10)
    expect(expandedMass.size[2]).toBe(baseMass.size[2])
    expect(expandedMass.position[2]).toBe(baseMass.position[2])
    expect(expandedStem.bottomSize).toEqual(baseStem.bottomSize)
    expect(expandedStem.topSize).toEqual(baseStem.topSize)
  })

  it('keeps the upper X/Y footprint independent when detached', () => {
    const base = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 440,
      asymmetry: 0,
      upperFootprintMode: 'detached',
      supportCount: 3,
      supportRowCount: 1,
      rowSpacingMm: 360,
    })
    const expanded = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 440,
      asymmetry: 0,
      upperFootprintMode: 'detached',
      supportCount: 5,
      supportRowCount: 3,
      rowSpacingMm: 720,
    })
    const baseMass = base.pieces.find((piece) => piece.id === 'upper-mass')
    const expandedMass = expanded.pieces.find(
      (piece) => piece.id === 'upper-mass',
    )

    expect(baseMass).toEqual(expandedMass)
  })

  it('keeps first-row identities and authored shapes when rows are added', () => {
    const oneRow = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 932,
      supportRowCount: 1,
      rowSpacingMm: 280,
      supportDepthRatio: 0.44,
    })
    const threeRows = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 932,
      supportRowCount: 3,
      rowSpacingMm: 280,
      supportDepthRatio: 0.44,
    })

    for (const id of [
      'support-1',
      'shoulder-1',
      'support-2',
      'shoulder-2',
      'support-3',
      'shoulder-3',
    ]) {
      const original = oneRow.pieces.find((piece) => piece.id === id)
      const repeated = threeRows.pieces.find((piece) => piece.id === id)
      expect(original).toBeDefined()
      expect(repeated).toBeDefined()
      if (!original || !repeated) continue

      expect(repeated).toEqual({
        ...original,
        position: [original.position[0], -280, original.position[2]],
      })
    }
  })

  it('keeps the physical height inside the one-to-two metre design range', () => {
    expect(
      generatePiloti({ ...DEFAULT_PILOTI_PARAMETERS, heightMm: 400 }).heightMm,
    ).toBe(1_000)
    expect(
      generatePiloti({ ...DEFAULT_PILOTI_PARAMETERS, heightMm: 4_000 }).heightMm,
    ).toBe(2_000)
  })

  it('reports positive manufacturing estimates', () => {
    const study = generatePiloti(DEFAULT_PILOTI_PARAMETERS)

    expect(study.concreteVolumeMm3).toBeGreaterThan(0)
    expect(study.estimatedMassKg).toBeGreaterThan(0)
    expect(study.groundContactMm2).toBeGreaterThan(0)
  })

  it('measures the complete seed-319 envelope including shifted supports', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 319,
      supportCount: 1,
      upperFootprintMode: 'detached',
      neckWidthRatio: 0.18,
      asymmetry: 0.5,
    })

    expect(study.widthMm).toBeCloseTo(1_434.230572, 5)
    expect(study.widthMm).toBeGreaterThan(1_080)
    for (const piece of study.pieces) {
      const bounds = scenePieceBounds(piece)
      for (let axis = 0; axis < 3; axis += 1) {
        expect(bounds.min[axis]).toBeGreaterThanOrEqual(
          study.bounds.min[axis],
        )
        expect(bounds.max[axis]).toBeLessThanOrEqual(study.bounds.max[axis])
      }
    }
  })

  it('keeps every support on the ground and every stem joined to its shoulder', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 220,
      supportCount: 3,
      supportRowCount: 2,
      asymmetry: 0.5,
      footOffsetXMm: 180,
      footOffsetYMm: -120,
    })

    for (let row = 1; row <= 2; row += 1) {
      for (let column = 1; column <= 3; column += 1) {
        const suffix = row === 1 ? String(column) : `r${row}-c${column}`
        const stem = study.pieces.find(
          (piece): piece is FrustumPiece => piece.id === `support-${suffix}`,
        )
        const shoulder = study.pieces.find(
          (piece): piece is FrustumPiece => piece.id === `shoulder-${suffix}`,
        )

        expect(stem).toBeDefined()
        expect(shoulder).toBeDefined()
        if (!stem || !shoulder) continue

        expect(stem.position[2] - stem.height / 2).toBeCloseTo(0, 10)
        expect(stem.position[2] + stem.height / 2).toBeCloseTo(
          shoulder.position[2] - shoulder.height / 2,
          10,
        )
        expect(stem.position[0] + stem.topOffset[0]).toBeCloseTo(
          shoulder.position[0] + shoulder.bottomOffset[0],
          10,
        )
        expect(stem.position[1] + stem.topOffset[1]).toBeCloseTo(
          shoulder.position[1] + shoulder.bottomOffset[1],
          10,
        )
        expect(stem.topSize).toEqual(shoulder.bottomSize)
      }
    }
    expect(study.bounds.min[2]).toBeCloseTo(0, 10)
  })

  it('moves every foot without moving its neck or changing physical estimates', () => {
    const baseParameters = {
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 220,
      supportCount: 4,
      asymmetry: 0.5,
    }
    const straight = generatePiloti(baseParameters)
    const leaned = generatePiloti({
      ...baseParameters,
      footOffsetXMm: 120,
      footOffsetYMm: -80,
    })

    for (let index = 1; index <= baseParameters.supportCount; index += 1) {
      const straightStem = straight.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `support-${index}`,
      )
      const leanedStem = leaned.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `support-${index}`,
      )

      expect(straightStem).toBeDefined()
      expect(leanedStem).toBeDefined()
      if (!straightStem || !leanedStem) continue

      expect(
        leanedStem.position[0] + leanedStem.bottomOffset[0] -
          (straightStem.position[0] + straightStem.bottomOffset[0]),
      ).toBeCloseTo(120, 10)
      expect(
        leanedStem.position[1] + leanedStem.bottomOffset[1] -
          (straightStem.position[1] + straightStem.bottomOffset[1]),
      ).toBeCloseTo(-80, 10)
      expect(leanedStem.position[0] + leanedStem.topOffset[0]).toBeCloseTo(
        straightStem.position[0] + straightStem.topOffset[0],
        10,
      )
      expect(leanedStem.position[1] + leanedStem.topOffset[1]).toBeCloseTo(
        straightStem.position[1] + straightStem.topOffset[1],
        10,
      )
    }

    expect(leaned.concreteVolumeMm3).toBeCloseTo(
      straight.concreteVolumeMm3,
      10,
    )
    expect(leaned.estimatedMassKg).toBeCloseTo(straight.estimatedMassKg, 10)
    expect(leaned.groundContactMm2).toBeCloseTo(
      straight.groundContactMm2,
      10,
    )
    for (const piece of leaned.pieces) {
      const bounds = scenePieceBounds(piece)
      for (let axis = 0; axis < 3; axis += 1) {
        expect(bounds.min[axis]).toBeGreaterThanOrEqual(
          leaned.bounds.min[axis],
        )
        expect(bounds.max[axis]).toBeLessThanOrEqual(leaned.bounds.max[axis])
      }
    }
  })

  it('replaces the shared offset only for the named support', () => {
    const shared = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 3,
      footOffsetXMm: 40,
      footOffsetYMm: -20,
    })
    const overridden = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 3,
      footOffsetXMm: 40,
      footOffsetYMm: -20,
      footOffsetOverrides: [
        {
          supportId: 'support-2',
          footOffsetXMm: -160,
          footOffsetYMm: 90,
        },
      ],
    })

    for (let index = 1; index <= 3; index += 1) {
      const support = overridden.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `support-${index}`,
      )
      const sharedSupport = shared.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `support-${index}`,
      )

      expect(support).toBeDefined()
      expect(sharedSupport).toBeDefined()
      if (!support || !sharedSupport) continue

      expect(support.bottomOffset).toEqual(
        index === 2 ? [-160, 90] : [40, -20],
      )
      expect(support.position[0] + support.topOffset[0]).toBeCloseTo(
        sharedSupport.position[0] + sharedSupport.topOffset[0],
        10,
      )
      expect(support.position[1] + support.topOffset[1]).toBeCloseTo(
        sharedSupport.position[1] + sharedSupport.topOffset[1],
        10,
      )
    }

    expect(overridden.concreteVolumeMm3).toBeCloseTo(
      shared.concreteVolumeMm3,
      10,
    )
    expect(overridden.groundContactMm2).toBeCloseTo(
      shared.groundContactMm2,
      10,
    )
  })

  it('applies an override to a selected support in a later row', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 3,
      supportRowCount: 2,
      footOffsetXMm: 40,
      footOffsetYMm: -20,
      footOffsetOverrides: [
        {
          supportId: 'support-r2-c2',
          footOffsetXMm: -140,
          footOffsetYMm: 110,
        },
      ],
    })

    const selected = study.pieces.find(
      (piece): piece is FrustumPiece => piece.id === 'support-r2-c2',
    )
    const neighbour = study.pieces.find(
      (piece): piece is FrustumPiece => piece.id === 'support-r2-c1',
    )

    expect(selected?.bottomOffset).toEqual([-140, 110])
    expect(neighbour?.bottomOffset).toEqual([40, -20])
  })

  it('scales width and depth only for the named support pair', () => {
    const baseParameters = {
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 3,
      supportRowCount: 2,
      supportDepthRatio: 0.48,
    }
    const shared = generatePiloti(baseParameters)
    const overridden = generatePiloti({
      ...baseParameters,
      supportSizeOverrides: [
        {
          supportId: 'support-r2-c2',
          widthScale: 1.25,
          depthScale: 0.7,
        },
      ],
    })

    for (const prefix of ['support', 'shoulder'] as const) {
      const basePiece = shared.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `${prefix}-r2-c2`,
      )
      const sizedPiece = overridden.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `${prefix}-r2-c2`,
      )
      expect(basePiece).toBeDefined()
      expect(sizedPiece).toBeDefined()
      if (!basePiece || !sizedPiece) continue

      expect(sizedPiece.position).toEqual(basePiece.position)
      expect(sizedPiece.height).toBe(basePiece.height)
      expect(sizedPiece.bottomOffset).toEqual(basePiece.bottomOffset)
      expect(sizedPiece.topOffset).toEqual(basePiece.topOffset)
      expect(sizedPiece.bottomSize[0]).toBeCloseTo(
        basePiece.bottomSize[0] * 1.25,
        10,
      )
      expect(sizedPiece.bottomSize[1]).toBeCloseTo(
        basePiece.bottomSize[1] * 0.7,
        10,
      )
      expect(sizedPiece.topSize[0]).toBeCloseTo(
        basePiece.topSize[0] * 1.25,
        10,
      )
      expect(sizedPiece.topSize[1]).toBeCloseTo(
        basePiece.topSize[1] * 0.7,
        10,
      )
    }

    expect(
      overridden.pieces.find((piece) => piece.id === 'support-r2-c1'),
    ).toEqual(shared.pieces.find((piece) => piece.id === 'support-r2-c1'))
    expect(overridden.concreteVolumeMm3).not.toBe(shared.concreteVolumeMm3)
    expect(overridden.groundContactMm2).not.toBe(shared.groundContactMm2)
  })

  it('reports overlap and side overhang from an oversized selected support', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      asymmetry: 0,
      supportSizeOverrides: [
        {
          supportId: 'support-1',
          widthScale: 1.45,
          depthScale: 1,
        },
      ],
    })

    expect(study.supportLayout?.adjacentColumnOverlapMm).toBeCloseTo(45.72, 10)
    expect(study.supportLayout?.sideBearingOverhangMm).toBeCloseTo(60.12, 10)
  })

  it('aligns shared shoulder tops into one continuous row', () => {
    const divided = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 319,
      asymmetry: 0.5,
      shoulderMode: 'divided',
    })
    const shared = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 319,
      asymmetry: 0.5,
      shoulderMode: 'shared',
    })

    for (let column = 1; column < 3; column += 1) {
      const left = shared.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `shoulder-${column}`,
      )
      const right = shared.pieces.find(
        (piece): piece is FrustumPiece =>
          piece.id === `shoulder-${column + 1}`,
      )
      expect(left).toBeDefined()
      expect(right).toBeDefined()
      if (!left || !right) continue

      const leftEdge =
        left.position[0] + left.topOffset[0] + left.topSize[0] / 2
      const rightEdge =
        right.position[0] + right.topOffset[0] - right.topSize[0] / 2
      expect(leftEdge).toBeCloseTo(rightEdge, 10)
    }

    for (let column = 1; column <= 3; column += 1) {
      expect(
        shared.pieces.find((piece) => piece.id === `support-${column}`),
      ).toEqual(
        divided.pieces.find((piece) => piece.id === `support-${column}`),
      )
    }
    expect(shared.supportLayout?.adjacentColumnGapMm).toBeCloseTo(0, 10)
    expect(shared.supportLayout?.adjacentColumnOverlapMm).toBeCloseTo(0, 10)
    expect(shared.supportLayout?.sideBearingOverhangMm).toBeCloseTo(0, 10)
    expect(shared.concreteVolumeMm3).toBeGreaterThan(
      divided.concreteVolumeMm3,
    )
    expect(shared.groundContactMm2).toBe(divided.groundContactMm2)
  })

  it('moves the upper mass independently from divided supports', () => {
    const centred = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 319,
      shoulderMode: 'divided',
    })
    const shifted = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 319,
      shoulderMode: 'divided',
      upperOffsetXMm: 180,
      upperOffsetYMm: -120,
    })
    const centredMass = centred.pieces.find(
      (piece) => piece.id === 'upper-mass',
    )
    const shiftedMass = shifted.pieces.find(
      (piece) => piece.id === 'upper-mass',
    )

    expect(centredMass).toBeDefined()
    expect(shiftedMass).toBeDefined()
    if (!centredMass || !shiftedMass) return
    expect(shiftedMass.position).toEqual([
      centredMass.position[0] + 180,
      centredMass.position[1] - 120,
      centredMass.position[2],
    ])
    for (const piece of centred.pieces.filter(
      (candidate) => candidate.role === 'support',
    )) {
      expect(shifted.pieces.find((candidate) => candidate.id === piece.id)).toEqual(
        piece,
      )
    }
    expect(shifted.concreteVolumeMm3).toBeCloseTo(
      centred.concreteVolumeMm3,
      10,
    )
    expect(shifted.groundContactMm2).toBe(centred.groundContactMm2)
    expect(shifted.supportLayout?.bearingOverhangMm).toBeCloseTo(99.6, 10)
  })

  it('keeps shared shoulder tops aligned to an offset upper mass', () => {
    const centred = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 319,
      asymmetry: 0.5,
      shoulderMode: 'shared',
    })
    const shifted = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 319,
      asymmetry: 0.5,
      shoulderMode: 'shared',
      upperOffsetXMm: -210,
    })

    for (let column = 1; column <= 3; column += 1) {
      const centredShoulder = centred.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `shoulder-${column}`,
      )
      const shiftedShoulder = shifted.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `shoulder-${column}`,
      )
      const centredStem = centred.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `support-${column}`,
      )
      const shiftedStem = shifted.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `support-${column}`,
      )
      expect(centredShoulder).toBeDefined()
      expect(shiftedShoulder).toBeDefined()
      expect(shiftedStem).toEqual(centredStem)
      if (!centredShoulder || !shiftedShoulder) continue

      expect(
        shiftedShoulder.position[0] + shiftedShoulder.topOffset[0],
      ).toBeCloseTo(
        centredShoulder.position[0] + centredShoulder.topOffset[0] - 210,
        10,
      )
      expect(shiftedShoulder.position).toEqual(centredShoulder.position)
      expect(shiftedShoulder.bottomOffset).toEqual(
        centredShoulder.bottomOffset,
      )
    }
    expect(shifted.supportLayout?.adjacentColumnGapMm).toBeCloseTo(0, 10)
    expect(shifted.supportLayout?.adjacentColumnOverlapMm).toBeCloseTo(0, 10)
    expect(shifted.supportLayout?.sideBearingOverhangMm).toBeCloseTo(0, 10)
  })

  it('tapers and drifts the upper mass without changing its bearing face', () => {
    const block = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 640,
      upperMassProfile: 'block',
    })
    const tapered = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      seed: 640,
      upperMassProfile: 'tapered',
      upperTopWidthRatio: 0.64,
      upperTopDepthRatio: 0.78,
      upperTopOffsetXMm: 170,
      upperTopOffsetYMm: -90,
    })
    const blockMass = block.pieces.find((piece) => piece.id === 'upper-mass')
    const taperedMass = tapered.pieces.find(
      (piece): piece is FrustumPiece =>
        piece.id === 'upper-mass' && piece.kind === 'frustum',
    )

    expect(blockMass?.kind).toBe('box')
    expect(taperedMass).toBeDefined()
    if (!blockMass || blockMass.kind !== 'box' || !taperedMass) return
    expect(taperedMass.position).toEqual(blockMass.position)
    expect(taperedMass.height).toBe(blockMass.size[2])
    expect(taperedMass.bottomSize).toEqual([
      blockMass.size[0],
      blockMass.size[1],
    ])
    expect(taperedMass.topSize).toEqual([
      blockMass.size[0] * 0.64,
      blockMass.size[1] * 0.78,
    ])
    expect(taperedMass.bottomOffset).toEqual([0, 0])
    expect(taperedMass.topOffset).toEqual([170, -90])
    for (const piece of block.pieces.filter(
      (candidate) => candidate.role === 'support',
    )) {
      expect(tapered.pieces.find((candidate) => candidate.id === piece.id)).toEqual(
        piece,
      )
    }
    expect(tapered.supportLayout).toEqual(block.supportLayout)
    expect(tapered.groundContactMm2).toBe(block.groundContactMm2)
    expect(tapered.concreteVolumeMm3).toBeLessThan(block.concreteVolumeMm3)

    const taperedBounds = scenePieceBounds(taperedMass)
    expect(tapered.bounds.min[0]).toBeLessThanOrEqual(taperedBounds.min[0])
    expect(tapered.bounds.max[0]).toBeGreaterThanOrEqual(taperedBounds.max[0])
    expect(tapered.bounds.min[1]).toBeLessThanOrEqual(taperedBounds.min[1])
    expect(tapered.bounds.max[1]).toBeGreaterThanOrEqual(taperedBounds.max[1])
  })

  it('reports gaps and overlaps when a shared shoulder is moved', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      asymmetry: 0,
      shoulderMode: 'shared',
      supportPositionOverrides: [
        {
          supportId: 'support-2',
          positionXMm: 60,
          positionYMm: 0,
        },
      ],
    })

    expect(study.supportLayout?.adjacentColumnGapMm).toBeCloseTo(60, 10)
    expect(study.supportLayout?.adjacentColumnOverlapMm).toBeCloseTo(60, 10)
  })

  it('translates only the named support pair while preserving its geometry', () => {
    const baseParameters = {
      ...DEFAULT_PILOTI_PARAMETERS,
      supportCount: 3,
      supportRowCount: 2,
      footOffsetXMm: 80,
      footOffsetYMm: -40,
    }
    const shared = generatePiloti(baseParameters)
    const placed = generatePiloti({
      ...baseParameters,
      supportPositionOverrides: [
        {
          supportId: 'support-r2-c2',
          positionXMm: 120,
          positionYMm: -75,
        },
      ],
    })

    for (const prefix of ['support', 'shoulder'] as const) {
      const original = shared.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `${prefix}-r2-c2`,
      )
      const translated = placed.pieces.find(
        (piece): piece is FrustumPiece => piece.id === `${prefix}-r2-c2`,
      )
      expect(original).toBeDefined()
      expect(translated).toBeDefined()
      if (!original || !translated) continue

      expect(translated).toEqual({
        ...original,
        position: [
          original.position[0] + 120,
          original.position[1] - 75,
          original.position[2],
        ],
      })
    }

    const translatedStem = placed.pieces.find(
      (piece): piece is FrustumPiece => piece.id === 'support-r2-c2',
    )
    const translatedShoulder = placed.pieces.find(
      (piece): piece is FrustumPiece => piece.id === 'shoulder-r2-c2',
    )
    expect(translatedStem).toBeDefined()
    expect(translatedShoulder).toBeDefined()
    if (translatedStem && translatedShoulder) {
      expect(
        translatedStem.position[0] + translatedStem.topOffset[0],
      ).toBeCloseTo(
        translatedShoulder.position[0] + translatedShoulder.bottomOffset[0],
        10,
      )
      expect(
        translatedStem.position[1] + translatedStem.topOffset[1],
      ).toBeCloseTo(
        translatedShoulder.position[1] + translatedShoulder.bottomOffset[1],
        10,
      )
      expect(translatedStem.topSize).toEqual(translatedShoulder.bottomSize)
    }

    expect(
      placed.pieces.find((piece) => piece.id === 'support-r2-c1'),
    ).toEqual(shared.pieces.find((piece) => piece.id === 'support-r2-c1'))
    expect(placed.concreteVolumeMm3).toBeCloseTo(
      shared.concreteVolumeMm3,
      10,
    )
    expect(placed.estimatedMassKg).toBeCloseTo(shared.estimatedMassKg, 10)
    expect(placed.groundContactMm2).toBeCloseTo(
      shared.groundContactMm2,
      10,
    )
  })

  it('requires actual 2D intersection before reporting column overlap', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      asymmetry: 0,
      supportDepthRatio: 0.25,
      supportSizeOverrides: [
        {
          supportId: 'support-1',
          widthScale: 1.45,
          depthScale: 1,
        },
      ],
      supportPositionOverrides: [
        {
          supportId: 'support-1',
          positionXMm: 0,
          positionYMm: 300,
        },
      ],
    })

    expect(study.supportLayout?.adjacentColumnOverlapMm).toBe(0)
  })

  it('reports a cross-grid collision after a selected support is displaced', () => {
    const study = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      asymmetry: 0,
      supportCount: 2,
      supportRowCount: 2,
      rowSpacingMm: 300,
      supportPositionOverrides: [
        {
          supportId: 'support-r2-c2',
          positionXMm: -300,
          positionYMm: 0,
        },
      ],
    })

    expect(study.supportLayout?.nonAdjacentBearingOverlapMm).toBeGreaterThan(0)
  })

  it('keeps geometry finite at both ends of every supported range', () => {
    expectFiniteStudy({
      seed: 0,
      heightMm: 1_000,
      supportCount: 1,
      supportRowCount: 1,
      rowSpacingMm: 100,
      supportDepthRatio: 0.25,
      supportHeightRatio: 0.25,
      shoulderRatio: 0.2,
      shoulderMode: 'divided',
      neckWidthRatio: 0.18,
      upperWidthRatio: 0.4,
      upperDepthRatio: 0.2,
      upperFootprintMode: 'linked',
      upperOffsetXMm: -400,
      upperOffsetYMm: -400,
      upperMassProfile: 'tapered',
      upperTopWidthRatio: 0.45,
      upperTopDepthRatio: 0.45,
      upperTopOffsetXMm: -400,
      upperTopOffsetYMm: -400,
      asymmetry: 0,
      footOffsetXMm: -300,
      footOffsetYMm: -300,
      footOffsetOverrides: [],
      supportSizeOverrides: [],
      supportPositionOverrides: [],
    })
    expectFiniteStudy({
      seed: MAX_SEED,
      heightMm: 2_000,
      supportCount: 6,
      supportRowCount: 3,
      rowSpacingMm: 800,
      supportDepthRatio: 0.92,
      supportHeightRatio: 0.58,
      shoulderRatio: 0.8,
      shoulderMode: 'shared',
      neckWidthRatio: 0.7,
      upperWidthRatio: 1.1,
      upperDepthRatio: 0.65,
      upperFootprintMode: 'detached',
      upperOffsetXMm: 400,
      upperOffsetYMm: 400,
      upperMassProfile: 'tapered',
      upperTopWidthRatio: 1.25,
      upperTopDepthRatio: 1.25,
      upperTopOffsetXMm: 400,
      upperTopOffsetYMm: 400,
      asymmetry: 0.5,
      footOffsetXMm: 300,
      footOffsetYMm: 300,
      footOffsetOverrides: [
        {
          supportId: 'support-r3-c6',
          footOffsetXMm: -300,
          footOffsetYMm: -300,
        },
      ],
      supportSizeOverrides: [
        {
          supportId: 'support-r3-c6',
          widthScale: 1.45,
          depthScale: 0.55,
        },
      ],
      supportPositionOverrides: [
        {
          supportId: 'support-r3-c6',
          positionXMm: -300,
          positionYMm: 300,
        },
      ],
    })
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite parameter value %s',
    (invalidValue) => {
      for (const key of Object.keys(
        PILOTI_PARAMETER_RULES,
      ) as (keyof typeof PILOTI_PARAMETER_RULES)[]) {
        expect(() =>
          generatePiloti({
            ...DEFAULT_PILOTI_PARAMETERS,
            [key]: invalidValue,
          }),
        ).toThrow(`Piloti parameter "${key}" must be finite.`)
      }
    },
  )

  it('rejects malformed or duplicated support overrides', () => {
    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        footOffsetOverrides: [
          {
            supportId: 'support-2',
            footOffsetXMm: Number.NaN,
            footOffsetYMm: 0,
          },
        ],
      }),
    ).toThrow('Piloti parameter "footOffsetXMm" must be finite.')

    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        footOffsetOverrides: [
          {
            supportId: 'support-02',
            footOffsetXMm: 10,
            footOffsetYMm: 20,
          },
        ],
      }),
    ).toThrow('Piloti foot offset override has an invalid support ID.')

    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        footOffsetOverrides: [
          {
            supportId: 'support-r1-c2',
            footOffsetXMm: 10,
            footOffsetYMm: 20,
          },
        ],
      }),
    ).toThrow('Piloti foot offset override has an invalid support ID.')

    expect(() =>
      generatePiloti({
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
      }),
    ).toThrow('Piloti foot offset override for "support-2" is duplicated.')

    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        supportSizeOverrides: [
          {
            supportId: 'support-r2-c1',
            widthScale: Number.NaN,
            depthScale: 1,
          },
        ],
      }),
    ).toThrow('Piloti support size override "widthScale" must be finite.')

    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        supportSizeOverrides: [
          { supportId: 'support-1', widthScale: 1, depthScale: 1 },
          { supportId: 'support-1', widthScale: 0.8, depthScale: 1.2 },
        ],
      }),
    ).toThrow('Piloti support size override for "support-1" is duplicated.')

    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        supportPositionOverrides: [
          {
            supportId: 'support-r2-c1',
            positionXMm: Number.NaN,
            positionYMm: 0,
          },
        ],
      }),
    ).toThrow('Piloti support position override "positionXMm" must be finite.')

    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        supportPositionOverrides: [
          { supportId: 'support-1', positionXMm: 10, positionYMm: 20 },
          { supportId: 'support-1', positionXMm: -10, positionYMm: -20 },
        ],
      }),
    ).toThrow('Piloti support position override for "support-1" is duplicated.')
  })

  it('rejects an unsupported shoulder topology', () => {
    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        shoulderMode: 'merged' as 'shared',
      }),
    ).toThrow(
      'Piloti parameter "shoulderMode" must be "divided" or "shared".',
    )
  })

  it('rejects an unsupported upper-mass profile', () => {
    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        upperMassProfile: 'wedge' as 'tapered',
      }),
    ).toThrow(
      'Piloti parameter "upperMassProfile" must be "block" or "tapered".',
    )
  })

  it('rejects an unsupported upper-footprint relationship', () => {
    expect(() =>
      generatePiloti({
        ...DEFAULT_PILOTI_PARAMETERS,
        upperFootprintMode: 'free' as 'linked',
      }),
    ).toThrow(
      'Piloti parameter "upperFootprintMode" must be "linked" or "detached".',
    )
  })

  it('exposes the six agreed recipe families with only Piloti enabled', () => {
    expect(RECIPES).toHaveLength(6)
    expect(RECIPES.filter((recipe) => recipe.available).map((recipe) => recipe.id)).toEqual([
      'piloti',
    ])
  })
})
