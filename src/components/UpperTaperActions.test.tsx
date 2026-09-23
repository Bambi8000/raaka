import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PILOTI_RECIPE } from '../core/recipes'
import type { PilotiParameters } from '../core/types'
import { UpperTaperActions } from './UpperTaperActions'

function renderActions(overrides: Partial<PilotiParameters> = {}) {
  return renderToStaticMarkup(<UpperTaperActions parameters={{
    ...PILOTI_RECIPE.defaultParameters,
    upperMassProfile: 'tapered',
    upperTopWidthRatio: 0.72,
    upperTopDepthRatio: 0.72,
    upperTopOffsetXMm: 0,
    upperTopOffsetYMm: 0,
    ...overrides,
  }} onApply={() => {}} />)
}

describe('upper taper actions', () => {
  it('identifies a centered narrow top and explains the shared-top scope', () => {
    const html = renderActions()

    expect(html).toContain('aria-label="Narrow top" aria-pressed="true"')
    expect(html).toContain('aria-label="Water tower" aria-pressed="false"')
    expect(html).toContain('72% · centered')
    expect(html).toContain('Centered over base')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Center top<\/button>/)
    expect(html).toContain('100% matches the base; above 100% widens upward.')
    expect(html).toContain('Base placement and legs stay unchanged.')
    expect(html).toContain('Independent part settings are kept; stacked level bases still follow the shared profile.')
  })

  it('identifies the centered water-tower shape', () => {
    const html = renderActions({ upperTopWidthRatio: 1.25, upperTopDepthRatio: 1.25 })

    expect(html).toContain('aria-label="Water tower" aria-pressed="true"')
    expect(html).toContain('aria-label="Narrow top" aria-pressed="false"')
    expect(html).toContain('125% · centered')
  })

  it('reports both signed offsets and offers centering without implying a preset is active', () => {
    const html = renderActions({ upperTopOffsetXMm: 120, upperTopOffsetYMm: -60 })

    expect(html).toContain('Top shifted X +120 mm / Y −60 mm')
    expect(html).not.toContain('aria-pressed="true"')
    expect(html).not.toContain('disabled=')
    expect(html).toContain('Aligns the top with its base while keeping the current top size.')
  })

  it.each([
    { upperTopDepthRatio: 0.9 },
    { upperMassProfile: 'block' as const },
    { upperTopWidthRatio: 0.73 },
  ])('does not mark a mismatching rectangle or block as a preset: %o', (overrides) => {
    expect(renderActions(overrides)).not.toContain('aria-pressed="true"')
  })

  it.each(['hexagon', 'octagon'] as const)('ignores dormant depth ratios for %s', (planShape) => {
    const html = renderActions({ planShape, upperTopDepthRatio: 0.9 })
    expect(html).toContain('aria-label="Narrow top" aria-pressed="true"')
  })
})
