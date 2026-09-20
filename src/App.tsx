import { useMemo, useState } from 'react'
import { Viewport } from './components/Viewport'
import {
  DEFAULT_PILOTI_PARAMETERS,
  generatePiloti,
  MAX_SEED,
  RECIPES,
} from './core/generator'
import type { PilotiParameters } from './core/types'

interface RangeFieldProps {
  readonly label: string
  readonly value: number
  readonly minimum: number
  readonly maximum: number
  readonly step: number
  readonly suffix?: string
  readonly onChange: (value: number) => void
}

function RangeField({
  label,
  value,
  minimum,
  maximum,
  step,
  suffix = '',
  onChange,
}: RangeFieldProps) {
  return (
    <label className="range-field">
      <span className="field-heading">
        <span>{label}</span>
        <output>
          {Number.isInteger(step) ? value.toFixed(0) : value.toFixed(2)}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </label>
  )
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en', { maximumFractionDigits }).format(value)
}

export default function App() {
  const [parameters, setParameters] = useState<PilotiParameters>(
    DEFAULT_PILOTI_PARAMETERS,
  )
  const [selectedPieceId, setSelectedPieceId] = useState('upper-mass')
  const study = useMemo(() => generatePiloti(parameters), [parameters])
  const selectedPiece = study.pieces.find(
    (piece) => piece.id === selectedPieceId,
  )

  const update = <Key extends keyof PilotiParameters>(
    key: Key,
    value: PilotiParameters[Key],
  ) => {
    setParameters((current) => ({ ...current, [key]: value }))
    if (key === 'supportCount') {
      const selectedSupport = /^(?:support|shoulder)-(\d+)$/.exec(
        selectedPieceId,
      )
      if (selectedSupport && Number(selectedSupport[1]) > Number(value)) {
        setSelectedPieceId('upper-mass')
      }
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true" />
          <strong>RAAKA</strong>
          <span>BRUTALIST MASSING STUDIO</span>
        </div>
        <div className="project-name">
          <span>STUDY</span>
          <strong>PILOTI / {String(parameters.seed).padStart(4, '0')}</strong>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="button button--quiet"
            onClick={() =>
              update('seed', (parameters.seed + 1) % (MAX_SEED + 1))
            }
          >
            NEXT SEED
          </button>
          <button type="button" className="button button--primary" disabled>
            EXPORT
            <span>SOON</span>
          </button>
        </div>
      </header>

      <aside className="left-panel panel">
        <section className="panel-section">
          <div className="section-heading">
            <span>01</span>
            <h2>Recipe</h2>
          </div>
          <div className="recipe-list">
            {RECIPES.map((recipe, index) => (
              <button
                type="button"
                key={recipe.id}
                className={`recipe-card ${recipe.id === 'piloti' ? 'is-active' : ''}`}
                disabled={!recipe.available}
                title={recipe.description}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{recipe.name}</strong>
                <small>{recipe.available ? 'ACTIVE' : 'DEFINED'}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section object-section">
          <div className="section-heading">
            <span>02</span>
            <h2>Objects</h2>
          </div>
          <div className="object-list">
            {study.pieces.map((piece) => (
              <button
                type="button"
                key={piece.id}
                className={piece.id === selectedPieceId ? 'is-selected' : ''}
                onClick={() => setSelectedPieceId(piece.id)}
                aria-pressed={piece.id === selectedPieceId}
              >
                <span className={`role-dot role-dot--${piece.role}`} />
                <span>{piece.label}</span>
                <small>{piece.kind.toUpperCase()}</small>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="workspace">
        <Viewport
          study={study}
          selectedPieceId={selectedPieceId}
          onSelect={setSelectedPieceId}
        />
      </section>

      <aside className="right-panel panel">
        <section className="inspector-lead" aria-live="polite">
          <span className="eyebrow">SELECTED OBJECT</span>
          <h1>{selectedPiece?.label ?? 'Mass study'}</h1>
          <p>
            {selectedPiece
              ? `${selectedPiece.role.toUpperCase()} · ${selectedPiece.kind.toUpperCase()}`
              : 'Generated composition'}
          </p>
        </section>

        <section className="panel-section controls-section">
          <div className="section-heading">
            <span>03</span>
            <h2>Global composition</h2>
          </div>
          <RangeField
            label="Physical height"
            value={parameters.heightMm}
            minimum={1_000}
            maximum={2_000}
            step={10}
            suffix=" mm"
            onChange={(value) => update('heightMm', value)}
          />
          <RangeField
            label="Supports"
            value={parameters.supportCount}
            minimum={1}
            maximum={6}
            step={1}
            onChange={(value) => update('supportCount', value)}
          />
          <RangeField
            label="Support height"
            value={parameters.supportHeightRatio}
            minimum={0.25}
            maximum={0.58}
            step={0.01}
            onChange={(value) => update('supportHeightRatio', value)}
          />
          <RangeField
            label="Shoulder share"
            value={parameters.shoulderRatio}
            minimum={0.2}
            maximum={0.8}
            step={0.01}
            onChange={(value) => update('shoulderRatio', value)}
          />
          <RangeField
            label="Neck width"
            value={parameters.neckWidthRatio}
            minimum={0.18}
            maximum={0.7}
            step={0.01}
            onChange={(value) => update('neckWidthRatio', value)}
          />
          <RangeField
            label="Asymmetry"
            value={parameters.asymmetry}
            minimum={0}
            maximum={0.5}
            step={0.01}
            onChange={(value) => update('asymmetry', value)}
          />
        </section>

        <section className="panel-section metrics-section">
          <div className="section-heading">
            <span>04</span>
            <h2>Physical estimate</h2>
          </div>
          <dl className="metrics-grid">
            <div>
              <dt>Envelope</dt>
              <dd>
                {formatNumber(study.widthMm)} × {formatNumber(study.depthMm)} ×{' '}
                {formatNumber(study.heightMm)} mm
              </dd>
            </div>
            <div>
              <dt>Solid volume</dt>
              <dd>{formatNumber(study.concreteVolumeMm3 / 1_000_000_000, 3)} m³</dd>
            </div>
            <div className="metric-alert">
              <dt>Solid mass</dt>
              <dd>{formatNumber(study.estimatedMassKg)} kg</dd>
            </div>
            <div>
              <dt>Ground contact</dt>
              <dd>{formatNumber(study.groundContactMm2 / 1_000_000, 3)} m²</dd>
            </div>
          </dl>
          <p className="notice">
            Solid estimate at 2,400 kg/m³. Structural approval, reinforcement and
            anchoring are outside this study.
          </p>
        </section>
      </aside>

      <footer className="statusbar">
        <span>
          <i className="status-dot" /> DETERMINISTIC
        </span>
        <span>SEED {parameters.seed}</span>
        <span>{study.pieces.length} OBJECTS</span>
        <span className="statusbar-end">RAAKA 0.1.1 / LOCAL</span>
      </footer>
    </main>
  )
}
