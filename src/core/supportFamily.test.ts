import { describe, expect, it } from 'vitest'
import { DEFAULT_PILOTI_PARAMETERS, generatePiloti } from './generator'
import {
  polygonSupportFamily,
  rectangularSupportFamily,
} from './supportFamily'
import type { FrustumPiece, PolygonLoftPiece } from './types'

describe('reusable Piloti support family', () => {
  it('preserves the established rectangular foot and bearing proportions at 100%', () => {
    const profile = rectangularSupportFamily(
      DEFAULT_PILOTI_PARAMETERS,
      400,
      300,
      1,
      1,
    )

    expect(profile.footSize[0] / profile.neckSize[0]).toBeCloseTo(1.18, 12)
    expect(profile.footSize[1] / profile.neckSize[1]).toBeCloseTo(1.16, 12)
    expect(profile.bearingSize).toEqual([400 * 0.92, 300])
  })

  it('keeps foot and bearing authoring independent around one neck', () => {
    const baseline = rectangularSupportFamily(
      DEFAULT_PILOTI_PARAMETERS,
      400,
      300,
      1,
      1,
    )
    const authored = rectangularSupportFamily(
      {
        ...DEFAULT_PILOTI_PARAMETERS,
        footFlareRatio: 1.5,
        bearingScaleRatio: 0.75,
      },
      400,
      300,
      1,
      1,
    )

    expect(authored.neckSize).toEqual(baseline.neckSize)
    expect(authored.footSize[0]).toBeCloseTo(baseline.footSize[0] * 1.5, 12)
    expect(authored.footSize[1]).toBeCloseTo(baseline.footSize[1] * 1.5, 12)
    expect(authored.bearingSize[0]).toBeCloseTo(baseline.bearingSize[0] * 0.75, 12)
    expect(authored.bearingSize[1]).toBeCloseTo(baseline.bearingSize[1] * 0.75, 12)
  })

  it('uses the same controls for homothetic polygon supports', () => {
    const baseline = polygonSupportFamily(DEFAULT_PILOTI_PARAMETERS)
    const authored = polygonSupportFamily({
      ...DEFAULT_PILOTI_PARAMETERS,
      footFlareRatio: 1.5,
      bearingScaleRatio: 0.75,
    })

    expect(baseline.footScale / baseline.neckScale).toBeCloseTo(1.18, 12)
    expect(baseline.bearingScale).toBe(0.92)
    expect(authored.neckScale).toBe(baseline.neckScale)
    expect(authored.footScale).toBeCloseTo(baseline.footScale * 1.5, 12)
    expect(authored.bearingScale).toBeCloseTo(baseline.bearingScale * 0.75, 12)
  })

  it('changes rectangular ground contact without moving the neck or shoulder', () => {
    const baseline = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      asymmetry: 0,
    })
    const flared = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      asymmetry: 0,
      footFlareRatio: 1.5,
    })
    const baselineStem = baseline.pieces.find(
      (piece): piece is FrustumPiece => piece.id === 'support-1',
    )
    const flaredStem = flared.pieces.find(
      (piece): piece is FrustumPiece => piece.id === 'support-1',
    )

    expect(baselineStem).toBeDefined()
    expect(flaredStem).toBeDefined()
    if (!baselineStem || !flaredStem) return
    expect(flaredStem.topSize).toEqual(baselineStem.topSize)
    expect(flaredStem.bottomSize[0]).toBeCloseTo(baselineStem.bottomSize[0] * 1.5, 12)
    expect(flaredStem.bottomSize[1]).toBeCloseTo(baselineStem.bottomSize[1] * 1.5, 12)
    expect(flared.pieces.find((piece) => piece.id === 'shoulder-1')).toEqual(
      baseline.pieces.find((piece) => piece.id === 'shoulder-1'),
    )
    expect(flared.groundContactMm2).toBeCloseTo(
      baseline.groundContactMm2 * 1.5 ** 2,
      8,
    )
  })

  it('turns shared bearing scale into measured gaps or overlaps', () => {
    const narrow = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      asymmetry: 0,
      shoulderMode: 'shared',
      bearingScaleRatio: 0.8,
    })
    const wide = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      asymmetry: 0,
      shoulderMode: 'shared',
      bearingScaleRatio: 1.1,
    })

    expect(narrow.supportLayout?.adjacentColumnGapMm).toBeGreaterThan(0)
    expect(narrow.supportLayout?.adjacentColumnOverlapMm).toBe(0)
    expect(wide.supportLayout?.adjacentColumnGapMm).toBe(0)
    expect(wide.supportLayout?.adjacentColumnOverlapMm).toBeGreaterThan(0)
    expect(wide.pieces.find((piece) => piece.id === 'support-2')).toEqual(
      narrow.pieces.find((piece) => piece.id === 'support-2'),
    )
  })

  it('applies both stations to a radial support without breaking its neck interface', () => {
    const baseline = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      planShape: 'hexagon',
      asymmetry: 0,
    })
    const authored = generatePiloti({
      ...DEFAULT_PILOTI_PARAMETERS,
      planShape: 'hexagon',
      asymmetry: 0,
      footFlareRatio: 1.4,
      bearingScaleRatio: 1.15,
    })
    const baselineStem = baseline.pieces.find(
      (piece): piece is PolygonLoftPiece => piece.id === 'support-hex-1',
    )
    const authoredStem = authored.pieces.find(
      (piece): piece is PolygonLoftPiece => piece.id === 'support-hex-1',
    )
    const baselineShoulder = baseline.pieces.find(
      (piece): piece is PolygonLoftPiece => piece.id === 'shoulder-hex-1',
    )
    const authoredShoulder = authored.pieces.find(
      (piece): piece is PolygonLoftPiece => piece.id === 'shoulder-hex-1',
    )

    expect(baselineStem).toBeDefined()
    expect(authoredStem).toBeDefined()
    expect(baselineShoulder).toBeDefined()
    expect(authoredShoulder).toBeDefined()
    if (!baselineStem || !authoredStem || !baselineShoulder || !authoredShoulder) return
    expect(authoredStem.topScale).toBe(baselineStem.topScale)
    expect(authoredStem.bottomScale).toBeCloseTo(baselineStem.bottomScale * 1.4, 12)
    expect(authoredShoulder.bottomScale).toBe(baselineShoulder.bottomScale)
    expect(authoredShoulder.topScale).toBeCloseTo(baselineShoulder.topScale * 1.15, 12)
    expect(authoredStem.topScale).toBe(authoredShoulder.bottomScale)
  })
})
