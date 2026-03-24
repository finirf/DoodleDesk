import { useEffect } from 'react'

export default function useDeskHistoryTracking({
  notes,
  notesRef,
  cloneNotesSnapshot,
  areNoteSnapshotsEqual,
  hasActivePointerInteraction,
  historyPastRef,
  historyFutureRef,
  previousNotesSnapshotRef,
  isApplyingHistoryRef,
  skipNextHistoryRef,
  setHistoryVersion
}) {
  useEffect(() => {
    notesRef.current = notes
  }, [notes, notesRef])

  useEffect(() => {
    const currentSnapshot = cloneNotesSnapshot(notes)

    if (skipNextHistoryRef.current) {
      skipNextHistoryRef.current = false
      previousNotesSnapshotRef.current = currentSnapshot
      return
    }

    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false
      previousNotesSnapshotRef.current = currentSnapshot
      return
    }

    // Pointer interactions emit many move updates; record one history step on release.
    if (hasActivePointerInteraction()) {
      return
    }

    const previousSnapshot = previousNotesSnapshotRef.current
    if (areNoteSnapshotsEqual(previousSnapshot, currentSnapshot)) {
      return
    }

    historyPastRef.current.push(cloneNotesSnapshot(previousSnapshot))
    if (historyPastRef.current.length > 60) {
      historyPastRef.current.shift()
    }
    historyFutureRef.current = []
    previousNotesSnapshotRef.current = currentSnapshot
    setHistoryVersion((prev) => prev + 1)
  }, [
    notes,
    cloneNotesSnapshot,
    areNoteSnapshotsEqual,
    hasActivePointerInteraction,
    historyPastRef,
    historyFutureRef,
    previousNotesSnapshotRef,
    isApplyingHistoryRef,
    skipNextHistoryRef,
    setHistoryVersion
  ])
}
