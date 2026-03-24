import { useEffect } from 'react'

export default function useDeskShelfPreferences({
  supabase,
  userId,
  shelfPrefsStorageKey,
  shelfSupabaseSyncEnabledRef,
  shelfSyncTimeoutRef,
  shelfPrefsHydrated,
  setShelfPrefsHydrated,
  deskShelves,
  setDeskShelves,
  deskShelfAssignments,
  setDeskShelfAssignments,
  expandedDeskShelves,
  setExpandedDeskShelves,
  desks,
  isMissingShelfStorageTableError,
  onSyncDeskShelfPrefs
}) {
  useEffect(() => {
    if (shelfSyncTimeoutRef.current) {
      clearTimeout(shelfSyncTimeoutRef.current)
      shelfSyncTimeoutRef.current = null
    }

    setShelfPrefsHydrated(false)
    let isCancelled = false

    const defaultExpanded = { __private: true, __shared: true, __sharing: true, __custom_root: true }

    const loadFromLocalStorage = () => {
      try {
        const rawValue = localStorage.getItem(shelfPrefsStorageKey)
        if (!rawValue) {
          return {
            shelves: [],
            assignments: {},
            expanded: defaultExpanded
          }
        }

        const parsed = JSON.parse(rawValue)
        const parsedShelves = Array.isArray(parsed?.shelves)
          ? parsed.shelves.filter((shelf) => shelf && typeof shelf.id === 'string' && typeof shelf.name === 'string')
          : []
        const parsedAssignments = parsed?.assignments && typeof parsed.assignments === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.assignments).filter((entry) => {
                const [deskId, shelfId] = entry
                return typeof deskId === 'string' && typeof shelfId === 'string'
              })
            )
          : {}
        const parsedExpanded = parsed?.expanded && typeof parsed.expanded === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.expanded).filter((entry) => {
                const [shelfId, expanded] = entry
                return typeof shelfId === 'string' && typeof expanded === 'boolean'
              })
            )
          : {}

        return {
          shelves: parsedShelves,
          assignments: parsedAssignments,
          expanded: { ...defaultExpanded, ...parsedExpanded }
        }
      } catch (error) {
        console.error('Failed to load local desk shelf preferences:', error)
        return {
          shelves: [],
          assignments: {},
          expanded: defaultExpanded
        }
      }
    }

    const applyLoadedState = (loadedState) => {
      if (isCancelled) return
      setDeskShelves(loadedState.shelves)
      setDeskShelfAssignments(loadedState.assignments)
      setExpandedDeskShelves(loadedState.expanded)
      setShelfPrefsHydrated(true)
    }

    async function loadShelfPrefs() {
      const localState = loadFromLocalStorage()

      if (!shelfSupabaseSyncEnabledRef.current) {
        applyLoadedState(localState)
        return
      }

      try {
        const [shelvesResult, assignmentsResult] = await Promise.all([
          supabase
            .from('desk_shelves')
            .select('id, name, parent_id')
            .eq('user_id', userId),
          supabase
            .from('desk_shelf_assignments')
            .select('desk_id, shelf_id')
            .eq('user_id', userId)
        ])

        if (shelvesResult.error) throw shelvesResult.error
        if (assignmentsResult.error) throw assignmentsResult.error

        const supabaseShelves = (shelvesResult.data || [])
          .filter((shelf) => shelf && typeof shelf.id === 'string' && typeof shelf.name === 'string')
          .map((shelf) => ({ id: shelf.id, name: shelf.name, parent_id: shelf.parent_id || null }))

        const validShelfIds = new Set(supabaseShelves.map((shelf) => shelf.id))
        const supabaseAssignments = Object.fromEntries(
          (assignmentsResult.data || [])
            .filter((row) => {
              const deskId = String(row?.desk_id || '')
              const shelfId = typeof row?.shelf_id === 'string' ? row.shelf_id : ''
              return deskId.length > 0 && validShelfIds.has(shelfId)
            })
            .map((row) => [String(row.desk_id), row.shelf_id])
        )

        applyLoadedState({
          shelves: supabaseShelves,
          assignments: supabaseAssignments,
          expanded: localState.expanded
        })
      } catch (error) {
        if (isMissingShelfStorageTableError(error)) {
          shelfSupabaseSyncEnabledRef.current = false
        } else {
          console.error('Failed loading desk shelves from Supabase, using local fallback:', error)
        }
        applyLoadedState(localState)
      }
    }

    loadShelfPrefs()

    return () => {
      isCancelled = true
      if (shelfSyncTimeoutRef.current) {
        clearTimeout(shelfSyncTimeoutRef.current)
        shelfSyncTimeoutRef.current = null
      }
    }
  }, [
    isMissingShelfStorageTableError,
    setDeskShelfAssignments,
    setDeskShelves,
    setExpandedDeskShelves,
    setShelfPrefsHydrated,
    shelfPrefsStorageKey,
    shelfSupabaseSyncEnabledRef,
    shelfSyncTimeoutRef,
    supabase,
    userId
  ])

  // Intentionally re-evaluated when hydrated shelf snapshots change.
  useEffect(() => {
    if (!shelfPrefsHydrated) return
    try {
      localStorage.setItem(
        shelfPrefsStorageKey,
        JSON.stringify({
          shelves: deskShelves,
          assignments: deskShelfAssignments,
          expanded: expandedDeskShelves
        })
      )
    } catch (error) {
      console.error('Failed to persist desk shelf preferences:', error)
    }

    if (!shelfSupabaseSyncEnabledRef.current) return

    if (shelfSyncTimeoutRef.current) {
      clearTimeout(shelfSyncTimeoutRef.current)
      shelfSyncTimeoutRef.current = null
    }

    const shelvesSnapshot = [...deskShelves]
    const assignmentsSnapshot = { ...deskShelfAssignments }

    shelfSyncTimeoutRef.current = setTimeout(async () => {
      try {
        await onSyncDeskShelfPrefs(shelvesSnapshot, assignmentsSnapshot)
      } catch (error) {
        if (isMissingShelfStorageTableError(error)) {
          shelfSupabaseSyncEnabledRef.current = false
          return
        }
        console.error('Failed to sync desk shelf preferences to Supabase:', error)
      }
    }, 250)

    return () => {
      if (shelfSyncTimeoutRef.current) {
        clearTimeout(shelfSyncTimeoutRef.current)
        shelfSyncTimeoutRef.current = null
      }
    }
  }, [
    deskShelfAssignments,
    deskShelves,
    expandedDeskShelves,
    isMissingShelfStorageTableError,
    onSyncDeskShelfPrefs,
    shelfPrefsHydrated,
    shelfPrefsStorageKey,
    shelfSupabaseSyncEnabledRef,
    shelfSyncTimeoutRef
  ])

  useEffect(() => {
    if (!shelfPrefsHydrated) return
    if (desks.length === 0) return

    const validDeskIds = new Set(desks.map((desk) => String(desk.id)))
    const validShelfIds = new Set(deskShelves.map((shelf) => shelf.id))

    setDeskShelfAssignments((prev) => {
      const nextEntries = Object.entries(prev).filter(([deskId, shelfId]) => validDeskIds.has(deskId) && validShelfIds.has(shelfId))
      const didChange = nextEntries.length !== Object.keys(prev).length
      return didChange ? Object.fromEntries(nextEntries) : prev
    })
  }, [deskShelves, desks, setDeskShelfAssignments, shelfPrefsHydrated])
}