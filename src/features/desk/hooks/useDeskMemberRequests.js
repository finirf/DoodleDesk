import { useCallback } from 'react'

export default function useDeskMemberRequests({
  supabase,
  desks,
  selectedDeskId,
  userId,
  setDeskMembers,
  setDeskMembersLoading,
  setDeskMembersError,
  setDeskMemberRequests,
  setDeskMemberRequestsLoading,
  setDeskMemberRequestsError,
  setDeskMembersMessage,
  setDeskMemberActionLoadingId,
  syncOwnedDeskCollaborativeState
}) {
  const fetchDeskMembers = useCallback(async (deskId) => {
    if (!deskId) {
      setDeskMembers([])
      return []
    }

    const desk = desks.find((entry) => entry.id === deskId)
    if (!desk) {
      setDeskMembers([])
      return []
    }

    setDeskMembersLoading(true)
    setDeskMembersError('')

    try {
      const { data: membershipRows, error: membershipError } = await supabase
        .from('desk_members')
        .select('id, user_id, role, created_at')
        .eq('desk_id', deskId)
        .order('created_at', { ascending: true })

      if (membershipError) throw membershipError

      const memberRows = membershipRows || []
      const memberIds = Array.from(new Set([
        desk.user_id,
        ...memberRows.map((row) => row.user_id)
      ]))

      if (memberIds.length === 0) {
        setDeskMembers([])
        return []
      }

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, preferred_name')
        .in('id', memberIds)

      if (profileError) throw profileError

      const profileById = new Map((profileRows || []).map((row) => [
        row.id,
        {
          email: row.email || 'Unknown user',
          preferred_name: row.preferred_name || ''
        }
      ]))
      const membershipByUserId = new Map(memberRows.map((row) => [row.user_id, row]))
      const normalizedMembers = memberIds.map((memberId) => {
        const membershipRow = membershipByUserId.get(memberId)
        const normalizedRole = membershipRow?.role === 'viewer'
          ? 'viewer'
          : (membershipRow?.role === 'manager' ? 'manager' : 'editor')
        return {
          membership_id: membershipRow?.id || null,
          user_id: memberId,
          email: profileById.get(memberId)?.email || 'Unknown user',
          preferred_name: profileById.get(memberId)?.preferred_name || '',
          is_owner: memberId === desk.user_id,
          role: memberId === desk.user_id ? 'owner' : normalizedRole
        }
      })

      const sortedMembers = normalizedMembers.sort((left, right) => {
        if (left.is_owner && !right.is_owner) return -1
        if (!left.is_owner && right.is_owner) return 1
        return left.email.localeCompare(right.email)
      })

      setDeskMembers(sortedMembers)
      return sortedMembers
    } catch (error) {
      console.error('Failed to fetch desk members:', error)
      setDeskMembersError(error?.message || 'Could not load desk members.')
      setDeskMembers([])
      return []
    } finally {
      setDeskMembersLoading(false)
    }
  }, [desks, setDeskMembers, setDeskMembersError, setDeskMembersLoading, supabase])

  const fetchDeskMemberRequests = useCallback(async (deskId) => {
    if (!deskId) {
      setDeskMemberRequests([])
      return
    }

    const desk = desks.find((entry) => entry.id === deskId)
    if (!desk) {
      setDeskMemberRequests([])
      return
    }

    const isOwnerView = desk.user_id === userId

    setDeskMemberRequestsLoading(true)
    setDeskMemberRequestsError('')

    try {
      let query = supabase
        .from('desk_member_requests')
        .select('id, desk_id, requester_id, target_friend_id, owner_id, status, created_at')
        .eq('desk_id', deskId)
        .order('created_at', { ascending: false })

      if (isOwnerView) {
        query = query.eq('status', 'pending')
      } else {
        query = query.eq('requester_id', userId).eq('status', 'pending')
      }

      const { data: requestRows, error: requestError } = await query
      if (requestError) throw requestError

      const rows = requestRows || []
      if (rows.length === 0) {
        setDeskMemberRequests([])
        return
      }

      const profileIds = Array.from(new Set(rows.flatMap((row) => [row.requester_id, row.target_friend_id]).filter(Boolean)))
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, preferred_name')
        .in('id', profileIds)

      if (profileError) throw profileError

      const profileById = new Map((profileRows || []).map((row) => [
        row.id,
        {
          email: row.email || 'Unknown user',
          preferred_name: row.preferred_name || ''
        }
      ]))

      setDeskMemberRequests(rows.map((row) => ({
        ...row,
        requester_email: profileById.get(row.requester_id)?.email || 'Unknown user',
        requester_preferred_name: profileById.get(row.requester_id)?.preferred_name || '',
        target_friend_email: profileById.get(row.target_friend_id)?.email || 'Unknown user',
        target_friend_preferred_name: profileById.get(row.target_friend_id)?.preferred_name || ''
      })))
    } catch (error) {
      console.error('Failed to fetch desk member requests:', error)
      setDeskMemberRequestsError(error?.message || 'Could not load desk member requests.')
      setDeskMemberRequests([])
    } finally {
      setDeskMemberRequestsLoading(false)
    }
  }, [desks, setDeskMemberRequests, setDeskMemberRequestsError, setDeskMemberRequestsLoading, supabase, userId])

  const respondDeskMemberRequest = useCallback(async (request, nextStatus) => {
    if (!request?.id || !selectedDeskId) return

    const actionKey = `${nextStatus}:${request.id}`
    setDeskMemberActionLoadingId(actionKey)
    setDeskMembersError('')
    setDeskMemberRequestsError('')
    setDeskMembersMessage('')

    if (nextStatus === 'approved') {
      const { error: addError } = await supabase
        .from('desk_members')
        .insert([{ desk_id: selectedDeskId, user_id: request.target_friend_id }], { ignoreDuplicates: true })

      if (addError) {
        console.error('Failed to add approved desk member:', addError)
        setDeskMembersError(addError?.message || 'Could not add approved member.')
        setDeskMemberActionLoadingId(null)
        return
      }
    }

    const { error: updateError } = await supabase
      .from('desk_member_requests')
      .update({ status: nextStatus })
      .eq('id', request.id)

    if (updateError) {
      console.error('Failed to update desk member request:', updateError)
      setDeskMembersError(updateError?.message || 'Could not update request.')
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage(nextStatus === 'approved' ? 'Request approved and member added.' : 'Request declined.')
    const [updatedMembers] = await Promise.all([
      fetchDeskMembers(selectedDeskId),
      fetchDeskMemberRequests(selectedDeskId)
    ])
    if (nextStatus === 'approved') {
      await syncOwnedDeskCollaborativeState(selectedDeskId, updatedMembers)
    }
    setDeskMemberActionLoadingId(null)
  }, [
    fetchDeskMemberRequests,
    fetchDeskMembers,
    selectedDeskId,
    setDeskMemberActionLoadingId,
    setDeskMemberRequestsError,
    setDeskMembersError,
    setDeskMembersMessage,
    supabase,
    syncOwnedDeskCollaborativeState
  ])

  return {
    fetchDeskMembers,
    fetchDeskMemberRequests,
    respondDeskMemberRequest
  }
}