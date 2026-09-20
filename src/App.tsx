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
import { MODEL_SCALE_PRESETS, scaleMassStudy } from './core/modelScale'
import { pilotiSupportAddress } from './core/pilotiParameters'
import {
  createProject,
  parseProject,
  readRecovery,
  serializeProject,
  writeRecovery,
} from './core/project'
import type {
  ModelScale,
  PilotiFootOffsetOverride,
  PilotiParameters,
  PilotiSupportPositionOverride,
  PilotiSupportSizeOverride,
} from './core/types'

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
type SupportEditScope = 'shared' | 'selected'

interface PilotiStudyState {
  readonly parameters: PilotiParameters
  readonly modelScale: ModelScale
}

interface InitialSession {
  readonly study: PilotiStudyState
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

const DEFAULT_STUDY: PilotiStudyState = {
  parameters: DEFAULT_PILOTI_PARAMETERS,
  modelScale: 1,
}

const DEFAULT_PROJECT_JSON = serializeProject(
  createProject(DEFAULT_STUDY.parameters, DEFAULT_STUDY.modelScale),
)

function pilotiHistoryReducer(
  state: HistoryState<PilotiStudyState>,
  action: HistoryAction<PilotiStudyState>,
): HistoryState<PilotiStudyState> {
  return reduceHistory(state, action)
}

function loadInitialSession(): InitialSession {
  const recovery = readRecovery(window.localStorage)
  if (recovery.status === 'recovered') {
    return {
      study: {
        parameters: recovery.project.parameters,
        modelScale: recovery.project.modelScale,
      },
      origin: 'RECOVERED',
      baseline: serializeProject(recovery.project),
      notice: { kind: 'info', text: 'Local recovery restored.' },
    }
  }
  if (recovery.status === 'invalid') {
    return {
      study: DEFAULT_STUDY,
      origin: 'DEFAULT',
      baseline: DEFAULT_PROJECT_JSON,
      notice: {
        kind: 'error',
        text: `Recovery ignored: ${recovery.message}`,
      },
    }
  }
  return {
    study: DEFAULT_STUDY,
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
  const selectedSupportId = supportIdForPiece(selectedPieceId)
  const address = selectedSupportId
    ? pilotiSupportAddress(selectedSupportId)
    : undefined
  return (
    address !== undefined &&
    address.column <= parameters.supportCount &&
    address.row <= parameters.supportRowCount
  )
}

function supportIdForPiece(pieceId: string): string | undefined {
  const supportId = pieceId.startsWith('shoulder-')
    ? `support-${pieceId.slice('shoulder-'.length)}`
    : pieceId
  return pilotiSupportAddress(supportId) ? supportId : undefined
}

function formatSupportId(supportId: string): string {
  const address = pilotiSupportAddress(supportId)
  return address
    ? `ROW ${address.row} · COLUMN ${address.column}`
    : supportId.toUpperCase()
}

function compareSupportIds(
  left: { readonly supportId: string },
  right: { readonly supportId: string },
): number {
  const leftAddress = pilotiSupportAddress(left.supportId)
  const rightAddress = pilotiSupportAddress(right.supportId)
  if (!leftAddress || !rightAddress) return 0
  return (
    leftAddress.row - rightAddress.row ||
    leftAddress.column - rightAddress.column
  )
}

export default function App() {
  const [initialSession] = useState(loadInitialSession)
  const [history, dispatch] = useReducer(
    pilotiHistoryReducer,
    initialSession.study,
    createHistory,
  )
  const [selectedPieceId, setSelectedPieceId] = useState('upper-mass')
  const [supportEditScope, setSupportEditScope] =
    useState<SupportEditScope>('shared')
  const [baselineJson, setBaselineJson] = useState(initialSession.baseline)
  const [projectOrigin, setProjectOrigin] = useState<ProjectOrigin>(
    initialSession.origin,
  )
  const [notice, setNotice] = useState<Notice | undefined>(
    initialSession.notice,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const studyState = history.present
  const parameters = studyState.parameters
  const modelScale = studyState.modelScale
  const modelScaleDenominator = Math.round(1 / modelScale)
  const project = useMemo(
    () => createProject(parameters, modelScale),
    [modelScale, parameters],
  )
  const projectJson = useMemo(() => serializeProject(project), [project])
  const masterStudy = useMemo(() => generatePiloti(parameters), [parameters])
  const study = useMemo(
    () => scaleMassStudy(masterStudy, modelScale),
    [masterStudy, modelScale],
  )
  const selectedSupportId = supportIdForPiece(selectedPieceId)
  const selectedFootOffsetOverride = parameters.footOffsetOverrides.find(
    (override) => override.supportId === selectedSupportId,
  )
  const selectedSupportSizeOverride = parameters.supportSizeOverrides.find(
    (override) => override.supportId === selectedSupportId,
  )
  const selectedSupportPositionOverride =
    parameters.supportPositionOverrides.find(
      (override) => override.supportId === selectedSupportId,
    )
  const hasSelectedSupportOverride =
    selectedFootOffsetOverride !== undefined ||
    selectedSupportSizeOverride !== undefined ||
    selectedSupportPositionOverride !== undefined
  const activeSupportEditScope =
    supportEditScope === 'selected' && selectedSupportId !== undefined
      ? 'selected'
      : 'shared'
  const activeFootOffsetX =
    activeSupportEditScope === 'selected'
      ? (selectedFootOffsetOverride?.footOffsetXMm ?? parameters.footOffsetXMm)
      : parameters.footOffsetXMm
  const activeFootOffsetY =
    activeSupportEditScope === 'selected'
      ? (selectedFootOffsetOverride?.footOffsetYMm ?? parameters.footOffsetYMm)
      : parameters.footOffsetYMm
  const activeSupportWidthScale = selectedSupportSizeOverride?.widthScale ?? 1
  const activeSupportDepthScale = selectedSupportSizeOverride?.depthScale ?? 1
  const activeSupportPositionX =
    selectedSupportPositionOverride?.positionXMm ?? 0
  const activeSupportPositionY =
    selectedSupportPositionOverride?.positionYMm ?? 0
  const stemHeightMm =
    parameters.heightMm *
    parameters.supportHeightRatio *
    (1 - parameters.shoulderRatio)
  const footOffsetMm = Math.hypot(
    activeFootOffsetX,
    activeFootOffsetY,
  )
  const authoredLeanAngleDeg =
    (Math.atan2(footOffsetMm, stemHeightMm) * 180) / Math.PI
  const footDirectionDeg =
    footOffsetMm === 0
      ? undefined
      : ((Math.atan2(activeFootOffsetY, activeFootOffsetX) * 180) /
          Math.PI +
          360) %
        360
  const selectedPiece = study.pieces.find(
    (piece) => piece.id === selectedPieceId,
  )
  const projectStatus: ProjectOrigin | 'UNSAVED' =
    projectJson === baselineJson ? projectOrigin : 'UNSAVED'

  const persistRecovery = (nextStudy: PilotiStudyState) => {
    try {
      writeRecovery(
        window.localStorage,
        createProject(nextStudy.parameters, nextStudy.modelScale),
      )
      if (
        notice?.kind === 'error' &&
        notice.text.startsWith('Recovery ignored:')
      ) {
        setNotice({ kind: 'info', text: 'Local recovery repaired.' })
      }
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
      setSupportEditScope('shared')
    }
  }

  const selectPiece = (pieceId: string) => {
    setSelectedPieceId(pieceId)
    if (supportIdForPiece(pieceId) === undefined) {
      setSupportEditScope('shared')
    }
  }

  const replaceStudy = (nextStudy: PilotiStudyState) => {
    if (nextStudy === studyState) return
    persistRecovery(nextStudy)
    dispatch({ type: 'replace', value: nextStudy })
  }

  const update = <Key extends keyof PilotiParameters>(
    key: Key,
    value: PilotiParameters[Key],
  ) => {
    if (parameters[key] === value) return
    const nextParameters = { ...parameters, [key]: value }
    reconcileSelection(nextParameters)
    replaceStudy({ ...studyState, parameters: nextParameters })
  }

  const updateModelScale = (nextModelScale: ModelScale) => {
    if (nextModelScale === modelScale) return
    replaceStudy({ ...studyState, modelScale: nextModelScale })
  }

  const undo = () => {
    const previous = history.past.at(-1)
    if (!previous) return
    reconcileSelection(previous.parameters)
    persistRecovery(previous)
    dispatch({ type: 'undo' })
  }

  const redo = () => {
    const next = history.future[0]
    if (!next) return
    reconcileSelection(next.parameters)
    persistRecovery(next)
    dispatch({ type: 'redo' })
  }

  const reset = () => {
    setSelectedPieceId('upper-mass')
    setSupportEditScope('shared')
    replaceStudy(DEFAULT_STUDY)
    setNotice({ kind: 'info', text: 'Defaults restored. Undo is available.' })
  }

  const saveProject = () => {
    const blob = new Blob([projectJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `raaka-piloti-${String(parameters.seed).padStart(4, '0')}-1to${modelScaleDenominator}.raaka.json`
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
      const openedStudy = {
        parameters: openedProject.parameters,
        modelScale: openedProject.modelScale,
      }
      dispatch({ type: 'load', value: openedStudy })
      persistRecovery(openedStudy)
      setSelectedPieceId('upper-mass')
      setSupportEditScope('shared')
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

  const replaceSelectedSupportOverride = (
    supportId: string,
    footOffsetOverride?: Omit<PilotiFootOffsetOverride, 'supportId'>,
    supportSizeOverride?: Omit<PilotiSupportSizeOverride, 'supportId'>,
    supportPositionOverride?: Omit<PilotiSupportPositionOverride, 'supportId'>,
  ) => {
    const retainedFootOffsets = parameters.footOffsetOverrides.filter(
      (override) => override.supportId !== supportId,
    )
    const retainedSizes = parameters.supportSizeOverrides.filter(
      (override) => override.supportId !== supportId,
    )
    const retainedPositions = parameters.supportPositionOverrides.filter(
      (override) => override.supportId !== supportId,
    )
    const footOffsetOverrides = footOffsetOverride
      ? [
          ...retainedFootOffsets,
          { supportId, ...footOffsetOverride },
        ].sort(compareSupportIds)
      : retainedFootOffsets
    const supportSizeOverrides = supportSizeOverride
      ? [
          ...retainedSizes,
          { supportId, ...supportSizeOverride },
        ].sort(compareSupportIds)
      : retainedSizes
    const supportPositionOverrides = supportPositionOverride
      ? [
          ...retainedPositions,
          { supportId, ...supportPositionOverride },
        ].sort(compareSupportIds)
      : retainedPositions
    replaceStudy({
      ...studyState,
      parameters: {
        ...parameters,
        footOffsetOverrides,
        supportSizeOverrides,
        supportPositionOverrides,
      },
    })
  }

  const createSelectedSupportOverride = () => {
    if (selectedSupportId === undefined || hasSelectedSupportOverride) return
    replaceSelectedSupportOverride(
      selectedSupportId,
      {
        footOffsetXMm: parameters.footOffsetXMm,
        footOffsetYMm: parameters.footOffsetYMm,
      },
      { widthScale: 1, depthScale: 1 },
      { positionXMm: 0, positionYMm: 0 },
    )
  }

  const updateSelectedFootOffset = (
    axis: 'footOffsetXMm' | 'footOffsetYMm',
    value: number,
  ) => {
    if (selectedSupportId === undefined || !hasSelectedSupportOverride) return
    replaceSelectedSupportOverride(
      selectedSupportId,
      {
        footOffsetXMm: axis === 'footOffsetXMm' ? value : activeFootOffsetX,
        footOffsetYMm: axis === 'footOffsetYMm' ? value : activeFootOffsetY,
      },
      {
        widthScale: activeSupportWidthScale,
        depthScale: activeSupportDepthScale,
      },
      {
        positionXMm: activeSupportPositionX,
        positionYMm: activeSupportPositionY,
      },
    )
  }

  const updateSelectedSupportSize = (
    axis: 'widthScale' | 'depthScale',
    value: number,
  ) => {
    if (selectedSupportId === undefined || !hasSelectedSupportOverride) return
    replaceSelectedSupportOverride(
      selectedSupportId,
      {
        footOffsetXMm: activeFootOffsetX,
        footOffsetYMm: activeFootOffsetY,
      },
      {
        widthScale: axis === 'widthScale' ? value : activeSupportWidthScale,
        depthScale: axis === 'depthScale' ? value : activeSupportDepthScale,
      },
      {
        positionXMm: activeSupportPositionX,
        positionYMm: activeSupportPositionY,
      },
    )
  }

  const updateSelectedSupportPosition = (
    axis: 'positionXMm' | 'positionYMm',
    value: number,
  ) => {
    if (selectedSupportId === undefined || !hasSelectedSupportOverride) return
    replaceSelectedSupportOverride(
      selectedSupportId,
      {
        footOffsetXMm: activeFootOffsetX,
        footOffsetYMm: activeFootOffsetY,
      },
      {
        widthScale: activeSupportWidthScale,
        depthScale: activeSupportDepthScale,
      },
      {
        positionXMm: axis === 'positionXMm' ? value : activeSupportPositionX,
        positionYMm: axis === 'positionYMm' ? value : activeSupportPositionY,
      },
    )
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
                onClick={() => selectPiece(piece.id)}
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
          modelScale={modelScale}
          selectedPieceId={selectedPieceId}
          onSelect={selectPiece}
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
            label="Design height"
            value={parameters.heightMm}
            minimum={1_000}
            maximum={2_000}
            step={10}
            suffix=" mm"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('heightMm', value)}
          />
          <div className="model-scale-control">
            <div className="model-scale-heading">
              <span>MODEL SCALE</span>
              <small>Uniform manufacturing size, not camera zoom.</small>
            </div>
            <div className="model-scale-presets" aria-label="Model scale">
              {MODEL_SCALE_PRESETS.map((preset) => {
                const denominator = Math.round(1 / preset)
                return (
                  <button
                    type="button"
                    key={preset}
                    className={modelScale === preset ? 'is-active' : ''}
                    aria-pressed={modelScale === preset}
                    onClick={() => updateModelScale(preset)}
                  >
                    1:{denominator}
                  </button>
                )
              })}
            </div>
            <div className="model-scale-summary">
              <span>MANUFACTURED HEIGHT</span>
              <strong>{formatNumber(study.heightMm)} MM</strong>
              <small>{formatNumber(masterStudy.heightMm)} MM DESIGN</small>
            </div>
          </div>
          <RangeField
            label="Upper width share"
            value={parameters.upperWidthRatio}
            minimum={0.4}
            maximum={1.1}
            step={0.01}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('upperWidthRatio', value)}
          />
          <RangeField
            label="Upper depth share"
            value={parameters.upperDepthRatio}
            minimum={0.2}
            maximum={0.65}
            step={0.01}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('upperDepthRatio', value)}
          />
          <RangeField
            label="Columns (X)"
            value={parameters.supportCount}
            minimum={1}
            maximum={6}
            step={1}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('supportCount', value)}
          />
          <RangeField
            label="Rows (Y)"
            value={parameters.supportRowCount}
            minimum={1}
            maximum={3}
            step={1}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('supportRowCount', value)}
          />
          <RangeField
            label="Row spacing"
            value={parameters.rowSpacingMm}
            minimum={100}
            maximum={800}
            step={10}
            suffix=" mm"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('rowSpacingMm', value)}
          />
          <RangeField
            label="Support depth share"
            value={parameters.supportDepthRatio}
            minimum={0.25}
            maximum={0.92}
            step={0.01}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('supportDepthRatio', value)}
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
            <span>LEG EDIT SCOPE</span>
            <small>Foot offsets lean. Position moves the complete leg.</small>
          </div>
          <div className="offset-scope-switch" aria-label="Leg edit scope">
            <button
              type="button"
              className={activeSupportEditScope === 'shared' ? 'is-active' : ''}
              aria-pressed={activeSupportEditScope === 'shared'}
              onClick={() => setSupportEditScope('shared')}
            >
              <span>SHARED</span>
              <small>ALL LEGS</small>
            </button>
            <button
              type="button"
              className={activeSupportEditScope === 'selected' ? 'is-active' : ''}
              aria-pressed={activeSupportEditScope === 'selected'}
              disabled={selectedSupportId === undefined}
              onClick={() => setSupportEditScope('selected')}
            >
              <span>SELECTED</span>
              <small>
                {selectedSupportId
                  ? formatSupportId(selectedSupportId)
                  : 'SELECT A LEG'}
              </small>
            </button>
          </div>
          {activeSupportEditScope === 'selected' &&
          !hasSelectedSupportOverride ? (
            <div className="offset-inheritance">
              <span>INHERITS SHARED LEG</span>
              <small>
                OFFSET X {parameters.footOffsetXMm} MM · Y{' '}
                {parameters.footOffsetYMm} MM · POSITION 0 × 0 MM · SIZE 100 ×
                100%
              </small>
              <button type="button" onClick={createSelectedSupportOverride}>
                CREATE OVERRIDE
              </button>
            </div>
          ) : (
            <>
              {activeSupportEditScope === 'selected' && selectedSupportId ? (
                <div className="offset-override-heading">
                  <span>{formatSupportId(selectedSupportId)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      replaceSelectedSupportOverride(selectedSupportId)
                    }
                  >
                    USE SHARED
                  </button>
                </div>
              ) : null}
              <RangeField
                label={
                  activeSupportEditScope === 'selected'
                    ? 'Selected foot X'
                    : 'Foot offset X'
                }
                value={activeFootOffsetX}
                minimum={-300}
                maximum={300}
                step={5}
                suffix=" mm"
                onInteractionStart={beginGesture}
                onInteractionEnd={endGesture}
                onChange={(value) =>
                  activeSupportEditScope === 'selected'
                    ? updateSelectedFootOffset('footOffsetXMm', value)
                    : update('footOffsetXMm', value)
                }
              />
              <RangeField
                label={
                  activeSupportEditScope === 'selected'
                    ? 'Selected foot Y'
                    : 'Foot offset Y'
                }
                value={activeFootOffsetY}
                minimum={-300}
                maximum={300}
                step={5}
                suffix=" mm"
                onInteractionStart={beginGesture}
                onInteractionEnd={endGesture}
                onChange={(value) =>
                  activeSupportEditScope === 'selected'
                    ? updateSelectedFootOffset('footOffsetYMm', value)
                    : update('footOffsetYMm', value)
                }
              />
              {activeSupportEditScope === 'selected' ? (
                <>
                  <RangeField
                    label="Selected position X"
                    value={activeSupportPositionX}
                    minimum={-300}
                    maximum={300}
                    step={5}
                    suffix=" mm"
                    onInteractionStart={beginGesture}
                    onInteractionEnd={endGesture}
                    onChange={(value) =>
                      updateSelectedSupportPosition('positionXMm', value)
                    }
                  />
                  <RangeField
                    label="Selected position Y"
                    value={activeSupportPositionY}
                    minimum={-300}
                    maximum={300}
                    step={5}
                    suffix=" mm"
                    onInteractionStart={beginGesture}
                    onInteractionEnd={endGesture}
                    onChange={(value) =>
                      updateSelectedSupportPosition('positionYMm', value)
                    }
                  />
                  <div className="shape-readout">
                    <span>SELECTED POSITION</span>
                    <strong>
                      X {formatNumber(activeSupportPositionX)} · Y{' '}
                      {formatNumber(activeSupportPositionY)} MM
                    </strong>
                    <small>Translation from the generated grid position.</small>
                  </div>
                  <RangeField
                    label="Selected width scale"
                    value={activeSupportWidthScale}
                    minimum={0.55}
                    maximum={1.45}
                    step={0.01}
                    onInteractionStart={beginGesture}
                    onInteractionEnd={endGesture}
                    onChange={(value) =>
                      updateSelectedSupportSize('widthScale', value)
                    }
                  />
                  <RangeField
                    label="Selected depth scale"
                    value={activeSupportDepthScale}
                    minimum={0.55}
                    maximum={1.45}
                    step={0.01}
                    onInteractionStart={beginGesture}
                    onInteractionEnd={endGesture}
                    onChange={(value) =>
                      updateSelectedSupportSize('depthScale', value)
                    }
                  />
                  <div className="shape-readout">
                    <span>SELECTED SIZE</span>
                    <strong>
                      {formatNumber(activeSupportWidthScale * 100)} ×{' '}
                      {formatNumber(activeSupportDepthScale * 100)}%
                    </strong>
                    <small>Width × depth relative to the shared leg.</small>
                  </div>
                </>
              ) : null}
            </>
          )}
          <div
            className="lean-readout"
            aria-label={`${activeSupportEditScope} leg lean result`}
          >
            <span>
              {activeSupportEditScope === 'selected'
                ? hasSelectedSupportOverride
                  ? 'SELECTED LEAN'
                  : 'INHERITED LEAN'
                : 'SHARED LEAN'}
            </span>
            <strong>{authoredLeanAngleDeg.toFixed(1)}°</strong>
            <small>
              {formatNumber(footOffsetMm, 1)} MM DESIGN OFFSET ·{' '}
              {footDirectionDeg === undefined
                ? 'NO DIRECTION'
                : `${footDirectionDeg.toFixed(0)}° FOOT DIRECTION`}
            </small>
            <small>
              {formatNumber(footOffsetMm * modelScale, 1)} MM MODEL OFFSET AT
              1:{modelScaleDenominator}
            </small>
            <small>
              {activeSupportEditScope === 'selected'
                ? hasSelectedSupportOverride
                  ? 'This leg uses selected lean, position and size values.'
                  : 'Create an override to separate this leg.'
                : 'Seeded asymmetry adds per-leg variation.'}
            </small>
          </div>
        </section>

