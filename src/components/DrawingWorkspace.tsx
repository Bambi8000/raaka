import { useEffect, useMemo, useState } from 'react'
import {
  createOrthographicPathSet,
  createSectionPathSet,
  drawingSvgFilename,
  encodeDrawingSvg,
  type DrawingPathSet,
  type DrawingViewId,
  type OrthographicDrawingViewId,
  type SectionDrawingAxis,
} from '../core/drawing'
import type { Bounds3, ScenePiece } from '../core/types'

const PAPER_SCALES = [1, 2, 5, 10, 20] as const
const DRAWING_VIEWS: readonly {
  readonly id: DrawingViewId
  readonly label: string
  readonly description: string
}[] = [
  { id: 'plan', label: 'PLAN', description: 'TOP' },
  { id: 'elevation-x', label: 'ELEV X', description: 'LOOK X' },
  { id: 'elevation-y', label: 'ELEV Y', description: 'LOOK Y' },
  { id: 'section-x', label: 'SECTION X', description: 'CUT X' },
  { id: 'section-y', label: 'SECTION Y', description: 'CUT Y' },
]

interface DrawingWorkspaceProps {
  readonly pieces: readonly ScenePiece[]
  readonly retainedCorePieces: readonly ScenePiece[]
  readonly bounds: Bounds3
  readonly seed: number
  readonly modelScaleDenominator: number
  readonly onMessage: (kind: 'info' | 'error', text: string) => void
}

type DrawingState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready'
      readonly drawing: DrawingPathSet
      readonly pieces: readonly ScenePiece[]
      readonly retainedCorePieces: readonly ScenePiece[]
      readonly viewId: DrawingViewId
      readonly planeOffsetMm?: number
    }
  | {
      readonly status: 'error'
      readonly message: string
      readonly pieces: readonly ScenePiece[]
      readonly retainedCorePieces: readonly ScenePiece[]
      readonly viewId: DrawingViewId
      readonly planeOffsetMm?: number
    }

