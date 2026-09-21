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
    expect(html).toContain('min="-300" max="300" step="5"')
    expect(html).toContain('40 mm')
    expect(html.includes('aria-label="Unrelated"')).toBe(showAll)
    expect(html.includes('Unrelated choice')).toBe(showAll)
    expect(html).not.toMatch(/\shidden(?:=|\s|>)/)
  })
})
