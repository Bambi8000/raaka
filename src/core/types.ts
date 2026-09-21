export type RecipeId =
  | 'monolith'
  | 'piloti'
  | 'silos'
  | 'ziggurat'
  | 'lamella-tower'
  | 'gate'

export type PieceRole = 'mass' | 'support' | 'surface' | 'core' | 'void'

export type Vec3 = readonly [x: number, y: number, z: number]
export type Vec2 = readonly [x: number, y: number]
export type PilotiPlanShape = 'rectangle' | 'hexagon' | 'octagon'
export type PilotiFootOffsetSpace = 'global' | 'centered'
export type Size2 = readonly [width: number, depth: number]
export type ModelScale = 1 | 0.5 | 0.25
export type PilotiShoulderMode = 'divided' | 'shared'
export type PilotiUpperMassProfile = 'block' | 'tapered'
export type PilotiUpperMassDivision = 'whole' | 'x2' | 'y2' | 'xy4'
export type PilotiUpperFootprintMode = 'linked' | 'detached'
export type PilotiRetainedCoreMode = 'none' | 'upper-mass'

export interface Bounds3 {
  readonly min: Vec3
  readonly max: Vec3
}

export interface BoxPiece {
  readonly kind: 'box'
  readonly id: string
  readonly label: string
  readonly role: PieceRole
  readonly position: Vec3
  readonly size: Vec3
}

export interface FrustumPiece {
  readonly kind: 'frustum'
  readonly id: string
  readonly label: string
  readonly role: PieceRole
  readonly position: Vec3
  readonly height: number
  readonly bottomSize: Size2
  readonly topSize: Size2
  readonly bottomOffset: readonly [x: number, y: number]
  readonly topOffset: readonly [x: number, y: number]
}

export interface MeshPiece {
  readonly kind: 'mesh'
  readonly id: string
  readonly label: string
  readonly role: PieceRole
  readonly position: Vec3
  readonly positions: Float32Array
  readonly triangles: Uint32Array
  readonly volumeMm3: number
  readonly groundContactMm2: number
  readonly sourcePieceIds: readonly string[]
}

/** Convex CCW footprint; homothetic end faces keep every side planar. */
export interface PolygonLoftPiece {
  readonly kind: 'polygon-loft'
  readonly id: string
  readonly label: string
  readonly role: PieceRole
  readonly position: Vec3
  readonly height: number
  readonly footprint: readonly Vec2[]
  readonly bottomScale: number
  readonly topScale: number
  readonly bottomOffset: Vec2
  readonly topOffset: Vec2
}

export type ScenePiece = BoxPiece | FrustumPiece | PolygonLoftPiece | MeshPiece

export interface PilotiFootOffsetOverride {
  readonly supportId: string
  readonly footOffsetXMm: number
  readonly footOffsetYMm: number
}

export interface PilotiSupportSizeOverride {
  readonly supportId: string
  readonly widthScale: number
  readonly depthScale: number
}

export interface PilotiSupportPositionOverride {
  readonly supportId: string
  readonly positionXMm: number
  readonly positionYMm: number
}

export interface PilotiPartCopy {
  readonly id: string
  readonly sourceId: string
  readonly offsetXMm: number
  readonly offsetYMm: number
  readonly offsetZMm: number
}

export interface PilotiFuseGroup {
  readonly id: string
  readonly pieceIds: readonly string[]
}

export interface PilotiMassPartOverride {
  readonly partId: string
  readonly profile: PilotiUpperMassProfile
  readonly topWidthRatio: number
  readonly topDepthRatio: number
  readonly topOffsetXMm: number
  readonly topOffsetYMm: number
}

export interface PilotiParameters {
  readonly planShape: PilotiPlanShape
  readonly polygonMassDivision: 'whole' | 'sectors'
  readonly radialSpreadRatio: number
  readonly seed: number
  readonly heightMm: number
  readonly supportCount: number
  readonly supportRowCount: number
  readonly rowSpacingMm: number
  readonly supportDepthRatio: number
  readonly supportHeightRatio: number
  readonly shoulderRatio: number
  readonly shoulderMode: PilotiShoulderMode
  readonly neckWidthRatio: number
  readonly upperWidthRatio: number
  readonly upperDepthRatio: number
  readonly upperFootprintMode: PilotiUpperFootprintMode
  readonly upperOffsetXMm: number
  readonly upperOffsetYMm: number
  readonly upperMassProfile: PilotiUpperMassProfile
  readonly upperMassDivision: PilotiUpperMassDivision
  readonly massPartOverrides: readonly PilotiMassPartOverride[]
  readonly retainedCoreMode: PilotiRetainedCoreMode
  readonly retainedCoreScale: number
  readonly upperTopWidthRatio: number
  readonly upperTopDepthRatio: number
  readonly upperTopOffsetXMm: number
  readonly upperTopOffsetYMm: number
  readonly asymmetry: number
  readonly footOffsetXMm: number
  readonly footOffsetYMm: number
  readonly footOffsetOverrides: readonly PilotiFootOffsetOverride[]
  readonly footOffsetSpace: PilotiFootOffsetSpace
  readonly supportSizeOverrides: readonly PilotiSupportSizeOverride[]
  readonly supportPositionOverrides: readonly PilotiSupportPositionOverride[]
  readonly partCopies: readonly PilotiPartCopy[]
  readonly fuseGroups: readonly PilotiFuseGroup[]
  readonly removedPartIds: readonly string[]
}

export interface SupportLayoutAnalysis {
  readonly columns: number
  readonly rows: number
  readonly totalSupports: number
  readonly rowSpacingMm: number
  readonly shoulderDepthMm: number
  readonly adjacentRowOverlapMm: number
  readonly adjacentColumnOverlapMm: number
  readonly adjacentColumnGapMm: number
  readonly nonAdjacentBearingOverlapMm: number
  readonly bearingOverhangMm: number
  readonly sideBearingOverhangMm: number
}

export interface MassStudy {
  readonly recipe: RecipeId
  readonly seed: number
  readonly pieces: readonly ScenePiece[]
  readonly bounds: Bounds3
  readonly widthMm: number
  readonly depthMm: number
  readonly heightMm: number
  readonly concreteVolumeMm3: number
  readonly concreteMassKg: number
  readonly retainedCore: {
    readonly status: 'off' | 'active' | 'paused'
    readonly pieces: readonly ScenePiece[]
    readonly volumeMm3: number
    readonly massKg: number
    readonly densityKgM3: number
    readonly minimumCoverMm: number
    readonly message: string
  }
  readonly estimatedMassKg: number
  readonly groundContactMm2: number
  readonly supportLayout?: SupportLayoutAnalysis
  readonly radialLayout?: {
    readonly sides: 6 | 8
    readonly totalSupports: number
    readonly bearingOverhangMm: number
    readonly shoulderOverlapMm2: number
  }
}

export interface RecipeSummary {
  readonly id: RecipeId
  readonly name: string
  readonly description: string
  readonly available: boolean
}
