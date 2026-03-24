import { useCallback } from 'react'
import {
  getDecorationOption,
  getDefaultItemColor,
  getItemColor,
  getItemFontFamily,
  getItemFontSize,
  getItemHeight,
  getItemKey,
  getItemTableName,
  getItemTextColor,
  getItemWidth,
  isChecklistItem,
  isDecorationItem,
  isMissingColumnError,
  normalizeFontSize,
  toStoredRotation
} from '../utils/itemUtils'
import { normalizeChecklistReminderValue } from '../utils/reminderUtils'

// Local helper: check if two rectangles overlap with optional gap
function areRectanglesOverlapping(rectA, rectB, gap = 8) {
  const left1 = rectA.x
  const right1 = rectA.x + rectA.width
  const top1 = rectA.y
  const bottom1 = rectA.y + rectA.height
  const left2 = rectB.x
  const right2 = rectB.x + rectB.width
  const top2 = rectB.y
  const bottom2 = rectB.y + rectB.height
  return !(right1 + gap < left2 || right2 + gap < left1 || bottom1 + gap < top2 || bottom2 + gap < top1)
}

/**
 * useDeskItemOperations - Centralizes all item/note creation, mutation, and deletion operations
 * for the current desk, including persistent state updates and activity logging.
 *
 * Dependencies passed in:
 * - supabase: Supabase client for database operations
 * - userId: Current user ID for logging and ownership
 * - selectedDeskId: Current desk context
 * - editingId, setEditingId: Editor context state
 * - editValue, setEditValue: Content editor value
 * - editColor, setEditColor: Color picker value
 * - editTextColor, setEditTextColor: Text color picker value
 * - editFontSize, setEditFontSize: Font size picker value
 * - editFontFamily, setEditFontFamily: Font family picker value
 * - checklistEditItems, setChecklistEditItems: Checklist item editing state
 * - newChecklistItemText, setNewChecklistItemText: New checklist item input
 * - pendingDeleteId, setPendingDeleteId: Delete confirmation state
 * - notesRef: Ref for current notes state
 * - canCurrentUserEditDeskItems: Permission check
 * - canvasWidth: Viewport width for spawn positioning
 * - fetchDeskItems: Refresh items after mutations
 * - logDeskActivity: Activity logging callback
 * - markAutoSaveSaving, markAutoSaveSaved, markAutoSaveError: Auto-save status updates
 * - getViewportMetrics: Get canvas dimensions
 * - isSavingEdit, setIsSavingEdit: Edit saving state
 * - setEditSaveError: Error display setter
 * - setActiveDecorationHandleId: Active decoration selection
 * - setShowStyleEditor: Style panel visibility setter
 */
