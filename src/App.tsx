import {
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { Viewport } from './components/Viewport'
import {
  DEFAULT_PILOTI_PARAMETERS,
  generatePiloti,
  MAX_SEED,
  RECIPES,
} from './core/generator'
import {
  createHistory,
  reduceHistory,
  type HistoryAction,
  type HistoryState,
} from './core/history'
import {
  createProject,
  parseProject,
  readRecovery,
  serializeProject,
  writeRecovery,
} from './core/project'
import type { PilotiParameters } from './core/types'

interface RangeFieldProps {
  readonly label: string
  readonly value: number
  readonly minimum: number
  readonly maximum: number
  readonly step: number
  readonly suffix?: string
  readonly onChange: (value: number) => void
  readonly onInteractionStart: () => void
  readonly onInteractionEnd: () => void
}

interface Notice {
  readonly kind: 'info' | 'error'
  readonly text: string
}

type ProjectOrigin = 'DEFAULT' | 'RECOVERED' | 'SAVED'

interface InitialSession {
  readonly parameters: PilotiParameters
  readonly origin: ProjectOrigin
  readonly baseline: string
  readonly notice?: Notice
}

const RANGE_KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
])

const DEFAULT_PROJECT_JSON = serializeProject(
  createProject(DEFAULT_PILOTI_PARAMETERS),
)

function pilotiHistoryReducer(
  state: HistoryState<PilotiParameters>,
  action: HistoryAction<PilotiParameters>,
): HistoryState<PilotiParameters> {
  return reduceHistory(state, action)
}

function loadInitialSession(): InitialSession {
  const recovery = readRecovery(window.localStorage)
  if (recovery.status === 'recovered') {
    return {
      parameters: recovery.project.parameters,
      origin: 'RECOVERED',
      baseline: serializeProject(recovery.project),
      notice: { kind: 'info', text: 'Local recovery restored.' },
    }
  }
  if (recovery.status === 'invalid') {
    return {
      parameters: DEFAULT_PILOTI_PARAMETERS,
      origin: 'DEFAULT',
      baseline: DEFAULT_PROJECT_JSON,
      notice: {
        kind: 'error',
        text: `Recovery ignored: ${recovery.message}`,
      },
    }
  }
  return {
    parameters: DEFAULT_PILOTI_PARAMETERS,
    origin: 'DEFAULT',
    baseline: DEFAULT_PROJECT_JSON,
  }
}

function RangeField({
  label,
  value,
  minimum,
  maximum,
  step,
  suffix = '',
  onChange,
  onInteractionStart,
  onInteractionEnd,
}: RangeFieldProps) {
  const beginKeyboardGesture = (event: KeyboardEvent<HTMLInputElement>) => {
    if (RANGE_KEYS.has(event.key)) onInteractionStart()
  }
  const endKeyboardGesture = (event: KeyboardEvent<HTMLInputElement>) => {
    if (RANGE_KEYS.has(event.key)) onInteractionEnd()
  }

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
        onPointerDown={onInteractionStart}
        onPointerUp={onInteractionEnd}
        onPointerCancel={onInteractionEnd}
        onKeyDown={beginKeyboardGesture}
        onKeyUp={endKeyboardGesture}
        onBlur={onInteractionEnd}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </label>
  )
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en', { maximumFractionDigits }).format(value)
}

function selectionExists(
  selectedPieceId: string,
  parameters: PilotiParameters,
): boolean {
  if (selectedPieceId === 'upper-mass') return true
  const selectedSupport = /^(?:support|shoulder)-(\d+)$/.exec(selectedPieceId)
  return (
    selectedSupport !== null &&
    Number(selectedSupport[1]) <= parameters.supportCount
  )
}

