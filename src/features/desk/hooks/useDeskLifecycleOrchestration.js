import useDeskBootstrapEffects from './useDeskBootstrapEffects'
import useDeskGlobalUiEffects from './useDeskGlobalUiEffects'
import useDeskRefBridgeEffects from './useDeskRefBridgeEffects'
import useDeskRealtimeSubscriptions from './useDeskRealtimeSubscriptions'
import useDeskShelfPreferences from './useDeskShelfPreferences'
import useSelectedDeskLifecycle from './useSelectedDeskLifecycle'
import useDeskLocalPreferences from './useDeskLocalPreferences'
import useDeskHistorySync from './useDeskHistorySync'
import useDeskHistoryTracking from './useDeskHistoryTracking'
import useDeskCleanupEffects from './useDeskCleanupEffects'

/**
 * Orchestrates all side effects, subscriptions, and lifecycle hooks for the desk.
 * 
 * This hook manages React effects in logical groups (bootstrap, realtime, history, cleanup).
 * It does not produce state or actions—it only runs side effects as hooks and returns nothing.
 * Call this once per desk component mount to trigger all initialization and subscription logic.
 * 
 * **Effect domains:**
 * - Bootstrap: Load initial user desks, friends, and stats on mount
 * - Global UI: Handle modal visibility, keyboard shortcuts, confirmation flows
 * - Ref bridging: Connect action refs to orchestration callbacks for imperative access
 * - Realtime subscriptions: Initialize Supabase listeners for desk items, members, activity
 * - Shelf preferences: Load/sync shelf hierarchy and expansion state from localStorage/Supabase
 * - Selected desk lifecycle: React to desk selection changes (fetch member roles, clear old state)
 * - Local preferences: Load/save snap-to-grid and other local UI prefs to localStorage
 * - History sync: Synchronize undo/redo history across the app and to Supabase
 * - History tracking: Track note changes and build undo/redo history snapshots
 * - Cleanup: Unsubscribe from realtime channels and clear timeouts on unmount
 * 
 * @param {Object} config - Large configuration object with 10 sub-configs for each effect group
 * @returns {void} - This hook only runs side effects and returns nothing
 */
export default function useDeskLifecycleOrchestration({
  bootstrap,
  globalUi,
  refBridge,
  realtime,
  shelfPreferences,
  selectedDeskLifecycle,
  localPreferences,
  historySync,
  historyTracking,
  cleanup
}) {
  useDeskBootstrapEffects(bootstrap)
  useDeskGlobalUiEffects(globalUi)
  useDeskRefBridgeEffects(refBridge)
  useDeskRealtimeSubscriptions(realtime)
  useDeskShelfPreferences(shelfPreferences)
  useSelectedDeskLifecycle(selectedDeskLifecycle)
  useDeskLocalPreferences(localPreferences)
  useDeskHistorySync(historySync)
  useDeskHistoryTracking(historyTracking)
  useDeskCleanupEffects(cleanup)
}
