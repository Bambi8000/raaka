export type RecipeId =
  | 'monolith'
  | 'piloti'
  | 'silos'
  | 'ziggurat'
  | 'lamella-tower'
  | 'gate'

export type PieceRole = 'mass' | 'support' | 'surface' | 'core' | 'void'

export type Vec3 = readonly [x: number, y: number, z: number]
export type Size2 = readonly [width: number, depth: number]
export type ModelScale = 1 | 0.5 | 0.25
export type PilotiShoulderMode = 'divided' | 'shared'

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

export type ScenePiece = BoxPiece | FrustumPiece

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

export interface PilotiParameters {
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
  readonly upperOffsetXMm: number
  readonly upperOffsetYMm: number
  readonly asymmetry: number
  readonly footOffsetXMm: number
  readonly footOffsetYMm: number
  readonly footOffsetOverrides: readonly PilotiFootOffsetOverride[]
  readonly supportSizeOverrides: readonly PilotiSupportSizeOverride[]
  readonly supportPositionOverrides: readonly PilotiSupportPositionOverride[]
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
  readonly estimatedMassKg: number
  readonly groundContactMm2: number
  readonly supportLayout?: SupportLayoutAnalysis
}

export interface RecipeSummary {
  readonly id: RecipeId
  readonly name: string
  readonly description: string
  readonly available: boolean
}
