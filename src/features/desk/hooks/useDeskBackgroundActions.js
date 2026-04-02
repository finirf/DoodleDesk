import { useCallback } from 'react'

export default function useDeskBackgroundActions({
  supabase,
  userId,
  selectedDeskId,
  desks,
  isMissingColumnError,
  normalizeCustomBackgroundValue,
  setBackgroundMode,
  setCustomBackgroundUrl,
  setCustomBackgroundInput,
  setBackgroundMenuError,
  setDesks,
  setShowDeskMenu
}) {
  const setCurrentDeskBackground = useCallback(async (mode) => {
    if (!selectedDeskId) return

    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk || currentDesk.user_id !== userId) {
      return
    }

    let updateError = null

    const { error: backgroundModeError } = await supabase
      .from('desks')
      .update({ background_mode: mode, background: mode })
      .eq('id', selectedDeskId)
      .eq('user_id', userId)

    if (backgroundModeError) {
      const { error: backgroundError } = await supabase
        .from('desks')
        .update({ background: mode })
        .eq('id', selectedDeskId)
        .eq('user_id', userId)
      updateError = backgroundError
    }

    if (updateError) {
      console.error('Failed to update desk background:', updateError)
      setBackgroundMenuError(updateError?.message || 'Could not update background.')
      return
    }

    setBackgroundMode(mode)
    setCustomBackgroundUrl('')
    setCustomBackgroundInput('')
    setBackgroundMenuError('')
    setDesks((prev) =>
      prev.map((desk) =>
        desk.id === selectedDeskId ? { ...desk, background_mode: mode, background: mode } : desk
      )
    )
    setShowDeskMenu(false)
  }, [
    desks,
    selectedDeskId,
    setBackgroundMenuError,
    setBackgroundMode,
    setCustomBackgroundInput,
    setCustomBackgroundUrl,
    setDesks,
    setShowDeskMenu,
    supabase,
    userId
  ])

  const setCurrentDeskCustomBackground = useCallback(async (urlInput) => {
    if (!selectedDeskId) return

    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk || currentDesk.user_id !== userId) return

    const normalizedUrl = normalizeCustomBackgroundValue(urlInput)
    if (!normalizedUrl) {
      setBackgroundMenuError('Please enter a valid hex color or http(s) image URL.')
      return
    }

    let updateError = null

    const { error: customModeError } = await supabase
      .from('desks')
      .update({ background_mode: 'custom', background: normalizedUrl })
      .eq('id', selectedDeskId)
      .eq('user_id', userId)

    if (customModeError) {
      const { error: fallbackError } = await supabase
        .from('desks')
        .update({ background: normalizedUrl })
        .eq('id', selectedDeskId)
        .eq('user_id', userId)
      updateError = fallbackError
    }

    if (updateError) {
      console.error('Failed to set custom background:', updateError)
      setBackgroundMenuError(updateError?.message || 'Could not set custom background.')
      return
    }

    setBackgroundMode('custom')
    setCustomBackgroundUrl(normalizedUrl)
    setCustomBackgroundInput(normalizedUrl)
    setBackgroundMenuError('')
    setDesks((prev) =>
      prev.map((desk) =>
        desk.id === selectedDeskId ? { ...desk, background_mode: 'custom', background: normalizedUrl } : desk
      )
    )
  }, [
    desks,
    normalizeCustomBackgroundValue,
    selectedDeskId,
    setBackgroundMenuError,
    setBackgroundMode,
    setCustomBackgroundInput,
    setCustomBackgroundUrl,
    setDesks,
    supabase,
    userId
  ])

  const setDeskCreatorLabelsVisible = useCallback(async (nextVisible) => {
    if (!selectedDeskId) return

    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk || currentDesk.user_id !== userId) return

    const nextValue = Boolean(nextVisible)

    const { error } = await supabase
      .from('desks')
      .update({ show_item_creator_labels: nextValue })
      .eq('id', selectedDeskId)
      .eq('user_id', userId)

    if (error && !isMissingColumnError(error, 'show_item_creator_labels')) {
      console.error('Failed to update creator label visibility:', error)
      setBackgroundMenuError(error?.message || 'Could not update item label visibility.')
      return
    }

    setBackgroundMenuError('')
    setDesks((prev) =>
      prev.map((desk) => (
        desk.id === selectedDeskId ? { ...desk, show_item_creator_labels: nextValue } : desk
      ))
    )
  }, [
    desks,
    isMissingColumnError,
    selectedDeskId,
    setBackgroundMenuError,
    setDesks,
    supabase,
    userId
  ])

  return {
    setCurrentDeskBackground,
    setCurrentDeskCustomBackground,
    setDeskCreatorLabelsVisible
  }
}