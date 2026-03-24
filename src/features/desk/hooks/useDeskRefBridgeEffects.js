import { useEffect } from 'react'

export default function useDeskRefBridgeEffects({
  fetchDesksRef,
  fetchDeskItemsRef,
  fetchDeskActivityRef,
  resetDeskHistoryRef,
  syncDeskShelfPrefsRef,
  undoNotesActionRef,
  redoNotesActionRef,
  flushDeferredNotesRef,
  clearSelectedDeskStateRef,
  fetchDesks,
  fetchDeskItems,
  fetchDeskActivity,
  resetDeskHistory,
  syncDeskShelfPrefsToSupabase,
  undoNotesChange,
  redoNotesChange,
  flushDeferredRemoteNotes,
  setSelectedDeskMemberRole,
  setSelectedDeskMemberRoleLoading,
  setNotesFromRemote,
  setActivityFeed,
  setActivityError
}) {
  useEffect(() => {
    fetchDesksRef.current = fetchDesks
    fetchDeskItemsRef.current = fetchDeskItems
    fetchDeskActivityRef.current = fetchDeskActivity
    resetDeskHistoryRef.current = resetDeskHistory
    syncDeskShelfPrefsRef.current = syncDeskShelfPrefsToSupabase
    undoNotesActionRef.current = undoNotesChange
    redoNotesActionRef.current = redoNotesChange
    flushDeferredNotesRef.current = flushDeferredRemoteNotes
    clearSelectedDeskStateRef.current = () => {
      setSelectedDeskMemberRole('owner')
      setSelectedDeskMemberRoleLoading(false)
      setNotesFromRemote([])
      setActivityFeed([])
      setActivityError('')
    }
  })
}
