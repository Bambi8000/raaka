import { boundsSize, sceneBounds } from './bounds'
import { partIdForPiece } from './partSelection'
import { massPartAddress } from './massDivision'
import { CONCRETE_DENSITY_KG_M3, scenePieceGroundContact, scenePieceVolume } from './pieceMetrics'
import { retainedCoreAnalysis } from './retainedCore'
import { analyseStability } from './stability'
import type { MassStudy, PilotiParameters, PilotiPartCopy, ScenePiece } from './types'

function copyPiece(piece: ScenePiece, id: string, label: string, copy: PilotiPartCopy): ScenePiece {
  return { ...piece, id, label, position: [
    piece.position[0] + copy.offsetXMm, piece.position[1] + copy.offsetYMm, piece.position[2] + copy.offsetZMm,
  ] }
}

/** Shared composition semantics for grid and radial Piloti layouts. */
export function composePiloti(parameters: PilotiParameters, base: readonly ScenePiece[], upperMass: ScenePiece): MassStudy {
  let pieces = [...base]
  const sources = new Map(base.map((piece) => [piece.id, piece]))
  sources.set('upper-mass', upperMass)
  for (const copy of parameters.partCopies) {
    const number = copy.id.slice('copy-'.length)
    if (copy.sourceId === 'upper-mass' || massPartAddress(copy.sourceId)) {
      const source = sources.get(copy.sourceId)
      if (source) pieces.push(copyPiece(source, `upper-mass-${copy.id}`, `${source.label} copy ${number}`, copy))
    } else {
      const stem = sources.get(copy.sourceId)
      const shoulder = sources.get(`shoulder-${copy.sourceId.slice('support-'.length)}`)
      if (stem && shoulder) pieces.push(
        copyPiece(stem, `support-${copy.id}`, `Support copy ${number}`, copy),
        copyPiece(shoulder, `shoulder-${copy.id}`, `Shoulder copy ${number}`, copy),
      )
    }
  }
  const removed = new Set(parameters.removedPartIds)
  // Resolve every source before omissions; copies survive removal of originals.
  pieces = pieces.filter((piece) => !removed.has(partIdForPiece(piece.id) ?? '') &&
    !(massPartAddress(piece.id) && removed.has('upper-mass')))
  const bounds = sceneBounds(pieces)
  const [widthMm, depthMm, heightMm] = boundsSize(bounds)
  const retainedCore = retainedCoreAnalysis(parameters, upperMass)
  const solidVolumeMm3 = pieces.reduce((sum, piece) => sum + scenePieceVolume(piece), 0)
  const concreteVolumeMm3 = Math.max(0, solidVolumeMm3 - retainedCore.volumeMm3)
  const concreteMassKg = concreteVolumeMm3 / 1e9 * CONCRETE_DENSITY_KG_M3
  return { recipe: 'piloti', seed: parameters.seed, pieces, bounds, widthMm, depthMm, heightMm,
    concreteVolumeMm3, concreteMassKg, retainedCore,
    estimatedMassKg: concreteMassKg + retainedCore.massKg,
    groundContactMm2: pieces.reduce((sum, piece) => sum + scenePieceGroundContact(piece), 0),
    stability: analyseStability(pieces, retainedCore) }
}
