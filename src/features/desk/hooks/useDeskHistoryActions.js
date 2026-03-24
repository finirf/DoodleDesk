import {
  areComparableDeskItemsEqual,
  getPersistableDeskItem
} from '../utils/historyPersistenceUtils'
import { getItemKey } from '../utils/itemUtils'
import { normalizeChecklistReminderValue } from '../utils/reminderUtils'

export default function useDeskHistoryActions({
  supabase,
  userId,
  selectedDeskId,
  canCurrentUserEditDeskItems,
  hasModalOpen,
  forceSaveInProgress,
  setForceSaveInProgress,
  markAutoSaveSaving,
  markAutoSaveSaved,
  markAutoSaveError,
  setEditSaveError,
  historySyncingRef,
  pendingHistoryActionRef,
  historyPastRef,
  historyFutureRef,
  isApplyingHistoryRef,
  previousNotesSnapshotRef,
  notesRef,
  setNotes,
  closeItemEditor,
  cloneNotesSnapshot,
  setHistorySyncing,
  setHistoryVersion,
  resetDeskHistory,
  insertChecklistItemsWithReminderFallback,
  isMissingColumnError
}) {
  async function upsertRowsWithSchemaFallback(table, rows) {
    if (!rows.length) return

    let nextRows = rows

    while (true) {
      const { error } = await supabase
        .from(table)
        .upsert(nextRows, { onConflict: 'id' })

      if (!error) return

      if (isMissingColumnError(error, 'user_id')) {
        nextRows = nextRows.map((row) => {
          const nextRow = { ...row }
          delete nextRow.user_id
          return nextRow
        })
        continue
      }

      if (isMissingColumnError(error, 'text_color')) {
        nextRows = nextRows.map((row) => {
          const nextRow = { ...row }
          delete nextRow.text_color
          return nextRow
        })
        continue
      }

      if (isMissingColumnError(error, 'font_size')) {
        nextRows = nextRows.map((row) => {
          const nextRow = { ...row }
          delete nextRow.font_size
          return nextRow
        })
        continue
      }

      throw error
    }
  }

  async function persistHistoryTransition(previousSnapshot, nextSnapshot) {
    if (!selectedDeskId) return

    const previousByKey = new Map((previousSnapshot || []).map((item) => [getItemKey(item), item]))
    const nextByKey = new Map((nextSnapshot || []).map((item) => [getItemKey(item), item]))
    const allKeys = new Set([...previousByKey.keys(), ...nextByKey.keys()])

    const deleteIdsByTable = {
      notes: [],
      checklists: [],
      decorations: []
    }
    const upsertRowsByTable = {
      notes: [],
      checklists: [],
      decorations: []
    }
    const checklistIdsNeedingItemSync = new Set()
    const checklistItemsByChecklistId = new Map()

    allKeys.forEach((itemKey) => {
      const previousItem = previousByKey.get(itemKey)
      const nextItem = nextByKey.get(itemKey)

      if (!previousItem && !nextItem) return

      if (previousItem && !nextItem) {
        const persistable = getPersistableDeskItem(previousItem, userId)
        if (persistable?.table && persistable?.id) {
          deleteIdsByTable[persistable.table].push(persistable.id)
        }
        return
      }

      if (!previousItem && nextItem) {
        const persistable = getPersistableDeskItem(nextItem, userId)
        if (persistable?.table && persistable?.payload) {
          upsertRowsByTable[persistable.table].push(persistable.payload)
          if (persistable.item_type === 'checklist') {
            checklistIdsNeedingItemSync.add(persistable.id)
            checklistItemsByChecklistId.set(persistable.id, persistable.checklistItems || [])
          }
        }
        return
      }

      if (previousItem && nextItem && !areComparableDeskItemsEqual(previousItem, nextItem)) {
        const persistable = getPersistableDeskItem(nextItem, userId)
        if (persistable?.table && persistable?.payload) {
          upsertRowsByTable[persistable.table].push(persistable.payload)
          if (persistable.item_type === 'checklist') {
            checklistIdsNeedingItemSync.add(persistable.id)
            checklistItemsByChecklistId.set(persistable.id, persistable.checklistItems || [])
          }
        }
      }
    })

    for (const table of ['notes', 'checklists', 'decorations']) {
      const rowsToUpsert = upsertRowsByTable[table]
      if (rowsToUpsert.length > 0) {
        await upsertRowsWithSchemaFallback(table, rowsToUpsert)
      }
    }

    for (const checklistId of checklistIdsNeedingItemSync) {
      const { error: deleteItemsError } = await supabase
        .from('checklist_items')
        .delete()
        .eq('checklist_id', checklistId)

      if (deleteItemsError) throw deleteItemsError

      const nextItems = (checklistItemsByChecklistId.get(checklistId) || [])
        .map((entry, index) => ({
          checklist_id: checklistId,
          text: (entry?.text || '').trim(),
          is_checked: Boolean(entry?.is_checked),
          sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : index,
          due_at: normalizeChecklistReminderValue(entry?.due_at)
        }))
        .filter((entry) => entry.text.length > 0)

      if (nextItems.length > 0) {
        await insertChecklistItemsWithReminderFallback(nextItems)
      }
    }

    for (const table of ['decorations', 'notes', 'checklists']) {
      const idsToDelete = deleteIdsByTable[table]
      if (idsToDelete.length > 0) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('desk_id', selectedDeskId)
          .in('id', idsToDelete)

        if (error) throw error
      }
    }
  }

  async function undoNotesChange() {
    if (!canCurrentUserEditDeskItems) return
    if (historySyncingRef.current) {
      pendingHistoryActionRef.current = 'undo'
      return
    }

    const previousSnapshot = historyPastRef.current.pop()
    if (!previousSnapshot) return

    const currentSnapshot = cloneNotesSnapshot(notesRef.current)
    historyFutureRef.current.push(currentSnapshot)
    isApplyingHistoryRef.current = true
    previousNotesSnapshotRef.current = cloneNotesSnapshot(previousSnapshot)
    setNotes(cloneNotesSnapshot(previousSnapshot))
    closeItemEditor()
    setHistoryVersion((prev) => prev + 1)

    setHistorySyncing(true)
    try {
      await persistHistoryTransition(currentSnapshot, previousSnapshot)
    } catch (error) {
      console.error('Failed to persist undo operation:', error)
      setEditSaveError(error?.message || 'Undo failed to sync. Reverting local changes.')

      historyFutureRef.current.pop()
      historyPastRef.current.push(cloneNotesSnapshot(previousSnapshot))
      isApplyingHistoryRef.current = true
      previousNotesSnapshotRef.current = cloneNotesSnapshot(currentSnapshot)
      setNotes(cloneNotesSnapshot(currentSnapshot))
      setHistoryVersion((prev) => prev + 1)
    } finally {
      setHistorySyncing(false)
    }
  }

  async function redoNotesChange() {
    if (!canCurrentUserEditDeskItems) return
    if (historySyncingRef.current) {
      pendingHistoryActionRef.current = 'redo'
      return
    }

    const nextSnapshot = historyFutureRef.current.pop()
    if (!nextSnapshot) return

    const currentSnapshot = cloneNotesSnapshot(notesRef.current)
    historyPastRef.current.push(currentSnapshot)
    isApplyingHistoryRef.current = true
    previousNotesSnapshotRef.current = cloneNotesSnapshot(nextSnapshot)
    setNotes(cloneNotesSnapshot(nextSnapshot))
    closeItemEditor()
    setHistoryVersion((prev) => prev + 1)

    setHistorySyncing(true)
    try {
      await persistHistoryTransition(currentSnapshot, nextSnapshot)
    } catch (error) {
      console.error('Failed to persist redo operation:', error)
      setEditSaveError(error?.message || 'Redo failed to sync. Reverting local changes.')

      historyPastRef.current.pop()
      historyFutureRef.current.push(cloneNotesSnapshot(nextSnapshot))
      isApplyingHistoryRef.current = true
      previousNotesSnapshotRef.current = cloneNotesSnapshot(currentSnapshot)
      setNotes(cloneNotesSnapshot(currentSnapshot))
      setHistoryVersion((prev) => prev + 1)
    } finally {
      setHistorySyncing(false)
    }
  }

  async function forceSaveAndClearHistory() {
    if (!selectedDeskId) return
    if (!canCurrentUserEditDeskItems) return
    if (hasModalOpen) return
    if (historySyncingRef.current || forceSaveInProgress) return

    setForceSaveInProgress(true)
    markAutoSaveSaving()

    try {
      const localSnapshot = cloneNotesSnapshot(notesRef.current)

      const [
        { data: remoteNotes, error: remoteNotesError },
        { data: remoteChecklists, error: remoteChecklistsError },
        { data: remoteDecorations, error: remoteDecorationsError }
      ] = await Promise.all([
        supabase.from('notes').select('*').eq('desk_id', selectedDeskId),
        supabase.from('checklists').select('*').eq('desk_id', selectedDeskId),
        supabase.from('decorations').select('*').eq('desk_id', selectedDeskId)
      ])

      if (remoteNotesError) throw remoteNotesError
      if (remoteChecklistsError) throw remoteChecklistsError
      if (remoteDecorationsError) throw remoteDecorationsError

      const checklistRows = remoteChecklists || []
      const checklistIds = checklistRows.map((row) => row.id)
      let checklistItemsMap = new Map()

      if (checklistIds.length > 0) {
        const { data: remoteChecklistItems, error: remoteChecklistItemsError } = await supabase
          .from('checklist_items')
          .select('*')
          .in('checklist_id', checklistIds)
          .order('sort_order', { ascending: true })

        if (remoteChecklistItemsError) throw remoteChecklistItemsError

        checklistItemsMap = (remoteChecklistItems || []).reduce((acc, entry) => {
          const existing = acc.get(entry.checklist_id) || []
          existing.push(entry)
          acc.set(entry.checklist_id, existing)
          return acc
        }, new Map())
      }

      const remoteSnapshot = [
        ...(remoteNotes || []).map((row) => ({ ...row, item_type: 'note' })),
        ...checklistRows.map((row) => ({
          ...row,
          item_type: 'checklist',
          items: checklistItemsMap.get(row.id) || []
        })),
        ...(remoteDecorations || []).map((row) => ({ ...row, item_type: 'decoration' }))
      ]

      await persistHistoryTransition(remoteSnapshot, localSnapshot)
      resetDeskHistory(localSnapshot)
      pendingHistoryActionRef.current = null
      markAutoSaveSaved()
    } catch (error) {
      console.error('Force save failed:', error)
      markAutoSaveError(error?.message || 'Force save failed. Please try again.')
    } finally {
      setForceSaveInProgress(false)
    }
  }

  return {
    undoNotesChange,
    redoNotesChange,
    forceSaveAndClearHistory
  }
}
