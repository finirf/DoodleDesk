import { useCallback } from 'react'

export default function useDeskFriendActions({
  supabase,
  userId,
  userEmail,
  friendEmailInput,
  setFriendEmailInput,
  setFriendSubmitting,
  setFriendError,
  setFriendMessage,
  setDeskMembersError,
  setDeskMembersMessage,
  setDeskMemberActionLoadingId,
  sendFriendRequestToUser,
  fetchFriends,
  friends,
  getProfileDisplayParts,
  openConfirmDialog,
  setFriendActionLoadingId
}) {
  const handleSendFriendRequest = useCallback(async (e) => {
    e.preventDefault()

    const targetEmail = friendEmailInput.trim().toLowerCase()
    if (!targetEmail) {
      setFriendError('Enter an email address to add a friend.')
      return
    }

    if (targetEmail === (userEmail || '').trim().toLowerCase()) {
      setFriendError('You cannot add yourself as a friend.')
      return
    }

    setFriendSubmitting(true)
    setFriendError('')
    setFriendMessage('')

    try {
      const { data: targetProfiles, error: targetError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', targetEmail)
        .limit(1)

      if (targetError) {
        throw targetError
      }

      const targetProfile = targetProfiles?.[0]
      if (!targetProfile) {
        setFriendError('No user found with that email yet.')
        return
      }

      const sendResult = await sendFriendRequestToUser(targetProfile.id, targetEmail)
      if (!sendResult.ok) {
        setFriendError(sendResult.errorMessage || 'Could not send friend request.')
        return
      }

      setFriendMessage(sendResult.successMessage || `Friend request sent to ${targetEmail}.`)
      setFriendEmailInput('')
      await fetchFriends()
    } catch (error) {
      console.error('Failed to send friend request:', error)
      setFriendError(error?.message || 'Could not send friend request.')
    } finally {
      setFriendSubmitting(false)
    }
  }, [fetchFriends, friendEmailInput, sendFriendRequestToUser, setFriendEmailInput, setFriendError, setFriendMessage, setFriendSubmitting, supabase, userEmail])

  const sendFriendRequestToDeskMember = useCallback(async (memberUserId, memberEmail) => {
    setDeskMembersError('')
    setDeskMembersMessage('')

    const loadingKey = `friend-request:${memberUserId}`
    setDeskMemberActionLoadingId(loadingKey)

    const sendResult = await sendFriendRequestToUser(memberUserId, memberEmail)
    if (!sendResult.ok) {
      setDeskMembersError(sendResult.errorMessage || 'Could not send friend request.')
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage(sendResult.successMessage || 'Friend request sent.')
    await fetchFriends()
    setDeskMemberActionLoadingId(null)
  }, [fetchFriends, sendFriendRequestToUser, setDeskMemberActionLoadingId, setDeskMembersError, setDeskMembersMessage])

  const respondToFriendRequest = useCallback(async (requestId, nextStatus) => {
    setFriendError('')
    setFriendMessage('')

    const { error } = await supabase
      .from('friend_requests')
      .update({ status: nextStatus })
      .eq('id', requestId)
      .eq('receiver_id', userId)
      .eq('status', 'pending')

    if (error) {
      console.error('Failed to update friend request:', error)
      setFriendError(error?.message || 'Could not update request.')
      return
    }

    setFriendMessage(nextStatus === 'accepted' ? 'Friend request accepted.' : 'Friend request declined.')
    await fetchFriends()
  }, [fetchFriends, setFriendError, setFriendMessage, supabase, userId])

  const cancelOutgoingFriendRequest = useCallback(async (requestId) => {
    setFriendError('')
    setFriendMessage('')

    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId)
      .eq('sender_id', userId)
      .eq('status', 'pending')

    if (error) {
      console.error('Failed to cancel friend request:', error)
      setFriendError(error?.message || 'Could not cancel request.')
      return
    }

    setFriendMessage('Friend request canceled.')
    await fetchFriends()
  }, [fetchFriends, setFriendError, setFriendMessage, supabase, userId])

  const removeFriend = useCallback(async (friendId) => {
    if (!friendId) return

    const friend = friends.find((entry) => entry.id === friendId)
    const friendDisplay = getProfileDisplayParts(friend)

    openConfirmDialog({
      title: 'Remove Friend',
      message: `Remove ${friendDisplay.primary || 'this friend'} from your friends list?`,
      confirmLabel: 'Remove',
      tone: 'danger',
      onConfirm: async () => {
        setFriendActionLoadingId(friendId)
        setFriendError('')
        setFriendMessage('')

        const { error } = await supabase
          .from('friend_requests')
          .delete()
          .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId},status.eq.accepted),and(sender_id.eq.${friendId},receiver_id.eq.${userId},status.eq.accepted)`)

        if (error) {
          console.error('Failed to remove friend:', error)
          setFriendError(error?.message || 'Could not remove friend.')
          setFriendActionLoadingId(null)
          return
        }

        setFriendMessage('Friend removed.')
        await fetchFriends()
        setFriendActionLoadingId(null)
      }
    })
  }, [fetchFriends, friends, getProfileDisplayParts, openConfirmDialog, setFriendActionLoadingId, setFriendError, setFriendMessage, supabase, userId])

  return {
    handleSendFriendRequest,
    sendFriendRequestToDeskMember,
    respondToFriendRequest,
    cancelOutgoingFriendRequest,
    removeFriend
  }
}
