import { useEffect, useEffectEvent } from 'react'

export default function useDeskBootstrapEffects({
  userId,
  fetchDesks,
  fetchFriends,
  fetchUserStats
}) {
  const runFetchDesksEffect = useEffectEvent(() => {
    void fetchDesks()
  })

  const runFetchFriendsEffect = useEffectEvent(() => {
    void fetchFriends()
  })

  const runFetchUserStatsEffect = useEffectEvent(() => {
    void fetchUserStats()
  })

  // Intentionally keyed to authenticated user identity changes.
  useEffect(() => {
    runFetchDesksEffect()
  }, [userId])

  // Intentionally keyed to authenticated user identity changes.
  useEffect(() => {
    runFetchFriendsEffect()
  }, [userId])

  // Intentionally keyed to authenticated user identity changes.
  useEffect(() => {
    runFetchUserStatsEffect()
  }, [userId])
}
