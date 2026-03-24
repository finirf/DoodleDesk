import { useCallback } from 'react'

export default function useDeskMembershipActions({
  supabase,
  userId,
  selectedDeskId,
  desks,
  deskMembers,
  deskMemberRequests,
  isCurrentDeskOwner,
  lastDeskStorageKey,
  getDeskNameValue,
  getDeskBackgroundValue,
  getDeskCustomBackgroundUrl,
  openConfirmDialog,
  incrementUserStat,
  fetchDeskMembers,
  fetchDeskMemberRequests,
  syncOwnedDeskCollaborativeState,
  isMissingColumnError,
  setDesks,
  setSelectedDeskId,
  setBackgroundMode,
  setCustomBackgroundUrl,
  setCustomBackgroundInput,
  setNotes,
  setShowDeskMenu,
  setDeskMembersDialogOpen,
  setDeskMembersMessage,
  setDeskMembersError,
  setDeskMemberRequestsError,
  setDeskMemberActionLoadingId
}) {
  const deleteCurrentDesk = useCallback(async () => {
    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk) return

    openConfirmDialog({
      title: 'Delete Desk',
      message: `Delete "${getDeskNameValue(currentDesk)}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        const { error } = await supabase
          .from('desks')
          .delete()
          .eq('id', currentDesk.id)
          .eq('user_id', userId)

        if (error) {
          console.error('Failed to delete desk:', error)
          return
        }

        const savedDeskId = localStorage.getItem(lastDeskStorageKey)
        if (savedDeskId && savedDeskId === String(currentDesk.id)) {
          localStorage.removeItem(lastDeskStorageKey)
        }

        const remainingDesks = desks.filter((desk) => desk.id !== currentDesk.id)
        setDesks(remainingDesks)

        if (remainingDesks.length === 0) {
          setSelectedDeskId(null)
          setBackgroundMode('desk1')
          setCustomBackgroundUrl('')
          setCustomBackgroundInput('')
          setNotes([])
        } else {
          const nextDesk = remainingDesks[0]
          setSelectedDeskId(nextDesk.id)
          const nextBackgroundMode = getDeskBackgroundValue(nextDesk)
          setBackgroundMode(nextBackgroundMode)
          setCustomBackgroundUrl(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(nextDesk) : '')
          setCustomBackgroundInput(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(nextDesk) : '')
        }

        setShowDeskMenu(false)
        await incrementUserStat('desks_deleted', 1)
      }
    })
  }, [
    desks,
    getDeskBackgroundValue,
    getDeskCustomBackgroundUrl,
    getDeskNameValue,
    incrementUserStat,
    lastDeskStorageKey,
    openConfirmDialog,
    selectedDeskId,
    setBackgroundMode,
    setCustomBackgroundInput,
    setCustomBackgroundUrl,
    setDesks,
    setNotes,
    setSelectedDeskId,
    setShowDeskMenu,
    supabase,
    userId
  ])

  const leaveCurrentDesk = useCallback(async () => {
    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk || currentDesk.user_id === userId) return

    openConfirmDialog({
      title: 'Leave Desk',
      message: `Leave "${getDeskNameValue(currentDesk)}"?`,
      confirmLabel: 'Leave',
      tone: 'danger',
      onConfirm: async () => {
        const { error } = await supabase
          .from('desk_members')
          .delete()
          .eq('desk_id', currentDesk.id)
          .eq('user_id', userId)

        if (error) {
          console.error('Failed to leave desk:', error)
          return
        }

        const savedDeskId = localStorage.getItem(lastDeskStorageKey)
        if (savedDeskId && savedDeskId === String(currentDesk.id)) {
          localStorage.removeItem(lastDeskStorageKey)
        }

        const remainingDesks = desks.filter((desk) => desk.id !== currentDesk.id)
        setDesks(remainingDesks)

        if (remainingDesks.length === 0) {
          setSelectedDeskId(null)
          setBackgroundMode('desk1')
          setCustomBackgroundUrl('')
          setCustomBackgroundInput('')
          setNotes([])
        } else {
          const nextDesk = remainingDesks[0]
          setSelectedDeskId(nextDesk.id)
          const nextBackgroundMode = getDeskBackgroundValue(nextDesk)
          setBackgroundMode(nextBackgroundMode)
          setCustomBackgroundUrl(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(nextDesk) : '')
          setCustomBackgroundInput(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(nextDesk) : '')
        }

        setShowDeskMenu(false)
      }
    })
  }, [
    desks,
    getDeskBackgroundValue,
    getDeskCustomBackgroundUrl,
    getDeskNameValue,
    lastDeskStorageKey,
    openConfirmDialog,
    selectedDeskId,
    setBackgroundMode,
    setCustomBackgroundInput,
    setCustomBackgroundUrl,
    setDesks,
    setNotes,
    setSelectedDeskId,
    setShowDeskMenu,
    supabase,
    userId
  ])

  const openDeskMembersDialog = useCallback(async () => {
    const desk = desks.find((entry) => entry.id === selectedDeskId)
    if (!desk) return

    setDeskMembersDialogOpen(true)
    setDeskMembersMessage('')
    setDeskMembersError('')
    setDeskMemberRequestsError('')
    setDeskMemberActionLoadingId(null)
    await Promise.all([
      fetchDeskMembers(desk.id),
      fetchDeskMemberRequests(desk.id)
    ])
  }, [
    desks,
    fetchDeskMemberRequests,
    fetchDeskMembers,
    selectedDeskId,
    setDeskMemberActionLoadingId,
    setDeskMemberRequestsError,
    setDeskMembersDialogOpen,
    setDeskMembersError,
    setDeskMembersMessage
  ])

  const closeDeskMembersDialog = useCallback(() => {
    setDeskMembersDialogOpen(false)
    setDeskMembersError('')
    setDeskMemberRequestsError('')
    setDeskMembersMessage('')
    setDeskMemberActionLoadingId(null)
  }, [
    setDeskMemberActionLoadingId,
    setDeskMemberRequestsError,
    setDeskMembersDialogOpen,
    setDeskMembersError,
    setDeskMembersMessage
  ])

  const addDeskMember = useCallback(async (friendId) => {
    if (!selectedDeskId || !friendId) return

    setDeskMemberActionLoadingId(`add:${friendId}`)
    setDeskMembersError('')
    setDeskMembersMessage('')

    const { error } = await supabase
      .from('desk_members')
      .insert([{ desk_id: selectedDeskId, user_id: friendId }], { ignoreDuplicates: true })

    if (error) {
      console.error('Failed to add desk member:', error)
      setDeskMembersError(error?.message || 'Could not add member.')
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage('Member added.')
    const updatedMembers = await fetchDeskMembers(selectedDeskId)
    await syncOwnedDeskCollaborativeState(selectedDeskId, updatedMembers)
    setDeskMemberActionLoadingId(null)
  }, [
    fetchDeskMembers,
    selectedDeskId,
    setDeskMemberActionLoadingId,
    setDeskMembersError,
    setDeskMembersMessage,
    supabase,
    syncOwnedDeskCollaborativeState
  ])

  const removeDeskMember = useCallback(async (memberUserId) => {
    if (!selectedDeskId || !memberUserId) return

    setDeskMemberActionLoadingId(`remove:${memberUserId}`)
    setDeskMembersError('')
    setDeskMembersMessage('')

    const { error } = await supabase
      .from('desk_members')
      .delete()
      .eq('desk_id', selectedDeskId)
      .eq('user_id', memberUserId)

    if (error) {
      console.error('Failed to remove desk member:', error)
      setDeskMembersError(error?.message || 'Could not remove member.')
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage('Member removed.')
    const updatedMembers = await fetchDeskMembers(selectedDeskId)
    await syncOwnedDeskCollaborativeState(selectedDeskId, updatedMembers)
    setDeskMemberActionLoadingId(null)
  }, [
    fetchDeskMembers,
    selectedDeskId,
    setDeskMemberActionLoadingId,
    setDeskMembersError,
    setDeskMembersMessage,
    supabase,
    syncOwnedDeskCollaborativeState
  ])

  const updateDeskMemberRole = useCallback(async (memberUserId, nextRole) => {
    if (!selectedDeskId || !memberUserId) return
    if (nextRole !== 'editor' && nextRole !== 'viewer') return
    if (!isCurrentDeskOwner) return

    const targetMember = deskMembers.find((member) => member.user_id === memberUserId)
    if (!targetMember || targetMember.is_owner || targetMember.role === nextRole) return

    setDeskMemberActionLoadingId(`role:${memberUserId}`)
    setDeskMembersError('')
    setDeskMembersMessage('')

    const { error } = await supabase
      .from('desk_members')
      .update({ role: nextRole })
      .eq('desk_id', selectedDeskId)
      .eq('user_id', memberUserId)

    if (error) {
      console.error('Failed to update desk member role:', error)
      if (isMissingColumnError(error, 'role')) {
        setDeskMembersError('Desk member roles are not available yet. Run the latest SQL in BACKEND_SQL_README.md.')
      } else {
        setDeskMembersError(error?.message || 'Could not update role.')
      }
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage(nextRole === 'viewer' ? 'Member changed to Viewer.' : 'Member changed to Editor.')
    await fetchDeskMembers(selectedDeskId)
    setDeskMemberActionLoadingId(null)
  }, [
    deskMembers,
    fetchDeskMembers,
    isCurrentDeskOwner,
    isMissingColumnError,
    selectedDeskId,
    setDeskMemberActionLoadingId,
    setDeskMembersError,
    setDeskMembersMessage,
    supabase
  ])

  const requestDeskMemberAdd = useCallback(async (friendId) => {
    if (!selectedDeskId || !friendId) return

    const desk = desks.find((entry) => entry.id === selectedDeskId)
    if (!desk) return

    if (desk.user_id === userId) {
      await addDeskMember(friendId)
      return
    }

    const alreadyMember = deskMembers.some((member) => member.user_id === friendId)
    if (alreadyMember) {
      setDeskMembersMessage('This friend is already in the desk.')
      return
    }

    const alreadyRequested = deskMemberRequests.some((request) => request.target_friend_id === friendId && request.status === 'pending')
    if (alreadyRequested) {
      setDeskMembersMessage('You already requested this friend.')
      return
    }

    setDeskMemberActionLoadingId(`request:${friendId}`)
    setDeskMembersError('')
    setDeskMemberRequestsError('')
    setDeskMembersMessage('')

    const { error } = await supabase
      .from('desk_member_requests')
      .insert([{
        desk_id: selectedDeskId,
        requester_id: userId,
        target_friend_id: friendId,
        owner_id: desk.user_id,
        status: 'pending'
      }])

    if (error) {
      console.error('Failed to create desk member request:', error)
      setDeskMembersError(error?.message || 'Could not send request to owner.')
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage('Request sent to desk owner.')
    await fetchDeskMemberRequests(selectedDeskId)
    setDeskMemberActionLoadingId(null)
  }, [
    addDeskMember,
    deskMemberRequests,
    deskMembers,
    desks,
    fetchDeskMemberRequests,
    selectedDeskId,
    setDeskMemberActionLoadingId,
    setDeskMemberRequestsError,
    setDeskMembersError,
    setDeskMembersMessage,
    supabase,
    userId
  ])

  return {
    deleteCurrentDesk,
    leaveCurrentDesk,
    openDeskMembersDialog,
    closeDeskMembersDialog,
    addDeskMember,
    removeDeskMember,
    updateDeskMemberRole,
    requestDeskMemberAdd
  }
}