export default function App() {
  const [initialSession] = useState(loadInitialSession)
  const [history, dispatch] = useReducer(
    pilotiHistoryReducer,
    initialSession.parameters,
    createHistory,
  )
  const [selectedPieceId, setSelectedPieceId] = useState('upper-mass')
  const [baselineJson, setBaselineJson] = useState(initialSession.baseline)
  const [projectOrigin, setProjectOrigin] = useState<ProjectOrigin>(
    initialSession.origin,
  )
  const [notice, setNotice] = useState<Notice | undefined>(
    initialSession.notice,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const parameters = history.present
  const project = useMemo(() => createProject(parameters), [parameters])
  const projectJson = useMemo(() => serializeProject(project), [project])
  const study = useMemo(() => generatePiloti(parameters), [parameters])
  const stemHeightMm =
    parameters.heightMm *
    parameters.supportHeightRatio *
    (1 - parameters.shoulderRatio)
  const footOffsetMm = Math.hypot(
    parameters.footOffsetXMm,
    parameters.footOffsetYMm,
  )
  const authoredLeanAngleDeg =
    (Math.atan2(footOffsetMm, stemHeightMm) * 180) / Math.PI
  const footDirectionDeg =
    footOffsetMm === 0
      ? undefined
      : ((Math.atan2(parameters.footOffsetYMm, parameters.footOffsetXMm) *
          180) /
          Math.PI +
          360) %
        360
  const selectedPiece = study.pieces.find(
    (piece) => piece.id === selectedPieceId,
  )
  const projectStatus: ProjectOrigin | 'UNSAVED' =
    projectJson === baselineJson ? projectOrigin : 'UNSAVED'

  const persistRecovery = (nextParameters: PilotiParameters) => {
    try {
      writeRecovery(window.localStorage, createProject(nextParameters))
    } catch {
      setNotice({
        kind: 'error',
        text: 'Local recovery could not be updated. Save a project file.',
      })
    }
  }

  const reconcileSelection = (nextParameters: PilotiParameters) => {
    if (!selectionExists(selectedPieceId, nextParameters)) {
      setSelectedPieceId('upper-mass')
    }
  }

  const replaceParameters = (nextParameters: PilotiParameters) => {
    if (nextParameters === parameters) return
    persistRecovery(nextParameters)
    dispatch({ type: 'replace', value: nextParameters })
  }

  const update = <Key extends keyof PilotiParameters>(
    key: Key,
    value: PilotiParameters[Key],
  ) => {
    if (parameters[key] === value) return
    const nextParameters = { ...parameters, [key]: value }
    reconcileSelection(nextParameters)
    replaceParameters(nextParameters)
  }

  const undo = () => {
    const previous = history.past.at(-1)
    if (!previous) return
    reconcileSelection(previous)
    persistRecovery(previous)
    dispatch({ type: 'undo' })
  }

  const redo = () => {
    const next = history.future[0]
    if (!next) return
    reconcileSelection(next)
    persistRecovery(next)
    dispatch({ type: 'redo' })
  }

  const reset = () => {
    setSelectedPieceId('upper-mass')
    replaceParameters(DEFAULT_PILOTI_PARAMETERS)
    setNotice({ kind: 'info', text: 'Defaults restored. Undo is available.' })
  }

  const saveProject = () => {
    const blob = new Blob([projectJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `raaka-piloti-${String(parameters.seed).padStart(4, '0')}.raaka.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    setBaselineJson(projectJson)
    setProjectOrigin('SAVED')
    setNotice({ kind: 'info', text: `Saved ${link.download}.` })
  }

  const openProjectFile = async (file: File) => {
    try {
      const openedProject = parseProject(await file.text())
      const openedJson = serializeProject(openedProject)
      dispatch({ type: 'load', value: openedProject.parameters })
      persistRecovery(openedProject.parameters)
      setSelectedPieceId('upper-mass')
      setBaselineJson(openedJson)
      setProjectOrigin('SAVED')
      setNotice({ kind: 'info', text: `Opened ${file.name}.` })
    } catch (error) {
      setNotice({
        kind: 'error',
        text: `Open failed: ${
          error instanceof Error ? error.message : 'Unknown project error.'
        }`,
      })
    }
  }

  const chooseProjectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) void openProjectFile(file)
  }

  const commitSeed = (input: HTMLInputElement) => {
    const seed = Number(input.value)
    if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
      input.value = String(parameters.seed)
      setNotice({
        kind: 'error',
        text: `Seed must be an integer from 0 to ${MAX_SEED}.`,
      })
      return
    }
    update('seed', seed)
  }

  const beginGesture = () => dispatch({ type: 'begin-gesture' })
  const endGesture = () => dispatch({ type: 'commit-gesture' })

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

      <nav className="study-toolbar" aria-label="Study history and files">
        <div className="project-state" aria-live="polite">
          <span>PROJECT</span>
          <strong className={projectStatus === 'UNSAVED' ? 'is-unsaved' : ''}>
            {projectStatus}
          </strong>
          {notice ? (
            <small className={notice.kind === 'error' ? 'is-error' : ''}>
              {notice.text}
            </small>
          ) : null}
        </div>
        <label className="seed-field">
          <span>SEED</span>
          <input
            key={parameters.seed}
            type="number"
            min={0}
            max={MAX_SEED}
            step={1}
            defaultValue={parameters.seed}
            onBlur={(event) => commitSeed(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') {
                event.currentTarget.value = String(parameters.seed)
                event.currentTarget.blur()
              }
            }}
          />
        </label>
        <div className="study-toolbar-actions">
          <button type="button" onClick={undo} disabled={history.past.length === 0}>
            UNDO
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={history.future.length === 0}
          >
            REDO
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={projectJson === DEFAULT_PROJECT_JSON}
          >
            RESET
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            OPEN
          </button>
          <button type="button" className="is-primary" onClick={saveProject}>
            SAVE PROJECT
          </button>
        </div>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept=".json,application/json"
          onChange={chooseProjectFile}
          tabIndex={-1}
        />
      </nav>

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
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('heightMm', value)}
          />
          <RangeField
            label="Supports"
            value={parameters.supportCount}
            minimum={1}
            maximum={6}
            step={1}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('supportCount', value)}
          />
          <RangeField
            label="Support height"
            value={parameters.supportHeightRatio}
            minimum={0.25}
            maximum={0.58}
            step={0.01}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('supportHeightRatio', value)}
          />
          <RangeField
            label="Shoulder share"
            value={parameters.shoulderRatio}
            minimum={0.2}
            maximum={0.8}
            step={0.01}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('shoulderRatio', value)}
          />
          <RangeField
            label="Neck width"
            value={parameters.neckWidthRatio}
            minimum={0.18}
            maximum={0.7}
            step={0.01}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('neckWidthRatio', value)}
          />
          <RangeField
            label="Asymmetry"
            value={parameters.asymmetry}
            minimum={0}
            maximum={0.5}
            step={0.01}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('asymmetry', value)}
          />
          <div className="control-subsection">
            <span>SHARED LEG LEAN</span>
            <small>Moves every foot. Necks remain fixed.</small>
          </div>
          <RangeField
            label="Foot offset X"
            value={parameters.footOffsetXMm}
            minimum={-300}
            maximum={300}
            step={5}
            suffix=" mm"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('footOffsetXMm', value)}
          />
          <RangeField
            label="Foot offset Y"
            value={parameters.footOffsetYMm}
            minimum={-300}
            maximum={300}
            step={5}
            suffix=" mm"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('footOffsetYMm', value)}
          />
          <div className="lean-readout" aria-label="Shared leg lean result">
            <span>AUTHORED LEAN</span>
            <strong>{authoredLeanAngleDeg.toFixed(1)}°</strong>
            <small>
              {formatNumber(footOffsetMm, 1)} MM OFFSET ·{' '}
              {footDirectionDeg === undefined
                ? 'NO DIRECTION'
                : `${footDirectionDeg.toFixed(0)}° FOOT DIRECTION`}
            </small>
            <small>Seeded asymmetry adds per-leg variation.</small>
          </div>
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
              <dd>
                {formatNumber(study.concreteVolumeMm3 / 1_000_000_000, 3)} m³
              </dd>
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
          <i className="status-dot" /> RECOVERY ON
        </span>
        <span>SEED {parameters.seed}</span>
        <span>{study.pieces.length} OBJECTS</span>
        <span className="statusbar-end">RAAKA 0.1.3 / LOCAL</span>
      </footer>
    </main>
  )
}
