import type { PilotiParameters } from './types'

export const UPPER_SILHOUETTE_RATIOS = { narrow: 0.72, wide: 1.25 } as const
export type UpperSilhouettePreset = keyof typeof UPPER_SILHOUETTE_RATIOS | 'center'

/** Change the shared top in one history step; never reset placement or local edits. */
export function applyUpperSilhouettePreset(
  parameters: PilotiParameters,
  preset: UpperSilhouettePreset,
): PilotiParameters {
  const patch: Partial<PilotiParameters> = {
    upperTopOffsetXMm: 0,
    upperTopOffsetYMm: 0,
    ...(preset === 'center' ? {} : {
      upperMassProfile: 'tapered',
      upperTopWidthRatio: UPPER_SILHOUETTE_RATIOS[preset],
      upperTopDepthRatio: UPPER_SILHOUETTE_RATIOS[preset],
    }),
  }
  if (Object.entries(patch).every(([key, value]) => parameters[key as keyof PilotiParameters] === value)) {
    return parameters
  }
  return { ...parameters, ...patch }
}
