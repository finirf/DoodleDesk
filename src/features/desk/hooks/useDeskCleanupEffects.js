import { useEffect } from 'react'

export default function useDeskCleanupEffects({
  clearAutoSaveStatusTimeout,
  shelfSyncTimeoutRef
}) {
  useEffect(() => {
    return () => {
      clearAutoSaveStatusTimeout()
      if (shelfSyncTimeoutRef.current) {
        clearTimeout(shelfSyncTimeoutRef.current)
        shelfSyncTimeoutRef.current = null
      }
    }
  }, [clearAutoSaveStatusTimeout, shelfSyncTimeoutRef])
}
