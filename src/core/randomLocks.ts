import { massPartAddress } from './massDivision'
import { isPilotiSupportId } from './pilotiParameters'
import { featureRandom } from './random'
import type { PilotiParameters } from './types'

function lockTargetForSource(sourceId: string): string | undefined {
  if (sourceId === 'upper-mass' || massPartAddress(sourceId)) {
    return 'upper-mass'
  }
  const supportId = sourceId.startsWith('shoulder-')
    ? `support-${sourceId.slice('shoulder-'.length)}`
    : sourceId
  return isPilotiSupportId(supportId) ? supportId : undefined
}

/** Map rendered pieces and live copies back to their seeded semantic source. */
export function randomLockTargetForPiece(
  parameters: PilotiParameters,
  pieceId: string,
): string | undefined {
  if (pieceId === 'upper-retained-core') return 'upper-mass'
  const copyId = /^copy-\d+$/.test(pieceId)
    ? pieceId
    : /^(?:upper-mass|support|shoulder)-(copy-\d+)$/.exec(pieceId)?.[1]
  const sourceId = copyId
    ? parameters.partCopies.find((copy) => copy.id === copyId)?.sourceId
    : pieceId
  return sourceId ? lockTargetForSource(sourceId) : undefined
}

export function randomSeedForTarget(
  parameters: PilotiParameters,
  targetId: string,
): number {
  return parameters.randomLocks.find((lock) => lock.targetId === targetId)?.seed ??
    parameters.seed
}

export function toggleRandomLockForTarget(
  parameters: PilotiParameters,
  targetId: string,
): PilotiParameters['randomLocks'] {
  const existing = parameters.randomLocks.find(
    (lock) => lock.targetId === targetId,
  )
  if (existing) {
    return parameters.randomLocks.filter((lock) => lock.targetId !== targetId)
  }
  return [
    ...parameters.randomLocks,
    { targetId, seed: parameters.seed },
  ].sort((left, right) => left.targetId.localeCompare(right.targetId))
}

export function featureRandomForTarget(
  parameters: PilotiParameters,
  targetId: string,
  featureId: string,
): () => number {
  return featureRandom(randomSeedForTarget(parameters, targetId), featureId)
}