        <section className="panel-section metrics-section">
          <div className="section-heading">
            <span>04</span>
            <h2>Manufacturing estimate</h2>
          </div>
          <dl className="metrics-grid">
            <div>
              <dt>Design envelope</dt>
              <dd>
                {formatNumber(masterStudy.widthMm)} ×{' '}
                {formatNumber(masterStudy.depthMm)} ×{' '}
                {formatNumber(masterStudy.heightMm)} mm
              </dd>
            </div>
            <div>
              <dt>Manufactured envelope</dt>
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
          {masterStudy.supportLayout &&
          (masterStudy.supportLayout.adjacentRowOverlapMm > 0 ||
            masterStudy.supportLayout.adjacentColumnOverlapMm > 0 ||
            masterStudy.supportLayout.nonAdjacentBearingOverlapMm > 0 ||
            masterStudy.supportLayout.bearingOverhangMm > 0 ||
            masterStudy.supportLayout.sideBearingOverhangMm > 0) ? (
            <div className="layout-advisories" aria-live="polite">
              {masterStudy.supportLayout.adjacentRowOverlapMm > 0 ? (
                <div>
                  <strong>ROW OVERLAP</strong>
                  <span>
                    {formatNumber(
                      masterStudy.supportLayout.adjacentRowOverlapMm,
                      1,
                    )}{' '}
                    MM DESIGN ·{' '}
                    {formatNumber(
                      study.supportLayout?.adjacentRowOverlapMm ?? 0,
                      1,
                    )}{' '}
                    MM MODEL
                  </span>
                  <small>
                    Shoulder zones intersect. The nominal volume counts both
                    preview pieces until solid union is available.
                  </small>
                </div>
              ) : null}
              {masterStudy.supportLayout.adjacentColumnOverlapMm > 0 ? (
                <div>
                  <strong>COLUMN OVERLAP</strong>
                  <span>
                    {formatNumber(
                      masterStudy.supportLayout.adjacentColumnOverlapMm,
                      1,
                    )}{' '}
                    MM DESIGN ·{' '}
                    {formatNumber(
                      study.supportLayout?.adjacentColumnOverlapMm ?? 0,
                      1,
                    )}{' '}
                    MM MODEL
                  </span>
                  <small>
                    Adjacent shoulder zones intersect across the width. The
                    nominal volume counts both preview pieces.
                  </small>
                </div>
              ) : null}
              {masterStudy.supportLayout.nonAdjacentBearingOverlapMm > 0 ? (
                <div>
                  <strong>CROSS-GRID OVERLAP</strong>
                  <span>
                    {formatNumber(
                      masterStudy.supportLayout.nonAdjacentBearingOverlapMm,
                      1,
                    )}{' '}
                    MM DESIGN ·{' '}
                    {formatNumber(
                      study.supportLayout?.nonAdjacentBearingOverlapMm ?? 0,
                      1,
                    )}{' '}
                    MM MODEL
                  </span>
                  <small>
                    Non-neighbour shoulder zones intersect after placement.
                    Move the selected leg; RAAKA will not correct it.
                  </small>
                </div>
              ) : null}
              {masterStudy.supportLayout.bearingOverhangMm > 0 ? (
                <div>
                  <strong>BEARING OVERHANG</strong>
                  <span>
                    {formatNumber(
                      masterStudy.supportLayout.bearingOverhangMm,
                      1,
                    )}{' '}
                    MM / SIDE DESIGN ·{' '}
                    {formatNumber(
                      study.supportLayout?.bearingOverhangMm ?? 0,
                      1,
                    )}{' '}
                    MM MODEL
                  </span>
                  <small>
                    The outer shoulder zones extend beyond the upper mass.
                    Adjust depth, spacing or selected position; RAAKA will not
                    resize them.
                  </small>
                </div>
              ) : null}
              {masterStudy.supportLayout.sideBearingOverhangMm > 0 ? (
                <div>
                  <strong>SIDE BEARING OVERHANG</strong>
                  <span>
                    {formatNumber(
                      masterStudy.supportLayout.sideBearingOverhangMm,
                      1,
                    )}{' '}
                    MM DESIGN ·{' '}
                    {formatNumber(
                      study.supportLayout?.sideBearingOverhangMm ?? 0,
                      1,
                    )}{' '}
                    MM MODEL
                  </span>
                  <small>
                    A shoulder extends beyond the upper mass in X. Adjust its
                    width, selected position or the shared upper width; RAAKA
                    will not resize it.
                  </small>
                </div>
              ) : null}
            </div>
          ) : null}
          <p className="notice">
            Manufactured nominal solid estimate at 2,400 kg/m³. Structural
            approval, reinforcement and anchoring are outside this study.
          </p>
        </section>
      </aside>

      <footer className="statusbar">
        <span>
          <i className="status-dot" /> RECOVERY ON
        </span>
        <span>SEED {parameters.seed}</span>
        <span>SCALE 1:{modelScaleDenominator}</span>
        <span>
          {parameters.supportCount} × {parameters.supportRowCount} GRID
        </span>
        <span>{study.pieces.length} OBJECTS</span>
        <span className="statusbar-end">RAAKA 0.1.8 / LOCAL</span>
      </footer>
    </main>
  )
}
