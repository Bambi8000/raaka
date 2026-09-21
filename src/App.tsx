import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { Viewport } from './components/Viewport'
import { ObjectList } from './components/ObjectList'
import { ControlGroup, InspectorControls, RangeField } from './components/InspectorControls'
import {
  DEFAULT_PILOTI_PARAMETERS,
  generatePiloti,
  MAX_SEED,
  RECIPES,
} from './core/generator'
import {
  createHistory,
  reduceHistory,
  type HistoryAction,
  type HistoryState,
} from './core/history'
import { MODEL_SCALE_PRESETS, scaleMassStudy } from './core/modelScale'
import { partIdForPiece, partInGrid, partLabel } from './core/partSelection'
import { affectedPilotiControls, type PilotiControlKey } from './core/controlInfluence'
import { relevantPilotiControls } from './core/inspectorControls'
import {
  applyTranslationGizmoValue,
  translationGizmoTarget,
  type TranslationGizmoTarget,
} from './core/translationGizmo'
import { MASS_DIVISIONS, MASS_PART_RULES, massPartAddress, massPartProfile } from './core/massDivision'
import {
  PILOTI_FUSE_GROUP_LIMIT,
  PILOTI_PART_COPY_LIMIT,
  PILOTI_PART_COPY_OFFSET_MM,
  pilotiSupportAddress,
} from './core/pilotiParameters'
import {
  createProject,
  parseProject,
  readRecovery,
  serializeProject,
  writeRecovery,
} from './core/project'
import { fuseScenePieces } from './core/solidKernel'
import { resolveStudyFuses } from './core/studyFuses'
import { readUiTheme, writeUiTheme } from './core/uiTheme'
import type {
  MassStudy,
  ModelScale,
  PilotiFootOffsetOverride,
  PilotiFuseGroup,
  PilotiParameters,
  PilotiPartCopy,
  PilotiMassPartOverride,
  PilotiSupportPositionOverride,
  PilotiSupportSizeOverride,
} from './core/types'

interface Notice {
  readonly kind: 'info' | 'error'
  readonly text: string
}

type ProjectOrigin = 'DEFAULT' | 'RECOVERED' | 'SAVED'
type SupportEditScope = 'shared' | 'selected'

interface PilotiStudyState {
  readonly parameters: PilotiParameters
  readonly modelScale: ModelScale
}

interface InitialSession {
  readonly study: PilotiStudyState
  readonly origin: ProjectOrigin
  readonly baseline: string
  readonly notice?: Notice
}

type FuseRenderState =
  | {
      readonly sourceStudy: MassStudy
      readonly status: 'ready'
      readonly study: MassStudy
      readonly dormantFuseGroupIds: readonly string[]
    }
  | {
      readonly sourceStudy: MassStudy
      readonly status: 'error'
      readonly message: string
    }

const DEFAULT_STUDY: PilotiStudyState = {
  parameters: DEFAULT_PILOTI_PARAMETERS,
  modelScale: 1,
}

const DEFAULT_PROJECT_JSON = serializeProject(
  createProject(DEFAULT_STUDY.parameters, DEFAULT_STUDY.modelScale),
)

function pilotiHistoryReducer(
  state: HistoryState<PilotiStudyState>,
  action: HistoryAction<PilotiStudyState>,
): HistoryState<PilotiStudyState> {
  return reduceHistory(state, action)
}

function loadInitialSession(): InitialSession {
  const recovery = readRecovery(window.localStorage)
  if (recovery.status === 'recovered') {
    return {
      study: {
        parameters: recovery.project.parameters,
        modelScale: recovery.project.modelScale,
      },
      origin: 'RECOVERED',
      baseline: serializeProject(recovery.project),
      notice: { kind: 'info', text: 'Local recovery restored.' },
    }
  }
  if (recovery.status === 'invalid') {
    return {
      study: DEFAULT_STUDY,
      origin: 'DEFAULT',
      baseline: DEFAULT_PROJECT_JSON,
      notice: {
        kind: 'error',
        text: `Recovery ignored: ${recovery.message}`,
      },
    }
  }
  return {
    study: DEFAULT_STUDY,
    origin: 'DEFAULT',
    baseline: DEFAULT_PROJECT_JSON,
  }
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en', { maximumFractionDigits }).format(value)
}

function selectablePieceIds(parameters: PilotiParameters): readonly string[] {
  const pieces = generatePiloti(parameters).pieces
  const available = new Set(pieces.map((piece) => piece.id))
  const activeGroups = parameters.fuseGroups.filter((group) =>
    group.pieceIds.every((id) => available.has(id)),
  )
  const fusedIds = new Set(activeGroups.flatMap((group) => [...group.pieceIds]))
  return [
    ...activeGroups.map((group) => group.id),
    ...pieces.filter((piece) => !fusedIds.has(piece.id)).map((piece) => piece.id),
  ]
}

function partCopyIdForPiece(pieceId: string): string | undefined {
  return /^(?:upper-mass|support|shoulder)-(copy-\d+)$/.exec(pieceId)?.[1]
}

function preferredSelection(ids: readonly string[]): string {
  return ids.includes('upper-mass') ? 'upper-mass' :
    (ids.find((id) => massPartAddress(id)) ?? ids[0] ?? '')
}

function partCopyPieceId(copy: PilotiPartCopy): string {
  return copy.sourceId === 'upper-mass' || massPartAddress(copy.sourceId)
    ? `upper-mass-${copy.id}`
    : `support-${copy.id}`
}

function partCopyNumber(copyId: string): number {
  return Number(copyId.slice('copy-'.length))
}

function fuseNumber(fuseId: string): number {
  return Number(fuseId.slice('fuse-'.length))
}

function supportIdForPiece(pieceId: string): string | undefined {
  const supportId = pieceId.startsWith('shoulder-')
    ? `support-${pieceId.slice('shoulder-'.length)}`
    : pieceId
  return pilotiSupportAddress(supportId) ? supportId : undefined
}

function formatSupportId(supportId: string): string {
  const address = pilotiSupportAddress(supportId)
  if (address?.planShape) return `${address.planShape.toUpperCase()} · LEG ${address.column}`
  return address
    ? `ROW ${address.row} · COLUMN ${address.column}`
    : supportId.toUpperCase()
}

function compareSupportIds(
  left: { readonly supportId: string },
  right: { readonly supportId: string },
): number {
  const leftAddress = pilotiSupportAddress(left.supportId)
  const rightAddress = pilotiSupportAddress(right.supportId)
  if (!leftAddress || !rightAddress) return 0
  return (
    (leftAddress.planShape ?? '').localeCompare(rightAddress.planShape ?? '') ||
    leftAddress.row - rightAddress.row ||
    leftAddress.column - rightAddress.column
  )
}