function centre(minimum: number, maximum: number): number {
  return Math.round((minimum + maximum) / 2)
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function format(value: number, digits = 0): string {
  return new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(value)
}

function previewPath(points: readonly (readonly [number, number])[]): string {
  return points.map(([x, y], index) =>
    `${index === 0 ? 'M' : 'L'} ${x} ${-y}`,
  ).join(' ') + ' Z'
}

function sectionAxis(viewId: DrawingViewId): SectionDrawingAxis | undefined {
  if (viewId === 'section-x') return 'x'
  if (viewId === 'section-y') return 'y'
  return undefined
}

function drawingTitle(viewId: DrawingViewId): string {
  if (viewId === 'plan') return 'PLAN'
  if (viewId === 'elevation-x') return 'ELEVATION X'
  if (viewId === 'elevation-y') return 'ELEVATION Y'
  const axis = sectionAxis(viewId)
  return `SECTION ${axis?.toUpperCase()}–${axis?.toUpperCase()}`
}

function drawingAxes(viewId: DrawingViewId): string {
  if (viewId === 'plan') return 'HORIZONTAL X · VERTICAL Y · TOP PROJECTION · SILHOUETTE ONLY'
  if (viewId === 'elevation-x') return 'HORIZONTAL Y · VERTICAL Z · LOOK ALONG X · SILHOUETTE ONLY'
  if (viewId === 'elevation-y') return 'HORIZONTAL X · VERTICAL Z · LOOK ALONG Y · SILHOUETTE ONLY'
  const axis = sectionAxis(viewId)
  return `HORIZONTAL ${axis === 'x' ? 'Y' : 'X'} · VERTICAL Z · FINISHED SOLID`
}

function pathLabel(drawing: DrawingPathSet): string {
  const count = drawing.paths.length
  const role = drawing.paths[0]?.role.toUpperCase() ?? 'DRAWING'
  return `${count} ${role} PATH${count === 1 ? '' : 'S'}`
}

export function DrawingWorkspace({
  pieces,
  retainedCorePieces,
  bounds,
  seed,
  modelScaleDenominator,
  onMessage,
}: DrawingWorkspaceProps) {
  const [viewId, setViewId] = useState<DrawingViewId>('section-x')
  const [offsets, setOffsets] = useState(() => ({
    x: centre(bounds.min[0], bounds.max[0]),
    y: centre(bounds.min[1], bounds.max[1]),
  }))
  const [paperScaleDenominator, setPaperScaleDenominator] = useState(10)
  const [drawingState, setDrawingState] = useState<DrawingState>({ status: 'loading' })
  const activeSectionAxis = sectionAxis(viewId)
  const axisIndex = activeSectionAxis === 'y' ? 1 : 0
  const minimum = Math.ceil(bounds.min[axisIndex])
  const maximum = Math.floor(bounds.max[axisIndex])
  const planeOffsetMm = activeSectionAxis
    ? clamp(offsets[activeSectionAxis], minimum, maximum)
    : undefined

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      const drawingPromise = activeSectionAxis && planeOffsetMm !== undefined
        ? createSectionPathSet(
            pieces,
            retainedCorePieces,
            activeSectionAxis,
            planeOffsetMm,
          )
        : createOrthographicPathSet(
            pieces,
            retainedCorePieces,
            viewId as OrthographicDrawingViewId,
          )
      void drawingPromise.then(
        (drawing) => {
          if (!cancelled) setDrawingState({
            status: 'ready', drawing, pieces, retainedCorePieces, viewId, planeOffsetMm,
          })
        },
        (error: unknown) => {
          if (!cancelled) setDrawingState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown drawing error.',
            pieces,
            retainedCorePieces,
            viewId,
            planeOffsetMm,
          })
        },
      )
    }, 60)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeSectionAxis, pieces, planeOffsetMm, retainedCorePieces, viewId])

  const currentDrawingState = useMemo((): DrawingState =>
    drawingState.status !== 'loading'
      && drawingState.pieces === pieces
      && drawingState.retainedCorePieces === retainedCorePieces
      && drawingState.viewId === viewId
      && drawingState.planeOffsetMm === planeOffsetMm
      ? drawingState
      : { status: 'loading' },
  [drawingState, pieces, planeOffsetMm, retainedCorePieces, viewId])

  const preview = useMemo(() => {
    if (currentDrawingState.status !== 'ready' || currentDrawingState.drawing.paths.length === 0) {
      return undefined
    }
    const { bounds: drawingBounds } = currentDrawingState.drawing
    const width = drawingBounds.max[0] - drawingBounds.min[0]
    const height = drawingBounds.max[1] - drawingBounds.min[1]
    const padding = Math.max(10, Math.max(width, height) * 0.08)
    return {
      viewBox: [
        drawingBounds.min[0] - padding,
        -drawingBounds.max[1] - padding,
        width + padding * 2,
        height + padding * 2,
      ].join(' '),
      paths: currentDrawingState.drawing.paths,
    }
  }, [currentDrawingState])

  const updatePlane = (value: number) => {
    if (!activeSectionAxis || !Number.isFinite(value)) return
    setOffsets((current) => ({
      ...current,
      [activeSectionAxis]: clamp(value, minimum, maximum),
    }))
  }

  const exportSvg = () => {
    if (currentDrawingState.status !== 'ready') return
    try {
      const filename = drawingSvgFilename(
        seed,
        modelScaleDenominator,
        currentDrawingState.drawing.view,
        paperScaleDenominator,
      )
      const svg = encodeDrawingSvg(currentDrawingState.drawing, {
        title: `RAAKA PILOTI ${seed} · ${drawingTitle(viewId)} · PAPER 1:${paperScaleDenominator}`,
        paperScaleDenominator,
      })
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      onMessage(
        'info',
        `Exported ${filename}: ${pathLabel(currentDrawingState.drawing).toLowerCase()} · ${format(currentDrawingState.drawing.areaMm2, 1)} mm² ${currentDrawingState.drawing.view.kind === 'section' ? 'cut' : 'projected'} area.`,
      )
    } catch (error) {
      onMessage(
        'error',
        `Drawing export failed: ${error instanceof Error ? error.message : 'Unknown SVG error.'}`,
      )
    }
  }

  const drawing = currentDrawingState.status === 'ready' ? currentDrawingState.drawing : undefined
  const hasDrawing = (drawing?.paths.length ?? 0) > 0
  const viewTitle = drawingTitle(viewId)

  return (
    <div className="section-workspace">
      <header className="section-toolbar">
        <div className="section-title">
          <span>DRAWING 01</span>
          <strong>{viewTitle}</strong>
          <small>{drawingAxes(viewId)}</small>
        </div>
        <div className="drawing-view-switch" aria-label="Drawing view">
          {DRAWING_VIEWS.map((choice) => (
            <button
              type="button"
              key={choice.id}
              className={viewId === choice.id ? 'is-active' : ''}
              aria-pressed={viewId === choice.id}
              onClick={() => setViewId(choice.id)}
            >
              <span>{choice.label}</span>
              <small>{choice.description}</small>
            </button>
          ))}
        </div>
        {activeSectionAxis && planeOffsetMm !== undefined ? (
          <label className="section-plane-field">
            <span>PLANE POSITION</span>
            <span className="section-numeric-entry">
              <input
                type="number"
                aria-label="Section plane position numeric value"
                min={minimum}
                max={maximum}
                step={1}
                value={planeOffsetMm}
                onChange={(event) => updatePlane(event.currentTarget.valueAsNumber)}
              />
              <small>MM</small>
            </span>
            <input
              type="range"
              aria-label="Section plane position"
              min={minimum}
              max={maximum}
              step={1}
              value={planeOffsetMm}
              disabled={minimum === maximum}
              onChange={(event) => updatePlane(event.currentTarget.valueAsNumber)}
            />
          </label>
        ) : null}
        <div className="section-paper-scale">
          <span>PAPER SCALE</span>
          <div>
            {PAPER_SCALES.map((denominator) => (
              <button
                type="button"
                key={denominator}
                className={paperScaleDenominator === denominator ? 'is-active' : ''}
                aria-pressed={paperScaleDenominator === denominator}
                onClick={() => setPaperScaleDenominator(denominator)}
              >
                1:{denominator}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="section-export"
          disabled={currentDrawingState.status !== 'ready' || !hasDrawing}
          onClick={exportSvg}
        >
          EXPORT
          <span>SVG · LINE ONLY</span>
        </button>
      </header>

      <div className="section-sheet" aria-live="polite">
        {preview ? (
          <svg
            role="img"
            aria-label={`${viewTitle}${planeOffsetMm === undefined ? '' : ` at ${format(planeOffsetMm, 1)} millimetres`}`}
            viewBox={preview.viewBox}
            preserveAspectRatio="xMidYMid meet"
          >
            <g className="drawing-preview-lines">
              {preview.paths.map((path) => (
                <path key={path.id} d={previewPath(path.points)} />
              ))}
            </g>
          </svg>
        ) : (
          <div className={`section-state ${currentDrawingState.status === 'error' ? 'is-error' : ''}`}>
            <strong>
              {currentDrawingState.status === 'loading'
                ? 'BUILDING DRAWING…'
                : currentDrawingState.status === 'error'
                  ? 'DRAWING UNAVAILABLE'
                  : 'NO OUTLINE'}
            </strong>
            <span>
              {currentDrawingState.status === 'error'
                ? currentDrawingState.message
                : currentDrawingState.status === 'ready'
                  ? activeSectionAxis && planeOffsetMm !== undefined
                    ? `The ${activeSectionAxis.toUpperCase()}=${format(planeOffsetMm, 1)} mm plane does not cross the finished solid.`
                    : 'The finished solid has no outline in this view.'
                  : 'Resolving finished-solid union and projection.'}
            </span>
          </div>
        )}
        <div className="section-sheet-meta">
          <span>
            {activeSectionAxis && planeOffsetMm !== undefined
              ? `PLANE ${activeSectionAxis.toUpperCase()}=${format(planeOffsetMm, 1)} MM`
              : viewTitle}
          </span>
          <span>MODEL 1:{modelScaleDenominator}</span>
          <span>PAPER 1:{paperScaleDenominator}</span>
          <span>
            {drawing
              ? `${pathLabel(drawing)} · ${format(drawing.areaMm2, 1)} MM² ${drawing.view.kind === 'section' ? 'CUT' : 'PROJECTED'}`
              : 'MEASURING'}
          </span>
        </div>
      </div>
    </div>
  )
}
