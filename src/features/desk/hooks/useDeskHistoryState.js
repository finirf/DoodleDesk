/**
 * useDeskHistoryState
 *
 * Derives undo/redo availability status based on history version and ref state.
 * Centralizes history action capability checks.
 */
export default function useDeskHistoryState({
  historyVersion,
  historyPastRef,
  historyFutureRef
}) {
  const canUndo = historyVersion >= 0 && historyPastRef.current.length > 0
  const canRedo = historyVersion >= 0 && historyFutureRef.current.length > 0

  return {
    canUndo,
    canRedo
  }
}
