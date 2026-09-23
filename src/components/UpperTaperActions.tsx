import { UPPER_SILHOUETTE_RATIOS, type UpperSilhouettePreset } from '../core/upperSilhouette'
import type { PilotiParameters } from '../core/types'

interface UpperTaperActionsProps {
  readonly parameters: PilotiParameters
  readonly onApply: (preset: UpperSilhouettePreset) => void
}

const SHAPES = [
  { preset: 'narrow', label: 'Narrow top', points: '25.6,10 54.4,10 60,44 20,44' },
  { preset: 'wide', label: 'Water tower', points: '15,10 65,10 60,44 20,44' },
] as const

function signedOffset(value: number): string {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0'
}

export function UpperTaperActions({ parameters, onApply }: UpperTaperActionsProps) {
  const centered = parameters.upperTopOffsetXMm === 0 && parameters.upperTopOffsetYMm === 0
  const radial = parameters.planShape !== 'rectangle'
  return <div className="upper-taper-actions">
    <div className="upper-taper-presets" role="group" aria-label="Centered upper silhouettes">
      {SHAPES.map(({ preset, label, points }) => {
        const ratio = UPPER_SILHOUETTE_RATIOS[preset]
        const active = parameters.upperMassProfile === 'tapered' && centered
          && parameters.upperTopWidthRatio === ratio
          && (radial || parameters.upperTopDepthRatio === ratio)
        return <button type="button" key={preset} aria-label={label}
          aria-pressed={active} onClick={() => onApply(preset)}>
          <svg className="upper-taper-icon" viewBox="0 0 80 54" aria-hidden="true">
            <polygon points={points} />
            <path className="upper-taper-axis" d="M40 3V50" />
            <path className="upper-taper-base" d="M12 44H68" />
          </svg>
          <strong>{label}</strong>
          <small>{ratio * 100}% · centered</small>
        </button>
      })}
    </div>
    <div className="upper-taper-centering">
      <span role="status">{centered ? 'Centered over base'
        : `Top shifted X ${signedOffset(parameters.upperTopOffsetXMm)} mm / Y ${signedOffset(parameters.upperTopOffsetYMm)} mm`}</span>
      <button type="button" className="subtle-button" disabled={centered}
        aria-description="Aligns the top with its base while keeping the current top size."
        onClick={() => onApply('center')}>Center top</button>
    </div>
    <p className="upper-taper-help">100% matches the base; above 100% widens upward. Base placement and legs stay unchanged. Independent part settings are kept; stacked level bases still follow the shared profile.</p>
  </div>
}
