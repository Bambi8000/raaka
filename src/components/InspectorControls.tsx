import { createContext, useContext, type KeyboardEvent, type ReactNode } from 'react'

const ShowAllControls = createContext(true)

/** Filtering is workspace UI state, never geometry or project history. */
export function InspectorControls({ showAll, children }: { showAll: boolean; children: ReactNode }) {
  return <ShowAllControls value={showAll}>{children}</ShowAllControls>
}

export function ControlGroup({ visible, children }: { visible: boolean; children: ReactNode }) {
  return visible ? children : null
}

interface RangeFieldProps {
  readonly label: string
  readonly value: number
  readonly minimum: number
  readonly maximum: number
  readonly step: number
  readonly suffix?: string
  readonly affected: boolean
  readonly onChange: (value: number) => void
  readonly onInteractionStart: () => void
  readonly onInteractionEnd: () => void
}

const RANGE_KEYS = new Set([
  'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp',
])

export function RangeField({
  label, value, minimum, maximum, step, suffix = '', affected,
  onChange, onInteractionStart, onInteractionEnd,
}: RangeFieldProps) {
  const showAll = useContext(ShowAllControls)
  if (!showAll && !affected) return null
  const beginKeyboardGesture = (event: KeyboardEvent<HTMLInputElement>) => {
    if (RANGE_KEYS.has(event.key)) onInteractionStart()
  }
  const endKeyboardGesture = (event: KeyboardEvent<HTMLInputElement>) => {
    if (RANGE_KEYS.has(event.key)) onInteractionEnd()
  }
  return (
    <label className={`range-field ${affected ? 'affects-selection' : 'other-controls'}`}>
      <span className="field-heading">
        <span>
          {label}
          {affected ? <small className="field-impact" aria-hidden="true">SELECTED</small> : null}
        </span>
        <output>{Number.isInteger(step) ? value.toFixed(0) : value.toFixed(2)}{suffix}</output>
      </span>
      <input type="range" aria-label={label}
        aria-description={affected
          ? 'Affects the selected part or its live Fuse sources.'
          : 'Does not affect the selected part in the current study.'}
        min={minimum} max={maximum} step={step} value={value}
        onPointerDown={onInteractionStart} onPointerUp={onInteractionEnd}
        onPointerCancel={onInteractionEnd} onKeyDown={beginKeyboardGesture}
        onKeyUp={endKeyboardGesture} onBlur={onInteractionEnd}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)} />
    </label>
  )
}
