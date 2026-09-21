import { composePiloti } from './composePiloti'
import { polygonFace, polygonIntersectionArea, polygonOverhang, regularPolygon } from './polygonLoft'
import { randomBetween } from './random'
import { featureRandomForTarget } from './randomLocks'
import { polygonSupportFamily } from './supportFamily'
import { divideUpperMassLevels, isUpperMassLevelDivision } from './upperMassLevels'
import type { MassStudy, PilotiParameters, PolygonLoftPiece, ScenePiece, Vec2 } from './types'

export function dividePolygonMass(parent: PolygonLoftPiece, parameters: PilotiParameters): readonly PolygonLoftPiece[] {
  if (parameters.polygonMassDivision === 'whole') return [parent]
  if (isUpperMassLevelDivision(parameters.polygonMassDivision)) {
    return divideUpperMassLevels(
      parent,
      parameters.planShape,
      parameters.polygonMassDivision,
      parameters.upperStepScaleRatio,
      [parameters.upperStepOffsetXMm, parameters.upperStepOffsetYMm],
      parameters.massPartOverrides,
    ) as readonly PolygonLoftPiece[]
  }
  const code = parameters.planShape === 'hexagon' ? 'hex6' : 'oct8'
  return parent.footprint.map((a, index) => {
    const b = parent.footprint[(index + 1) % parent.footprint.length]
    const centre: Vec2 = [(a[0] + b[0]) / 3, (a[1] + b[1]) / 3]
    const id = `upper-mass-${code}-${index + 1}`
    const override = parameters.massPartOverrides.find((entry) => entry.partId === id)
    const block = override?.profile === 'block'
    const topScale = override ? (block ? 1 : override.topWidthRatio) : parent.topScale
    return {
      ...parent, id, label: `${code === 'hex6' ? 'Hex' : 'Oct'} sector ${index + 1}`,
      // Keep untouched shared vertices in one parent frame, not independently
      // recentered cell frames. Both sides then quantize to identical endpoints.
      footprint: [[0, 0], a, b], topScale,
      topOffset: override ? (block ? [0, 0] : [
        override.topOffsetXMm + (1 - topScale) * centre[0],
        override.topOffsetYMm + (1 - topScale) * centre[1],
      ]) : parent.topOffset,
    }
  })
}

