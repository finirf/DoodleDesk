import { useCallback, useState } from 'react'

export default function useDeskProfileData({
  supabase,
  userId,
  userEmail,
  selectedDeskId,
  fetchDeskItems
}) {
  const [preferredNameInput, setPreferredNameInput] = useState('')
  const [preferredNameSaving, setPreferredNameSaving] = useState(false)
  const [preferredNameError, setPreferredNameError] = useState('')
  const [preferredNameMessage, setPreferredNameMessage] = useState('')

  const ensureCurrentUserProfile = useCallback(async () => {
    const email = (userEmail || '').trim().toLowerCase()
    if (!email) return

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, email }, { onConflict: 'id' })

    if (error) {
      console.error('Failed to ensure profile exists:', error)
    }
  }, [supabase, userEmail, userId])

  const fetchCurrentUserProfile = useCallback(async () => {
    setPreferredNameError('')
    setPreferredNameMessage('')

    try {
      await ensureCurrentUserProfile()
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_name')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        throw error
      }

      setPreferredNameInput((data?.preferred_name || '').trim())
    } catch (error) {
      console.error('Failed to fetch current profile:', error)
      const message = error?.message || ''
      if (message.toLowerCase().includes('preferred_name')) {
        setPreferredNameError('Preferred name is not available yet. Add a preferred_name column to profiles first.')
      } else {
        setPreferredNameError('Could not load preferred name.')
      }
    }
  }, [ensureCurrentUserProfile, supabase, userId])

  const savePreferredName = useCallback(async () => {
    const nextPreferredName = preferredNameInput.trim()

    setPreferredNameSaving(true)
    setPreferredNameError('')
    setPreferredNameMessage('')

    try {
      await ensureCurrentUserProfile()
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_name: nextPreferredName || null })
        .eq('id', userId)

      if (error) {
        throw error
      }

      setPreferredNameMessage('Preferred name saved.')
      if (selectedDeskId) {
        await fetchDeskItems(selectedDeskId)
      }
    } catch (error) {
      console.error('Failed to save preferred name:', error)
      const message = error?.message || ''
      if (message.toLowerCase().includes('preferred_name')) {
        setPreferredNameError('Preferred name is not available yet. Add a preferred_name column to profiles first.')
      } else {
        setPreferredNameError(error?.message || 'Could not save preferred name.')
      }
    } finally {
      setPreferredNameSaving(false)
    }
  }, [ensureCurrentUserProfile, fetchDeskItems, preferredNameInput, selectedDeskId, supabase, userId])

  const updatePreferredNameInput = useCallback((value) => {
    if (preferredNameError) setPreferredNameError('')
    if (preferredNameMessage) setPreferredNameMessage('')
    setPreferredNameInput(value)
  }, [preferredNameError, preferredNameMessage])

  return {
    preferredNameInput,
    preferredNameSaving,
    preferredNameError,
    preferredNameMessage,
    updatePreferredNameInput,
    ensureCurrentUserProfile,
    fetchCurrentUserProfile,
    savePreferredName
  }
}