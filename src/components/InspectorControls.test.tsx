import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ControlGroup, InspectorControls, RangeField } from './InspectorControls'

describe('inspector field filtering', () => {
  it.each([false, true])('omits irrelevant fields unless Show all is %s', (showAll) => {
    const html = renderToStaticMarkup(
      <InspectorControls showAll={showAll}>
        {[true, false].map((affected) => <RangeField key={String(affected)}
          label={affected ? 'Relevant' : 'Unrelated'} affected={affected}
          value={40} minimum={-300} maximum={300} step={5} suffix=" mm"
          onChange={() => {}} onInteractionStart={() => {}} onInteractionEnd={() => {}} />)}
        <ControlGroup visible={showAll}><button>Unrelated choice</button></ControlGroup>
      </InspectorControls>,
    )
    expect(html).toContain('aria-label="Relevant"')
    expect(html).toContain('aria-label="Relevant numeric value"')
    expect(html).toContain('min="-300" max="300" step="1"')
    expect(html).toContain('type="number"')
    expect(html).toContain('value="40"')
    expect(html.includes('aria-label="Unrelated"')).toBe(showAll)
    expect(html.includes('aria-label="Unrelated numeric value"')).toBe(showAll)
    expect(html.includes('Unrelated choice')).toBe(showAll)
    expect(html).not.toMatch(/\shidden(?:=|\s|>)/)
  })

  it('presents stored ratios as editable percentages without changing slider truth', () => {
    const html = renderToStaticMarkup(
      <InspectorControls showAll={true}>
        <RangeField label="Width share" affected={true} display="percent"
          value={0.72} minimum={0.4} maximum={1.1} step={0.01}
          onChange={() => {}} onInteractionStart={() => {}} onInteractionEnd={() => {}} />
      </InspectorControls>,
    )
    expect(html).toContain('aria-label="Width share numeric value"')
    expect(html).toContain('min="40" max="110" step="1" value="72"')
    expect(html).toContain('min="0.4" max="1.1" step="0.01" value="0.72"')
    expect(html).toContain('>%</span>')
  })
})
