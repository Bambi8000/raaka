import { massPartAddress } from './massDivision'
import type { PilotiControlKey } from './controlInfluence'
import type { PilotiParameters, ScenePiece } from './types'

/** Keep relevant enabling choices reachable even when their current geometry is neutral. */
export function relevantPilotiControls(
  parameters: PilotiParameters,
  selectedPieceId: string,
  pieces: readonly ScenePiece[],
  affected: ReadonlySet<PilotiControlKey>,
): ReadonlySet<PilotiControlKey> {
  const relevant = new Set(affected)
  const ids = new Set(parameters.fuseGroups.find((group) => group.id === selectedPieceId)?.pieceIds ?? [selectedPieceId])
  for (const piece of pieces.filter((candidate) => ids.has(candidate.id))) {
    // Linkage can be neutral at the current grid/ring size, yet governs the next size edit.
    relevant.add('upperFootprintMode')
    if (piece.id.startsWith('support-') && parameters.planShape !== 'rectangle') {
      relevant.add('footOffsetSpace')
    }
    if (piece.role !== 'mass') continue
    const copyId = /^upper-mass-(copy-\d+)$/.exec(piece.id)?.[1]
    const sourceId = parameters.partCopies.find((copy) => copy.id === copyId)?.sourceId ?? piece.id
    const part = massPartAddress(sourceId)
    if (sourceId === 'upper-mass' || (part && !parameters.massPartOverrides.some((entry) => entry.partId === sourceId))) {
      relevant.add('upperMassProfile')
    }
  }
  return relevant
}
