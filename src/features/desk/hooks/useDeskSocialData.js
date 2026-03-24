import { useCallback } from 'react'

export default function useDeskSocialData({
  supabase,
  userId,
  setProfileStats,
  setProfileStatsLoading,
  setFriendsLoading,
  setFriendError,
  setIncomingFriendRequests,
  setOutgoingFriendRequests,
  setFriends,
  ensureCurrentUserProfile
}) {
  const ensureUserStats = useCallback(async () => {
    const { error } = await supabase
      .from('user_stats')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })

    if (error) {
      console.error('Failed to ensure user stats row:', error)
    }
  }, [supabase, userId])

  const fetchUserStats = useCallback(async () => {
    setProfileStatsLoading(true)
    try {
      await ensureUserStats()
      const { data, error } = await supabase
        .from('user_stats')
        .select('desks_created, desks_deleted')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        throw error
      }

      setProfileStats({
        desks_created: Number(data?.desks_created) || 0,
        desks_deleted: Number(data?.desks_deleted) || 0
      })
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
      setProfileStats({ desks_created: 0, desks_deleted: 0 })
    } finally {
      setProfileStatsLoading(false)
    }
  }, [ensureUserStats, setProfileStats, setProfileStatsLoading, supabase, userId])

  const incrementUserStat = useCallback(async (statColumn, amount = 1) => {
    if (statColumn !== 'desks_created' && statColumn !== 'desks_deleted') return

    try {
      await ensureUserStats()

      const { data, error } = await supabase
        .from('user_stats')
        .select('desks_created, desks_deleted')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        throw error
      }

      const currentCreated = Number(data?.desks_created) || 0
      const currentDeleted = Number(data?.desks_deleted) || 0
      const nextValues = statColumn === 'desks_created'
        ? { desks_created: currentCreated + amount, desks_deleted: currentDeleted }
        : { desks_created: currentCreated, desks_deleted: currentDeleted + amount }

      const { error: updateError } = await supabase
        .from('user_stats')
        .update(nextValues)
        .eq('user_id', userId)

      if (updateError) {
        throw updateError
      }

      setProfileStats(nextValues)
    } catch (error) {
      console.error('Failed to update user stats:', error)
    }
  }, [ensureUserStats, setProfileStats, supabase, userId])

  const fetchFriends = useCallback(async () => {
    setFriendsLoading(true)
    setFriendError('')

    try {
      await ensureCurrentUserProfile()

      const [incomingResult, outgoingResult, acceptedResult] = await Promise.all([
        supabase
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at')
          .eq('receiver_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at')
          .eq('sender_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at')
          .or(`and(sender_id.eq.${userId},status.eq.accepted),and(receiver_id.eq.${userId},status.eq.accepted)`)
          .order('created_at', { ascending: false })
      ])

      if (incomingResult.error || outgoingResult.error || acceptedResult.error) {
        throw incomingResult.error || outgoingResult.error || acceptedResult.error
      }

      const incomingRows = incomingResult.data || []
      const outgoingRows = outgoingResult.data || []
      const acceptedRows = acceptedResult.data || []

      const profileIds = new Set()
      incomingRows.forEach((row) => profileIds.add(row.sender_id))
      outgoingRows.forEach((row) => profileIds.add(row.receiver_id))
      acceptedRows.forEach((row) => {
        const otherId = row.sender_id === userId ? row.receiver_id : row.sender_id
        profileIds.add(otherId)
      })

      let profileEmailById = new Map()
      const profileIdList = Array.from(profileIds)

      if (profileIdList.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, preferred_name')
          .in('id', profileIdList)

        if (profilesError) {
          throw profilesError
        }

        profileEmailById = new Map((profilesData || []).map((profile) => [
          profile.id,
          {
            email: profile.email || 'Unknown user',
            preferred_name: profile.preferred_name || ''
          }
        ]))
      }

      setIncomingFriendRequests(
        incomingRows.map((row) => ({
          ...row,
          email: profileEmailById.get(row.sender_id)?.email || 'Unknown user',
          preferred_name: profileEmailById.get(row.sender_id)?.preferred_name || ''
        }))
      )

      setOutgoingFriendRequests(
        outgoingRows.map((row) => ({
          ...row,
          email: profileEmailById.get(row.receiver_id)?.email || 'Unknown user',
          preferred_name: profileEmailById.get(row.receiver_id)?.preferred_name || ''
        }))
      )

      setFriends(
        acceptedRows.map((row) => {
          const friendId = row.sender_id === userId ? row.receiver_id : row.sender_id
          return {
            id: friendId,
            email: profileEmailById.get(friendId)?.email || 'Unknown user',
            preferred_name: profileEmailById.get(friendId)?.preferred_name || ''
          }
        })
      )
    } catch (error) {
      console.error('Failed to fetch friends:', error)
      setFriendError(error?.message || 'Could not load friends right now.')
    } finally {
      setFriendsLoading(false)
    }
  }, [ensureCurrentUserProfile, setFriendError, setFriends, setFriendsLoading, setIncomingFriendRequests, setOutgoingFriendRequests, supabase, userId])

  const sendFriendRequestToUser = useCallback(async (targetUserId, targetEmail) => {
    if (!targetUserId) {
      return { ok: false, errorMessage: 'Could not resolve target user.' }
    }

    if (targetUserId === userId) {
      return { ok: false, errorMessage: 'You cannot add yourself as a friend.' }
    }

    const safeTargetEmail = (targetEmail || '').trim().toLowerCase()

    await ensureCurrentUserProfile()

    const { data: existingRows, error: existingError } = await supabase
      .from('friend_requests')
      .select('id, status, sender_id, receiver_id')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`)
      .limit(1)

    if (existingError) {
      return { ok: false, errorMessage: existingError?.message || 'Could not check existing friend requests.' }
    }

    const existingRow = existingRows?.[0]
    if (existingRow) {
      if (existingRow.status === 'accepted') {
        return { ok: false, errorMessage: 'You are already friends with this user.' }
      }

      if (existingRow.status === 'pending') {
        if (existingRow.receiver_id === userId) {
          return { ok: false, errorMessage: 'This user already sent you a request. Accept it in the Friends tab.' }
        }
        return { ok: false, errorMessage: 'Friend request already sent.' }
      }
    }

    const { error: insertError } = await supabase
      .from('friend_requests')
      .insert([{ sender_id: userId, receiver_id: targetUserId, status: 'pending' }])

    if (insertError) {
      return { ok: false, errorMessage: insertError?.message || 'Could not send friend request.' }
    }

    return {
      ok: true,
      successMessage: `Friend request sent${safeTargetEmail ? ` to ${safeTargetEmail}` : ''}.`
    }
  }, [ensureCurrentUserProfile, supabase, userId])

  return {
    fetchUserStats,
    incrementUserStat,
    fetchFriends,
    sendFriendRequestToUser
  }
}