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
  if (massPart?.division === 'hex6' || massPart?.division === 'oct8') {
    return `${massPart.division === 'hex6' ? 'Hex' : 'Oct'} sector ${massPart.index}`
  }
  if (massPart) return `Mass ${massPart.division.toUpperCase()} · ${massPart.index}`
  if (partId === 'upper-mass') return 'Upper mass'
  if (partId.startsWith('copy-')) return `Copy ${partId.slice(5)}`
  const address = pilotiSupportAddress(partId)
  if (address?.planShape) return `${address.planShape === 'hexagon' ? 'Hex' : 'Oct'} leg ${address.column}`
  return address ? `Leg C${address.column} / R${address.row}` : partId
}

export function partInGrid(partId: string, parameters: PilotiParameters): boolean {
  const sourceId = parameters.partCopies.find(
    (copy) => copy.id === partId,
  )?.sourceId ?? partId
  if (sourceId === 'upper-mass') return true
  const massPart = massPartAddress(sourceId)
  if (massPart) {
    if (massPart.division === 'hex6' || massPart.division === 'oct8') {
      return parameters.polygonMassDivision === 'sectors' &&
        parameters.planShape === (massPart.division === 'hex6' ? 'hexagon' : 'octagon')
    }
    return parameters.planShape === 'rectangle' && massPart.division === parameters.upperMassDivision
  }
  const address = pilotiSupportAddress(sourceId)
  if (address?.planShape) return address.planShape === parameters.planShape
  return (
    parameters.planShape === 'rectangle' &&
    address !== undefined &&
    address.column <= parameters.supportCount &&
    address.row <= parameters.supportRowCount
  )
}
