import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createProject, RECOVERY_STORAGE_KEY, serializeProject } from './core/project'
import { PILOTI_RECIPE, RECIPE_DEFINITIONS } from './core/recipes'
import type { PilotiParameters } from './core/types'

const defaults = PILOTI_RECIPE.defaultParameters

afterEach(() => vi.unstubAllGlobals())

function renderInspector(parameters: PilotiParameters = defaults) {
  const project = serializeProject(createProject(parameters))
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => key === RECOVERY_STORAGE_KEY ? project : null,
  } })
  return renderToStaticMarkup(<App />)
}

/** Isolate one mounted workflow, including Make's following estimate section. */
function workflowMarkup(html: string, workflow: 'create' | 'edit' | 'make'): string {
  const start = html.indexOf(`id="workflow-${workflow}"`)
  const next = workflow === 'create' ? 'id="workflow-edit"'
    : workflow === 'edit' ? 'id="workflow-make"' : '</aside>'
  const end = html.indexOf(next, start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return html.slice(start, end)
}

describe('creation workflow', () => {
  it('starts in Create with Edit and Make hidden but reachable from named workflow actions', () => {
    const html = renderInspector()

    expect(html).toContain('aria-pressed="true" aria-controls="workflow-create"')
    expect(html).toContain('aria-pressed="false" aria-controls="workflow-edit"')
    expect(html).toContain('aria-pressed="false" aria-controls="workflow-make"')
    expect(html).toContain('id="workflow-create" class="workflow-panel">')
    expect(html).toContain('id="workflow-edit" class="workflow-panel" hidden=""')
    expect(html).toContain('id="workflow-make" class="panel-section make-section" hidden=""')
    expect(html).toContain('class="panel-section metrics-section" hidden=""')
    expect(workflowMarkup(html, 'create')).toContain('Refine a piece →')
    expect(workflowMarkup(html, 'edit')).toContain('aria-label="Show all controls"')
    expect(workflowMarkup(html, 'make')).toContain('Export sculpture STL')
  })

  it('keeps initial creation focused on form with count buttons and exact design height', () => {
    const html = workflowMarkup(renderInspector(), 'create')

    expect(html).toContain('aria-label="Plan shape"')
    expect(html).toContain('aria-label="Columns (X): 3" aria-pressed="true"')
    expect(html).toContain('aria-label="Rows (Y): 1" aria-pressed="true"')
    expect(html).not.toContain('type="range" aria-label="Columns (X)"')
    expect(html).not.toContain('type="range" aria-label="Rows (Y)"')
    expect(html).toContain('aria-label="Design height numeric value"')
    expect(html).not.toContain('type="range" aria-label="Design height"')
    expect(html).toContain('type="range" aria-label="Width proportion"')
    expect(html).toContain('aria-label="Upper silhouette"')
    for (const label of ['Retained core mode', 'Core size', 'Concrete density', 'Copy offset X']) {
      expect(html).not.toContain(`aria-label="${label}"`)
    }
    expect(html).not.toContain('ADD TO FUSE')
  })

  it('keeps planned recipes in a closed disclosure without offering unavailable actions', () => {
    const html = renderInspector()
    const disclosure = html.match(/<details class="recipe-disclosure">(.*?)<\/details>/)?.[1]

    expect(disclosure).toBeDefined()
    expect(disclosure).toContain('<summary>Planned recipes</summary>')
    expect(disclosure).not.toContain('<button')
    for (const recipe of RECIPE_DEFINITIONS.filter((entry) => entry.status === 'planned')) {
      expect(disclosure).toContain(`<strong>${recipe.name}</strong>`)
      expect(disclosure).toContain(recipe.description)
    }
    expect(html).toContain('<small>ACTIVE</small>')
  })

  it('opens a recovered radial taper in Create with its actual shape and relevant dimensions', () => {
    const html = workflowMarkup(renderInspector({
      ...defaults, planShape: 'hexagon', upperMassProfile: 'tapered', upperTopWidthRatio: 0.66,
    }), 'create')

    const hexagonChoice = [...html.matchAll(/<button\b[^>]*>.*?<\/button>/g)]
      .map(([button]) => button).find((button) => button.includes('<strong>Hexagon</strong>'))
    expect(hexagonChoice).toContain('aria-pressed="true"')
    expect(html).toContain('aria-label="Diameter proportion numeric value"')
    expect(html).toMatch(/aria-label="Top size numeric value"[^>]*value="66"/)
    expect(html).not.toContain('aria-label="Columns (X)"')
    expect(html).not.toContain('aria-label="Rows (Y)"')
    expect(html).not.toContain('aria-label="Top depth"')
  })

  it('keeps layout warnings reachable from Create when the mass projection is inside', () => {
    const parameters: PilotiParameters = {
      ...defaults,
      supportSizeOverrides: [{ supportId: 'support-1', widthScale: 1.45, depthScale: 1 }],
    }
    const study = PILOTI_RECIPE.generate(parameters)
    expect(study.stability.status).toBe('inside')
    expect(study.supportLayout?.sideBearingOverhangMm).toBeGreaterThan(0)

    const html = renderInspector(parameters)
    const readout = html.slice(html.indexOf('class="workflow-readout"'), html.indexOf('class="compact-objects"'))
    expect(readout).toContain('<button type="button">Review model warnings →</button>')
    expect(workflowMarkup(html, 'make')).toContain('SIDE BEARING OVERHANG')
  })
})

describe('wired selection inspector', () => {
  it('starts with relevant upper-mass controls and no leg-only faders or empty headings', () => {
    const application = renderInspector()
    const html = workflowMarkup(application, 'edit')
    const manufacturing = workflowMarkup(application, 'make')
    for (const label of ['Upper offset X', 'Upper base height', 'Design height', 'Columns (X)']) {
      expect(html).toContain(`aria-label="${label}"`)
    }
    for (const text of ['aria-label="Foot offset X"', 'aria-label="Neck width"', 'SHOULDER TOPOLOGY', 'LEG EDIT SCOPE', 'SHARED LEAN']) {
      expect(html).not.toContain(text)
    }
    expect(html).not.toContain('aria-label="Foot flare"')
    expect(html).not.toContain('aria-label="Bearing scale"')
    expect(html).not.toContain('SUPPORT FAMILY')
    expect(html).not.toContain('UPPER LEVEL STEP')
    expect(html).toContain('aria-label="Show all controls"')
    expect(html).toContain('UPPER MASS PROFILE')
    expect(html).not.toContain('RETAINED LIGHTWEIGHT CORE')
    expect(manufacturing).toContain('RETAINED LIGHTWEIGHT CORE')
    expect(manufacturing).toContain('UPPER CORE')
    expect(html).toContain('LOCK VARIATION')
    expect(html).toContain('Follows the global seed')
    expect(manufacturing).toContain('MODEL SCALE')
    expect(application).toContain('MOVE XY')
    expect(application).toContain('UPPER MASS · SHARED XY')
    expect(application).toContain('1 MM DESIGN SNAP · ESC CANCELS')
    expect(html).toContain('aria-label="Upper offset X numeric value"')
    expect(html).toContain('aria-label="Base width share (3 columns) numeric value"')
    expect(html).toContain('min="40" max="110" step="1" value="72"')
    expect(application).toContain('Export finished solid as binary STL in millimetres')
    expect(application).toContain('STL · MM')
    expect(application).toContain('Open measured plans, elevations and sections from the finished physical solid.')
    expect(application).toContain('DRAWINGS')
    expect(application).toContain('2D · SVG')
    expect(manufacturing).toContain('Mass centre X / Y / Z')
    expect(manufacturing).toContain('Support reserve')
    expect(manufacturing).toContain('MASS PROJECTION INSIDE')
    expect(manufacturing).toContain('static geometry only')
    expect(manufacturing).toContain('MATERIAL ASSUMPTIONS')
    expect(manufacturing).toContain('aria-label="Concrete density"')
    expect(manufacturing).toContain('aria-label="Retained core density"')
    expect(manufacturing).toContain('value="2400"')
    expect(manufacturing).toContain('value="30"')
  })

  it('shows a saved seed lock on the selected upper-mass source and object list', () => {
    const html = renderInspector({
      ...defaults,
      seed: 920,
      randomLocks: [{ targetId: 'upper-mass', seed: 318 }],
    })

    expect(html).toContain('UNLOCK VARIATION')
    expect(html).toContain('Locked to seed 318')
    expect(html).toContain('LOCKED · BOX')
    expect(html).toContain('PILOTI / 0920')
  })

  it('shows an explicit warning when the mass projection leaves the support polygon', () => {
    const html = workflowMarkup(renderInspector({
      ...defaults,
      supportCount: 1,
      upperFootprintMode: 'detached',
      upperOffsetXMm: 400,
    }), 'make')

    expect(html).toContain('MASS PROJECTION OUTSIDE')
    expect(html).toContain('BEYOND · MODEL')
    expect(html).toContain('metric-error')
  })

  it('shows active retained-core controls and separate material readings', () => {
    const html = workflowMarkup(renderInspector({
      ...defaults,
      retainedCoreMode: 'upper-mass',
      retainedCoreScale: 0.76,
      concreteDensityKgM3: 1_800,
      retainedCoreDensityKgM3: 45,
    }), 'make')

    expect(html).toContain('aria-label="Core size"')
    expect(html).toContain('BLUE CORE · RETAINED')
    expect(html).toContain('RETAINED CORE ACTIVE')
    expect(html).toContain('Concrete volume')
    expect(html).toContain('Concrete mass')
    expect(html).toContain('Retained core volume')
    expect(html).toContain('Retained core mass')
    expect(html).toContain('Estimated total mass')
    expect(html).toContain('Concrete uses 1,800 kg/m³')
    expect(html).toContain('retained foam uses 45 kg/m³')
  })

  it('switches to stem controls when the upper mass has been removed', () => {
    const html = workflowMarkup(renderInspector({ ...defaults, removedPartIds: ['upper-mass'] }), 'edit')
    expect(html).toContain('aria-label="Selected foot X"')
    expect(html).toContain('aria-label="Selected position X"')
    expect(html).toContain('aria-label="Selected width scale"')
    expect(html).toMatch(/aria-pressed="true"><span>This leg<\/span>/)
    expect(html).toContain('Your first edit makes it independent')
    expect(html).toContain('disabled="">USE SHARED')
    expect(html).not.toContain('CREATE OVERRIDE')
    expect(html.indexOf('aria-label="Selected position X"')).toBeLessThan(html.indexOf('SUPPORT FAMILY'))
    expect(html).toContain('aria-label="Neck width"')
    expect(html).toContain('aria-label="Foot flare"')
    expect(html).not.toContain('aria-label="Bearing scale"')
    expect(html).toContain('SUPPORT FAMILY')
    expect(html).toContain('LEG EDIT SCOPE')
    expect(html).not.toContain('UPPER MASS PROFILE')
    expect(html).not.toContain('UPPER MASS PLACEMENT')
    expect(html).not.toContain('UPPER MASS DIVISION')
  })

  it('recovers a selected leg override into the local editor without substituting shared values', () => {
    const html = workflowMarkup(renderInspector({
      ...defaults,
      removedPartIds: ['upper-mass'],
      footOffsetXMm: -60,
      footOffsetOverrides: [{ supportId: 'support-1', footOffsetXMm: 125, footOffsetYMm: -80 }],
      supportSizeOverrides: [{ supportId: 'support-1', widthScale: 0.8, depthScale: 1.2 }],
      supportPositionOverrides: [{ supportId: 'support-1', positionXMm: 40, positionYMm: -25 }],
    }), 'edit')

    expect(html).toMatch(/aria-label="Selected foot X numeric value"[^>]*value="125"/)
    expect(html).toMatch(/aria-label="Selected foot Y numeric value"[^>]*value="-80"/)
    expect(html).toMatch(/aria-label="Selected width scale numeric value"[^>]*value="80"/)
    expect(html).toMatch(/aria-label="Selected position X numeric value"[^>]*value="40"/)
    expect(html).toContain('This leg uses selected lean, position and size values.')
    expect(html).not.toContain('Your first edit makes it independent')
    expect(html).not.toContain('disabled="">USE SHARED')
  })

  it.each(['hexagon', 'octagon'] as const)('exposes the zero-lean frame switch for %s', (planShape) => {
    const html = workflowMarkup(renderInspector({ ...defaults, planShape, removedPartIds: ['upper-mass'], footOffsetXMm: 0, footOffsetYMm: 0 }), 'edit')
    expect(html).toContain('FOOT OFFSET SPACE')
    expect(html).toContain('CENTERED')
    expect(html).not.toContain('aria-label="Columns (X)"')
  })

  it('shows local part top controls but hides the overridden shared top and all leg controls', () => {
    const html = workflowMarkup(renderInspector({ ...defaults, upperMassDivision: 'xy4', massPartOverrides: [{
      partId: 'upper-mass-xy4-1', profile: 'tapered', topWidthRatio: 0.8, topDepthRatio: 0.9,
      topOffsetXMm: 100, topOffsetYMm: -100,
    }] }), 'edit')
    expect(html).toContain('aria-label="Part top drift X"')
    expect(html).toContain('USE SHARED PROFILE')
    expect(html).not.toContain('SHARED UPPER MASS PROFILE')
    expect(html).not.toContain('LEG EDIT SCOPE')
  })

  it.each([
    ['rectangle', 'upperMassDivision'],
    ['hexagon', 'polygonMassDivision'],
  ] as const)('shows focused stepped-level controls for %s', (planShape, divisionKey) => {
    const html = workflowMarkup(renderInspector({
      ...defaults,
      planShape,
      [divisionKey]: 'z3',
      upperStepScaleRatio: 0.74,
      upperStepOffsetXMm: -120,
      upperStepOffsetYMm: 65,
    }), 'edit')

    expect(html).toContain('UPPER LEVEL STEP')
    expect(html).toContain('3 LEVEL STACK')
    expect(html).toContain('aria-label="Scale per level"')
    expect(html).toContain('aria-label="Step offset X"')
    expect(html).toContain('aria-label="Step offset Y"')
    expect(html).toContain('value="74"')
    expect(html).not.toContain('LEG EDIT SCOPE')
  })

  it('keeps copy translation reachable even when its source is removed', () => {
    const application = renderInspector({ ...defaults, removedPartIds: ['upper-mass', 'support-1', 'support-2', 'support-3'],
      partCopies: [{ id: 'copy-1', sourceId: 'upper-mass', offsetXMm: 100, offsetYMm: 0, offsetZMm: 0 }] })
    const html = workflowMarkup(application, 'edit')
    expect(html).toContain('aria-label="Copy offset Z"')
    expect(html).toContain('UPPER MASS PROFILE')
    expect(html).not.toContain('LEG EDIT SCOPE')
    expect(application).toContain('MOVE XYZ')
    expect(application).toContain('COPY · XYZ')
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
