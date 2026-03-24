import { useMemo } from 'react'

/**
 * useDeskRealtimeChannelNames
 *
 * Derives the live channel name patterns used for Supabase realtime subscriptions.
 * Centralizes naming conventions for desk and desk-members channel subscriptions.
 */
export default function useDeskRealtimeChannelNames({ selectedDeskId, userId }) {
  const deskLiveChannelName = useMemo(
    () => (selectedDeskId ? `desk-live:${selectedDeskId}:${userId}` : ''),
    [selectedDeskId, userId]
  )

  const deskMembersLiveChannelName = useMemo(
    () => `desk-members-live:${userId}`,
    [userId]
  )

  return {
    deskLiveChannelName,
    deskMembersLiveChannelName
  }
}
