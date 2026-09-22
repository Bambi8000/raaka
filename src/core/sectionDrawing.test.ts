import { describe, expect, it } from 'vitest'
import {
  createSectionPathSet,
  encodeSectionSvg,
  sectionPathSet,
  sectionSvgFilename,
} from './sectionDrawing'
import type { BoxPiece } from './types'

function box(
  id: string,
  position: readonly [number, number, number],
  size: readonly [number, number, number],
): BoxPiece {
  return { kind: 'box', id, label: id, role: 'mass', position, size }
}

describe('section drawing path set', () => {
  it('keeps full physical millimetres separate from the paper scale', async () => {
    const drawing = await createSectionPathSet(
      [box('outer', [0, 0, 50], [120, 80, 100])],
      [],
      'x',
      0,
    )

    expect(drawing).toMatchObject({
      format: 'raaka.path-set',
      formatVersion: 1,
      units: 'mm',
      coordinateSystem: 'cartesian',
      view: {
        kind: 'section',
        planeAxis: 'x',
        planeOffsetMm: 0,
        horizontalAxis: 'y',
        verticalAxis: 'z',
      },
      bounds: { min: [-40, 0], max: [40, 100] },
      areaMm2: 8_000,
    })
    expect(drawing.paths).toHaveLength(1)
    expect(drawing.paths[0]).toMatchObject({
      id: 'section-1',
      role: 'section',
      closed: true,
    })
  })

  it('retains an inner core boundary as a separate semantic section path', async () => {
    const drawing = await createSectionPathSet(
      [box('outer', [0, 0, 50], [100, 100, 100])],
      [box('core', [0, 0, 50], [60, 60, 60])],
      'y',
      0,
    )

    expect(drawing.paths).toHaveLength(2)
    expect(drawing.paths.every((path) => path.role === 'section')).toBe(true)
    expect(drawing.areaMm2).toBeCloseTo(6_400, 8)
  })

  it('encodes a line-only named SVG layer at the selected paper scale', () => {
    const drawing = sectionPathSet({
      polygons: [[[-50, 0], [50, 0], [50, 100], [-50, 100]]],
      areaMm2: 10_000,
    }, 'x', -12.5)
    const svg = encodeSectionSvg(drawing, {
      title: 'PILOTI <318>',
      paperScaleDenominator: 10,
    })

    expect(svg).toContain('width="30mm" height="30mm"')
    expect(svg).toContain('viewBox="-150 -200 300 300"')
    expect(svg).toContain('data-paper-scale="1:10"')
    expect(svg).toContain('id="layer-section" data-layer="section"')
    expect(svg).toContain('fill="none"')
    expect(svg).toContain('stroke-width="3.5"')
    expect(svg).toContain('<title>PILOTI &lt;318&gt;</title>')
    expect(svg).toContain('d="M -50 0 L 50 0 L 50 -100 L -50 -100 Z"')
    expect(svg).not.toContain('<polygon')
    expect(svg).not.toContain('<text')
  })

  it('refuses an empty section instead of exporting a fluent blank drawing', () => {
    const empty = sectionPathSet({ polygons: [], areaMm2: 0 }, 'x', 500)

    expect(() => encodeSectionSvg(empty, {
      title: 'Empty',
      paperScaleDenominator: 10,
    })).toThrow('the section plane does not intersect')
  })

  it('names model scale, section plane and paper scale independently', () => {
    expect(sectionSvgFilename(7, 4, 'y', -25.2, 10)).toBe(
      'raaka-piloti-0007-model-1to4-section-y-minus-25mm-paper-1to10.svg',
    )
  })
})
