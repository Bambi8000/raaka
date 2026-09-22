import { useEffect, useMemo, useState } from 'react'
import {
  createSectionPathSet,
  encodeSectionSvg,
  sectionSvgFilename,
  type DrawingPathSet,
  type SectionDrawingAxis,
} from '../core/sectionDrawing'
import type { Bounds3, ScenePiece } from '../core/types'

const PAPER_SCALES = [1, 2, 5, 10, 20] as const

interface SectionWorkspaceProps {
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
      readonly axis: SectionDrawingAxis
      readonly planeOffsetMm: number
    }
  | {
      readonly status: 'error'
      readonly message: string
      readonly pieces: readonly ScenePiece[]
      readonly retainedCorePieces: readonly ScenePiece[]
      readonly axis: SectionDrawingAxis
      readonly planeOffsetMm: number
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

export function SectionWorkspace({
  pieces,
  retainedCorePieces,
  bounds,
  seed,
  modelScaleDenominator,
  onMessage,
}: SectionWorkspaceProps) {
  const [axis, setAxis] = useState<SectionDrawingAxis>('x')
  const [offsets, setOffsets] = useState(() => ({
    x: centre(bounds.min[0], bounds.max[0]),
    y: centre(bounds.min[1], bounds.max[1]),
  }))
  const [paperScaleDenominator, setPaperScaleDenominator] = useState(10)
  const [drawingState, setDrawingState] = useState<DrawingState>({ status: 'loading' })
  const axisIndex = axis === 'x' ? 0 : 1
  const minimum = Math.ceil(bounds.min[axisIndex])
  const maximum = Math.floor(bounds.max[axisIndex])
  const planeOffsetMm = clamp(offsets[axis], minimum, maximum)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      void createSectionPathSet(
        pieces,
        retainedCorePieces,
        axis,
        planeOffsetMm,
      ).then(
        (drawing) => {
          if (!cancelled) setDrawingState({
            status: 'ready', drawing, pieces, retainedCorePieces, axis, planeOffsetMm,
          })
        },
        (error: unknown) => {
          if (!cancelled) setDrawingState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown section error.',
            pieces,
            retainedCorePieces,
            axis,
            planeOffsetMm,
          })
        },
      )
    }, 60)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [axis, pieces, planeOffsetMm, retainedCorePieces])

  const currentDrawingState = useMemo((): DrawingState =>
    drawingState.status !== 'loading'
      && drawingState.pieces === pieces
      && drawingState.retainedCorePieces === retainedCorePieces
      && drawingState.axis === axis
      && drawingState.planeOffsetMm === planeOffsetMm
      ? drawingState
      : { status: 'loading' },
  [axis, drawingState, pieces, planeOffsetMm, retainedCorePieces])

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
    if (!Number.isFinite(value)) return
    setOffsets((current) => ({
      ...current,
      [axis]: clamp(value, minimum, maximum),
    }))
  }

  const exportSvg = () => {
    if (currentDrawingState.status !== 'ready') return
    try {
      const filename = sectionSvgFilename(
        seed,
        modelScaleDenominator,
        axis,
        planeOffsetMm,
        paperScaleDenominator,
      )
      const svg = encodeSectionSvg(currentDrawingState.drawing, {
        title: `RAAKA PILOTI ${seed} · SECTION ${axis.toUpperCase()}=${format(planeOffsetMm, 1)} MM · PAPER 1:${paperScaleDenominator}`,
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
        `Exported ${filename}: ${currentDrawingState.drawing.paths.length} section paths · ${format(currentDrawingState.drawing.areaMm2, 1)} mm² cut area.`,
      )
    } catch (error) {
      onMessage(
        'error',
        `Section export failed: ${error instanceof Error ? error.message : 'Unknown SVG error.'}`,
      )
    }
  }

  const drawing = currentDrawingState.status === 'ready' ? currentDrawingState.drawing : undefined
  const hasSection = (drawing?.paths.length ?? 0) > 0
  const horizontalAxis = axis === 'x' ? 'Y' : 'X'

  return (
    <div className="section-workspace">
      <header className="section-toolbar">
        <div className="section-title">
          <span>DRAWING 01</span>
          <strong>SECTION {axis.toUpperCase()}–{axis.toUpperCase()}</strong>
          <small>HORIZONTAL {horizontalAxis} · VERTICAL Z · FINISHED SOLID</small>
        </div>
        <div className="section-axis-switch" aria-label="Section plane axis">
          {(['x', 'y'] as const).map((choice) => (
            <button
              type="button"
              key={choice}
              className={axis === choice ? 'is-active' : ''}
              aria-pressed={axis === choice}
              onClick={() => setAxis(choice)}
            >
              {choice.toUpperCase()} PLANE
            </button>
          ))}
        </div>
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
          disabled={currentDrawingState.status !== 'ready' || !hasSection}
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
            aria-label={`Section ${axis.toUpperCase()} at ${format(planeOffsetMm, 1)} millimetres`}
            viewBox={preview.viewBox}
            preserveAspectRatio="xMidYMid meet"
          >
            <g className="section-preview-lines">
              {preview.paths.map((path) => (
                <path key={path.id} d={previewPath(path.points)} />
              ))}
            </g>
          </svg>
        ) : (
          <div className={`section-state ${currentDrawingState.status === 'error' ? 'is-error' : ''}`}>
            <strong>
              {currentDrawingState.status === 'loading'
                ? 'BUILDING SECTION…'
                : currentDrawingState.status === 'error'
                  ? 'SECTION UNAVAILABLE'
                  : 'NO INTERSECTION'}
            </strong>
            <span>
              {currentDrawingState.status === 'error'
                ? currentDrawingState.message
                : currentDrawingState.status === 'ready'
                  ? `The ${axis.toUpperCase()}=${format(planeOffsetMm, 1)} mm plane does not cross the finished solid.`
                  : 'Resolving union and retained-core subtraction.'}
            </span>
          </div>
        )}
        <div className="section-sheet-meta">
          <span>PLANE {axis.toUpperCase()}={format(planeOffsetMm, 1)} MM</span>
          <span>MODEL 1:{modelScaleDenominator}</span>
          <span>PAPER 1:{paperScaleDenominator}</span>
          <span>{drawing ? `${drawing.paths.length} PATHS · ${format(drawing.areaMm2, 1)} MM²` : 'MEASURING'}</span>
        </div>
      </div>
    </div>
  )
}
