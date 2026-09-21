/** Small deterministic generator shared by every recipe. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function randomBetween(
  random: () => number,
  minimum: number,
  maximum: number,
): number {
  return minimum + random() * (maximum - minimum)
}

function featureHash(featureId: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < featureId.length; index += 1) {
    hash ^= featureId.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function mixFeatureSeed(seed: number, featureId: string): number {
  let value = (seed >>> 0) ^ featureHash(featureId)
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d)
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b)
  return (value ^ (value >>> 16)) >>> 0
}

/** A named stream cannot move when unrelated streams are added or reordered. */
export function featureRandom(seed: number, featureId: string): () => number {
  return mulberry32(mixFeatureSeed(seed, featureId))
}
