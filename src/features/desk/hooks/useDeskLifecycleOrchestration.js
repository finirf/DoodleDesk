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
