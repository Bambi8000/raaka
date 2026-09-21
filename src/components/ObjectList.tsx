import { partInGrid, partLabel } from '../core/partSelection'
import { randomLockTargetForPiece } from '../core/randomLocks'
import type { MassStudy, PilotiParameters } from '../core/types'

interface ObjectListProps {
  readonly study: MassStudy
  readonly parameters: PilotiParameters
  readonly selectedPieceId: string
  readonly fuseSelectionPieceIds: readonly string[]
  readonly isResolving: boolean
  readonly onSelect: (id: string) => void
  readonly onRestore: (id: string) => void
}

export function ObjectList({
  study, parameters, selectedPieceId, fuseSelectionPieceIds, isResolving, onSelect, onRestore,
}: ObjectListProps) {
  const visiblePieces = [...study.pieces, ...study.retainedCore.pieces]
  const lockedTargets = new Set(
    parameters.randomLocks.map((lock) => lock.targetId),
  )
  const isVariationLocked = (pieceId: string) => {
    const targetId = randomLockTargetForPiece(parameters, pieceId)
    return targetId !== undefined && lockedTargets.has(targetId)
  }
  return (
    <section className="panel-section object-section">
      <div className="section-heading"><span>02</span><h2>Objects</h2></div>
      <div className="object-list">
        {visiblePieces.length === 0 ? (
          <p className="empty-study">No parts remain. Restore a removed part or use Undo.</p>
        ) : null}
        {visiblePieces.map((piece) => (
          <button
            type="button"
            key={piece.id}
            className={[
              piece.id === selectedPieceId ? 'is-selected' : '',
              fuseSelectionPieceIds.includes(piece.id) ? 'is-fuse-selected' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onSelect(piece.id)}
            aria-pressed={piece.id === selectedPieceId}
          >
            <span className={`role-dot role-dot--${piece.role}`} />
            <span>{piece.label}</span>
            <small>{isVariationLocked(piece.id) ? 'LOCKED · ' : ''}{piece.kind.toUpperCase()}</small>
          </button>
        ))}
      </div>
      {parameters.fuseGroups.filter((group) =>
        !study.pieces.some((piece) => piece.id === group.id),
      ).map((group) => (
        <button
          className="inactive-fuse"
          key={group.id}
          type="button"
          aria-pressed={selectedPieceId === group.id}
          onClick={() => onSelect(group.id)}
        >
          Fuse {group.id.slice('fuse-'.length)} · {isResolving ? 'RESOLVING' : 'INACTIVE'}
        </button>
      ))}
      {parameters.removedPartIds.length > 0 ? (
        <details className="removed-parts" open>
          <summary>REMOVED PARTS ({parameters.removedPartIds.length})</summary>
          <p>Other part positions and source shapes are retained.</p>
          {parameters.removedPartIds.map((partId) => (
            <div key={partId}>
              <span>
                {partLabel(partId)}
                {partInGrid(partId, parameters) ? '' : ' · inactive layout'}
                {isVariationLocked(partId) ? ' · locked variation' : ''}
              </span>
              <button type="button" onClick={() => onRestore(partId)} aria-label={`Restore ${partLabel(partId)}`}>
                RESTORE
              </button>
            </div>
          ))}
        </details>
      ) : null}
    </section>
  )
}
