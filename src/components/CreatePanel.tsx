import { InspectorControls, InspectorSection, RangeField } from './InspectorControls'
import { PILOTI_PARAMETER_RULES } from '../core/pilotiParameters'
import { UpperTaperActions } from './UpperTaperActions'
import type { UpperSilhouettePreset } from '../core/upperSilhouette'
import type { PilotiParameters } from '../core/types'

interface CreatePanelProps {
  readonly parameters: PilotiParameters
  readonly onChange: <Key extends keyof PilotiParameters>(key: Key, value: PilotiParameters[Key]) => void
  readonly onSilhouette: (preset: UpperSilhouettePreset) => void
  readonly onInteractionStart: () => void
  readonly onInteractionEnd: () => void
  readonly onEdit: () => void
}

export function CreatePanel({ parameters, onChange, onSilhouette, onInteractionStart, onInteractionEnd, onEdit }: CreatePanelProps) {
  const radial = parameters.planShape !== 'rectangle'
  const interaction = { onInteractionStart, onInteractionEnd }
  const ratio = (key: 'upperWidthRatio' | 'upperDepthRatio' | 'supportHeightRatio' | 'upperTopWidthRatio' | 'upperTopDepthRatio' | 'asymmetry', label: string) => (
    <RangeField label={label} affected={false} value={parameters[key]}
      minimum={PILOTI_PARAMETER_RULES[key].minimum} maximum={PILOTI_PARAMETER_RULES[key].maximum}
      step={0.01} display="percent" ariaDescription="Changes the shared composition. Local overrides keep their own values."
      {...interaction} onChange={(value) => onChange(key, value)} />
  )
  return (
    <InspectorControls showAll={true}>
      <div className="create-panel">
        <div className="workflow-intro">
          <span className="eyebrow">PILOTI</span>
          <h1>Start with a shape.</h1>
          <p>Set the silhouette here. Select a piece in the view to refine it.</p>
        </div>
        <div className="quick-shapes" role="group" aria-label="Plan shape">
          {(['rectangle', 'hexagon', 'octagon'] as const).map((shape) => (
            <button type="button" className="quick-shape" key={shape}
              aria-pressed={parameters.planShape === shape} onClick={() => onChange('planShape', shape)}>
              <svg className="shape-icon" viewBox="0 0 64 52" aria-hidden="true">
                {shape === 'rectangle' ? <rect x="10" y="10" width="44" height="32" /> :
                  <polygon points={shape === 'hexagon' ? '18,4 46,4 60,26 46,48 18,48 4,26' : '20,4 44,4 58,17 58,35 44,48 20,48 6,35 6,17'} />}
              </svg>
              <strong>{shape[0].toUpperCase() + shape.slice(1)}</strong>
              <small>{shape === 'rectangle' ? 'Grid of legs' : `${shape === 'hexagon' ? 6 : 8} radial legs`}</small>
            </button>
          ))}
        </div>
        <div className="create-group">
          <h2 className="create-group-heading">Size & layout</h2>
          <RangeField label="Design height" presentation="number" affected={false}
            value={parameters.heightMm} minimum={1000} maximum={2000} step={1} suffix=" mm"
            ariaDescription="Full-size design height. Choose a smaller manufactured model in Make."
            {...interaction} onChange={(value) => onChange('heightMm', value)} />
          {!radial ? <div className="quick-counts">
            <RangeField label="Columns (X)" presentation="choices" affected={false}
              ariaDescription="Repeat legs across the width. Extends a linked upper mass."
              value={parameters.supportCount} minimum={1} maximum={6} step={1}
              {...interaction} onChange={(value) => onChange('supportCount', value)} />
            <RangeField label="Rows (Y)" presentation="choices" affected={false}
              ariaDescription="Repeat legs through the depth. Extends a linked upper mass."
              value={parameters.supportRowCount} minimum={1} maximum={3} step={1}
              {...interaction} onChange={(value) => onChange('supportRowCount', value)} />
            {parameters.supportRowCount > 1 ? <RangeField label="Row spacing" presentation="number" affected={false}
              ariaDescription="Changes the spacing between rows and the linked upper depth."
              value={parameters.rowSpacingMm} minimum={100} maximum={800} step={1} suffix=" mm"
              {...interaction} onChange={(value) => onChange('rowSpacingMm', value)} /> : null}
          </div> : null}
          {ratio('upperWidthRatio', radial ? 'Diameter proportion' : 'Width proportion')}
          {!radial ? ratio('upperDepthRatio', 'Depth proportion') : null}
          <p className="selection-help">Proportions are relative to design height. {radial
            ? 'Diameter is measured corner to corner; radial spread is available in Edit.'
            : parameters.upperFootprintMode === 'linked'
              ? 'Width describes three columns; depth describes one row. Adding legs extends the linked mass.'
              : 'The upper footprint is detached from the leg grid.'}</p>
        </div>
        <div className="create-group">
          <h2 className="create-group-heading">Silhouette</h2>
          {ratio('supportHeightRatio', 'Leg height proportion')}
          <div className="offset-scope-switch" role="group" aria-label="Upper silhouette">
            {(['block', 'tapered'] as const).map((profile) => (
              <button type="button" key={profile} aria-pressed={parameters.upperMassProfile === profile}
                className={parameters.upperMassProfile === profile ? 'is-active' : ''}
                onClick={() => onChange('upperMassProfile', profile)}>
                <span>{profile === 'block' ? 'Block' : 'Tapered'}</span>
                <small>{profile === 'block' ? 'Straight sides' : 'Narrow or widen the top'}</small>
              </button>
            ))}
          </div>
          {parameters.upperMassProfile === 'tapered' ? <>
            <UpperTaperActions parameters={parameters} onApply={onSilhouette} />
            {ratio('upperTopWidthRatio', radial ? 'Top size' : 'Top width')}
            {!radial ? ratio('upperTopDepthRatio', 'Top depth') : null}
          </> : null}
          {parameters.massPartOverrides.length > 0 ? <p className="selection-help">Parts with independent tops keep their own silhouette. Select a part to edit it.</p> : null}
        </div>
        <InspectorSection title="Variation" description="Add irregularity and explore seeds">
          {ratio('asymmetry', 'Asymmetry')}
          <button type="button" className="subtle-button"
            onClick={() => onChange('seed', (parameters.seed + 1) % (PILOTI_PARAMETER_RULES.seed.maximum + 1))}>
            Try next variation
          </button>
          <p className="selection-help">Locked sources keep their current variation. Undo returns to the previous seed.</p>
        </InspectorSection>
        <div className="workflow-next">
          <button type="button" className="workflow-next-button" onClick={onEdit}>Refine a piece →</button>
          <p>Split the mass, lean a leg, move or duplicate a piece in Edit.</p>
        </div>
      </div>
    </InspectorControls>
  )
}
