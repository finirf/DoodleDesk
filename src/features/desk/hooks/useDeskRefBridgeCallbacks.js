import { useCallback } from 'react'

export default function useDeskRefBridgeCallbacks({
  fetchDesksRef,
  fetchDeskItemsRef,
  fetchDeskActivityRef,
  resetDeskHistoryRef,
  clearSelectedDeskStateRef,
  syncDeskShelfPrefsRef
}) {
  const realtimeFetchDesks = useCallback(() => {
    if (typeof fetchDesksRef.current === 'function') {
      void fetchDesksRef.current()
    }
  }, [fetchDesksRef])

  const realtimeFetchDeskItems = useCallback((deskId) => {
    if (typeof fetchDeskItemsRef.current === 'function') {
      void fetchDeskItemsRef.current(deskId)
    }
  }, [fetchDeskItemsRef])

  const realtimeFetchDeskActivity = useCallback((deskId) => {
    if (typeof fetchDeskActivityRef.current === 'function') {
      void fetchDeskActivityRef.current(deskId)
    }
  }, [fetchDeskActivityRef])

  const handleSelectedDeskActivated = useCallback((deskId) => {
    if (typeof resetDeskHistoryRef.current === 'function') {
      resetDeskHistoryRef.current([])
    }
    if (typeof fetchDeskItemsRef.current === 'function') {
      void fetchDeskItemsRef.current(deskId)
    }
    if (typeof fetchDeskActivityRef.current === 'function') {
      void fetchDeskActivityRef.current(deskId)
    }
  }, [fetchDeskActivityRef, fetchDeskItemsRef, resetDeskHistoryRef])

  const handleSelectedDeskCleared = useCallback(() => {
    if (typeof clearSelectedDeskStateRef.current === 'function') {
      clearSelectedDeskStateRef.current()
    }
  }, [clearSelectedDeskStateRef])

  const runSyncDeskShelfPrefs = useCallback(async (shelvesSnapshot, assignmentsSnapshot) => {
    if (typeof syncDeskShelfPrefsRef.current === 'function') {
      await syncDeskShelfPrefsRef.current(shelvesSnapshot, assignmentsSnapshot)
    }
  }, [syncDeskShelfPrefsRef])

  return {
    realtimeFetchDesks,
    realtimeFetchDeskItems,
    realtimeFetchDeskActivity,
    handleSelectedDeskActivated,
    handleSelectedDeskCleared,
    runSyncDeskShelfPrefs
  }
}