/** One faceted stem/shoulder pair per polygon side; no renderer or kernel state. */
export function generateRadialPiloti(parameters: PilotiParameters): MassStudy {
  const sides = parameters.planShape === 'hexagon' ? 6 : 8
  const code = sides === 6 ? 'hex' : 'oct'
  const label = sides === 6 ? 'Hex' : 'Oct'
  const radius = parameters.heightMm * parameters.upperWidthRatio / 2
  const ringRadius = radius * parameters.radialSpreadRatio
  const linked = parameters.upperFootprintMode === 'linked'
  const massRadius = linked ? ringRadius : radius
  const upperRandom = featureRandomForTarget(
    parameters,
    'upper-mass',
    `piloti/${code}/upper-mass`,
  )
  const centre: Vec2 = [parameters.upperOffsetXMm + randomBetween(upperRandom, -1, 1) * radius * parameters.asymmetry * 0.1, parameters.upperOffsetYMm]
  const supportHeight = parameters.heightMm * parameters.supportHeightRatio
  const shoulderHeight = supportHeight * parameters.shoulderRatio
  const stemHeight = supportHeight - shoulderHeight
  const upperHeight = parameters.heightMm - supportHeight
  const family = polygonSupportFamily(parameters)
  const tapered = parameters.upperMassProfile === 'tapered'
  const upperMass: PolygonLoftPiece = {
    kind: 'polygon-loft', id: 'upper-mass', label: `${label} upper mass`, role: 'mass',
    position: [centre[0], centre[1], supportHeight + upperHeight / 2], height: upperHeight,
    footprint: regularPolygon(sides, massRadius), bottomScale: 1, bottomOffset: [0, 0],
    topScale: tapered ? parameters.upperTopWidthRatio : 1,
    topOffset: tapered ? [parameters.upperTopOffsetXMm, parameters.upperTopOffsetYMm] : [0, 0],
  }
  const ring = regularPolygon(sides, ringRadius)
  const pieces: ScenePiece[] = []
  const bearings: (readonly Vec2[])[] = []
  ring.forEach((a, index) => {
    const b = ring[(index + 1) % sides]
    const supportId = `support-${code}-${index + 1}`
    const supportRandom = featureRandomForTarget(
      parameters,
      supportId,
      `piloti/${code}/${supportId}`,
    )
    const size = parameters.supportSizeOverrides.find((entry) => entry.supportId === supportId)
    const placement = parameters.supportPositionOverrides.find((entry) => entry.supportId === supportId)
    const lean = parameters.footOffsetOverrides.find((entry) => entry.supportId === supportId)
    const inner = 1 - parameters.supportDepthRatio
    const points: readonly Vec2[] = [[a[0] * inner, a[1] * inner], a, b, [b[0] * inner, b[1] * inner]]
    const bearingCentre: Vec2 = [(a[0] + b[0]) * (1 + inner) / 4, (a[1] + b[1]) * (1 + inner) / 4]
    const footprint: readonly Vec2[] = points.map(([x, y]) => [
      (x - bearingCentre[0]) * (size?.widthScale ?? 1),
      (y - bearingCentre[1]) * (size?.depthScale ?? 1),
    ])
    const jitter: Vec2 = [randomBetween(supportRandom, -1, 1) * ringRadius * parameters.asymmetry * 0.08,
      randomBetween(supportRandom, -1, 1) * ringRadius * parameters.asymmetry * 0.08]
    const x = bearingCentre[0] + jitter[0] + (placement?.positionXMm ?? 0)
    const y = bearingCentre[1] + jitter[1] + (placement?.positionYMm ?? 0)
    const offsetX = lean?.footOffsetXMm ?? parameters.footOffsetXMm
    const offsetY = lean?.footOffsetYMm ?? parameters.footOffsetYMm
    let bottomOffset: Vec2 = [offsetX, offsetY]
    if (parameters.footOffsetSpace === 'centered') {
      // Use the actual neck relative to the fixed ring centre, never the upper
      // mass or already-offset foot. At the centre, retain the source bay axis.
      const distance = Math.hypot(x, y)
      const bayDistance = Math.hypot(...bearingCentre)
      const ux = distance > 1e-9 ? x / distance : bearingCentre[0] / bayDistance
      const uy = distance > 1e-9 ? y / distance : bearingCentre[1] / bayDistance
      bottomOffset = [offsetX * ux - offsetY * uy, offsetX * uy + offsetY * ux]
    }
    const stem: PolygonLoftPiece = {
      kind: 'polygon-loft', id: supportId, label: `${label} support ${index + 1}`, role: 'support',
      position: [x, y, stemHeight / 2], height: stemHeight, footprint,
      bottomScale: family.footScale, topScale: family.neckScale,
      bottomOffset,
      topOffset: [0, 0],
    }
    const shoulder: PolygonLoftPiece = {
      ...stem, id: `shoulder-${code}-${index + 1}`, label: `${label} shoulder ${index + 1}`,
      position: [x, y, stemHeight + shoulderHeight / 2], height: shoulderHeight,
      bottomScale: family.neckScale, bottomOffset: [0, 0],
      topScale: family.bearingScale,
      topOffset: [(linked ? centre[0] : 0) - jitter[0], (linked ? centre[1] : 0) - jitter[1]],
    }
    pieces.push(stem, shoulder)
    if (!parameters.removedPartIds.includes(supportId)) bearings.push(polygonFace(shoulder, true))
  })
  pieces.push(...dividePolygonMass(upperMass, parameters))
  const boundary = polygonFace(upperMass, false)
  const overhang = parameters.removedPartIds.includes('upper-mass') ? 0 :
    Math.max(0, ...bearings.map((bearing) => polygonOverhang(bearing, boundary)))
  let overlap = 0
  bearings.forEach((bearing, index) => bearings.slice(index + 1).forEach((other) => {
    overlap = Math.max(overlap, polygonIntersectionArea(bearing, other))
  }))
  return { ...composePiloti(parameters, pieces, upperMass), radialLayout: {
    sides, totalSupports: bearings.length,
    bearingOverhangMm: overhang > 1e-7 ? overhang : 0,
    shoulderOverlapMm2: overlap > 1e-6 ? overlap : 0,
  } }
}
