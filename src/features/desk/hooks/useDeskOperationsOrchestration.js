import useDeskRemoteNotesAndAutosave from './useDeskRemoteNotesAndAutosave'
import useDeskChecklistHelpers from './useDeskChecklistHelpers'
import useDeskActivity from './useDeskActivity'
import useDeskDataQueries from './useDeskDataQueries'

export default function useDeskOperationsOrchestration({
  remoteNotes,
  checklistHelpers,
  activity,
  dataQueries
}) {
  const {
    clearDeferredRemoteNotes,
    flushDeferredRemoteNotes,
    setNotesFromRemote,
    clearAutoSaveStatusTimeout,
    markAutoSaveSaving,
    markAutoSaveSaved,
    markAutoSaveError
  } = useDeskRemoteNotesAndAutosave(remoteNotes)

  const {
    insertChecklistItemsWithFallback,
    hasChecklistInCurrentNotes
  } = useDeskChecklistHelpers(checklistHelpers)

  const {
    fetchDeskActivity,
    getActivityActionLabel,
    logDeskActivity
  } = useDeskActivity(activity)

  const {
    syncOwnedDeskCollaborativeState,
    fetchDeskItems
  } = useDeskDataQueries({ ...dataQueries, setNotesFromRemote })

  return {
    clearDeferredRemoteNotes,
    flushDeferredRemoteNotes,
    setNotesFromRemote,
    clearAutoSaveStatusTimeout,
    markAutoSaveSaving,
    markAutoSaveSaved,
    markAutoSaveError,
    insertChecklistItemsWithFallback,
    hasChecklistInCurrentNotes,
    fetchDeskActivity,
    getActivityActionLabel,
    logDeskActivity,
    syncOwnedDeskCollaborativeState,
    fetchDeskItems
  }
}
