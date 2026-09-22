import {
  sectionScenePiecesAtPlane,
  type SolidKernelSection,
} from './solidKernel'
import type { ScenePiece, Vec2 } from './types'

export const DRAWING_PATH_SET_FORMAT = 'raaka.path-set'
export const DRAWING_PATH_SET_VERSION = 1

export type SectionDrawingAxis = 'x' | 'y'
export type DrawingRole = 'section'

export interface DrawingBounds2 {
  readonly min: Vec2
  readonly max: Vec2
}

export interface DrawingPath {
  readonly id: string
  readonly role: DrawingRole
  readonly closed: boolean
  readonly points: readonly Vec2[]
}

/** Full physical millimetres; paper scaling is an export concern. */
export interface DrawingPathSet {
  readonly format: typeof DRAWING_PATH_SET_FORMAT
  readonly formatVersion: typeof DRAWING_PATH_SET_VERSION
  readonly units: 'mm'
  readonly coordinateSystem: 'cartesian'
  readonly view: {
    readonly kind: 'section'
    readonly planeAxis: SectionDrawingAxis
    readonly planeOffsetMm: number
    readonly horizontalAxis: 'x' | 'y'
    readonly verticalAxis: 'z'
  }
  readonly bounds: DrawingBounds2
  readonly areaMm2: number
  readonly paths: readonly DrawingPath[]
}

export interface SectionSvgOptions {
  readonly title: string
  readonly paperScaleDenominator: number
  readonly marginMm?: number
  readonly strokeWidthMm?: number
}

export class SectionDrawingError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'SectionDrawingError'
  }
}

function drawingBounds(paths: readonly DrawingPath[]): DrawingBounds2 {
  const points = paths.flatMap((path) => path.points)
  if (points.length === 0) return { min: [0, 0], max: [0, 0] }
  return {
    min: [
      Math.min(...points.map(([x]) => x)),
      Math.min(...points.map(([, y]) => y)),
    ],
    max: [
      Math.max(...points.map(([x]) => x)),
      Math.max(...points.map(([, y]) => y)),
    ],
  }
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value
}

export function sectionPathSet(
  section: SolidKernelSection,
  planeAxis: SectionDrawingAxis,
  planeOffsetMm: number,
): DrawingPathSet {
  if (!Number.isFinite(planeOffsetMm)) {
    throw new SectionDrawingError('Section plane offset must be finite.')
  }
  const paths = section.polygons
    .filter((polygon) => polygon.length >= 3)
    .map((polygon, index): DrawingPath => ({
      id: `section-${index + 1}`,
      role: 'section',
      closed: true,
      points: polygon.map(([x, y]) => [normalizeZero(x), normalizeZero(y)]),
    }))
  return {
    format: DRAWING_PATH_SET_FORMAT,
    formatVersion: DRAWING_PATH_SET_VERSION,
    units: 'mm',
    coordinateSystem: 'cartesian',
    view: {
      kind: 'section',
      planeAxis,
      planeOffsetMm,
      horizontalAxis: planeAxis === 'x' ? 'y' : 'x',
      verticalAxis: 'z',
    },
    bounds: drawingBounds(paths),
    areaMm2: section.areaMm2,
    paths,
  }
}

export async function createSectionPathSet(
  pieces: readonly ScenePiece[],
  retainedCorePieces: readonly ScenePiece[],
  planeAxis: SectionDrawingAxis,
  planeOffsetMm: number,
): Promise<DrawingPathSet> {
  if (pieces.length === 0) {
    throw new SectionDrawingError(
      'Section drawing needs at least one visible part. Restore a part and try again.',
    )
  }
  const section = await sectionScenePiecesAtPlane(
    pieces,
    { axis: planeAxis, offsetMm: planeOffsetMm },
    retainedCorePieces,
  )
  return sectionPathSet(section, planeAxis, planeOffsetMm)
}

function finitePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new SectionDrawingError(`${label} must be a positive finite number.`)
  }
  return value
}

function coordinate(value: number): string {
  const rounded = Math.abs(value) < 5e-7 ? 0 : value
  return Number(rounded.toFixed(3)).toString()
}

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/** Serialize one line-only, tightly bounded paper-scaled SVG drawing. */
export function encodeSectionSvg(
  pathSet: DrawingPathSet,
  options: SectionSvgOptions,
): string {
  if (pathSet.paths.length === 0) {
    throw new SectionDrawingError(
      'SVG export stopped: the section plane does not intersect the finished solid.',
    )
  }
  const denominator = finitePositive(
    options.paperScaleDenominator,
    'Paper scale denominator',
  )
  const marginMm = finitePositive(options.marginMm ?? 10, 'Paper margin')
  const strokeWidthMm = finitePositive(
    options.strokeWidthMm ?? 0.35,
    'Stroke width',
  )
  const modelMargin = marginMm * denominator
  const modelWidth = pathSet.bounds.max[0] - pathSet.bounds.min[0]
  const modelHeight = pathSet.bounds.max[1] - pathSet.bounds.min[1]
  const viewWidth = modelWidth + modelMargin * 2
  const viewHeight = modelHeight + modelMargin * 2
  const paperWidth = viewWidth / denominator
  const paperHeight = viewHeight / denominator
  const viewMinX = pathSet.bounds.min[0] - modelMargin
  const viewMinY = -pathSet.bounds.max[1] - modelMargin
  const strokeWidth = strokeWidthMm * denominator
  const pathMarkup = pathSet.paths.map((path) => {
    const [first, ...rest] = path.points
    const commands = [
      `M ${coordinate(first[0])} ${coordinate(-first[1])}`,
      ...rest.map(([x, y]) => `L ${coordinate(x)} ${coordinate(-y)}`),
      path.closed ? 'Z' : '',
    ].filter(Boolean).join(' ')
    return `    <path id="${xml(path.id)}" data-role="${path.role}" d="${commands}" />`
  }).join('\n')
  const axisLabel = `${pathSet.view.planeAxis.toUpperCase()}=${coordinate(pathSet.view.planeOffsetMm)}mm`

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${coordinate(paperWidth)}mm" height="${coordinate(paperHeight)}mm" viewBox="${coordinate(viewMinX)} ${coordinate(viewMinY)} ${coordinate(viewWidth)} ${coordinate(viewHeight)}" data-format="${DRAWING_PATH_SET_FORMAT}" data-format-version="${DRAWING_PATH_SET_VERSION}" data-units="mm" data-paper-scale="1:${coordinate(denominator)}">`,
    `  <title>${xml(options.title)}</title>`,
    `  <desc>RAAKA section ${axisLabel}; geometry is stored in physical millimetres.</desc>`,
    `  <g id="layer-section" data-layer="section" fill="none" stroke="#000000" stroke-width="${coordinate(strokeWidth)}" stroke-linecap="square" stroke-linejoin="miter">`,
    pathMarkup,
    '  </g>',
    '</svg>',
    '',
  ].join('\n')
}

export function sectionSvgFilename(
  seed: number,
  modelScaleDenominator: number,
  axis: SectionDrawingAxis,
  planeOffsetMm: number,
  paperScaleDenominator: number,
): string {
  const offset = Math.round(planeOffsetMm)
  const signedOffset = offset < 0 ? `minus-${Math.abs(offset)}` : `plus-${offset}`
  return `raaka-piloti-${String(seed).padStart(4, '0')}-model-1to${modelScaleDenominator}-section-${axis}-${signedOffset}mm-paper-1to${paperScaleDenominator}.svg`
}
