import { isPilotiPartCopySourceId, pilotiSupportAddress } from './pilotiParameters'
import type { PilotiParameters } from './types'
import { massPartAddress } from './massDivision'

/** Stems and shoulders share one removable leg; copies keep their own identity. */
export function partIdForPiece(pieceId: string): string | undefined {
  const copyId = /^(?:upper-mass|support|shoulder)-(copy-\d+)$/.exec(pieceId)?.[1]
  if (copyId) return copyId
  const sourceId = pieceId.startsWith('shoulder-')
    ? `support-${pieceId.slice('shoulder-'.length)}`
    : pieceId
  return isPilotiPartCopySourceId(sourceId) ? sourceId : undefined
}

export function partLabel(partId: string): string {
  const massPart = massPartAddress(partId)
  if (massPart) return `Mass ${massPart.division.toUpperCase()} · ${massPart.index}`
  if (partId === 'upper-mass') return 'Upper mass'
  if (partId.startsWith('copy-')) return `Copy ${partId.slice(5)}`
  const address = pilotiSupportAddress(partId)
  return address ? `Leg C${address.column} / R${address.row}` : partId
}

export function partInGrid(partId: string, parameters: PilotiParameters): boolean {
  const sourceId = parameters.partCopies.find(
    (copy) => copy.id === partId,
  )?.sourceId ?? partId
  if (sourceId === 'upper-mass') return true
  const massPart = massPartAddress(sourceId)
  if (massPart) return massPart.division === parameters.upperMassDivision
  const address = pilotiSupportAddress(sourceId)
  return (
    address !== undefined &&
    address.column <= parameters.supportCount &&
    address.row <= parameters.supportRowCount
  )
}
