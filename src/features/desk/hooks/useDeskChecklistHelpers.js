import { useCallback } from 'react'
import {
  insertChecklistItemsWithReminderFallback,
  isChecklistItem
} from '../utils/itemUtils'

export default function useDeskChecklistHelpers({
  supabase,
  isMissingColumnError,
  notesRef
}) {
  const insertChecklistItemsWithFallback = useCallback((rows, options = {}) => {
    return insertChecklistItemsWithReminderFallback({
      supabase,
      isMissingColumnError,
      rows,
      options
    })
  }, [isMissingColumnError, supabase])

  const hasChecklistInCurrentNotes = useCallback((checklistId) => {
    if (!checklistId) return false
    return notesRef.current.some((row) => isChecklistItem(row) && row.id === checklistId)
  }, [notesRef])

  return {
    insertChecklistItemsWithFallback,
    hasChecklistInCurrentNotes
  }
}
