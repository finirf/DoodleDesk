import { useCallback } from 'react'

export default function useDeskShelfSyncActions({
  supabase,
  userId,
  shelfSupabaseSyncEnabledRef
}) {
  const syncDeskShelfPrefsToSupabase = useCallback(async (shelvesSnapshot, assignmentsSnapshot) => {
    if (!shelfSupabaseSyncEnabledRef.current) return

    const sanitizedShelves = shelvesSnapshot
      .filter((shelf) => shelf && typeof shelf.id === 'string' && typeof shelf.name === 'string')
      .map((shelf) => ({
        id: shelf.id,
        user_id: userId,
        name: shelf.name,
        parent_id: shelf.parent_id || null
      }))

    const validShelfIds = new Set(sanitizedShelves.map((shelf) => shelf.id))
    const sanitizedAssignments = Object.entries(assignmentsSnapshot)
      .filter(([deskId, shelfId]) => typeof deskId === 'string' && typeof shelfId === 'string' && validShelfIds.has(shelfId))
      .map(([deskId, shelfId]) => ({ desk_id: deskId, shelf_id: shelfId, user_id: userId }))

    const [existingShelvesResult, existingAssignmentsResult] = await Promise.all([
      supabase.from('desk_shelves').select('id').eq('user_id', userId),
      supabase.from('desk_shelf_assignments').select('desk_id').eq('user_id', userId)
    ])

    if (existingShelvesResult.error) throw existingShelvesResult.error
    if (existingAssignmentsResult.error) throw existingAssignmentsResult.error

    const existingShelfIds = new Set((existingShelvesResult.data || []).map((row) => row.id))
    const nextShelfIds = new Set(sanitizedShelves.map((shelf) => shelf.id))
    const shelvesToDelete = [...existingShelfIds].filter((shelfId) => !nextShelfIds.has(shelfId))

    if (sanitizedShelves.length > 0) {
      const { error: upsertShelvesError } = await supabase
        .from('desk_shelves')
        .upsert(sanitizedShelves, { onConflict: 'id' })
      if (upsertShelvesError) throw upsertShelvesError
    } else if (existingShelfIds.size > 0) {
      const { error: clearShelvesError } = await supabase
        .from('desk_shelves')
        .delete()
        .eq('user_id', userId)
      if (clearShelvesError) throw clearShelvesError
    }

    if (shelvesToDelete.length > 0) {
      const { error: deleteShelvesError } = await supabase
        .from('desk_shelves')
        .delete()
        .eq('user_id', userId)
        .in('id', shelvesToDelete)
      if (deleteShelvesError) throw deleteShelvesError
    }

    const existingAssignmentDeskIds = new Set((existingAssignmentsResult.data || []).map((row) => String(row.desk_id)))
    const nextAssignmentDeskIds = new Set(sanitizedAssignments.map((row) => String(row.desk_id)))
    const assignmentsToDelete = [...existingAssignmentDeskIds].filter((deskId) => !nextAssignmentDeskIds.has(deskId))

    if (sanitizedAssignments.length > 0) {
      const { error: upsertAssignmentsError } = await supabase
        .from('desk_shelf_assignments')
        .upsert(sanitizedAssignments, { onConflict: 'user_id,desk_id' })
      if (upsertAssignmentsError) throw upsertAssignmentsError
    }

    if (assignmentsToDelete.length > 0) {
      const { error: deleteAssignmentsError } = await supabase
        .from('desk_shelf_assignments')
        .delete()
        .eq('user_id', userId)
        .in('desk_id', assignmentsToDelete)
      if (deleteAssignmentsError) throw deleteAssignmentsError
    }
  }, [shelfSupabaseSyncEnabledRef, supabase, userId])

  return {
    syncDeskShelfPrefsToSupabase
  }
}