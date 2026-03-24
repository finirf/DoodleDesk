import { useCallback } from 'react'

export default function useDeskCollectionActions({
  supabase,
  userId,
  userEmail,
  desks,
  selectedDeskId,
  lastDeskStorageKey,
  loadMergedDesksForUser,
  normalizeCustomBackgroundValue,
  setDesks,
  setSelectedDeskId,
  setBackgroundMode,
  setCustomBackgroundUrl,
  setCustomBackgroundInput,
  setBackgroundMenuError,
  setShowDeskMenu,
  setDeskMenuMessage,
  setDeskMenuError,
  setEditingId,
  setEditValue,
  setChecklistEditItems,
  setNewChecklistItemText,
  setPendingDeleteId,
  setActiveDecorationHandleId,
  incrementUserStat
}) {
  const getDeskCustomBackgroundUrl = useCallback((desk) => {
    const candidates = [desk?.custom_background_url, desk?.background_url, desk?.background]
    for (const candidate of candidates) {
      const normalized = normalizeCustomBackgroundValue(candidate)
      if (normalized) return normalized
    }
    return ''
  }, [normalizeCustomBackgroundValue])

  const getDeskBackgroundValue = useCallback((desk) => {
    const modeFromColumn = typeof desk?.background_mode === 'string' ? desk.background_mode.trim() : ''
    const modeFromFallback = typeof desk?.background === 'string' ? desk.background.trim() : ''
    const nextMode = modeFromColumn || modeFromFallback

    if (nextMode === 'desk1' || nextMode === 'desk2' || nextMode === 'desk3' || nextMode === 'desk4') {
      return nextMode
    }

    const customUrl = getDeskCustomBackgroundUrl(desk)
    if ((nextMode === 'custom' && customUrl) || customUrl) {
      return 'custom'
    }

    return 'desk1'
  }, [getDeskCustomBackgroundUrl])

  const fetchDesks = useCallback(async () => {
    let loadedDesks = []
    try {
      loadedDesks = await loadMergedDesksForUser({
        supabase,
        userId,
        userEmail
      })
    } catch (error) {
      console.error(error?.message || 'Failed to fetch desks', error)
      return
    }

    setDesks(loadedDesks)

    if (loadedDesks.length === 0) {
      setSelectedDeskId(null)
      setBackgroundMode('desk1')
      return
    }

    setSelectedDeskId((prev) => {
      const lastDeskId = localStorage.getItem(lastDeskStorageKey)
      const nextDesk = loadedDesks.find((desk) => desk.id === prev)
        || loadedDesks.find((desk) => desk.id === lastDeskId)
        || loadedDesks[0]
      const nextBackgroundMode = getDeskBackgroundValue(nextDesk)
      const nextCustomBackground = getDeskCustomBackgroundUrl(nextDesk)
      setBackgroundMode(nextBackgroundMode)
      setCustomBackgroundUrl(nextBackgroundMode === 'custom' ? nextCustomBackground : '')
      setCustomBackgroundInput(nextBackgroundMode === 'custom' ? nextCustomBackground : '')
      setBackgroundMenuError('')
      return nextDesk.id
    })
  }, [
    getDeskBackgroundValue,
    getDeskCustomBackgroundUrl,
    lastDeskStorageKey,
    loadMergedDesksForUser,
    setBackgroundMenuError,
    setBackgroundMode,
    setCustomBackgroundInput,
    setCustomBackgroundUrl,
    setDesks,
    setSelectedDeskId,
    supabase,
    userEmail,
    userId
  ])

  const createDesk = useCallback(async (nextDeskName, options = {}) => {
    const trimmedName = (nextDeskName || '').trim()
    if (!trimmedName) {
      return { ok: false, errorMessage: 'Please enter a desk name.' }
    }

    const isCollaborative = Boolean(options.isCollaborative)
    const invitedFriendIds = Array.isArray(options.invitedFriendIds)
      ? Array.from(new Set(options.invitedFriendIds.filter((friendId) => friendId && friendId !== userId)))
      : []
    const shouldStartCollaborative = isCollaborative && invitedFriendIds.length > 0

    let createdDesk = null
    let createError = null

    const { data: withFlagData, error: withFlagError } = await supabase
      .from('desks')
      .insert([{ user_id: userId, name: trimmedName, background: 'desk1', is_collaborative: shouldStartCollaborative }])
      .select()

    if (withFlagError) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('desks')
        .insert([{ user_id: userId, name: trimmedName, background: 'desk1' }])
        .select()

      createError = fallbackError
      createdDesk = fallbackData?.[0]
      if (createdDesk && shouldStartCollaborative) {
        createdDesk = { ...createdDesk, is_collaborative: true }
      }
    } else {
      createdDesk = withFlagData?.[0]
    }

    if (createError || !createdDesk) {
      console.error('Failed to create desk:', createError)
      return { ok: false, errorMessage: createError?.message || 'Failed to create desk.' }
    }

    if (shouldStartCollaborative && invitedFriendIds.length > 0) {
      const invitedRows = invitedFriendIds.map((friendId) => ({
        desk_id: createdDesk.id,
        user_id: friendId
      }))

      const { error: invitedMemberInsertError } = await supabase
        .from('desk_members')
        .insert(invitedRows, { ignoreDuplicates: true })

      if (invitedMemberInsertError) {
        console.error('Failed to add collaborators:', invitedMemberInsertError)

        const { error: rollbackMembersError } = await supabase
          .from('desk_members')
          .delete()
          .eq('desk_id', createdDesk.id)

        if (rollbackMembersError) {
          console.error('Failed to rollback desk members during desk creation:', rollbackMembersError)
        }

        const { error: rollbackDeskError } = await supabase
          .from('desks')
          .delete()
          .eq('id', createdDesk.id)
          .eq('user_id', userId)

        if (rollbackDeskError) {
          console.error('Failed to rollback desk during creation:', rollbackDeskError)
          return {
            ok: false,
            errorMessage: 'Inviting collaborators failed and desk cleanup was incomplete. Please check your desk list.'
          }
        }

        return { ok: false, errorMessage: invitedMemberInsertError?.message || 'Failed to invite collaborators.' }
      }
    }

    setDesks((prev) => [...prev, createdDesk])
    setSelectedDeskId(createdDesk.id)
    setBackgroundMode(getDeskBackgroundValue(createdDesk))
    setCustomBackgroundUrl('')
    setCustomBackgroundInput('')
    setBackgroundMenuError('')
    setShowDeskMenu(false)
    await incrementUserStat('desks_created', 1)
    return { ok: true }
  }, [
    getDeskBackgroundValue,
    incrementUserStat,
    setBackgroundMenuError,
    setBackgroundMode,
    setCustomBackgroundInput,
    setCustomBackgroundUrl,
    setDesks,
    setSelectedDeskId,
    setShowDeskMenu,
    supabase,
    userId
  ])

  const renameCurrentDesk = useCallback(async (nextNameInput) => {
    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk) {
      return { ok: false, errorMessage: 'No desk selected.' }
    }

    const nextName = (nextNameInput || '').trim()
    if (!nextName) {
      return { ok: false, errorMessage: 'Please enter a desk name.' }
    }

    const { error } = await supabase
      .from('desks')
      .update({ name: nextName })
      .eq('id', currentDesk.id)
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to rename desk:', error)
      return { ok: false, errorMessage: error?.message || 'Failed to rename desk.' }
    }

    setDesks((prev) => prev.map((desk) => (desk.id === currentDesk.id ? { ...desk, name: nextName } : desk)))
    setShowDeskMenu(false)
    return { ok: true }
  }, [desks, selectedDeskId, setDesks, setShowDeskMenu, supabase, userId])

  const handleSelectDesk = useCallback((desk) => {
    if (!desk || desk.id === selectedDeskId) {
      setShowDeskMenu(false)
      return
    }

    setSelectedDeskId(desk.id)
    const nextBackgroundMode = getDeskBackgroundValue(desk)
    setBackgroundMode(nextBackgroundMode)
    setCustomBackgroundUrl(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(desk) : '')
    setCustomBackgroundInput(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(desk) : '')
    setBackgroundMenuError('')
    setDeskMenuMessage('')
    setDeskMenuError('')
    setEditingId(null)
    setEditValue('')
    setChecklistEditItems([])
    setNewChecklistItemText('')
    setPendingDeleteId(null)
    setActiveDecorationHandleId(null)
    setShowDeskMenu(false)
  }, [
    getDeskBackgroundValue,
    getDeskCustomBackgroundUrl,
    selectedDeskId,
    setActiveDecorationHandleId,
    setBackgroundMenuError,
    setBackgroundMode,
    setChecklistEditItems,
    setCustomBackgroundInput,
    setCustomBackgroundUrl,
    setDeskMenuError,
    setDeskMenuMessage,
    setEditingId,
    setEditValue,
    setNewChecklistItemText,
    setPendingDeleteId,
    setSelectedDeskId,
    setShowDeskMenu
  ])

  return {
    getDeskBackgroundValue,
    getDeskCustomBackgroundUrl,
    fetchDesks,
    createDesk,
    renameCurrentDesk,
    handleSelectDesk
  }
}
