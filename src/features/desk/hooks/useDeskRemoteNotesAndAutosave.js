import { useCallback } from 'react'

export default function useDeskRemoteNotesAndAutosave({
  historySyncingRef,
  hasActivePointerInteraction,
  deferredRemoteNotesRef,
  skipNextHistoryRef,
  setNotes,
  cloneNotesSnapshot,
  autoSaveStatusTimeoutRef,
  setAutoSaveStatus,
  setEditSaveError
}) {
  const flushDeferredRemoteNotes = useCallback(() => {
    if (historySyncingRef.current || hasActivePointerInteraction()) return
    if (!deferredRemoteNotesRef.current) return

    const deferredNotes = deferredRemoteNotesRef.current
    deferredRemoteNotesRef.current = null
    skipNextHistoryRef.current = true
    setNotes(cloneNotesSnapshot(deferredNotes))
  }, [
    cloneNotesSnapshot,
    deferredRemoteNotesRef,
    hasActivePointerInteraction,
    historySyncingRef,
    setNotes,
    skipNextHistoryRef
  ])

  const setNotesFromRemote = useCallback((nextNotes) => {
    if (historySyncingRef.current || hasActivePointerInteraction()) {
      deferredRemoteNotesRef.current = cloneNotesSnapshot(nextNotes)
      return
    }

    skipNextHistoryRef.current = true
    setNotes(cloneNotesSnapshot(nextNotes))
  }, [
    cloneNotesSnapshot,
    deferredRemoteNotesRef,
    hasActivePointerInteraction,
    historySyncingRef,
    setNotes,
    skipNextHistoryRef
  ])

  const clearAutoSaveStatusTimeout = useCallback(() => {
    if (!autoSaveStatusTimeoutRef.current) return
    clearTimeout(autoSaveStatusTimeoutRef.current)
    autoSaveStatusTimeoutRef.current = null
  }, [autoSaveStatusTimeoutRef])

  const markAutoSaveSaving = useCallback(() => {
    clearAutoSaveStatusTimeout()
    setAutoSaveStatus('saving')
  }, [clearAutoSaveStatusTimeout, setAutoSaveStatus])

  const markAutoSaveSaved = useCallback(() => {
    clearAutoSaveStatusTimeout()
    setAutoSaveStatus('saved')
    autoSaveStatusTimeoutRef.current = setTimeout(() => {
      setAutoSaveStatus('idle')
      autoSaveStatusTimeoutRef.current = null
    }, 1800)
  }, [autoSaveStatusTimeoutRef, clearAutoSaveStatusTimeout, setAutoSaveStatus])

  const markAutoSaveError = useCallback((message = '') => {
    clearAutoSaveStatusTimeout()
    setAutoSaveStatus('error')
    if (message) {
      setEditSaveError(message)
    }
  }, [clearAutoSaveStatusTimeout, setAutoSaveStatus, setEditSaveError])

  return {
    flushDeferredRemoteNotes,
    setNotesFromRemote,
    clearAutoSaveStatusTimeout,
    markAutoSaveSaving,
    markAutoSaveSaved,
    markAutoSaveError
  }
}