export default function App() {
  const [initialSession] = useState(loadInitialSession)
  const [history, dispatch] = useReducer(
    pilotiHistoryReducer,
    initialSession.study,
    createHistory,
  )
  const [selectedPieceId, setSelectedPieceId] = useState(() => {
    const ids = selectablePieceIds(initialSession.study.parameters)
    return preferredSelection(ids)
  })
  const [supportEditScope, setSupportEditScope] =
    useState<SupportEditScope>('shared')
  const [showAllControls, setShowAllControls] = useState(false)
  const [baselineJson, setBaselineJson] = useState(initialSession.baseline)
  const [projectOrigin, setProjectOrigin] = useState<ProjectOrigin>(
    initialSession.origin,
  )
  const [notice, setNotice] = useState<Notice | undefined>(
    initialSession.notice,
  )
  const [uiTheme, setUiTheme] = useState(() =>
    readUiTheme(window.localStorage),
  )
  const [fuseSelectionPieceIds, setFuseSelectionPieceIds] = useState<
    readonly string[]
  >([])
  const [fuseActionPending, setFuseActionPending] = useState(false)
  const [fuseRenderState, setFuseRenderState] = useState<
    FuseRenderState | undefined
  >()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const gizmoGestureStartRef = useRef<PilotiStudyState | undefined>(undefined)
  const studyState = history.present
  const parameters = studyState.parameters
  const radial = parameters.planShape !== 'rectangle'
  const centeredFeet = radial && parameters.footOffsetSpace === 'centered'
  const polygonSides = parameters.planShape === 'hexagon' ? 6 : 8
  const activeDivision = radial ? parameters.polygonMassDivision : parameters.upperMassDivision
  const divisionChoices = radial ? [
    { value: 'whole' as const, label: 'WHOLE', description: 'ONE POLYGON' },
    { value: 'sectors' as const, label: `${polygonSides} SECTORS`, description: 'RADIAL DIVISION' },
  ] : MASS_DIVISIONS
  const modelScale = studyState.modelScale
  const modelScaleDenominator = Math.round(1 / modelScale)
  const project = useMemo(
    () => createProject(parameters, modelScale),
    [modelScale, parameters],
  )
  const projectJson = useMemo(() => serializeProject(project), [project])
  useEffect(() => {
    document.documentElement.dataset.theme = uiTheme
    writeUiTheme(window.localStorage, uiTheme)
  }, [uiTheme])
  const unfusedMasterStudy = useMemo(
    () => generatePiloti(parameters),
    [parameters],
  )
  useEffect(() => {
    if (parameters.fuseGroups.length === 0) {
      return undefined
    }
    let cancelled = false
    void resolveStudyFuses(unfusedMasterStudy, parameters.fuseGroups).then(
      (resolution) => {
        if (cancelled) return
        setFuseRenderState({
          sourceStudy: unfusedMasterStudy,
          status: 'ready',
          study: resolution.study,
          dormantFuseGroupIds: resolution.dormantFuseGroupIds,
        })
      },
      (error: unknown) => {
        if (cancelled) return
        setFuseRenderState({
          sourceStudy: unfusedMasterStudy,
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'The solid kernel could not resolve this Fuse.',
        })
      },
    )
    return () => {
      cancelled = true
    }
  }, [parameters.fuseGroups, unfusedMasterStudy])
  const currentFuseRenderState =
    fuseRenderState?.sourceStudy === unfusedMasterStudy
      ? fuseRenderState
      : undefined
  const fuseRenderStatus =
    parameters.fuseGroups.length === 0
      ? 'idle'
      : (currentFuseRenderState?.status ?? 'pending')
  const masterStudy =
    currentFuseRenderState?.status === 'ready'
      ? currentFuseRenderState.study
      : unfusedMasterStudy
  const study = useMemo(
    () => scaleMassStudy(masterStudy, modelScale),
    [masterStudy, modelScale],
  )
  const selectedSupportId = supportIdForPiece(selectedPieceId)
  const selectedFuseGroup = parameters.fuseGroups.find(
    (group) => group.id === selectedPieceId,
  )
  const selectedPartCopyId = partCopyIdForPiece(selectedPieceId)
  const selectedPartCopy = parameters.partCopies.find(
    (copy) => copy.id === selectedPartCopyId,
  )
  const massSourceId = selectedPartCopy?.sourceId ?? selectedPieceId
  const selectedMassPartId = massPartAddress(massSourceId) ? massSourceId : undefined
  const selectedRawPiece = unfusedMasterStudy.pieces.find((piece) => piece.id === selectedPieceId)
  const selectedMassOverride = parameters.massPartOverrides.find((entry) => entry.partId === selectedMassPartId)
  const activeMassProfile = selectedMassPartId && selectedRawPiece && selectedRawPiece.kind !== 'mesh'
    ? selectedMassOverride ?? massPartProfile(selectedRawPiece, selectedMassPartId)
    : undefined
  const selectedFootOffsetOverride = parameters.footOffsetOverrides.find(
    (override) => override.supportId === selectedSupportId,
  )
  const selectedSupportSizeOverride = parameters.supportSizeOverrides.find(
    (override) => override.supportId === selectedSupportId,
  )
  const selectedSupportPositionOverride =
    parameters.supportPositionOverrides.find(
      (override) => override.supportId === selectedSupportId,
    )
  const hasSelectedSupportOverride =
    selectedFootOffsetOverride !== undefined ||
    selectedSupportSizeOverride !== undefined ||
    selectedSupportPositionOverride !== undefined
  const activeSupportEditScope =
    supportEditScope === 'selected' && selectedSupportId !== undefined
      ? 'selected'
      : 'shared'
  const activeFootOffsetX =
    activeSupportEditScope === 'selected'
      ? (selectedFootOffsetOverride?.footOffsetXMm ?? parameters.footOffsetXMm)
      : parameters.footOffsetXMm
  const activeFootOffsetY =
    activeSupportEditScope === 'selected'
      ? (selectedFootOffsetOverride?.footOffsetYMm ?? parameters.footOffsetYMm)
      : parameters.footOffsetYMm
  const activeSupportWidthScale = selectedSupportSizeOverride?.widthScale ?? 1
  const activeSupportDepthScale = selectedSupportSizeOverride?.depthScale ?? 1
  const activeSupportPositionX =
    selectedSupportPositionOverride?.positionXMm ?? 0
  const activeSupportPositionY =
    selectedSupportPositionOverride?.positionYMm ?? 0
  const stemHeightMm =
    parameters.heightMm *
    parameters.supportHeightRatio *
    (1 - parameters.shoulderRatio)
  const footOffsetMm = Math.hypot(
    activeFootOffsetX,
    activeFootOffsetY,
  )
  const authoredLeanAngleDeg =
    (Math.atan2(footOffsetMm, stemHeightMm) * 180) / Math.PI
  const footDirectionDeg =
    footOffsetMm === 0
      ? undefined
      : ((Math.atan2(activeFootOffsetY, activeFootOffsetX) * 180) /
          Math.PI +
          360) %
        360
  const selectedPiece = study.pieces.find(
    (piece) => piece.id === selectedPieceId,
  )
  const translationGizmo = useMemo(
    () => translationGizmoTarget(parameters, selectedPieceId, study),
    [parameters, selectedPieceId, study],
  )
  const selectedPartId = selectedPiece ? partIdForPiece(selectedPieceId) : undefined
  const affectedControls = useMemo(
    () => affectedPilotiControls(parameters, selectedPieceId),
    [parameters, selectedPieceId],
  )
  const relevantControls = useMemo(
    () => relevantPilotiControls(parameters, selectedPieceId, unfusedMasterStudy.pieces, affectedControls),
    [parameters, selectedPieceId, unfusedMasterStudy.pieces, affectedControls],
  )
  const allControlsVisible = showAllControls || relevantControls.size === 0
  const canShowControls = (...keys: PilotiControlKey[]) =>
    allControlsVisible || keys.some((key) => relevantControls.has(key))
  const selectedStem = selectedSupportId !== undefined && selectedPieceId.startsWith('support-')
  const showFootReadout = allControlsVisible || (selectedStem &&
    (activeSupportEditScope === 'selected' || !hasSelectedSupportOverride)) ||
    affectedControls.has('footOffsetXMm') || affectedControls.has('footOffsetYMm')
  const showLegEditor = allControlsVisible || selectedSupportId !== undefined || showFootReadout
  const usedFusePieceIds = useMemo(
    () => new Set(parameters.fuseGroups.flatMap((group) => [...group.pieceIds])),
    [parameters.fuseGroups],
  )
  const validFuseSelectionPieceIds = fuseSelectionPieceIds.filter(
    (pieceId) =>
      !usedFusePieceIds.has(pieceId) &&
      unfusedMasterStudy.pieces.some((piece) => piece.id === pieceId),
  )
  const selectedPieceCanJoinFuse =
    selectedPieceId !== selectedFuseGroup?.id &&
    !usedFusePieceIds.has(selectedPieceId) &&
    unfusedMasterStudy.pieces.some((piece) => piece.id === selectedPieceId)
  const selectedPieceIsInFuseSet = validFuseSelectionPieceIds.includes(
    selectedPieceId,
  )
  const canCreateFuse =
    validFuseSelectionPieceIds.length >= 2 &&
    parameters.fuseGroups.length < PILOTI_FUSE_GROUP_LIMIT &&
    !fuseActionPending
  const separateCopyPieceCount = study.pieces.filter(
    (piece) => piece.kind !== 'mesh' && partCopyIdForPiece(piece.id) !== undefined,
  ).length
  const duplicateSourceId =
    selectedPartCopy?.sourceId ??
    (selectedPieceId === 'upper-mass' || massPartAddress(selectedPieceId) ? selectedPieceId : selectedSupportId)
  const canDuplicateSelectedPiece =
    selectedPiece !== undefined &&
    duplicateSourceId !== undefined &&
    parameters.partCopies.length < PILOTI_PART_COPY_LIMIT
  const projectStatus: ProjectOrigin | 'UNSAVED' =
    projectJson === baselineJson ? projectOrigin : 'UNSAVED'

  const persistRecovery = (nextStudy: PilotiStudyState) => {
    try {
      writeRecovery(
        window.localStorage,
        createProject(nextStudy.parameters, nextStudy.modelScale),
      )
      if (
        notice?.kind === 'error' &&
        notice.text.startsWith('Recovery ignored:')
      ) {
        setNotice({ kind: 'info', text: 'Local recovery repaired.' })
      }
    } catch {
      setNotice({
        kind: 'error',
        text: 'Local recovery could not be updated. Save a project file.',
      })
    }
  }

  const reconcileSelection = (nextParameters: PilotiParameters) => {
    const availableIds = selectablePieceIds(nextParameters)
    if (!availableIds.includes(selectedPieceId)) {
      const owningFuse = nextParameters.fuseGroups.find((group) =>
        availableIds.includes(group.id) && group.pieceIds.includes(selectedPieceId),
      )
      const upperMassFuse = nextParameters.fuseGroups.find((group) =>
        availableIds.includes(group.id) && group.pieceIds.includes('upper-mass'),
      )
      setSelectedPieceId(owningFuse?.id ?? upperMassFuse?.id ??
        preferredSelection(availableIds))
      setSupportEditScope('shared')
    }
  }

  const selectPiece = (pieceId: string) => {
    const owningFuse = parameters.fuseGroups.find((group) =>
      study.pieces.some((piece) => piece.id === group.id) && group.pieceIds.includes(pieceId),
    )
    const semanticPieceId = owningFuse?.id ?? pieceId
    setSelectedPieceId(semanticPieceId)
    if (supportIdForPiece(semanticPieceId) === undefined) {
      setSupportEditScope('shared')
    }
  }

  const replaceStudy = (nextStudy: PilotiStudyState) => {
    if (nextStudy === studyState) return
    persistRecovery(nextStudy)
    dispatch({ type: 'replace', value: nextStudy })
  }

  const update = <Key extends keyof PilotiParameters>(
    key: Key,
    value: PilotiParameters[Key],
  ) => {
    if (parameters[key] === value) return
    const nextParameters = { ...parameters, [key]: value }
    reconcileSelection(nextParameters)
    replaceStudy({ ...studyState, parameters: nextParameters })
  }

  const updateModelScale = (nextModelScale: ModelScale) => {
    if (nextModelScale === modelScale) return
    replaceStudy({ ...studyState, modelScale: nextModelScale })
  }

  const updateMassPart = (patch: Partial<Omit<PilotiMassPartOverride, 'partId'>>) => {
    if (!activeMassProfile) return
    update('massPartOverrides', [
      ...parameters.massPartOverrides.filter((entry) => entry.partId !== activeMassProfile.partId),
      { ...activeMassProfile, ...patch },
    ].sort((a, b) => a.partId.localeCompare(b.partId)))
  }

  const replacePartCopy = (nextCopy: PilotiPartCopy) => {
    replaceStudy({
      ...studyState,
      parameters: {
        ...parameters,
        partCopies: parameters.partCopies.map((copy) =>
          copy.id === nextCopy.id ? nextCopy : copy,
        ),
      },
    })
  }

  const updateSelectedPartCopyOffset = (
    axis: 'offsetXMm' | 'offsetYMm' | 'offsetZMm',
    value: number,
  ) => {
    if (!selectedPartCopy) return
    replacePartCopy({
      ...selectedPartCopy,
      [axis]: value,
    })
  }

  const duplicateSelectedPiece = () => {
    if (!duplicateSourceId || !canDuplicateSelectedPiece) return
    const nextNumber =
      Math.max(0, ...parameters.partCopies.map((copy) => partCopyNumber(copy.id))) +
      1
    const sourceOffsetX = selectedPartCopy?.offsetXMm ?? 0
    const sourceOffsetY = selectedPartCopy?.offsetYMm ?? 0
    const sourceOffsetZ = selectedPartCopy?.offsetZMm ?? 0
    const copy: PilotiPartCopy = {
      id: `copy-${nextNumber}`,
      sourceId: duplicateSourceId,
      offsetXMm: sourceOffsetX + 120,
      offsetYMm: sourceOffsetY + 120,
      offsetZMm: sourceOffsetZ,
    }
    replaceStudy({
      ...studyState,
      parameters: {
        ...parameters,
        partCopies: [...parameters.partCopies, copy],
      },
    })
    setSelectedPieceId(partCopyPieceId(copy))
    setSupportEditScope('shared')
    setNotice({
      kind: 'info',
      text: 'Part duplicated with a 120 mm X/Y nudge. Its source shape stays linked.',
    })
  }

  const removeSelectedPart = () => {
    if (!selectedPartId) return
    const nextParameters = {
      ...parameters,
      removedPartIds: [...parameters.removedPartIds, selectedPartId],
    }
    reconcileSelection(nextParameters)
    setFuseSelectionPieceIds((pieceIds) =>
      pieceIds.filter((pieceId) => partIdForPiece(pieceId) !== selectedPartId),
    )
    setSupportEditScope('shared')
    replaceStudy({ ...studyState, parameters: nextParameters })
    setNotice({
      kind: 'info',
      text: `${partLabel(selectedPartId)} removed. Other parts keep their positions. Undo or Restore is available.`,
    })
  }

  const restorePart = (partId: string) => {
    const nextParameters = {
      ...parameters,
      removedPartIds: parameters.removedPartIds.filter((id) => id !== partId),
    }
    replaceStudy({ ...studyState, parameters: nextParameters })
    const copy = parameters.partCopies.find((candidate) => candidate.id === partId)
    const pieceId = copy ? partCopyPieceId(copy) : partId
    const ids = selectablePieceIds(nextParameters)
    const owningFuse = nextParameters.fuseGroups.find((group) =>
      ids.includes(group.id) && group.pieceIds.includes(pieceId),
    )
    if (owningFuse || ids.includes(pieceId)) setSelectedPieceId(owningFuse?.id ?? pieceId)
    setNotice({
      kind: 'info',
      text: massPartAddress(partId) && nextParameters.removedPartIds.includes('upper-mass')
        ? `${partLabel(partId)} restored, but the original upper mass is still removed. Restore Upper mass to show its cells.`
        : partInGrid(partId, parameters)
        ? `${partLabel(partId)} restored. Undo is available.`
        : `${partLabel(partId)} restored; select its plan shape and mass division, or increase its support grid, to show its source.`,
    })
  }

  const toggleSelectedPieceForFuse = () => {
    if (!selectedPieceCanJoinFuse) return
    setFuseSelectionPieceIds((pieceIds) =>
      pieceIds.includes(selectedPieceId)
        ? pieceIds.filter((pieceId) => pieceId !== selectedPieceId)
        : [...pieceIds, selectedPieceId],
    )
  }

  const fuseSelectedPieces = async () => {
    if (!canCreateFuse) return
    const pieceIds = [...validFuseSelectionPieceIds]
    const sourcePieces = pieceIds
      .map((pieceId) =>
        unfusedMasterStudy.pieces.find((piece) => piece.id === pieceId),
      )
      .filter((piece): piece is NonNullable<typeof piece> => piece !== undefined)
    if (sourcePieces.length !== pieceIds.length) {
      setNotice({
        kind: 'error',
        text: 'Fuse refused: one selected source is no longer available.',
      })
      return
    }

    setFuseActionPending(true)
    setNotice({ kind: 'info', text: 'Checking the selected solid connection…' })
    try {
      const preview = await fuseScenePieces(sourcePieces)
      if (preview.componentCount !== 1) {
        setNotice({
          kind: 'error',
          text: `Fuse refused: the ${pieceIds.length} selected parts do not touch or overlap.`,
        })
        return
      }
      const nextNumber =
        Math.max(
          0,
          ...parameters.fuseGroups.map((group) => fuseNumber(group.id)),
        ) + 1
      const group: PilotiFuseGroup = {
        id: `fuse-${nextNumber}`,
        pieceIds,
      }
      replaceStudy({
        ...studyState,
        parameters: {
          ...parameters,
          fuseGroups: [...parameters.fuseGroups, group],
        },
      })
      setFuseSelectionPieceIds([])
      setSelectedPieceId(group.id)
      setSupportEditScope('shared')
      setNotice({
        kind: 'info',
        text: `Fused ${pieceIds.length} parts into one measured solid.`,
      })
    } catch (error) {
      setNotice({
        kind: 'error',
        text: `Fuse failed: ${
          error instanceof Error ? error.message : 'Unknown solid-kernel error.'
        }`,
      })
    } finally {
      setFuseActionPending(false)
    }
  }

  const unfuseSelectedGroup = () => {
    if (!selectedFuseGroup) return
    const nextParameters = {
      ...parameters,
      fuseGroups: parameters.fuseGroups.filter(
        (group) => group.id !== selectedFuseGroup.id,
      ),
    }
    const availableIds = selectablePieceIds(nextParameters)
    const restoredSelection = selectedFuseGroup.pieceIds.find(
      (id) => availableIds.includes(id),
    ) ?? availableIds[0] ?? ''
    replaceStudy({
      ...studyState,
      parameters: nextParameters,
    })
    setSelectedPieceId(restoredSelection)
    setSupportEditScope('shared')
    setNotice({
      kind: 'info',
      text: 'Fuse removed. Its source parts are editable again; Undo is available.',
    })
  }

  const undo = () => {
    const previous = history.past.at(-1)
    if (!previous) return
    setFuseSelectionPieceIds([])
    reconcileSelection(previous.parameters)
    persistRecovery(previous)
    dispatch({ type: 'undo' })
  }

  const redo = () => {
    const next = history.future[0]
    if (!next) return
    setFuseSelectionPieceIds([])
    reconcileSelection(next.parameters)
    persistRecovery(next)
    dispatch({ type: 'redo' })
  }

  const reset = () => {
    setSelectedPieceId('upper-mass')
    setFuseSelectionPieceIds([])
    setSupportEditScope('shared')
    replaceStudy(DEFAULT_STUDY)
    setNotice({ kind: 'info', text: 'Defaults restored. Undo is available.' })
  }

  const saveProject = () => {
    const blob = new Blob([projectJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `raaka-piloti-${String(parameters.seed).padStart(4, '0')}-1to${modelScaleDenominator}.raaka.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    setBaselineJson(projectJson)
    setProjectOrigin('SAVED')
    setNotice({ kind: 'info', text: `Saved ${link.download}.` })
  }

  const openProjectFile = async (file: File) => {
    try {
      const openedProject = parseProject(await file.text())
      const openedJson = serializeProject(openedProject)
      const openedStudy = {
        parameters: openedProject.parameters,
        modelScale: openedProject.modelScale,
      }
      dispatch({ type: 'load', value: openedStudy })
      persistRecovery(openedStudy)
      const ids = selectablePieceIds(openedProject.parameters)
      setSelectedPieceId(preferredSelection(ids))
      setFuseSelectionPieceIds([])
      setSupportEditScope('shared')
      setBaselineJson(openedJson)
      setProjectOrigin('SAVED')
      setNotice({ kind: 'info', text: `Opened ${file.name}.` })
    } catch (error) {
      setNotice({
        kind: 'error',
        text: `Open failed: ${
          error instanceof Error ? error.message : 'Unknown project error.'
        }`,
      })
    }
  }

  const chooseProjectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) void openProjectFile(file)
  }

  const commitSeed = (input: HTMLInputElement) => {
    const seed = Number(input.value)
    if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
      input.value = String(parameters.seed)
      setNotice({
        kind: 'error',
        text: `Seed must be an integer from 0 to ${MAX_SEED}.`,
      })
      return
    }
    update('seed', seed)
  }

  const replaceSelectedSupportOverride = (
    supportId: string,
    footOffsetOverride?: Omit<PilotiFootOffsetOverride, 'supportId'>,
    supportSizeOverride?: Omit<PilotiSupportSizeOverride, 'supportId'>,
    supportPositionOverride?: Omit<PilotiSupportPositionOverride, 'supportId'>,
  ) => {
    const retainedFootOffsets = parameters.footOffsetOverrides.filter(
      (override) => override.supportId !== supportId,
    )
    const retainedSizes = parameters.supportSizeOverrides.filter(
      (override) => override.supportId !== supportId,
    )
    const retainedPositions = parameters.supportPositionOverrides.filter(
      (override) => override.supportId !== supportId,
    )
    const footOffsetOverrides = footOffsetOverride
      ? [
          ...retainedFootOffsets,
          { supportId, ...footOffsetOverride },
        ].sort(compareSupportIds)
      : retainedFootOffsets
    const supportSizeOverrides = supportSizeOverride
      ? [
          ...retainedSizes,
          { supportId, ...supportSizeOverride },
        ].sort(compareSupportIds)
      : retainedSizes
    const supportPositionOverrides = supportPositionOverride
      ? [
          ...retainedPositions,
          { supportId, ...supportPositionOverride },
        ].sort(compareSupportIds)
      : retainedPositions
    replaceStudy({
      ...studyState,
      parameters: {
        ...parameters,
        footOffsetOverrides,
        supportSizeOverrides,
        supportPositionOverrides,
      },
    })
  }

  const createSelectedSupportOverride = () => {
    if (selectedSupportId === undefined || hasSelectedSupportOverride) return
    replaceSelectedSupportOverride(
      selectedSupportId,
      {
        footOffsetXMm: parameters.footOffsetXMm,
        footOffsetYMm: parameters.footOffsetYMm,
      },
      { widthScale: 1, depthScale: 1 },
      { positionXMm: 0, positionYMm: 0 },
    )
  }

  const updateSelectedFootOffset = (
    axis: 'footOffsetXMm' | 'footOffsetYMm',
    value: number,
  ) => {
    if (selectedSupportId === undefined || !hasSelectedSupportOverride) return
    replaceSelectedSupportOverride(
      selectedSupportId,
      {
        footOffsetXMm: axis === 'footOffsetXMm' ? value : activeFootOffsetX,
        footOffsetYMm: axis === 'footOffsetYMm' ? value : activeFootOffsetY,
      },
      {
        widthScale: activeSupportWidthScale,
        depthScale: activeSupportDepthScale,
      },
      {
        positionXMm: activeSupportPositionX,
        positionYMm: activeSupportPositionY,
      },
    )
  }

  const updateSelectedSupportSize = (
    axis: 'widthScale' | 'depthScale',
    value: number,
  ) => {
    if (selectedSupportId === undefined || !hasSelectedSupportOverride) return
    replaceSelectedSupportOverride(
      selectedSupportId,
      {
        footOffsetXMm: activeFootOffsetX,
        footOffsetYMm: activeFootOffsetY,
      },
      {
        widthScale: axis === 'widthScale' ? value : activeSupportWidthScale,
        depthScale: axis === 'depthScale' ? value : activeSupportDepthScale,
      },
      {
        positionXMm: activeSupportPositionX,
        positionYMm: activeSupportPositionY,
      },
    )
  }

  const updateSelectedSupportPosition = (
    axis: 'positionXMm' | 'positionYMm',
    value: number,
  ) => {
    if (selectedSupportId === undefined || !hasSelectedSupportOverride) return
    replaceSelectedSupportOverride(
      selectedSupportId,
      {
        footOffsetXMm: activeFootOffsetX,
        footOffsetYMm: activeFootOffsetY,
      },
      {
        widthScale: activeSupportWidthScale,
        depthScale: activeSupportDepthScale,
      },
      {
        positionXMm: axis === 'positionXMm' ? value : activeSupportPositionX,
        positionYMm: axis === 'positionYMm' ? value : activeSupportPositionY,
      },
    )
  }

  const applyGizmoTranslation = (
    target: TranslationGizmoTarget,
    valueDesignMm: readonly [number, number, number],
  ) => {
    replaceStudy({
      ...studyState,
      parameters: applyTranslationGizmoValue(parameters, target, valueDesignMm),
    })
  }

  const beginGesture = () => dispatch({ type: 'begin-gesture' })
  const endGesture = () => dispatch({ type: 'commit-gesture' })
  const beginGizmoTranslation = (target: TranslationGizmoTarget) => {
    gizmoGestureStartRef.current = studyState
    beginGesture()
    if (target.kind === 'support') setSupportEditScope('selected')
  }
  const endGizmoTranslation = (
    target: TranslationGizmoTarget,
    changed: boolean,
  ) => {
    endGesture()
    gizmoGestureStartRef.current = undefined
    if (!changed) return
    setNotice({
      kind: 'info',
      text: `${target.kind === 'upper-mass'
        ? 'Upper mass'
        : target.kind === 'support'
          ? 'Complete leg'
          : 'Copy'} moved. Undo is available.`,
    })
  }
  const cancelGizmoTranslation = () => {
    const start = gizmoGestureStartRef.current
    if (start) persistRecovery(start)
    dispatch({ type: 'cancel-gesture' })
    gizmoGestureStartRef.current = undefined
    setNotice({ kind: 'info', text: 'Move cancelled. The starting position was restored.' })
  }
  const objectList = (
    <ObjectList
      study={study}
      parameters={parameters}
      selectedPieceId={selectedPieceId}
      fuseSelectionPieceIds={validFuseSelectionPieceIds}
      isResolving={fuseRenderStatus === 'pending'}
      onSelect={selectPiece}
      onRestore={restorePart}
    />
  )

  return (
    <main className="app-shell" data-theme={uiTheme}>
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true" />
          <strong>RAAKA</strong>
          <span>BRUTALIST MASSING STUDIO</span>
        </div>
        <div className="project-name">
          <span>STUDY</span>
          <strong>PILOTI / {String(parameters.seed).padStart(4, '0')}</strong>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="button button--theme"
            aria-label={`Switch to ${uiTheme === 'dark' ? 'light' : 'dark'} mode`}
            aria-pressed={uiTheme === 'dark'}
            onClick={() =>
              setUiTheme((theme) => (theme === 'dark' ? 'light' : 'dark'))
            }
          >
            {uiTheme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
          </button>
          <button
            type="button"
            className="button button--quiet"
            onClick={() =>
              update('seed', (parameters.seed + 1) % (MAX_SEED + 1))
            }
          >
            NEXT SEED
          </button>
          <button type="button" className="button button--primary" disabled>
            EXPORT
            <span>SOON</span>
          </button>
        </div>
      </header>

      <nav className="study-toolbar" aria-label="Study history and files">
        <div className="project-state" aria-live="polite">
          <span>PROJECT</span>
          <strong className={projectStatus === 'UNSAVED' ? 'is-unsaved' : ''}>
            {projectStatus}
          </strong>
          {notice ? (
            <small className={notice.kind === 'error' ? 'is-error' : ''}>
              {notice.text}
            </small>
          ) : null}
        </div>
        <label className="seed-field">
          <span>SEED</span>
          <input
            key={parameters.seed}
            type="number"
            min={0}
            max={MAX_SEED}
            step={1}
            defaultValue={parameters.seed}
            onBlur={(event) => commitSeed(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') {
                event.currentTarget.value = String(parameters.seed)
                event.currentTarget.blur()
              }
            }}
          />
        </label>
        <div className="study-toolbar-actions">
          <button type="button" onClick={undo} disabled={history.past.length === 0}>
            UNDO
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={history.future.length === 0}
          >
            REDO
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={projectJson === DEFAULT_PROJECT_JSON}
          >
            RESET
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            OPEN
          </button>
          <button type="button" className="is-primary" onClick={saveProject}>
            SAVE PROJECT
          </button>
        </div>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept=".json,application/json"
          onChange={chooseProjectFile}
          tabIndex={-1}
        />
      </nav>

      <aside className="left-panel panel">
        <section className="panel-section">
          <div className="section-heading">
            <span>01</span>
            <h2>Recipe</h2>
          </div>
          <div className="recipe-list">
            {RECIPES.map((recipe, index) => (
              <button
                type="button"
                key={recipe.id}
                className={`recipe-card ${recipe.id === 'piloti' ? 'is-active' : ''}`}
                disabled={!recipe.available}
                title={recipe.description}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{recipe.name}</strong>
                <small>{recipe.available ? 'ACTIVE' : 'DEFINED'}</small>
              </button>
            ))}
          </div>
        </section>

        {objectList}
      </aside>

      <section className="workspace">
        <Viewport
          study={study}
          modelScale={modelScale}
          uiTheme={uiTheme}
          selectedPieceId={selectedPieceId}
          fuseSelectionPieceIds={validFuseSelectionPieceIds}
          translationGizmo={translationGizmo}
          onSelect={selectPiece}
          onTranslationStart={beginGizmoTranslation}
          onTranslationChange={applyGizmoTranslation}
          onTranslationEnd={endGizmoTranslation}
          onTranslationCancel={cancelGizmoTranslation}
        />
      </section>

      <aside className="right-panel panel">
        <details className="compact-objects">
          <summary>OBJECTS · {study.pieces.length} VISIBLE · {parameters.removedPartIds.length} REMOVED</summary>
          {objectList}
        </details>
        <section className="inspector-lead" aria-live="polite">
          <span className="eyebrow">SELECTED OBJECT</span>
          <h1>
            {selectedPiece?.label ??
              (selectedFuseGroup
                ? `Fuse ${fuseNumber(selectedFuseGroup.id)}`
                : 'Mass study')}
          </h1>
          <p>
            {selectedPiece
              ? `${selectedPiece.role.toUpperCase()} · ${selectedPiece.kind.toUpperCase()}`
              : selectedFuseGroup && fuseRenderStatus === 'pending'
                ? 'SOLID KERNEL · RESOLVING'
                : selectedFuseGroup && fuseRenderStatus === 'error'
                  ? 'SOLID KERNEL · PAUSED'
                  : selectedFuseGroup
                    ? 'FUSE · SOURCES MISSING'
              : 'Generated composition'}
          </p>
          <div className="inspector-actions">
            <button
              type="button"
              onClick={duplicateSelectedPiece}
              disabled={!canDuplicateSelectedPiece}
              title={
                parameters.partCopies.length >= PILOTI_PART_COPY_LIMIT
                  ? `The ${PILOTI_PART_COPY_LIMIT}-copy limit includes removed copies. Restore an existing copy to reuse it.`
                  : 'Duplicate the selected semantic part.'
              }
            >
              DUPLICATE
            </button>
            {selectedPieceCanJoinFuse ? (
              <button
                type="button"
                className="is-constructive"
                onClick={toggleSelectedPieceForFuse}
              >
                {selectedPieceIsInFuseSet ? 'REMOVE FROM SET' : 'ADD TO FUSE'}
              </button>
            ) : null}
            {selectedPartId ? (
              <button
                type="button"
                className="is-destructive"
                onClick={removeSelectedPart}
                title={selectedPiece?.role === 'support'
                  ? 'Remove the complete leg: stem and shoulder.'
                  : 'Remove this mass. Copies keep their live source shape.'}
              >
                {selectedPiece?.role === 'support' ? 'REMOVE LEG' : 'REMOVE MASS'}
              </button>
            ) : null}
            {selectedFuseGroup ? (
              <button
                type="button"
                className="is-destructive"
                onClick={unfuseSelectedGroup}
              >
                UNFUSE
              </button>
            ) : null}
          </div>
          {selectedFuseGroup ? (
            <p className="selection-help">Unfuse to remove or move individual parts.</p>
          ) : selectedPiece?.role === 'support' ? (
            <p className="selection-help">Remove leg deletes its stem and shoulder together.</p>
          ) : null}
          <p className="selection-help selection-legend">
            <span>YELLOW CONTROLS</span> affect {selectedFuseGroup ? 'this Fuse’s source parts' : 'the selected part'}.
            {' '}{allControlsVisible
              ? 'Grey controls remain available for the rest of the study.'
              : 'Only relevant controls are shown. Shared settings may also change linked parts.'}
          </p>
          {translationGizmo ? (
            <p className="selection-help gizmo-help">
              <span>MOVE GIZMO</span>{' '}
              {translationGizmo.kind === 'upper-mass'
                ? massPartAddress(selectedPieceId)
                  ? 'moves the complete original upper mass in shared X/Y.'
                  : 'moves the upper mass in X/Y.'
                : translationGizmo.kind === 'support'
                  ? 'moves the complete leg in X/Y. Foot lean remains separate.'
                  : 'moves this copy in X/Y/Z.'}
            </p>
          ) : selectedFuseGroup ? (
            <p className="selection-help gizmo-help"><span>MOVE GIZMO</span> Unfuse to move individual source parts.</p>
          ) : null}
          {validFuseSelectionPieceIds.length > 0 ? (
            <div className="fuse-builder" aria-live="polite">
              <span>FUSE SET</span>
              <strong>
                {validFuseSelectionPieceIds.length}{' '}
                {validFuseSelectionPieceIds.length === 1 ? 'PART' : 'PARTS'}
              </strong>
              <small>
                Select another object and add it. Parts must touch or overlap.
              </small>
              <div>
                <button
                  type="button"
                  onClick={() => setFuseSelectionPieceIds([])}
                >
                  CLEAR
                </button>
                <button
                  type="button"
                  className="is-primary"
                  disabled={!canCreateFuse}
                  onClick={() => void fuseSelectedPieces()}
                >
                  {fuseActionPending
                    ? 'CHECKING…'
                    : `FUSE ${validFuseSelectionPieceIds.length} PARTS`}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <div className="selection-context">
          <span>EDITING</span>
          <strong>{selectedPiece?.label ?? (selectedFuseGroup
            ? `Fuse ${fuseNumber(selectedFuseGroup.id)}` : 'No selection')}</strong>
          <button type="button" aria-pressed={allControlsVisible}
            disabled={relevantControls.size === 0}
            aria-label={allControlsVisible ? 'Show relevant controls' : 'Show all controls'}
            onClick={() => setShowAllControls(!allControlsVisible)}>
            {allControlsVisible ? 'SHOW RELEVANT' : 'SHOW ALL'}
          </button>
        </div>
        <InspectorControls showAll={allControlsVisible}>
        <section className="panel-section controls-section">
          <div className="section-heading">
            <span>03</span>
            <h2>{allControlsVisible ? 'All controls' : 'Relevant controls'}</h2>
          </div>
          {relevantControls.size === 0 ? <p className="selection-help">No active part to filter. Composition controls remain available; select or restore a part to focus the inspector.</p> : null}
          <ControlGroup visible={canShowControls('planShape')}>
          <div className="control-subsection">
            <span>PLAN SHAPE</span>
            <small>Rectangle uses the support grid. Hexagon and Octagon use one leg per side. Each layout retains its own part edits.</small>
          </div>
          <div className={`offset-scope-switch plan-shape-switch ${affectedControls.has('planShape') ? 'affects-selection' : 'other-controls'}`} aria-label="Piloti plan shape">
            {(['rectangle', 'hexagon', 'octagon'] as const).map((shape) => (
              <button type="button" key={shape} aria-pressed={parameters.planShape === shape}
                className={parameters.planShape === shape ? 'is-active' : ''}
                onClick={() => update('planShape', shape)}><span>{shape.toUpperCase()}</span></button>
            ))}
          </div>
          </ControlGroup>
          <ControlGroup visible={canShowControls(radial ? 'polygonMassDivision' : 'upperMassDivision')}>
          <div className="control-subsection">
            <span>UPPER MASS DIVISION</span>
            <small>New divisions preserve the original envelope. Whole-mass copies stay whole; cell copies pause outside their source division.</small>
          </div>
          <div className={`offset-scope-switch mass-division-switch ${affectedControls.has(radial ? 'polygonMassDivision' : 'upperMassDivision') ? 'affects-selection' : 'other-controls'}`} aria-label="Upper mass division">
            {divisionChoices.map((division) => (
              <button key={division.value} type="button"
                className={activeDivision === division.value ? 'is-active' : ''}
                aria-pressed={activeDivision === division.value}
                onClick={() => radial
                  ? update('polygonMassDivision', division.value === 'sectors' ? 'sectors' : 'whole')
                  : division.value !== 'sectors' && update('upperMassDivision', division.value)}>
                <span>{division.label}</span><small>{division.description}</small>
              </button>
            ))}
          </div>
          {activeDivision !== 'whole' ? (
            <>
              <p className="selection-help">Select a mass part in the view or below. Whole restores the shared profile, not a union of edited parts. Each division remembers its edits. Part copies and Fuses pause when their source division is inactive.</p>
              <div className="mass-part-picker" aria-label="Select mass part">
                {unfusedMasterStudy.pieces.filter((piece) => massPartAddress(piece.id)).map((piece) => (
                  <button key={piece.id} type="button" aria-pressed={selectedPieceId === piece.id}
                    onClick={() => selectPiece(piece.id)}>{piece.label}</button>
                ))}
              </div>
            </>
          ) : null}
          </ControlGroup>
          {activeMassProfile ? (
            <div className="mass-part-editor">
              <div className="control-subsection">
                <span>{partLabel(activeMassProfile.partId).toUpperCase()} · {selectedMassOverride ? 'INDEPENDENT TOP' : 'SHARED PROFILE'}</span>
                <small>Only this part and its live copies change. The bottom face stays linked; dimensions are design millimetres.</small>
              </div>
              <div className="offset-scope-switch affects-selection" aria-label="Selected mass part profile">
                {(['block', 'tapered'] as const).map((profile) => (
                  <button key={profile} type="button" className={activeMassProfile.profile === profile ? 'is-active' : ''}
                    aria-pressed={activeMassProfile.profile === profile} onClick={() => updateMassPart({ profile })}>
                    {profile === 'block' ? 'PART BLOCK' : 'PART TAPERED'}
                  </button>
                ))}
              </div>
              {activeMassProfile.profile === 'tapered' ? (
                <>
                  {([
                    ['topWidthRatio', 'Part top width share', 0.01, ''],
                    ['topDepthRatio', 'Part top depth share', 0.01, ''],
                    ['topOffsetXMm', 'Part top drift X', 1, ' mm'],
                    ['topOffsetYMm', 'Part top drift Y', 1, ' mm'],
                  ] as const).filter(([key]) => !radial || key !== 'topDepthRatio').map(([key, label, step, suffix]) => (
                    <RangeField key={key} label={radial && key === 'topWidthRatio' ? 'Part top scale' : label} affected={true} value={activeMassProfile[key]}
                      minimum={MASS_PART_RULES[key].minimum} maximum={MASS_PART_RULES[key].maximum}
                      step={step} suffix={suffix}
                      display={key === 'topWidthRatio' || key === 'topDepthRatio' ? 'percent' : 'raw'}
                      onInteractionStart={beginGesture} onInteractionEnd={endGesture}
                      onChange={(value) => updateMassPart({ [key]: value })} />
                  ))}
                  <p className="selection-help">Negative / positive drift leans the top towards −X / +X or −Y / +Y. Use opposite signs on neighbouring parts.</p>
                </>
              ) : null}
              <button type="button" className="subtle-button" disabled={!selectedMassOverride}
                onClick={() => update('massPartOverrides', parameters.massPartOverrides.filter((entry) => entry.partId !== selectedMassPartId))}>
                USE SHARED PROFILE
              </button>
            </div>
          ) : null}
          {selectedPartCopy ? (
            <>
              <div className="control-subsection">
                <span>COPY POSITION</span>
                <small>
                  Source{' '}
                  {selectedPartCopy.sourceId === 'upper-mass' || massPartAddress(selectedPartCopy.sourceId)
                    ? partLabel(selectedPartCopy.sourceId).toUpperCase()
                    : formatSupportId(selectedPartCopy.sourceId)}{' '}
                  supplies the live shape. This copy owns its translation.
                </small>
              </div>
              <RangeField
                label="Copy offset X"
                affected={true}
                value={selectedPartCopy.offsetXMm}
                minimum={PILOTI_PART_COPY_OFFSET_MM.minimum}
                maximum={PILOTI_PART_COPY_OFFSET_MM.maximum}
                step={1}
                suffix=" mm"
                onInteractionStart={beginGesture}
                onInteractionEnd={endGesture}
                onChange={(value) =>
                  updateSelectedPartCopyOffset('offsetXMm', value)
                }
              />
              <RangeField
                label="Copy offset Y"
                affected={true}
                value={selectedPartCopy.offsetYMm}
                minimum={PILOTI_PART_COPY_OFFSET_MM.minimum}
                maximum={PILOTI_PART_COPY_OFFSET_MM.maximum}
                step={1}
                suffix=" mm"
                onInteractionStart={beginGesture}
                onInteractionEnd={endGesture}
                onChange={(value) =>
                  updateSelectedPartCopyOffset('offsetYMm', value)
                }
              />
              <RangeField
                label="Copy offset Z"
                affected={true}
                value={selectedPartCopy.offsetZMm}
                minimum={PILOTI_PART_COPY_OFFSET_MM.minimum}
                maximum={PILOTI_PART_COPY_OFFSET_MM.maximum}
                step={1}
                suffix=" mm"
                onInteractionStart={beginGesture}
                onInteractionEnd={endGesture}
                onChange={(value) =>
                  updateSelectedPartCopyOffset('offsetZMm', value)
                }
              />
              <div className="shape-readout">
                <span>COPY OFFSET</span>
                <strong>
                  {formatNumber(selectedPartCopy.offsetXMm)} ·{' '}
                  {formatNumber(selectedPartCopy.offsetYMm)} ·{' '}
                  {formatNumber(selectedPartCopy.offsetZMm)} MM
                </strong>
                <small>X · Y · Z in design millimetres.</small>
              </div>
            </>
          ) : null}
          <RangeField
            label="Design height"
            affected={affectedControls.has('heightMm')}
            value={parameters.heightMm}
            minimum={1_000}
            maximum={2_000}
            step={1}
            suffix=" mm"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('heightMm', value)}
          />
          <div className="model-scale-control">
            <div className="model-scale-heading">
              <span>MODEL SCALE</span>
              <small>Uniform manufacturing size, not camera zoom.</small>
            </div>
            <div className="model-scale-presets" aria-label="Model scale">
              {MODEL_SCALE_PRESETS.map((preset) => {
                const denominator = Math.round(1 / preset)
                return (
                  <button
                    type="button"
                    key={preset}
                    className={modelScale === preset ? 'is-active' : ''}
                    aria-pressed={modelScale === preset}
                    onClick={() => updateModelScale(preset)}
                  >
                    1:{denominator}
                  </button>
                )
              })}
            </div>
            <div className="model-scale-summary">
              <span>MANUFACTURED HEIGHT</span>
              <strong>{formatNumber(study.heightMm)} MM</strong>
              <small>{formatNumber(masterStudy.heightMm)} MM DESIGN</small>
            </div>
          </div>
          <ControlGroup visible={canShowControls('upperFootprintMode', 'upperWidthRatio', 'upperDepthRatio', 'radialSpreadRatio')}>
          <div className="control-subsection">
            <span>UPPER / SUPPORT FOOTPRINT</span>
            <small>
              Linked keeps ordinary bearings under the upper X/Y footprint. Z
              stays independent.
            </small>
          </div>
          <div
            className={`offset-scope-switch ${affectedControls.has('upperFootprintMode') ? 'affects-selection' : 'other-controls'}`}
            aria-label="Upper and support footprint relationship"
          >
            <button
              type="button"
              className={
                parameters.upperFootprintMode === 'linked' ? 'is-active' : ''
              }
              aria-pressed={parameters.upperFootprintMode === 'linked'}
              onClick={() => update('upperFootprintMode', 'linked')}
            >
              <span>LINKED</span>
              <small>{radial ? 'RING DRIVES X/Y' : 'GRID DRIVES X/Y'}</small>
            </button>
            <button
              type="button"
              className={
                parameters.upperFootprintMode === 'detached' ? 'is-active' : ''
              }
              aria-pressed={parameters.upperFootprintMode === 'detached'}
              onClick={() => update('upperFootprintMode', 'detached')}
            >
              <span>DETACHED</span>
              <small>INDEPENDENT X/Y</small>
            </button>
          </div>
          <RangeField
            label={
              radial ? 'Polygon diameter share' : parameters.upperFootprintMode === 'linked'
                ? 'Base width share (3 columns)'
                : 'Upper width share'
            }
            affected={affectedControls.has('upperWidthRatio')}
            value={parameters.upperWidthRatio}
            minimum={0.4}
            maximum={1.1}
            step={0.01}
            display="percent"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('upperWidthRatio', value)}
          />
          {!radial ? <RangeField
            label={
              parameters.upperFootprintMode === 'linked'
                ? 'Base depth share (1 row)'
                : 'Upper depth share'
            }
            affected={affectedControls.has('upperDepthRatio')}
            value={parameters.upperDepthRatio}
            minimum={0.2}
            maximum={0.65}
            step={0.01}
            display="percent"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('upperDepthRatio', value)}
          /> : <>
            <RangeField label="Radial spread" affected={affectedControls.has('radialSpreadRatio')}
              value={parameters.radialSpreadRatio} minimum={0.55} maximum={1.45} step={0.01}
              display="percent"
              onInteractionStart={beginGesture} onInteractionEnd={endGesture}
              onChange={(value) => update('radialSpreadRatio', value)} />
            <p className="selection-help">Diameter share × design height gives the corner-to-corner base diameter. Radial spread scales the leg ring; Linked also scales the upper footprint. Top scale stays uniform to keep all polygon side faces planar.</p>
          </>}
          </ControlGroup>
          <ControlGroup visible={canShowControls('upperOffsetXMm', 'upperOffsetYMm')}>
          <div className="control-subsection">
            <span>UPPER MASS PLACEMENT</span>
            <small>
              {parameters.upperFootprintMode === 'linked'
                ? 'Shoulder tops follow X/Y; stems and feet stay fixed.'
                : 'Independent cantilever in design millimetres.'}
            </small>
          </div>
          <RangeField
            label="Upper offset X"
            affected={affectedControls.has('upperOffsetXMm')}
            value={parameters.upperOffsetXMm}
            minimum={-400}
            maximum={400}
            step={1}
            suffix=" mm"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('upperOffsetXMm', value)}
          />
          <RangeField
            label="Upper offset Y"
            affected={affectedControls.has('upperOffsetYMm')}
            value={parameters.upperOffsetYMm}
            minimum={-400}
            maximum={400}
            step={1}
            suffix=" mm"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('upperOffsetYMm', value)}
          />
          </ControlGroup>
          <ControlGroup visible={canShowControls('upperMassProfile', 'upperTopWidthRatio', 'upperTopDepthRatio', 'upperTopOffsetXMm', 'upperTopOffsetYMm')}>
          <div className="control-subsection">
            <span>{activeDivision === 'whole' ? 'UPPER MASS PROFILE' : 'SHARED UPPER MASS PROFILE'}</span>
            <small>The bottom bearing face stays fixed. Independent part tops keep their own profile.</small>
          </div>
          <div className={`offset-scope-switch ${affectedControls.has('upperMassProfile') ? 'affects-selection' : 'other-controls'}`} aria-label="Upper mass profile">
            <button
              type="button"
              className={parameters.upperMassProfile === 'block' ? 'is-active' : ''}
              aria-pressed={parameters.upperMassProfile === 'block'}
              onClick={() => update('upperMassProfile', 'block')}
            >
              <span>BLOCK</span>
              <small>PARALLEL SIDES</small>
            </button>
            <button
              type="button"
              className={
                parameters.upperMassProfile === 'tapered' ? 'is-active' : ''
              }
              aria-pressed={parameters.upperMassProfile === 'tapered'}
              onClick={() => update('upperMassProfile', 'tapered')}
            >
              <span>TAPERED</span>
              <small>LOFTED TOP</small>
            </button>
          </div>
          {parameters.upperMassProfile === 'tapered' ? (
            <>
              <RangeField
                label={radial ? 'Top scale' : 'Top width share'}
                affected={affectedControls.has('upperTopWidthRatio')}
                value={parameters.upperTopWidthRatio}
                minimum={0.45}
                maximum={1.25}
                step={0.01}
                display="percent"
                onInteractionStart={beginGesture}
                onInteractionEnd={endGesture}
                onChange={(value) => update('upperTopWidthRatio', value)}
              />
              {!radial ? <RangeField
                label="Top depth share"
                affected={affectedControls.has('upperTopDepthRatio')}
                value={parameters.upperTopDepthRatio}
                minimum={0.45}
                maximum={1.25}
                step={0.01}
                display="percent"
                onInteractionStart={beginGesture}
                onInteractionEnd={endGesture}
                onChange={(value) => update('upperTopDepthRatio', value)}
              /> : null}
              <RangeField
                label="Top drift X"
                affected={affectedControls.has('upperTopOffsetXMm')}
                value={parameters.upperTopOffsetXMm}
                minimum={-400}
                maximum={400}
                step={1}
                suffix=" mm"
                onInteractionStart={beginGesture}
                onInteractionEnd={endGesture}
                onChange={(value) => update('upperTopOffsetXMm', value)}
              />
              <RangeField
                label="Top drift Y"
                affected={affectedControls.has('upperTopOffsetYMm')}
                value={parameters.upperTopOffsetYMm}
                minimum={-400}
                maximum={400}
                step={1}
                suffix=" mm"
                onInteractionStart={beginGesture}
                onInteractionEnd={endGesture}
                onChange={(value) => update('upperTopOffsetYMm', value)}
              />
            </>
          ) : null}
          </ControlGroup>
          {!radial ? <>
          <RangeField
            label="Columns (X)"
            affected={affectedControls.has('supportCount')}
            value={parameters.supportCount}
            minimum={1}
            maximum={6}
            step={1}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('supportCount', value)}
          />
          <RangeField
            label="Rows (Y)"
            affected={affectedControls.has('supportRowCount')}
            value={parameters.supportRowCount}
            minimum={1}
            maximum={3}
            step={1}
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('supportRowCount', value)}
          />
          <RangeField
            label="Row spacing"
            affected={affectedControls.has('rowSpacingMm')}
            value={parameters.rowSpacingMm}
            minimum={100}
            maximum={800}
            step={1}
            suffix=" mm"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('rowSpacingMm', value)}
          />
          </> : null}
          <RangeField
            label={radial ? 'Shoulder radial depth' : 'Support depth share'}
            affected={affectedControls.has('supportDepthRatio')}
            value={parameters.supportDepthRatio}
            minimum={0.25}
            maximum={0.92}
            step={0.01}
            display="percent"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('supportDepthRatio', value)}
          />
          <RangeField
            label={!allControlsVisible && selectedPiece?.role === 'mass' ? 'Upper base height' : 'Support height'}
            affected={affectedControls.has('supportHeightRatio')}
            value={parameters.supportHeightRatio}
            minimum={0.25}
            maximum={0.58}
            step={0.01}
            display="percent"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('supportHeightRatio', value)}
          />
          <RangeField
            label="Shoulder share"
            affected={affectedControls.has('shoulderRatio')}
            value={parameters.shoulderRatio}
            minimum={0.2}
            maximum={0.8}
            step={0.01}
            display="percent"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('shoulderRatio', value)}
          />
          <ControlGroup visible={canShowControls('shoulderMode')}>
          <div className="control-subsection">
            <span>SHOULDER TOPOLOGY</span>
            <small>{radial ? 'Shared tops meet along radial edges, leaving a central opening below the upper mass.' : 'Shared tops meet across each support row.'}</small>
          </div>
          <div
            className={`offset-scope-switch ${affectedControls.has('shoulderMode') ? 'affects-selection' : 'other-controls'}`}
            aria-label="Shoulder topology"
          >
            <button
              type="button"
              className={parameters.shoulderMode === 'divided' ? 'is-active' : ''}
              aria-pressed={parameters.shoulderMode === 'divided'}
              onClick={() => update('shoulderMode', 'divided')}
            >
              <span>DIVIDED</span>
              <small>SEPARATE TOPS</small>
            </button>
            <button
              type="button"
              className={parameters.shoulderMode === 'shared' ? 'is-active' : ''}
              aria-pressed={parameters.shoulderMode === 'shared'}
              onClick={() => update('shoulderMode', 'shared')}
            >
              <span>SHARED</span>
              <small>{radial ? 'CONTINUOUS RING' : 'CONTINUOUS ROW'}</small>
            </button>
          </div>
          </ControlGroup>
          <RangeField
            label="Neck width"
            affected={affectedControls.has('neckWidthRatio')}
            value={parameters.neckWidthRatio}
            minimum={0.18}
            maximum={0.7}
            step={0.01}
            display="percent"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('neckWidthRatio', value)}
          />
          <RangeField
            label="Asymmetry"
            affected={affectedControls.has('asymmetry')}
            value={parameters.asymmetry}
            minimum={0}
            maximum={0.5}
            step={0.01}
            display="percent"
            onInteractionStart={beginGesture}
            onInteractionEnd={endGesture}
            onChange={(value) => update('asymmetry', value)}
          />
          {radial && canShowControls('footOffsetSpace') ? <>
            <div className="control-subsection">
              <span>FOOT OFFSET SPACE</span>
              <small>Applies to shared and selected leg offsets. Switching space reinterprets the same values; it does not move necks or shoulders.</small>
            </div>
            <div className={`offset-scope-switch ${affectedControls.has('footOffsetSpace') ? 'affects-selection' : 'other-controls'}`} aria-label="Foot offset space">
              <button type="button" className={!centeredFeet ? 'is-active' : ''}
                aria-pressed={!centeredFeet} onClick={() => update('footOffsetSpace', 'global')}>
                <span>GLOBAL</span><small>WORLD X/Y</small>
              </button>
              <button type="button" className={centeredFeet ? 'is-active' : ''}
                aria-pressed={centeredFeet} onClick={() => update('footOffsetSpace', 'centered')}>
                <span>CENTERED</span><small>OUTWARD / TANGENT</small>
              </button>
            </div>
            <p className="selection-help">{centeredFeet
              ? 'Positive radial offset spreads feet away from the ring centre; negative pulls them inward. Positive tangential offset turns counter-clockwise viewed from above. Upper-mass placement does not change this centre.'
              : 'All legs use the same world X/Y directions, regardless of their position around the ring.'}</p>
          </> : null}
          <ControlGroup visible={showLegEditor}>
          <div className="control-subsection">
            <span>LEG EDIT SCOPE</span>
            <small>{!allControlsVisible && selectedSupportId && !selectedStem
              ? 'Position and size move or resize the whole leg. Select its stem to change foot lean.'
              : centeredFeet
              ? 'Foot offsets lean. Position moves the whole leg and realigns its outward direction.'
              : 'Foot offsets lean. Position moves the complete leg.'}</small>
          </div>
          <div className="offset-scope-switch" aria-label="Leg edit scope">
            <button
              type="button"
              className={activeSupportEditScope === 'shared' ? 'is-active' : ''}
              aria-pressed={activeSupportEditScope === 'shared'}
              onClick={() => setSupportEditScope('shared')}
            >
              <span>SHARED</span>
              <small>ALL LEGS</small>
            </button>
            <button
              type="button"
              className={activeSupportEditScope === 'selected' ? 'is-active' : ''}
              aria-pressed={activeSupportEditScope === 'selected'}
              disabled={selectedSupportId === undefined}
              onClick={() => setSupportEditScope('selected')}
            >
              <span>SELECTED</span>
              <small>
                {selectedSupportId
                  ? formatSupportId(selectedSupportId)
                  : 'SELECT A LEG'}
              </small>
            </button>
          </div>
          {!allControlsVisible && activeSupportEditScope === 'shared' && hasSelectedSupportOverride ? (
            <p className="selection-help">This leg uses its own settings. Choose Selected to edit them; shared foot sliders do not affect this leg.</p>
          ) : !allControlsVisible && activeSupportEditScope === 'shared' && selectedSupportId && !selectedStem ? (
            <p className="selection-help">Shared dimensions are above. Choose Selected to edit this leg's position and size.</p>
          ) : null}
          {activeSupportEditScope === 'selected' &&
          !hasSelectedSupportOverride ? (
            <div className="offset-inheritance">
              <span>INHERITS SHARED LEG</span>
              <small>
                {centeredFeet ? 'RADIAL' : 'OFFSET X'} {parameters.footOffsetXMm} MM · {centeredFeet ? 'TANGENTIAL' : 'Y'}{' '}
                {parameters.footOffsetYMm} MM · POSITION 0 × 0 MM · SIZE 100 ×
                100%
              </small>
              <button type="button" onClick={createSelectedSupportOverride}>
                CREATE OVERRIDE
              </button>
            </div>
          ) : (
            <>
              {activeSupportEditScope === 'selected' && selectedSupportId ? (
                <div className="offset-override-heading">
                  <span>{formatSupportId(selectedSupportId)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      replaceSelectedSupportOverride(selectedSupportId)
                    }
                  >
                    USE SHARED
                  </button>
                </div>
              ) : null}
              <RangeField
                label={
                  centeredFeet
                    ? activeSupportEditScope === 'selected' ? 'Selected radial offset' : 'Radial foot offset'
                    : activeSupportEditScope === 'selected'
                    ? 'Selected foot X'
                    : 'Foot offset X'
                }
                affected={activeSupportEditScope === 'selected'
                  ? selectedPieceId.startsWith('support-')
                  : affectedControls.has('footOffsetXMm')}
                value={activeFootOffsetX}
                minimum={-300}
                maximum={300}
                step={1}
                suffix=" mm"
                onInteractionStart={beginGesture}
                onInteractionEnd={endGesture}
                onChange={(value) =>
                  activeSupportEditScope === 'selected'
                    ? updateSelectedFootOffset('footOffsetXMm', value)
                    : update('footOffsetXMm', value)
                }
              />
              <RangeField
                label={
                  centeredFeet
                    ? activeSupportEditScope === 'selected' ? 'Selected tangential offset' : 'Tangential foot offset'
                    : activeSupportEditScope === 'selected'
                    ? 'Selected foot Y'
                    : 'Foot offset Y'
                }
                affected={activeSupportEditScope === 'selected'
                  ? selectedPieceId.startsWith('support-')
                  : affectedControls.has('footOffsetYMm')}
                value={activeFootOffsetY}
                minimum={-300}
                maximum={300}
                step={1}
                suffix=" mm"
                onInteractionStart={beginGesture}
                onInteractionEnd={endGesture}
                onChange={(value) =>
                  activeSupportEditScope === 'selected'
                    ? updateSelectedFootOffset('footOffsetYMm', value)
                    : update('footOffsetYMm', value)
                }
              />
              {activeSupportEditScope === 'selected' ? (
                <>
                  <RangeField
                    label="Selected position X"
                    affected={true}
                    value={activeSupportPositionX}
                    minimum={-300}
                    maximum={300}
                    step={1}
                    suffix=" mm"
                    onInteractionStart={beginGesture}
                    onInteractionEnd={endGesture}
                    onChange={(value) =>
                      updateSelectedSupportPosition('positionXMm', value)
                    }
                  />
                  <RangeField
                    label="Selected position Y"
                    affected={true}
                    value={activeSupportPositionY}
                    minimum={-300}
                    maximum={300}
                    step={1}
                    suffix=" mm"
                    onInteractionStart={beginGesture}
                    onInteractionEnd={endGesture}
                    onChange={(value) =>
                      updateSelectedSupportPosition('positionYMm', value)
                    }
                  />
                  <div className="shape-readout">
                    <span>SELECTED POSITION</span>
                    <strong>
                      X {formatNumber(activeSupportPositionX)} · Y{' '}
                      {formatNumber(activeSupportPositionY)} MM
                    </strong>
                    <small>{centeredFeet
                      ? 'World X/Y placement. The outward foot direction follows this leg’s new position.'
                      : 'Translation from the generated support position.'}</small>
                  </div>
                  <RangeField
                    label="Selected width scale"
                    affected={true}
                    value={activeSupportWidthScale}
                    minimum={0.55}
                    maximum={1.45}
                    step={0.01}
                    display="percent"
                    onInteractionStart={beginGesture}
                    onInteractionEnd={endGesture}
                    onChange={(value) =>
                      updateSelectedSupportSize('widthScale', value)
                    }
                  />
                  <RangeField
                    label="Selected depth scale"
                    affected={true}
                    value={activeSupportDepthScale}
                    minimum={0.55}
                    maximum={1.45}
                    step={0.01}
                    display="percent"
                    onInteractionStart={beginGesture}
                    onInteractionEnd={endGesture}
                    onChange={(value) =>
                      updateSelectedSupportSize('depthScale', value)
                    }
                  />
                  <div className="shape-readout">
                    <span>SELECTED SIZE</span>
                    <strong>
                      {formatNumber(activeSupportWidthScale * 100)} ×{' '}
                      {formatNumber(activeSupportDepthScale * 100)}%
                    </strong>
                    <small>Width × depth relative to the shared leg.</small>
                  </div>
                </>
              ) : null}
            </>
          )}
          <ControlGroup visible={showFootReadout}>
          <div
            className="lean-readout"
            aria-label={`${activeSupportEditScope} leg lean result`}
          >
            <span>
              {activeSupportEditScope === 'selected'
                ? hasSelectedSupportOverride
                  ? 'SELECTED LEAN'
                  : 'INHERITED LEAN'
                : 'SHARED LEAN'}
            </span>
            <strong>{authoredLeanAngleDeg.toFixed(1)}°</strong>
            <small>
              {formatNumber(footOffsetMm, 1)} MM DESIGN OFFSET ·{' '}
              {footDirectionDeg === undefined
                ? 'NO DIRECTION'
                : `${footDirectionDeg.toFixed(0)}° ${centeredFeet ? 'FROM OUTWARD · CCW' : 'FOOT DIRECTION'}`}
            </small>
            <small>
              {formatNumber(footOffsetMm * modelScale, 1)} MM MODEL OFFSET AT
              1:{modelScaleDenominator}
            </small>
            <small>
              {activeSupportEditScope === 'selected'
                ? hasSelectedSupportOverride
                  ? 'This leg uses selected lean, position and size values.'
                  : 'Create an override to separate this leg.'
                : 'Seeded asymmetry adds per-leg variation.'}
            </small>
          </div>
          </ControlGroup>
          </ControlGroup>
        </section>
        </InspectorControls>

        <section className="panel-section metrics-section">
          <div className="section-heading">
            <span>04</span>
            <h2>Manufacturing estimate</h2>
          </div>
          <dl className="metrics-grid">
            <div>
              <dt>Design envelope</dt>
              <dd>
                {formatNumber(masterStudy.widthMm)} ×{' '}
                {formatNumber(masterStudy.depthMm)} ×{' '}
                {formatNumber(masterStudy.heightMm)} mm
              </dd>
            </div>
            <div>
              <dt>Manufactured envelope</dt>
              <dd>
                {formatNumber(study.widthMm)} × {formatNumber(study.depthMm)} ×{' '}
                {formatNumber(study.heightMm)} mm
              </dd>
            </div>
            <div>
              <dt>Solid volume</dt>
              <dd>
                {formatNumber(study.concreteVolumeMm3 / 1_000_000_000, 3)} m³
              </dd>
            </div>
            <div className="metric-alert">
              <dt>Solid mass</dt>
              <dd>{formatNumber(study.estimatedMassKg)} kg</dd>
            </div>
            <div>
              <dt>Ground contact</dt>
              <dd>{formatNumber(study.groundContactMm2 / 1_000_000, 3)} m²</dd>
            </div>
          </dl>
          {parameters.fuseGroups.length > 0 ? (
            <div className="layout-advisories" aria-live="polite">
              <div className={fuseRenderStatus === 'error' ? 'is-error' : ''}>
                <strong>
                  {fuseRenderStatus === 'pending'
                    ? 'SOLID KERNEL WORKING'
                    : fuseRenderStatus === 'error'
                      ? 'FUSE PAUSED'
                      : currentFuseRenderState?.status === 'ready' && currentFuseRenderState.dormantFuseGroupIds.length > 0
                        ? 'FUSE SOURCES MISSING'
                      : 'MEASURED FUSED SOLID'}
                </strong>
                <span>
                  {parameters.fuseGroups.length}{' '}
                  {parameters.fuseGroups.length === 1 ? 'FUSE' : 'FUSES'} ·{' '}
                  {fuseRenderStatus.toUpperCase()}
                </span>
                <small>
                  {fuseRenderStatus === 'error'
                    ? currentFuseRenderState?.status === 'error'
                      ? currentFuseRenderState.message
                      : 'The Fuse could not be resolved.'
                    : fuseRenderStatus === 'pending'
                      ? 'The preview is temporarily showing separate source pieces.'
                      : currentFuseRenderState?.status === 'ready' &&
                          currentFuseRenderState.dormantFuseGroupIds.length > 0
                        ? `${currentFuseRenderState.dormantFuseGroupIds.length} Fuse is dormant because a source is removed or outside the active grid / mass division.`
                        : 'Internal contact faces are removed and volume comes from the finished union.'}
                </small>
              </div>
            </div>
          ) : null}
          {separateCopyPieceCount > 0 ? (
            <div className="layout-advisories" aria-live="polite">
              <div>
                <strong>UNFUSED COPY PIECES</strong>
                <span>
                  {separateCopyPieceCount}{' '}
                  {separateCopyPieceCount === 1 ? 'PIECE' : 'PIECES'} · LIVE
                  SOURCES
                </span>
                <small>
                  These pieces remain separate. Their overlap is counted more
                  than once until they are included in a Fuse.
                </small>
              </div>
            </div>
          ) : null}
          {activeDivision !== 'whole' ? (
            <p className="notice">Divided masses remain separate until fused. Independent tapers may create gaps or overlaps; overlapping volumes are counted twice outside a Fuse. Bearing checks use the outer footprint only, not gaps left by removed mass parts.</p>
          ) : null}
          {study.radialLayout ? <div className="layout-advisories">
            <div><strong>RADIAL SUPPORTS</strong><span>{study.radialLayout.totalSupports} / {study.radialLayout.sides} LEGS</span>
              <small>One leg per side. Removing a leg retains the polygon and other positions. Selected size or placement may cause gaps, overlap or overhang.</small></div>
            {study.radialLayout.bearingOverhangMm > 0 ? <div><strong>POLYGON BEARING OVERHANG</strong>
              <span>{formatNumber(study.radialLayout.bearingOverhangMm, 1)} MM MODEL</span>
              <small>A shoulder crosses a polygon edge. Check linkage, radial spread or selected overrides.</small></div> : null}
            {study.radialLayout.shoulderOverlapMm2 > 0 ? <div><strong>RADIAL SHOULDER OVERLAP</strong>
              <span>{formatNumber(study.radialLayout.shoulderOverlapMm2, 1)} MM² MODEL</span>
              <small>Largest pairwise bearing overlap. Unfused volumes remain nominal.</small></div> : null}
          </div> : null}
          {masterStudy.supportLayout &&
          (masterStudy.supportLayout.adjacentRowOverlapMm > 0 ||
            masterStudy.supportLayout.adjacentColumnOverlapMm > 0 ||
            (parameters.shoulderMode === 'shared' &&
              masterStudy.supportLayout.adjacentColumnGapMm > 0) ||
            masterStudy.supportLayout.nonAdjacentBearingOverlapMm > 0 ||
            masterStudy.supportLayout.bearingOverhangMm > 0 ||
            masterStudy.supportLayout.sideBearingOverhangMm > 0) ? (
            <div className="layout-advisories" aria-live="polite">
              {masterStudy.supportLayout.adjacentRowOverlapMm > 0 ? (
                <div>
                  <strong>ROW OVERLAP</strong>
                  <span>
                    {formatNumber(
                      masterStudy.supportLayout.adjacentRowOverlapMm,
                      1,
                    )}{' '}
                    MM DESIGN ·{' '}
                    {formatNumber(
                      study.supportLayout?.adjacentRowOverlapMm ?? 0,
                      1,
                    )}{' '}
                    MM MODEL
                  </span>
                  <small>
                    Shoulder zones intersect. The nominal volume counts both
                    preview pieces until solid union is available.
                  </small>
                </div>
              ) : null}
              {masterStudy.supportLayout.adjacentColumnOverlapMm > 0 ? (
                <div>
                  <strong>COLUMN OVERLAP</strong>
                  <span>
                    {formatNumber(
                      masterStudy.supportLayout.adjacentColumnOverlapMm,
                      1,
                    )}{' '}
                    MM DESIGN ·{' '}
                    {formatNumber(
                      study.supportLayout?.adjacentColumnOverlapMm ?? 0,
                      1,
                    )}{' '}
                    MM MODEL
                  </span>
                  <small>
                    Adjacent shoulder zones intersect across the width. The
                    nominal volume counts both preview pieces.
                  </small>
                </div>
              ) : null}
              {parameters.shoulderMode === 'shared' &&
              masterStudy.supportLayout.adjacentColumnGapMm > 0 ? (
                <div>
                  <strong>SHARED SHOULDER GAP</strong>
                  <span>
                    {formatNumber(
                      masterStudy.supportLayout.adjacentColumnGapMm,
                      1,
                    )}{' '}
                    MM DESIGN ·{' '}
                    {formatNumber(
                      study.supportLayout?.adjacentColumnGapMm ?? 0,
                      1,
                    )}{' '}
                    MM MODEL
                  </span>
                  <small>
                    Adjacent shared shoulder tops no longer meet. Restore their
                    size or position; RAAKA will not move them automatically.
                  </small>
                </div>
              ) : null}
              {masterStudy.supportLayout.nonAdjacentBearingOverlapMm > 0 ? (
                <div>
                  <strong>CROSS-GRID OVERLAP</strong>
                  <span>
                    {formatNumber(
                      masterStudy.supportLayout.nonAdjacentBearingOverlapMm,
                      1,
                    )}{' '}
                    MM DESIGN ·{' '}
                    {formatNumber(
                      study.supportLayout?.nonAdjacentBearingOverlapMm ?? 0,
                      1,
                    )}{' '}
                    MM MODEL
                  </span>
                  <small>
                    Non-neighbour shoulder zones intersect after placement.
                    Move the selected leg; RAAKA will not correct it.
                  </small>
                </div>
              ) : null}
              {masterStudy.supportLayout.bearingOverhangMm > 0 ? (
                <div>
                  <strong>BEARING OVERHANG</strong>
                  <span>
                    {formatNumber(
                      masterStudy.supportLayout.bearingOverhangMm,
                      1,
                    )}{' '}
                    MM / SIDE DESIGN ·{' '}
                    {formatNumber(
                      study.supportLayout?.bearingOverhangMm ?? 0,
                      1,
                    )}{' '}
                    MM MODEL
                  </span>
                  <small>
                    The outer shoulder zones extend beyond the upper mass.
                    Adjust upper Y offset, depth, spacing or selected position;
                    RAAKA will not resize them.
                  </small>
                </div>
              ) : null}
              {masterStudy.supportLayout.sideBearingOverhangMm > 0 ? (
                <div>
                  <strong>SIDE BEARING OVERHANG</strong>
                  <span>
                    {formatNumber(
                      masterStudy.supportLayout.sideBearingOverhangMm,
                      1,
                    )}{' '}
                    MM DESIGN ·{' '}
                    {formatNumber(
                      study.supportLayout?.sideBearingOverhangMm ?? 0,
                      1,
                    )}{' '}
                    MM MODEL
                  </span>
                  <small>
                    A shoulder extends beyond the upper mass in X. Adjust its
                    width, selected position, the upper X offset or the shared
                    upper width; RAAKA will not resize it.
                  </small>
                </div>
              ) : null}
            </div>
          ) : null}
          <p className="notice">
            {parameters.fuseGroups.length > 0 && fuseRenderStatus === 'ready'
              ? 'Fused groups use finished-union volume; remaining pieces are summed.'
              : 'Manufactured nominal solid estimate at 2,400 kg/m³.'}{' '}
            Structural approval, reinforcement and anchoring are outside this
            study.
          </p>
        </section>
      </aside>

      <footer className="statusbar">
        <span>
          <i className="status-dot" /> RECOVERY ON
        </span>
        <span>SEED {parameters.seed}</span>
        <span>SCALE 1:{modelScaleDenominator}</span>
        <span>
          {radial ? `${polygonSides}-SIDE RING` : `${parameters.supportCount} × ${parameters.supportRowCount} GRID`}
        </span>
        <span>{study.radialLayout?.totalSupports ?? study.supportLayout?.totalSupports ?? 0} {radial ? 'RADIAL' : 'GRID'} LEGS</span>
        <span>{study.pieces.length} OBJECTS</span>
        <span className="statusbar-end">RAAKA 0.1.24 / LOCAL</span>
      </footer>
    </main>
  )
}
