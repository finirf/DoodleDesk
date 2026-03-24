import { useEffect } from 'react'

function isMissingRoleColumnError(error) {
  if (!error) return false
  if (error.code === '42703') return true
  const searchable = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase()
  return searchable.includes('column') && searchable.includes('role') && searchable.includes('does not exist')
}

export default function useSelectedDeskLifecycle({
  supabase,
  userId,
  selectedDeskId,
  desks,
  onSelectedDeskCleared,
  onSelectedDeskActivated,
  setSelectedDeskMemberRole,
  setSelectedDeskMemberRoleLoading
}) {
  // Intentionally keyed to selected desk switches.
  useEffect(() => {
    if (!selectedDeskId) {
      onSelectedDeskCleared()
      return
    }

    onSelectedDeskActivated(selectedDeskId)
  }, [onSelectedDeskActivated, onSelectedDeskCleared, selectedDeskId])

  useEffect(() => {
    if (!selectedDeskId) {
      setSelectedDeskMemberRole('owner')
      setSelectedDeskMemberRoleLoading(false)
      return
    }

    const desk = desks.find((entry) => entry.id === selectedDeskId)
    if (!desk) {
      setSelectedDeskMemberRole('viewer')
      setSelectedDeskMemberRoleLoading(false)
      return
    }

    if (desk.user_id === userId) {
      setSelectedDeskMemberRole('owner')
      setSelectedDeskMemberRoleLoading(false)
      return
    }

    let isCancelled = false
    setSelectedDeskMemberRoleLoading(true)

    async function loadSelectedDeskMemberRole() {
      try {
        const { data, error } = await supabase
          .from('desk_members')
          .select('role')
          .eq('desk_id', selectedDeskId)
          .eq('user_id', userId)
          .maybeSingle()

        if (error) {
          if (isMissingRoleColumnError(error)) {
            if (!isCancelled) setSelectedDeskMemberRole('editor')
            return
          }
          throw error
        }

        if (!isCancelled) {
          setSelectedDeskMemberRole(data?.role === 'viewer' ? 'viewer' : 'editor')
        }
      } catch (error) {
        console.error('Failed to fetch selected desk member role:', error)
        if (!isCancelled) {
          setSelectedDeskMemberRole('viewer')
        }
      } finally {
        if (!isCancelled) {
          setSelectedDeskMemberRoleLoading(false)
        }
      }
    }

    loadSelectedDeskMemberRole()

    return () => {
      isCancelled = true
    }
  }, [desks, selectedDeskId, setSelectedDeskMemberRole, setSelectedDeskMemberRoleLoading, supabase, userId])
}