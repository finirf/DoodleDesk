import { useEffect } from 'react'

export default function useDeskRealtimeSubscriptions({
  supabase,
  userId,
  selectedDeskId,
  profileTab,
  deskLiveChannelName,
  deskMembersLiveChannelName,
  hasChecklistInCurrentNotes,
  onFetchDesks,
  onFetchDeskItems,
  onFetchDeskActivity
}) {
  useEffect(() => {
    const channel = supabase
      .channel(deskMembersLiveChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'desk_members',
          filter: `user_id=eq.${userId}`
        },
        () => {
          onFetchDesks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [deskMembersLiveChannelName, onFetchDesks, supabase, userId])

  useEffect(() => {
    if (!selectedDeskId) return

    let itemRefreshTimeoutId = null
    let deskRefreshTimeoutId = null
    let syncFallbackIntervalId = null

    const scheduleDeskItemRefresh = () => {
      if (itemRefreshTimeoutId) {
        clearTimeout(itemRefreshTimeoutId)
      }

      itemRefreshTimeoutId = setTimeout(() => {
        itemRefreshTimeoutId = null
        onFetchDeskItems(selectedDeskId)
      }, 140)
    }

    const scheduleDeskListRefresh = () => {
      if (deskRefreshTimeoutId) {
        clearTimeout(deskRefreshTimeoutId)
      }

      deskRefreshTimeoutId = setTimeout(() => {
        deskRefreshTimeoutId = null
        onFetchDesks()
      }, 140)
    }

    const channel = supabase
      .channel(deskLiveChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `desk_id=eq.${selectedDeskId}`
        },
        () => {
          scheduleDeskItemRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklists',
          filter: `desk_id=eq.${selectedDeskId}`
        },
        () => {
          scheduleDeskItemRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'decorations',
          filter: `desk_id=eq.${selectedDeskId}`
        },
        () => {
          scheduleDeskItemRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_items'
        },
        (payload) => {
          const checklistId = payload?.new?.checklist_id || payload?.old?.checklist_id || null
          if (!hasChecklistInCurrentNotes(checklistId)) return
          scheduleDeskItemRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'desks',
          filter: `id=eq.${selectedDeskId}`
        },
        () => {
          scheduleDeskListRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'desk_members',
          filter: `desk_id=eq.${selectedDeskId}`
        },
        () => {
          scheduleDeskListRefresh()
          scheduleDeskItemRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'desk_activity',
          filter: `desk_id=eq.${selectedDeskId}`
        },
        () => {
          if (profileTab === 'activity') {
            onFetchDeskActivity(selectedDeskId)
          }
        }
      )
      .subscribe()

    syncFallbackIntervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      scheduleDeskItemRefresh()
    }, 12000)

    return () => {
      if (itemRefreshTimeoutId) {
        clearTimeout(itemRefreshTimeoutId)
      }
      if (deskRefreshTimeoutId) {
        clearTimeout(deskRefreshTimeoutId)
      }
      if (syncFallbackIntervalId) {
        clearInterval(syncFallbackIntervalId)
      }
      supabase.removeChannel(channel)
    }
  }, [
    deskLiveChannelName,
    hasChecklistInCurrentNotes,
    onFetchDeskActivity,
    onFetchDeskItems,
    onFetchDesks,
    profileTab,
    selectedDeskId,
    supabase
  ])
}