import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ControlGroup, InspectorControls, InspectorSection, RangeField } from './InspectorControls'

describe('inspector field filtering', () => {
  it.each([false, true])('omits irrelevant fields unless Show all is %s', (showAll) => {
    const html = renderToStaticMarkup(
      <InspectorControls showAll={showAll}>
        {[true, false].map((affected) => <RangeField key={String(affected)}
          label={affected ? 'Relevant' : 'Unrelated'} affected={affected}
          value={40} minimum={-300} maximum={300} step={5} suffix=" mm"
          onChange={() => {}} onInteractionStart={() => {}} onInteractionEnd={() => {}} />)}
        <RangeField label="Contextual" affected={false} visible={true}
          value={50} minimum={0} maximum={100} step={1}
          onChange={() => {}} onInteractionStart={() => {}} onInteractionEnd={() => {}} />
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
    expect(html).toContain('aria-label="Contextual"')
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

  it('allows a global analysis control to explain its non-geometric effect', () => {
    const html = renderToStaticMarkup(
      <RangeField label="Density" affected={false} ariaDescription="Changes mass only."
        value={2_400} minimum={800} maximum={4_000} step={10} suffix=" kg/m³"
        onChange={() => {}} onInteractionStart={() => {}} onInteractionEnd={() => {}} />,
    )

    expect(html).toContain('aria-description="Changes mass only."')
    expect(html).not.toContain('SELECTED')
  })

  it('offers discrete counts as named pressed choices without a slider or number field', () => {
    const html = renderToStaticMarkup(
      <RangeField label="Columns (X)" affected={true} presentation="choices"
        value={3} minimum={1} maximum={6} step={1}
        onChange={() => {}} onInteractionStart={() => {}} onInteractionEnd={() => {}} />,
    )

    expect(html).toContain('role="group" aria-label="Columns (X)"')
    expect(html.match(/<button /g)).toHaveLength(6)
    expect(html).toContain('aria-label="Columns (X): 3" aria-pressed="true"')
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).not.toContain('<input')
  })

  it('labels exact-entry controls directly and retains limits, units and descriptions', () => {
    const html = renderToStaticMarkup(
      <RangeField label="Upper offset X" affected={true} presentation="number"
        ariaDescription="Moves the upper mass in design millimetres."
        value={60} minimum={-300} maximum={300} step={5} suffix=" mm"
        onChange={() => {}} onInteractionStart={() => {}} onInteractionEnd={() => {}} />,
    )

    const labelTarget = /<label for="([^"]+)"/.exec(html)?.[1]
    expect(labelTarget).toBeDefined()
    expect(html).toContain(`<input id="${labelTarget}" type="number"`)
    expect(html).toContain('aria-label="Upper offset X numeric value"')
    expect(html).toContain('aria-description="Moves the upper mass in design millimetres."')
    expect(html).toContain('min="-300" max="300" step="1" value="60"')
    expect(html).toContain('> mm</span>')
    expect(html).not.toContain('type="range"')
  })

  it.each(['number', 'choices'] as const)('filters unrelated %s controls before rendering', (presentation) => {
    const html = renderToStaticMarkup(
      <InspectorControls showAll={false}>
        <RangeField label="Unrelated" affected={false} presentation={presentation}
          value={3} minimum={1} maximum={6} step={1}
          onChange={() => {}} onInteractionStart={() => {}} onInteractionEnd={() => {}} />
      </InspectorControls>,
    )
    expect(html).toBe('')
  })

  it('starts optional sections closed and omits irrelevant sections entirely', () => {
    const html = renderToStaticMarkup(<>
      <InspectorSection title="Placement" description="Exact X and Y offsets.">
        <button>Move</button>
      </InspectorSection>
      <InspectorSection title="Shape" defaultOpen><button>Form</button></InspectorSection>
      <InspectorSection title="Unrelated" visible={false}><button>Hidden</button></InspectorSection>
    </>)

    expect(html).toContain('<details class="inspector-section"><summary>')
    expect(html).toContain('Exact X and Y offsets.')
    expect(html).toContain('<details class="inspector-section" open="">')
    expect(html).toContain('<button>Move</button>')
    expect(html).not.toContain('Unrelated')
    expect(html).not.toContain('Hidden')
  })
})
