import useDeskRemoteNotesAndAutosave from './useDeskRemoteNotesAndAutosave'
import useDeskChecklistHelpers from './useDeskChecklistHelpers'
import useDeskActivity from './useDeskActivity'
import useDeskDataQueries from './useDeskDataQueries'

/**
 * Orchestrates operations that support remote synchronization, autosave, activity logging, and data queries.
 * 
 * This hook provides read-only operations (callbacks, data fetchers, helpers) that handle:
 * - Deferred remote note synchronization (conflict resolution)
 * - Autosave status tracking
 * - Checklist item insertion with fallback behaviors
 * - Activity feed logging and fetching
 * - Desk item and member data queries
 * 
 * **Output domains:**
 * - Remote notes (clearDeferredRemoteNotes, flushDeferredRemoteNotes, setNotesFromRemote)
 * - Autosave status (clearAutoSaveStatusTimeout, markAutoSaveSaving, markAutoSaveSaved, markAutoSaveError)
 * - Checklist helpers (insertChecklistItemsWithFallback, hasChecklistInCurrentNotes)
 * - Activity (fetchDeskActivity, getActivityActionLabel, logDeskActivity)
 * - Data queries (syncOwnedDeskCollaborativeState, fetchDeskItems)
 * 
 * @param {Object} config
 * @param {Object} config.remoteNotes - Remote sync configuration (deferredRemoteNotesRef, historySyncingRef, etc.)
 * @param {Object} config.checklistHelpers - Checklist config (notesRef, supabase, isMissingColumnError)
 * @param {Object} config.activity - Activity config (supabase, userId, profileTab, setters)
 * @param {Object} config.dataQueries - Query config (supabase, userId, desks, deskShelfAssignments, etc.)
 * @returns {Object} Operations object with all callback and data-fetching utilities
 */
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