export function useDeskItemOperations({
  supabase,
  userId,
  selectedDeskId,
  setNotes,
  editingId,
  setEditingId,
  editValue,
  setEditValue,
  editColor,
  setEditColor,
  editTextColor,
  setEditTextColor,
  editFontSize,
  setEditFontSize,
  editFontFamily,
  setEditFontFamily,
  checklistEditItems,
  setChecklistEditItems,
  newChecklistItemText,
  setNewChecklistItemText,
  pendingDeleteId,
  setPendingDeleteId,
  notesRef,
  canCurrentUserEditDeskItems,
  canvasWidth,
  fetchDeskItems,
  logDeskActivity,
  markAutoSaveSaving,
  markAutoSaveSaved,
  markAutoSaveError,
  getViewportMetrics,
  isSavingEdit,
  setIsSavingEdit,
  setEditSaveError,
  setActiveDecorationHandleId,
  setShowStyleEditor
}) {
  // ===== Item Creation =====

  // Pre-define findAvailableSpawnPosition since it's used by creation functions
  const findAvailableSpawnPosition = useCallback(
    ({ baseX, baseY, width, height }) => {
      const availableWidth = Math.round(canvasWidth || getViewportMetrics().width)
      const maxX = Math.max(0, availableWidth - width)
      const normalizedBaseX = Math.min(Math.max(0, Number(baseX) || 0), maxX)
      const normalizedBaseY = Math.max(0, Number(baseY) || 0)
      const diagonalStep = 24
      const maxAttempts = 24

      for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
        const candidate = {
          x: Math.min(Math.max(0, normalizedBaseX + attempt * diagonalStep), maxX),
          y: Math.max(0, normalizedBaseY + attempt * diagonalStep),
          width,
          height
        }

        const hasOverlap = notesRef.current.some((item) => {
          const existing = {
            x: Number(item?.x) || 0,
            y: Number(item?.y) || 0,
            width: getItemWidth(item),
            height: getItemHeight(item)
          }
          return areRectanglesOverlapping(candidate, existing)
        })

        if (!hasOverlap) {
          return { x: candidate.x, y: candidate.y }
        }
      }

      return {
        x: normalizedBaseX,
        y: normalizedBaseY + (maxAttempts + 1) * diagonalStep
      }
    },
    [canvasWidth, getViewportMetrics, notesRef]
  )

  const addStickyNote = useCallback(
    async (showNewNoteMenuSetter) => {
      if (!canCurrentUserEditDeskItems) return
      if (!selectedDeskId) return

      const spawnPosition = findAvailableSpawnPosition({
        baseX: 100,
        baseY: 100,
        width: 200,
        height: 120
      })

      let data = null
      let error = null

      const withUserResult = await supabase
        .from('notes')
        .insert([{
          desk_id: selectedDeskId,
          user_id: userId,
          content: 'New note',
          color: '#fff59d',
          font_family: 'inherit',
          x: spawnPosition.x,
          y: spawnPosition.y,
          rotation: 0,
          width: 200,
          height: 120
        }])
        .select()

      data = withUserResult.data
      error = withUserResult.error

      if (error) {
        const fallbackResult = await supabase
          .from('notes')
          .insert([{
            desk_id: selectedDeskId,
            content: 'New note',
            color: '#fff59d',
            font_family: 'inherit',
            x: spawnPosition.x,
            y: spawnPosition.y,
            rotation: 0,
            width: 200,
            height: 120
          }])
          .select()

        data = fallbackResult.data
        error = fallbackResult.error
      }

      const createdNote = data?.[0]

      if (createdNote) {
        setNotes((prev) => [...prev, { ...createdNote, item_type: 'note' }])
        await fetchDeskItems(selectedDeskId)
        await logDeskActivity({
          actionType: 'created',
          itemType: 'note',
          itemId: createdNote.id,
          summary: 'created a note'
        })
      } else {
        console.error('Failed to create note:', error)
        setEditSaveError(error?.message || 'Failed to create note.')
      }

      if (showNewNoteMenuSetter) {
        showNewNoteMenuSetter(false)
      }
    },
    [
      canCurrentUserEditDeskItems,
      selectedDeskId,
      setNotes,
      setEditSaveError,
      supabase,
      userId,
      fetchDeskItems,
      logDeskActivity,
      findAvailableSpawnPosition
    ]
  )

  const addChecklistNote = useCallback(
    async (showNewNoteMenuSetter) => {
      if (!canCurrentUserEditDeskItems) return
      if (!selectedDeskId) return

      const spawnPosition = findAvailableSpawnPosition({
        baseX: 100,
        baseY: 100,
        width: 220,
        height: 160
      })

      let data = null
      let error = null

      const withUserResult = await supabase
        .from('checklists')
        .insert([{
          desk_id: selectedDeskId,
          user_id: userId,
          title: 'Checklist',
          color: '#ffffff',
          font_family: 'inherit',
          x: spawnPosition.x,
          y: spawnPosition.y,
          rotation: 0,
          width: 220,
          height: 160
        }])
        .select()

      data = withUserResult.data
      error = withUserResult.error

      if (error) {
        const fallbackResult = await supabase
          .from('checklists')
          .insert([{
            desk_id: selectedDeskId,
            title: 'Checklist',
            color: '#ffffff',
            font_family: 'inherit',
            x: spawnPosition.x,
            y: spawnPosition.y,
            rotation: 0,
            width: 220,
            height: 160
          }])
          .select()

        data = fallbackResult.data
        error = fallbackResult.error
      }

      const createdChecklist = data?.[0]

      if (!createdChecklist) {
        console.error('Failed to create checklist:', error)
        setEditSaveError(error?.message || 'Failed to create checklist.')
        if (showNewNoteMenuSetter) {
          showNewNoteMenuSetter(false)
        }
        return
      }

      const { data: itemData, error: itemError } = await supabase
        .from('checklist_items')
        .insert([{ checklist_id: createdChecklist.id, text: 'New item', is_checked: false, sort_order: 0 }])
        .select()

      if (itemError) {
        console.error('Failed to create checklist item:', itemError)
      }

      setNotes((prev) => [
        ...prev,
        {
          ...createdChecklist,
          item_type: 'checklist',
          items: itemData || []
        }
      ])

      await fetchDeskItems(selectedDeskId)
      await logDeskActivity({
        actionType: 'created',
        itemType: 'checklist',
        itemId: createdChecklist.id,
        summary: 'created a checklist'
      })

      if (showNewNoteMenuSetter) {
        showNewNoteMenuSetter(false)
      }
    },
    [
      canCurrentUserEditDeskItems,
      selectedDeskId,
      setNotes,
      setEditSaveError,
      supabase,
      userId,
      fetchDeskItems,
      logDeskActivity,
      findAvailableSpawnPosition
    ]
  )

  const addDecoration = useCallback(
    async (kind, showNewNoteMenuSetter) => {
      if (!canCurrentUserEditDeskItems) return
      if (!selectedDeskId) return

      const spawnPosition = findAvailableSpawnPosition({
        baseX: 110,
        baseY: 110,
        width: 88,
        height: 88
      })

      const option = getDecorationOption(kind)
      const { data, error } = await supabase
        .from('decorations')
        .insert([{
          desk_id: selectedDeskId,
          kind: option.key,
          x: spawnPosition.x,
          y: spawnPosition.y,
          rotation: 0,
          width: 88,
          height: 88
        }])
        .select()

      const createdDecoration = data?.[0]

      if (createdDecoration) {
        setNotes((prev) => [...prev, { ...createdDecoration, item_type: 'decoration' }])
        await fetchDeskItems(selectedDeskId)
        await logDeskActivity({
          actionType: 'created',
          itemType: 'decoration',
          itemId: createdDecoration.id,
          summary: 'added a decoration'
        })
      } else {
        console.error('Failed to create decoration:', error)
        setEditSaveError(error?.message || 'Failed to create decoration.')
      }

      if (showNewNoteMenuSetter) {
        showNewNoteMenuSetter(false)
      }
    },
    [
      canCurrentUserEditDeskItems,
      selectedDeskId,
      setNotes,
      setEditSaveError,
      supabase,
      fetchDeskItems,
      logDeskActivity,
      findAvailableSpawnPosition
    ]
  )

  // ===== Item Positioning & Sizing =====

  const persistRotation = useCallback(
    async (itemKey, rotationValue) => {
      const item = notesRef.current.find((row) => getItemKey(row) === itemKey)
      if (!item) return null

      markAutoSaveSaving()

      const storedRotation = toStoredRotation(rotationValue)
      const table = getItemTableName(item)
      const { error } = await supabase
        .from(table)
        .update({ rotation: storedRotation, desk_id: selectedDeskId })
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)

      if (error) {
        console.error('Failed to save item rotation:', error)
        markAutoSaveError(error?.message || 'Failed to save rotation.')
        return null
      }

      markAutoSaveSaved()
      return storedRotation
    },
    [notesRef, selectedDeskId, supabase, markAutoSaveSaving, markAutoSaveSaved, markAutoSaveError]
  )

  const persistItemPosition = useCallback(
    async (itemKey, x, y) => {
      const item = notesRef.current.find((row) => getItemKey(row) === itemKey)
      if (!item) return

      const normalizedX = Math.max(0, Math.round(Number.isFinite(Number(x)) ? Number(x) : Number(item.x) || 0))
      const normalizedY = Math.max(0, Math.round(Number.isFinite(Number(y)) ? Number(y) : Number(item.y) || 0))

      if (Number(item.x) === normalizedX && Number(item.y) === normalizedY) {
        markAutoSaveSaved()
        return
      }

      markAutoSaveSaving()

      const table = getItemTableName(item)
      const { error } = await supabase
        .from(table)
        .update({ x: normalizedX, y: normalizedY })
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)

      if (error) {
        console.error('Failed to save item position:', error)
        markAutoSaveError(error?.message || 'Failed to save position.')
        return
      }

      markAutoSaveSaved()
    },
    [notesRef, selectedDeskId, supabase, markAutoSaveSaving, markAutoSaveSaved, markAutoSaveError]
  )

  const persistItemSize = useCallback(
    async (itemKey, width, height) => {
      const item = notesRef.current.find((row) => getItemKey(row) === itemKey)
      if (!item) return

      markAutoSaveSaving()

      const table = getItemTableName(item)
      const { error } = await supabase
        .from(table)
        .update({ width, height, desk_id: selectedDeskId })
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)

      if (error) {
        console.error('Failed to save item size:', error)
        markAutoSaveError(error?.message || 'Failed to save size.')
        return
      }

      markAutoSaveSaved()
    },
    [notesRef, selectedDeskId, supabase, markAutoSaveSaving, markAutoSaveSaved, markAutoSaveError]
  )

  // ===== Item Layering =====

  const moveItemLayer = useCallback(
    (itemKey, direction) => {
      setNotes((prev) => {
        const currentIndex = prev.findIndex((entry) => getItemKey(entry) === itemKey)
        if (currentIndex === -1) return prev

        const nextItems = [...prev]
        const [target] = nextItems.splice(currentIndex, 1)

        if (direction === 'front') {
          nextItems.push(target)
        } else {
          nextItems.unshift(target)
        }

        return nextItems
      })
    },
    [setNotes]
  )

  // ===== Item Editing =====

  const addChecklistEditItem = useCallback(() => {
    const text = newChecklistItemText.trim()
    if (!text) return

    setChecklistEditItems((prev) => [...prev, { text, is_checked: false, due_at: null }])
    setNewChecklistItemText('')
  }, [newChecklistItemText, setChecklistEditItems, setNewChecklistItemText])

  const closeItemEditor = useCallback(() => {
    setEditingId(null)
    setEditValue('')
    setChecklistEditItems([])
    setNewChecklistItemText('')
    setShowStyleEditor(false)
    setEditColor('#fff59d')
    setEditTextColor('#222222')
    setEditFontSize(16)
    setEditFontFamily('inherit')
    setEditSaveError('')
  }, [
    setEditingId,
    setEditValue,
    setChecklistEditItems,
    setNewChecklistItemText,
    setShowStyleEditor,
    setEditColor,
    setEditTextColor,
    setEditFontSize,
    setEditFontFamily,
    setEditSaveError
  ])

  const saveItemEdits = useCallback(
    async (item) => {
      const nextRotation = toStoredRotation(Number(item.rotation) || 0)
      const nextColor = (editColor || getItemColor(item)).trim() || getDefaultItemColor(item.item_type)
      const nextTextColor = (editTextColor || getItemTextColor(item)).trim() || '#222222'
      const nextFontSize = normalizeFontSize(editFontSize, getItemFontSize(item))
      const nextFontFamily = (editFontFamily || 'inherit').trim() || 'inherit'
      const itemKey = getItemKey(item)

      if (!isChecklistItem(item)) {
        const basePayload = {
          content: editValue,
          rotation: nextRotation,
          color: nextColor,
          font_family: nextFontFamily,
          desk_id: selectedDeskId
        }
        let persistedTextColor = nextTextColor
        let persistedFontSize = nextFontSize

        let { error: saveError } = await supabase
          .from('notes')
          .update({ ...basePayload, text_color: nextTextColor, font_size: nextFontSize })
          .eq('id', item.id)
          .eq('desk_id', selectedDeskId)

        if (saveError && isMissingColumnError(saveError, 'text_color')) {
          const { error: retryError } = await supabase
            .from('notes')
            .update(basePayload)
            .eq('id', item.id)
            .eq('desk_id', selectedDeskId)

          if (!retryError) {
            saveError = null
            persistedTextColor = getItemTextColor(item)
            persistedFontSize = getItemFontSize(item)
          } else {
            saveError = retryError
          }
        } else if (saveError && isMissingColumnError(saveError, 'font_size')) {
          const { error: retryError } = await supabase
            .from('notes')
            .update({ ...basePayload, text_color: nextTextColor })
            .eq('id', item.id)
            .eq('desk_id', selectedDeskId)

          if (!retryError) {
            saveError = null
            persistedFontSize = getItemFontSize(item)
          } else {
            saveError = retryError
          }
        }

        if (saveError) {
          console.error('Failed to save note:', saveError)
          return { ok: false, errorMessage: saveError?.message || 'Failed to save note.' }
        }

        setNotes((prev) =>
          prev.map((row) =>
            getItemKey(row) === itemKey ? {
              ...row,
              content: editValue,
              rotation: nextRotation,
              color: nextColor,
              text_color: persistedTextColor,
              font_size: persistedFontSize,
              font_family: nextFontFamily
            } : row
          )
        )
        return { ok: true }
      }

      const nextItems = checklistEditItems
        .map((entry, index) => ({
          text: (entry.text || '').trim(),
          is_checked: Boolean(entry.is_checked),
          sort_order: index,
          due_at: normalizeChecklistReminderValue(entry.due_at)
        }))
        .filter((entry) => entry.text.length > 0)

      const baseChecklistPayload = {
        title: editValue.trim() || 'Checklist',
        rotation: nextRotation,
        color: nextColor,
        font_family: nextFontFamily,
        desk_id: selectedDeskId
      }
      let persistedTextColor = nextTextColor
      let persistedFontSize = nextFontSize

      let { error: checklistSaveError } = await supabase
        .from('checklists')
        .update({ ...baseChecklistPayload, text_color: nextTextColor, font_size: nextFontSize })
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)

      if (checklistSaveError && isMissingColumnError(checklistSaveError, 'text_color')) {
        const { error: retryChecklistError } = await supabase
          .from('checklists')
          .update(baseChecklistPayload)
          .eq('id', item.id)
          .eq('desk_id', selectedDeskId)

        if (!retryChecklistError) {
          checklistSaveError = null
          persistedTextColor = getItemTextColor(item)
          persistedFontSize = getItemFontSize(item)
        } else {
          checklistSaveError = retryChecklistError
        }
      } else if (checklistSaveError && isMissingColumnError(checklistSaveError, 'font_size')) {
        const { error: retryChecklistError } = await supabase
          .from('checklists')
          .update({ ...baseChecklistPayload, text_color: nextTextColor })
          .eq('id', item.id)
          .eq('desk_id', selectedDeskId)

        if (!retryChecklistError) {
          checklistSaveError = null
          persistedFontSize = getItemFontSize(item)
        } else {
          checklistSaveError = retryChecklistError
        }
      }

      if (checklistSaveError) {
        console.error('Failed to save checklist:', checklistSaveError)
        return { ok: false, errorMessage: checklistSaveError?.message || 'Failed to save checklist.' }
      }

      const { error: itemsError } = await supabase
        .from('checklist_items')
        .upsert(nextItems.map((entry) => ({
          ...entry,
          checklist_id: item.id
        })), { onConflict: 'id' })

      if (itemsError) {
        console.error('Failed to save checklist items:', itemsError)
        return { ok: false, errorMessage: itemsError?.message || 'Failed to save checklist items.' }
      }

      setNotes((prev) =>
        prev.map((row) =>
          getItemKey(row) === itemKey ? {
            ...row,
            title: editValue.trim() || 'Checklist',
            rotation: nextRotation,
            color: nextColor,
            text_color: persistedTextColor,
            font_size: persistedFontSize,
            font_family: nextFontFamily,
            items: nextItems
          } : row
        )
      )

      return { ok: true }
    },
    [
      editColor,
      editValue,
      editFontSize,
      editFontFamily,
      editTextColor,
      checklistEditItems,
      selectedDeskId,
      supabase,
      setNotes
    ]
  )

  const commitItemEdits = useCallback(
    async (item) => {
      if (!canCurrentUserEditDeskItems) return
      if (isSavingEdit) return

      markAutoSaveSaving()
      setIsSavingEdit(true)
      setEditSaveError('')

      let saveResult = { ok: false }
      try {
        saveResult = await saveItemEdits(item)
      } catch (error) {
        console.error('Unexpected save error:', error)
        setEditSaveError('Save failed. Please try again.')
        markAutoSaveError('Save failed. Please try again.')
        return
      } finally {
        setIsSavingEdit(false)
      }

      if (!saveResult.ok) {
        setEditSaveError(saveResult.errorMessage || 'Save failed. Please check your connection and try again.')
        markAutoSaveError(saveResult.errorMessage || 'Save failed. Please check your connection and try again.')
        return
      }

      setEditingId(null)
      setEditValue('')
      setChecklistEditItems([])
      setNewChecklistItemText('')
      setShowStyleEditor(false)
      setEditColor('#fff59d')
      setEditTextColor('#222222')
      setEditFontSize(16)
      setEditFontFamily('inherit')
      setEditSaveError('')
      await logDeskActivity({
        actionType: 'edited',
        itemType: isChecklistItem(item) ? 'checklist' : 'note',
        itemId: item.id,
        summary: isChecklistItem(item) ? 'edited a checklist' : 'edited a note'
      })
      markAutoSaveSaved()
    },
    [
      canCurrentUserEditDeskItems,
      isSavingEdit,
      saveItemEdits,
      setIsSavingEdit,
      setEditingId,
      setEditValue,
      setChecklistEditItems,
      setNewChecklistItemText,
      setShowStyleEditor,
      setEditColor,
      setEditTextColor,
      setEditFontSize,
      setEditFontFamily,
      setEditSaveError,
      markAutoSaveSaving,
      markAutoSaveError,
      markAutoSaveSaved,
      logDeskActivity
    ]
  )

  const toggleChecklistItem = useCallback(
    async (itemKey, itemIndex) => {
      if (!canCurrentUserEditDeskItems) return
      const checklist = notesRef.current.find((row) => getItemKey(row) === itemKey)
      if (!checklist || !isChecklistItem(checklist)) return

      const targetItem = checklist.items?.[itemIndex]
      if (!targetItem) return

      const nextChecked = !targetItem.is_checked

      markAutoSaveSaving()

      setNotes((prev) =>
        prev.map((row) =>
          getItemKey(row) === itemKey
            ? {
                ...row,
                items: row.items.map((entry, index) =>
                  index === itemIndex ? { ...entry, is_checked: nextChecked } : entry
                )
              }
            : row
        )
      )

      const { error } = await supabase
        .from('checklist_items')
        .update({ is_checked: nextChecked })
        .eq('id', targetItem.id)

      if (error) {
        console.error('Failed to toggle checklist item:', error)
        markAutoSaveError(error?.message || 'Failed to save checklist item.')
        await fetchDeskItems(selectedDeskId)
        return
      }

      await logDeskActivity({
        actionType: nextChecked ? 'checked' : 'unchecked',
        itemType: 'checklist item',
        itemId: targetItem.id,
        summary: nextChecked ? 'checked off a checklist item' : 'unchecked a checklist item'
      })

      markAutoSaveSaved()
    },
    [
      canCurrentUserEditDeskItems,
      notesRef,
      setNotes,
      markAutoSaveSaving,
      markAutoSaveError,
      markAutoSaveSaved,
      supabase,
      fetchDeskItems,
      selectedDeskId,
      logDeskActivity
    ]
  )

  // ===== Item Duplication & Deletion =====

  const getDuplicatePosition = useCallback(
    (item) => {
      const offset = 24
      const nextX = Math.max(0, (Number(item?.x) || 0) + offset)
      const nextY = Math.max(0, (Number(item?.y) || 0) + offset)
      return { x: nextX, y: nextY }
    },
    []
  )

  const duplicateItem = useCallback(
    async (itemKey) => {
      if (!canCurrentUserEditDeskItems) return
      if (!selectedDeskId) return

      const sourceItem = notesRef.current.find((row) => getItemKey(row) === itemKey)
      if (!sourceItem) return

      markAutoSaveSaving()

      const { x: nextX, y: nextY } = getDuplicatePosition(sourceItem)

      try {
        if (isDecorationItem(sourceItem)) {
          const { data, error } = await supabase
            .from('decorations')
            .insert([{
              desk_id: selectedDeskId,
              kind: sourceItem.kind || 'pin',
              x: nextX,
              y: nextY,
              rotation: toStoredRotation(Number(sourceItem.rotation) || 0),
              width: getItemWidth(sourceItem),
              height: getItemHeight(sourceItem)
            }])
            .select()

          const duplicatedDecoration = data?.[0]
          if (!duplicatedDecoration || error) {
            throw error || new Error('Failed to duplicate decoration.')
          }

          setNotes((prev) => [...prev, { ...duplicatedDecoration, item_type: 'decoration' }])
          setActiveDecorationHandleId(`decoration-${duplicatedDecoration.id}`)
          await fetchDeskItems(selectedDeskId)
          await logDeskActivity({
            actionType: 'duplicated',
            itemType: 'decoration',
            itemId: duplicatedDecoration.id,
            summary: 'duplicated a decoration'
          })
          markAutoSaveSaved()
          return
        }

        if (isChecklistItem(sourceItem)) {
          let checklistData = null
          let checklistError = null

          const withUserResult = await supabase
            .from('checklists')
            .insert([{
              desk_id: selectedDeskId,
              user_id: sourceItem.user_id || userId,
              title: sourceItem.title || 'Checklist',
              color: getItemColor(sourceItem),
              font_family: getItemFontFamily(sourceItem),
              x: nextX,
              y: nextY,
              rotation: toStoredRotation(Number(sourceItem.rotation) || 0),
              width: getItemWidth(sourceItem),
              height: getItemHeight(sourceItem)
            }])
            .select()

          checklistData = withUserResult.data
          checklistError = withUserResult.error

          if (checklistError) {
            const fallbackResult = await supabase
              .from('checklists')
              .insert([{
                desk_id: selectedDeskId,
                title: sourceItem.title || 'Checklist',
                color: getItemColor(sourceItem),
                font_family: getItemFontFamily(sourceItem),
                x: nextX,
                y: nextY,
                rotation: toStoredRotation(Number(sourceItem.rotation) || 0),
                width: getItemWidth(sourceItem),
                height: getItemHeight(sourceItem)
              }])
              .select()

            checklistData = fallbackResult.data
            checklistError = fallbackResult.error
          }

          const createdChecklist = checklistData?.[0]
          if (!createdChecklist || checklistError) {
            throw checklistError || new Error('Failed to duplicate checklist.')
          }

          const sourceItems = (sourceItem.items || []).map((entry, index) => ({
            checklist_id: createdChecklist.id,
            text: (entry?.text || '').trim(),
            is_checked: Boolean(entry?.is_checked),
            sort_order: index,
            due_at: normalizeChecklistReminderValue(entry?.due_at)
          }))

          if (sourceItems.length > 0) {
            const { error: itemsError } = await supabase
              .from('checklist_items')
              .insert(sourceItems)
              .select()

            if (itemsError) {
              console.error('Failed to duplicate checklist items:', itemsError)
            }
          }

          setNotes((prev) => [...prev, {
            ...createdChecklist,
            item_type: 'checklist',
            items: sourceItems
          }])
          await fetchDeskItems(selectedDeskId)
          await logDeskActivity({
            actionType: 'duplicated',
            itemType: 'checklist',
            itemId: createdChecklist.id,
            summary: 'duplicated a checklist'
          })
          markAutoSaveSaved()
          return
        }

        const { data, error } = await supabase
          .from('notes')
          .insert([{
            desk_id: selectedDeskId,
            user_id: sourceItem.user_id || userId,
            content: sourceItem.content || 'Note',
            color: getItemColor(sourceItem),
            font_family: getItemFontFamily(sourceItem),
            x: nextX,
            y: nextY,
            rotation: toStoredRotation(Number(sourceItem.rotation) || 0),
            width: getItemWidth(sourceItem),
            height: getItemHeight(sourceItem)
          }])
          .select()

        const duplicatedNote = data?.[0]
        if (!duplicatedNote || error) {
          throw error || new Error('Failed to duplicate note.')
        }

        setNotes((prev) => [...prev, { ...duplicatedNote, item_type: 'note' }])
        await fetchDeskItems(selectedDeskId)
        await logDeskActivity({
          actionType: 'duplicated',
          itemType: 'note',
          itemId: duplicatedNote.id,
          summary: 'duplicated a note'
        })
        markAutoSaveSaved()
      } catch (error) {
        console.error('Failed to duplicate item:', error)
        markAutoSaveError(error?.message || 'Failed to duplicate item.')
      }
    },
    [
      canCurrentUserEditDeskItems,
      selectedDeskId,
      notesRef,
      getDuplicatePosition,
      userId,
      supabase,
      setNotes,
      setActiveDecorationHandleId,
      fetchDeskItems,
      logDeskActivity,
      markAutoSaveSaving,
      markAutoSaveSaved,
      markAutoSaveError
    ]
  )

  const requestDeleteNote = useCallback(
    (itemKey) => {
      if (!canCurrentUserEditDeskItems) return
      setPendingDeleteId(itemKey)
    },
    [canCurrentUserEditDeskItems, setPendingDeleteId]
  )

  const confirmDeleteNote = useCallback(
    async () => {
      if (!canCurrentUserEditDeskItems) return
      if (!pendingDeleteId) return

      const item = notesRef.current.find((row) => getItemKey(row) === pendingDeleteId)
      if (!item) {
        setPendingDeleteId(null)
        return
      }

      let error = null

      if (isChecklistItem(item)) {
        const { error: checklistError } = await supabase
          .from('checklists')
          .delete()
          .eq('id', item.id)
          .eq('desk_id', selectedDeskId)
        error = checklistError
      } else if (isDecorationItem(item)) {
        const { error: decorationError } = await supabase
          .from('decorations')
          .delete()
          .eq('id', item.id)
          .eq('desk_id', selectedDeskId)
        error = decorationError
      } else {
        const { error: noteError } = await supabase
          .from('notes')
          .delete()
          .eq('id', item.id)
          .eq('desk_id', selectedDeskId)
        error = noteError
      }

      if (!error) {
        setNotes((prev) => prev.filter((row) => getItemKey(row) !== pendingDeleteId))
        if (editingId === pendingDeleteId) {
          setEditingId(null)
          setEditValue('')
          setChecklistEditItems([])
          setNewChecklistItemText('')
        }
      }

      setPendingDeleteId(null)
    },
    [
      canCurrentUserEditDeskItems,
      pendingDeleteId,
      notesRef,
      selectedDeskId,
      supabase,
      setNotes,
      editingId,
      setEditingId,
      setEditValue,
      setChecklistEditItems,
      setNewChecklistItemText,
      setPendingDeleteId
    ]
  )

  // ===== Public API =====

  return {
    // Item creation
    addStickyNote,
    addChecklistNote,
    addDecoration,
    // Item positioning & sizing
    persistRotation,
    persistItemPosition,
    persistItemSize,
    // Item layering
    moveItemLayer,
    // Item editing
    addChecklistEditItem,
    closeItemEditor,
    saveItemEdits,
    commitItemEdits,
    toggleChecklistItem,
    // Item duplication & deletion
    getDuplicatePosition,
    findAvailableSpawnPosition,
    duplicateItem,
    requestDeleteNote,
    confirmDeleteNote
  }
}
