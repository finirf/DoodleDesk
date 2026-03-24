import { useEffect } from 'react'

export default function useDeskHistorySync({
  historySyncing,
  historySyncingRef,
  pendingHistoryActionRef,
  undoNotesActionRef,
  redoNotesActionRef,
  flushDeferredNotesRef
}) {
  useEffect(() => {
    historySyncingRef.current = historySyncing
    if (historySyncing) return

    const pendingAction = pendingHistoryActionRef.current
    pendingHistoryActionRef.current = null

    if (pendingAction === 'undo') {
      if (typeof undoNotesActionRef.current === 'function') {
        void undoNotesActionRef.current()
      }
      return
    }

    if (pendingAction === 'redo') {
      if (typeof redoNotesActionRef.current === 'function') {
        void redoNotesActionRef.current()
      }
      return
    }

    if (typeof flushDeferredNotesRef.current === 'function') {
      flushDeferredNotesRef.current()
    }
  }, [
    flushDeferredNotesRef,
    historySyncing,
    historySyncingRef,
    pendingHistoryActionRef,
    redoNotesActionRef,
    undoNotesActionRef
  ])
}