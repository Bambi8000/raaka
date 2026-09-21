import { boundsSize, sceneBounds } from './bounds'
import { scenePieceGroundContact, scenePieceVolume } from './pieceMetrics'
import { fuseScenePieces } from './solidKernel'
import { analyseStability } from './stability'
import type {
  MassStudy,
  MeshPiece,
  PieceRole,
  PilotiFuseGroup,
  ScenePiece,
} from './types'

export interface StudyFuseResolution {
  readonly study: MassStudy
  readonly dormantFuseGroupIds: readonly string[]
}

export class FuseResolutionError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'FuseResolutionError'
  }
}

function fusedRole(pieces: readonly ScenePiece[]): PieceRole {
  if (pieces.some((piece) => piece.role === 'mass')) return 'mass'
  if (pieces.some((piece) => piece.role === 'support')) return 'support'
  return pieces[0].role
}

function fuseNumber(groupId: string): string {
  return groupId.slice('fuse-'.length)
}

export async function resolveStudyFuses(
  study: MassStudy,
  groups: readonly PilotiFuseGroup[],
): Promise<StudyFuseResolution> {
  if (groups.length === 0) {
    return { study, dormantFuseGroupIds: [] }
  }

  const piecesById = new Map(study.pieces.map((piece) => [piece.id, piece]))
  const dormantFuseGroupIds: string[] = []
  const activeGroups: {
    readonly group: PilotiFuseGroup
    readonly sourcePieces: readonly ScenePiece[]
    readonly insertionIndex: number
  }[] = []

  for (const group of groups) {
    const sourcePieces = group.pieceIds
      .map((pieceId) => piecesById.get(pieceId))
      .filter((piece): piece is ScenePiece => piece !== undefined)
    if (sourcePieces.length !== group.pieceIds.length) {
      dormantFuseGroupIds.push(group.id)
      continue
    }
    activeGroups.push({
      group,
      sourcePieces,
      insertionIndex: Math.min(
        ...sourcePieces.map((source) =>
          study.pieces.findIndex((piece) => piece.id === source.id),
        ),
      ),
    })
  }

  if (activeGroups.length === 0) {
    return { study, dormantFuseGroupIds }
  }

  const fusedPieces = new Map<string, MeshPiece>()
  for (const { group, sourcePieces } of activeGroups) {
    const solid = await fuseScenePieces(sourcePieces)
    if (solid.componentCount !== 1) {
      throw new FuseResolutionError(
        `Fuse ${fuseNumber(group.id)} is paused: its source pieces no longer touch or overlap.`,
      )
    }
    fusedPieces.set(group.id, {
      kind: 'mesh',
      id: group.id,
      label: `Fuse ${fuseNumber(group.id)} · ${sourcePieces.length} parts`,
      role: fusedRole(sourcePieces),
      position: [0, 0, 0],
      positions: solid.positions,
      triangles: solid.triangles,
      volumeMm3: solid.volumeMm3,
      groundContactMm2: solid.groundContactMm2,
      sourcePieceIds: [...group.pieceIds],
    })
  }

  const sourceIds = new Set(
    activeGroups.flatMap(({ group }) => [...group.pieceIds]),
  )
  const groupsByInsertionIndex = new Map(
    activeGroups.map(({ group, insertionIndex }) => [insertionIndex, group]),
  )
  const pieces: ScenePiece[] = []
  for (let index = 0; index < study.pieces.length; index += 1) {
    const group = groupsByInsertionIndex.get(index)
    if (group) {
      const fusedPiece = fusedPieces.get(group.id)
      if (fusedPiece) pieces.push(fusedPiece)
    }
    const piece = study.pieces[index]
    if (!sourceIds.has(piece.id)) pieces.push(piece)
  }

  const bounds = sceneBounds(pieces)
  const [widthMm, depthMm, heightMm] = boundsSize(bounds)
  const solidVolumeMm3 = pieces.reduce(
    (sum, piece) => sum + scenePieceVolume(piece),
    0,
  )
  const concreteVolumeMm3 = Math.max(
    0,
    solidVolumeMm3 - study.retainedCore.volumeMm3,
  )
  const concreteMassKg =
    (concreteVolumeMm3 / 1_000_000_000) * study.concreteDensityKgM3
  const groundContactMm2 = pieces.reduce(
    (sum, piece) => sum + scenePieceGroundContact(piece),
    0,
  )

  return {
    study: {
      ...study,
      pieces,
      bounds,
      widthMm,
      depthMm,
      heightMm,
      concreteVolumeMm3,
      concreteMassKg,
      estimatedMassKg: concreteMassKg + study.retainedCore.massKg,
      groundContactMm2,
      stability: analyseStability(
        pieces,
        study.concreteDensityKgM3,
        study.retainedCore,
      ),
    },
    dormantFuseGroupIds,
  }
}
