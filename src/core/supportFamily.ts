import type { PilotiParameters, Size2 } from './types'

const LEGACY_FOOT_WIDTH_SCALE = 1.18
const LEGACY_FOOT_DEPTH_SCALE = 1.16
const LEGACY_DIVIDED_BEARING_SCALE = 0.92

type SupportFamilyParameters = Pick<
  PilotiParameters,
  | 'bearingScaleRatio'
  | 'footFlareRatio'
  | 'neckWidthRatio'
  | 'shoulderMode'
>

export interface RectangularSupportFamily {
  readonly footSize: Size2
  readonly neckSize: Size2
  readonly bearingSize: Size2
}

export interface PolygonSupportFamily {
  readonly footScale: number
  readonly neckScale: number
  readonly bearingScale: number
}

function topologyBearingScale(parameters: SupportFamilyParameters): number {
  return parameters.shoulderMode === 'shared'
    ? 1
    : LEGACY_DIVIDED_BEARING_SCALE
}

/** Shared four-station support profile for rectangular Piloti layouts. */
export function rectangularSupportFamily(
  parameters: SupportFamilyParameters,
  bayWidth: number,
  shoulderDepth: number,
  widthScale: number,
  depthScale: number,
): RectangularSupportFamily {
  const neckWidth = bayWidth * parameters.neckWidthRatio * widthScale
  const neckDepth =
    shoulderDepth *
    ((0.34 + parameters.neckWidthRatio * 0.32) / 0.92) *
    depthScale
  return {
    neckSize: [neckWidth, neckDepth],
    footSize: [
      neckWidth * LEGACY_FOOT_WIDTH_SCALE * parameters.footFlareRatio,
      neckDepth * LEGACY_FOOT_DEPTH_SCALE * parameters.footFlareRatio,
    ],
    bearingSize: [
      bayWidth * topologyBearingScale(parameters) * parameters.bearingScaleRatio * widthScale,
      shoulderDepth * parameters.bearingScaleRatio * depthScale,
    ],
  }
}

/** Homothetic counterpart used by faceted hexagonal and octagonal supports. */
export function polygonSupportFamily(
  parameters: SupportFamilyParameters,
): PolygonSupportFamily {
  return {
    neckScale: parameters.neckWidthRatio,
    footScale:
      parameters.neckWidthRatio *
      LEGACY_FOOT_WIDTH_SCALE *
      parameters.footFlareRatio,
    bearingScale:
      topologyBearingScale(parameters) * parameters.bearingScaleRatio,
  }
}
