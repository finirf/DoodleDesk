import { useCallback } from 'react'

export default function useDeskDataQueries({
  supabase,
  userId,
  desks,
  deskShelfAssignments,
  setDesks,
  setExpandedDeskShelves,
  isMissingColumnError,
  withTimeout,
  setNotesFromRemote,
  setEditSaveError,
  getItemHeight,
  getItemWidth,
  isDecorationItem,
  growThreshold,
  viewportWidth,
  sectionHeight,
  setCanvasWidth,
  setCanvasHeight
}) {
  const syncOwnedDeskCollaborativeState = useCallback(async (deskId, members = []) => {
    if (!deskId) return

    const targetDesk = desks.find((desk) => desk.id === deskId)
    if (!targetDesk || targetDesk.user_id !== userId) return
    const hasCustomShelfAssignment = Boolean(deskShelfAssignments[deskId])

    const shouldBeCollaborative = members.some((member) => !member.is_owner)
    const isCurrentlyCollaborative = Boolean(targetDesk.is_collaborative)

    if (isCurrentlyCollaborative !== shouldBeCollaborative) {
      setDesks((prev) =>
        prev.map((desk) =>
          desk.id === deskId ? { ...desk, is_collaborative: shouldBeCollaborative } : desk
        )
      )

      if (!hasCustomShelfAssignment) {
        const nextBuiltInShelfId = shouldBeCollaborative ? '__sharing' : '__private'
        setExpandedDeskShelves((prev) => ({ ...prev, [nextBuiltInShelfId]: true }))
      }
    }

    const { error } = await supabase
      .from('desks')
      .update({ is_collaborative: shouldBeCollaborative })
      .eq('id', deskId)
      .eq('user_id', userId)

    if (error && !isMissingColumnError(error, 'is_collaborative')) {
      console.error('Failed to sync desk collaborative state:', error)
    }
  }, [deskShelfAssignments, desks, isMissingColumnError, setDesks, setExpandedDeskShelves, supabase, userId])

  const fetchDeskItems = useCallback(async (deskId) => {
    if (!deskId) {
      setNotesFromRemote([])
      return
    }

    try {
      const [
        { data: notesData, error: notesError },
        { data: checklistsData, error: checklistsError },
        { data: decorationsData, error: decorationsError }
      ] = await withTimeout(
        Promise.all([
          supabase.from('notes').select('*').eq('desk_id', deskId),
          supabase.from('checklists').select('*').eq('desk_id', deskId),
          supabase.from('decorations').select('*').eq('desk_id', deskId)
        ]),
        10000
      )

      if (notesError) {
        console.error('Failed to fetch notes:', notesError)
      }
      if (checklistsError) {
        console.error('Failed to fetch checklists:', checklistsError)
      }
      if (decorationsError) {
        console.error('Failed to fetch decorations:', decorationsError)
      }

      const checklistRows = checklistsData || []
      const checklistIds = checklistRows.map((row) => row.id)

      let checklistItemsMap = new Map()

      if (checklistIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('checklist_items')
          .select('*')
          .in('checklist_id', checklistIds)
          .order('sort_order', { ascending: true })

        if (itemsError) {
          console.error('Failed to fetch checklist items:', itemsError)
        } else {
          checklistItemsMap = (itemsData || []).reduce((acc, item) => {
            const existing = acc.get(item.checklist_id) || []
            existing.push(item)
            acc.set(item.checklist_id, existing)
            return acc
          }, new Map())
        }
      }

      const mappedNotes = (notesData || []).map((note) => ({ ...note, item_type: 'note' }))
      const mappedChecklists = checklistRows.map((checklist) => ({
        ...checklist,
        item_type: 'checklist',
        items: checklistItemsMap.get(checklist.id) || []
      }))
      const mappedDecorations = (decorationsData || []).map((decoration) => ({ ...decoration, item_type: 'decoration' }))

      const creatorIds = Array.from(
        new Set(
          [...mappedNotes, ...mappedChecklists]
            .map((item) => item.user_id)
            .filter((value) => Boolean(value))
        )
      )

      let creatorEmailById = new Map()
      if (creatorIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, preferred_name')
          .in('id', creatorIds)

        if (profileError) {
          console.error('Failed to fetch item creator profiles:', profileError)
        } else {
          creatorEmailById = new Map((profileRows || []).map((row) => [
            row.id,
            {
              email: row.email || '',
              preferredName: row.preferred_name || ''
            }
          ]))
        }
      }

      const combined = [...mappedNotes, ...mappedChecklists, ...mappedDecorations].map((item) => {
        if (isDecorationItem(item)) return item
        const creatorProfile = creatorEmailById.get(item.user_id)
        if (!creatorProfile) return item
        return {
          ...item,
          created_by_email: creatorProfile.email,
          created_by_name: creatorProfile.preferredName
        }
      })
      setNotesFromRemote(combined)

      const maxNoteBottom = combined.reduce((maxY, item) => {
        const itemBottom = (Number(item.y) || 0) + getItemHeight(item)
        return Math.max(maxY, itemBottom)
      }, 0)
      const maxNoteRight = combined.reduce((maxX, item) => {
        const itemRight = (Number(item.x) || 0) + getItemWidth(item)
        return Math.max(maxX, itemRight)
      }, 0)
      const requiredWidth = maxNoteRight + growThreshold
      const requiredHeight = maxNoteBottom + growThreshold
      setCanvasWidth((prev) => Math.max(prev, requiredWidth, viewportWidth))
      const requiredSections = Math.max(2, Math.ceil(requiredHeight / sectionHeight))
      setCanvasHeight((prev) => Math.max(prev, requiredSections * sectionHeight))
    } catch (error) {
      console.error('Failed to fetch desk items:', error)
      if (error?.message?.includes('timeout')) {
        setEditSaveError('Desk items took too long to load. Please try again.')
      }
      setNotesFromRemote([])
    }
  }, [
    getItemHeight,
    getItemWidth,
    growThreshold,
    isDecorationItem,
    sectionHeight,
    setCanvasHeight,
    setCanvasWidth,
    setEditSaveError,
    setNotesFromRemote,
    supabase,
    viewportWidth,
    withTimeout
  ])

  return {
    syncOwnedDeskCollaborativeState,
    fetchDeskItems
  }
}
