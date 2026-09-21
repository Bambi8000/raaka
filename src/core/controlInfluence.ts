import { generatePiloti } from './generator'
import { PILOTI_PARAMETER_RULES } from './pilotiParameters'
import type { PilotiParameters, ScenePiece } from './types'

export type PilotiControlKey =
  | keyof typeof PILOTI_PARAMETER_RULES
  | 'upperFootprintMode'
  | 'upperMassProfile'
  | 'shoulderMode'

function geometryValues(piece: ScenePiece): readonly number[] {
  if (piece.kind === 'box') return [...piece.position, ...piece.size]
  if (piece.kind === 'frustum') {
    return [
      ...piece.position, piece.height, ...piece.bottomSize, ...piece.topSize,
      ...piece.bottomOffset, ...piece.topOffset,
    ]
  }
  return [...piece.position, ...piece.positions]
}

/** Inspect analytic sources, never run the solid kernel or mutate the study. */
export function affectedPilotiControls(
  parameters: PilotiParameters,
  selectedPieceId: string,
): ReadonlySet<PilotiControlKey> {
  const selectedIds = parameters.fuseGroups.find(
    (group) => group.id === selectedPieceId,
  )?.pieceIds ?? [selectedPieceId]
  const selectedSet = new Set(selectedIds)
  const current = generatePiloti(parameters).pieces.filter(
    (piece) => selectedSet.has(piece.id),
  )
  if (current.length === 0) return new Set()
  const baseline = new Map(current.map((piece) => [
    piece.id,
    { kind: piece.kind, values: geometryValues(piece) },
  ]))
  const affectsSelection = (candidate: PilotiParameters): boolean => {
    const pieces = generatePiloti(candidate).pieces.filter(
      (piece) => selectedSet.has(piece.id),
    )
    if (pieces.length !== current.length) return true
    return pieces.some((piece) => {
      const before = baseline.get(piece.id)
      if (!before || before.kind !== piece.kind) return true
      const after = geometryValues(piece)
      return after.length !== before.values.length ||
        after.some((value, index) => Math.abs(value - before.values[index]) > 1e-7)
    })
  }

  const affected = new Set<PilotiControlKey>()
  const numericKeys = Object.keys(PILOTI_PARAMETER_RULES) as
    (keyof typeof PILOTI_PARAMETER_RULES)[]
  for (const key of numericKeys) {
    const rule = PILOTI_PARAMETER_RULES[key]
    if ([rule.minimum, rule.maximum].some((value) =>
      value !== parameters[key] && affectsSelection({ ...parameters, [key]: value }),
    )) affected.add(key)
  }
  const choices = {
    shoulderMode: parameters.shoulderMode === 'shared' ? 'divided' : 'shared',
    upperFootprintMode: parameters.upperFootprintMode === 'linked' ? 'detached' : 'linked',
    upperMassProfile: parameters.upperMassProfile === 'block' ? 'tapered' : 'block',
  } as const
  for (const key of Object.keys(choices) as (keyof typeof choices)[]) {
    if (affectsSelection({ ...parameters, [key]: choices[key] })) affected.add(key)
  }
  return affected
}
