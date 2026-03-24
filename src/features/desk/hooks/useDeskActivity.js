import { useCallback } from 'react'

export default function useDeskActivity({
  supabase,
  userId,
  selectedDeskId,
  profileTab,
  setActivityFeed,
  setActivityError,
  setActivityLoading,
  isMissingTableError,
  withTimeout
}) {
  const getActivityActionLabel = useCallback((activity) => {
    const details = activity?.details && typeof activity.details === 'object' ? activity.details : {}
    const actorLabel = activity?.actor_display || 'Someone'
    const actionType = activity?.action_type || 'updated'
    const itemType = activity?.item_type || 'item'
    const summary = typeof details.summary === 'string' ? details.summary.trim() : ''

    if (summary) return `${actorLabel} ${summary}`

    switch (actionType) {
      case 'created':
        return `${actorLabel} created a ${itemType}`
      case 'edited':
        return `${actorLabel} edited a ${itemType}`
      case 'deleted':
        return `${actorLabel} deleted a ${itemType}`
      case 'duplicated':
        return `${actorLabel} duplicated a ${itemType}`
      case 'checked':
        return `${actorLabel} checked off a ${itemType}`
      case 'unchecked':
        return `${actorLabel} unchecked a ${itemType}`
      case 'imported':
        return `${actorLabel} imported desk content`
      case 'exported':
        return `${actorLabel} exported this desk`
      default:
        return `${actorLabel} updated a ${itemType}`
    }
  }, [])

  const fetchDeskActivity = useCallback(async (deskId = selectedDeskId) => {
    if (!deskId) {
      setActivityFeed([])
      setActivityError('')
      return
    }

    setActivityLoading(true)

    try {
      const { data: rows, error } = await withTimeout(
        supabase
          .from('desk_activity')
          .select('*')
          .eq('desk_id', deskId)
          .order('created_at', { ascending: false })
          .limit(40),
        8000
      )

      if (error) throw error

      const actorIds = Array.from(new Set((rows || []).map((row) => row.actor_user_id).filter(Boolean)))
      let actorProfilesById = new Map()

      if (actorIds.length > 0) {
        const { data: actorProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, preferred_name')
          .in('id', actorIds)

        // Allow partial failure: if profile fetch fails, show activity feed without resolved names.
        if (profileError) {
          console.warn('Failed to load activity feed actor profiles, using fallback labels:', profileError)
        } else if (actorProfiles) {
          actorProfilesById = new Map((actorProfiles || []).map((row) => [
            row.id,
            row.preferred_name?.trim() || row.email || 'Unknown user'
          ]))
        }
      }

      const hydratedRows = (rows || []).map((row) => ({
        ...row,
        actor_display: row.actor_user_id === userId
          ? 'You'
          : (actorProfilesById.get(row.actor_user_id) || 'Unknown user')
      }))

      setActivityFeed(hydratedRows)
      setActivityError('')
    } catch (error) {
      if (isMissingTableError(error, 'desk_activity')) {
        setActivityFeed([])
        setActivityError('Run the backend SQL activity feed migration to enable this tab.')
      } else {
        console.error('Failed to fetch desk activity:', error)
        setActivityError(error?.message || 'Could not load activity feed.')
      }
    } finally {
      setActivityLoading(false)
    }
  }, [isMissingTableError, selectedDeskId, setActivityError, setActivityFeed, setActivityLoading, supabase, userId, withTimeout])

  const logDeskActivity = useCallback(async ({ actionType, itemType, itemId, summary = '', metadata = null }) => {
    if (!selectedDeskId) return

    const details = {
      summary,
      ...(metadata && typeof metadata === 'object' ? metadata : {})
    }

    const payload = {
      desk_id: selectedDeskId,
      actor_user_id: userId,
      action_type: actionType,
      item_type: itemType,
      item_id: itemId ? String(itemId) : null,
      details
    }

    const { error } = await supabase
      .from('desk_activity')
      .insert([payload])

    if (error) {
      if (isMissingTableError(error, 'desk_activity')) return
      console.error('Failed to log desk activity:', error)
      return
    }

    if (profileTab === 'activity') {
      await fetchDeskActivity(selectedDeskId)
    }
  }, [fetchDeskActivity, isMissingTableError, profileTab, selectedDeskId, supabase, userId])

  return {
    fetchDeskActivity,
    getActivityActionLabel,
    logDeskActivity
  }
}