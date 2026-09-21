import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { DEFAULT_PILOTI_PARAMETERS as defaults } from './core/generator'
import { createProject, RECOVERY_STORAGE_KEY, serializeProject } from './core/project'
import type { PilotiParameters } from './core/types'

afterEach(() => vi.unstubAllGlobals())

function renderInspector(parameters: PilotiParameters = defaults) {
  const project = serializeProject(createProject(parameters))
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => key === RECOVERY_STORAGE_KEY ? project : null,
  } })
  return renderToStaticMarkup(<App />)
}

describe('wired selection inspector', () => {
  it('starts with relevant upper-mass controls and no leg-only faders or empty headings', () => {
    const html = renderInspector()
    for (const label of ['Upper offset X', 'Upper base height', 'Design height', 'Columns (X)']) {
      expect(html).toContain(`aria-label="${label}"`)
    }
    for (const text of ['aria-label="Foot offset X"', 'aria-label="Neck width"', 'SHOULDER TOPOLOGY', 'LEG EDIT SCOPE', 'SHARED LEAN']) {
      expect(html).not.toContain(text)
    }
    expect(html).toContain('aria-label="Show all controls"')
    expect(html).toContain('UPPER MASS PROFILE')
    expect(html).toContain('MODEL SCALE')
    expect(html).toContain('MOVE XY')
    expect(html).toContain('UPPER MASS · SHARED XY')
    expect(html).toContain('1 MM DESIGN SNAP · ESC CANCELS')
  })

  it('switches to stem controls when the upper mass has been removed', () => {
    const html = renderInspector({ ...defaults, removedPartIds: ['upper-mass'] })
    expect(html).toContain('aria-label="Foot offset X"')
    expect(html).toContain('aria-label="Neck width"')
    expect(html).toContain('LEG EDIT SCOPE')
    expect(html).not.toContain('UPPER MASS PROFILE')
    expect(html).not.toContain('UPPER MASS PLACEMENT')
    expect(html).not.toContain('UPPER MASS DIVISION')
  })

  it.each(['hexagon', 'octagon'] as const)('exposes the zero-lean frame switch for %s', (planShape) => {
    const html = renderInspector({ ...defaults, planShape, removedPartIds: ['upper-mass'], footOffsetXMm: 0, footOffsetYMm: 0 })
    expect(html).toContain('FOOT OFFSET SPACE')
    expect(html).toContain('CENTERED')
    expect(html).not.toContain('aria-label="Columns (X)"')
  })

  it('shows local part top controls but hides the overridden shared top and all leg controls', () => {
    const html = renderInspector({ ...defaults, upperMassDivision: 'xy4', massPartOverrides: [{
      partId: 'upper-mass-xy4-1', profile: 'tapered', topWidthRatio: 0.8, topDepthRatio: 0.9,
      topOffsetXMm: 100, topOffsetYMm: -100,
    }] })
    expect(html).toContain('aria-label="Part top drift X"')
    expect(html).toContain('USE SHARED PROFILE')
    expect(html).not.toContain('SHARED UPPER MASS PROFILE')
    expect(html).not.toContain('LEG EDIT SCOPE')
  })

  it('keeps copy translation reachable even when its source is removed', () => {
    const html = renderInspector({ ...defaults, removedPartIds: ['upper-mass', 'support-1', 'support-2', 'support-3'],
      partCopies: [{ id: 'copy-1', sourceId: 'upper-mass', offsetXMm: 100, offsetYMm: 0, offsetZMm: 0 }] })
    expect(html).toContain('aria-label="Copy offset Z"')
    expect(html).toContain('UPPER MASS PROFILE')
    expect(html).not.toContain('LEG EDIT SCOPE')
    expect(html).toContain('MOVE XYZ')
    expect(html).toContain('COPY · XYZ')
  })

  it('leaves composition and Restore reachable in an empty study', () => {
    const html = renderInspector({ ...defaults, removedPartIds: ['upper-mass', 'support-1', 'support-2', 'support-3'] })
    expect(html).toContain('No active part to filter.')
    expect(html).toContain('All controls')
    expect(html).toContain('aria-label="Foot offset X"')
    expect(html).toContain('RESTORE')
    expect(html).not.toContain('viewport-gizmo-status')
  })

  it('requires Unfuse before showing direct-move handles for source parts', () => {
    const html = renderInspector({ ...defaults, fuseGroups: [{
      id: 'fuse-1', pieceIds: ['upper-mass', 'shoulder-2'],
    }] })
    expect(html).toContain('Unfuse to move individual source parts.')
    expect(html).not.toContain('viewport-gizmo-status')
  })
})
