import { useCallback } from 'react'

export default function useDeskImportExport({
  supabase,
  desks,
  selectedDeskId,
  userId,
  canCurrentUserEditDeskItems,
  setDeskMenuMessage,
  setDeskMenuError,
  setShowDeskMenu,
  setBackgroundMenuError,
  getDeskNameValue,
  logDeskActivity,
  fetchDeskItems,
  isMissingColumnError,
  normalizeChecklistReminderValue,
  normalizeFontSize,
  toStoredRotation,
  getItemWidth,
  getItemHeight,
  insertChecklistItemsWithReminderFallback
}) {
  const sanitizeExportFileName = useCallback((value) => {
    const trimmed = (value || '').trim()
    if (!trimmed) return 'desk'
    return trimmed
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80)
      .toLowerCase() || 'desk'
  }, [])

  const triggerJsonDownload = useCallback((fileName, payload) => {
    const serialized = JSON.stringify(payload, null, 2)
    const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' })
    const downloadUrl = URL.createObjectURL(blob)
    const downloadAnchor = document.createElement('a')
    downloadAnchor.href = downloadUrl
    downloadAnchor.download = fileName
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    URL.revokeObjectURL(downloadUrl)
  }, [])

  const insertRowsWithImportFallback = useCallback(async (table, rows) => {
    if (!rows.length) return []

    let nextRows = rows

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .insert(nextRows)
        .select()

      if (!error) return data || []

      if (isMissingColumnError(error, 'user_id')) {
        nextRows = nextRows.map((row) => {
          const copy = { ...row }
          delete copy.user_id
          return copy
        })
        continue
      }

      if (isMissingColumnError(error, 'text_color')) {
        nextRows = nextRows.map((row) => {
          const copy = { ...row }
          delete copy.text_color
          return copy
        })
        continue
      }

      if (isMissingColumnError(error, 'font_size')) {
        nextRows = nextRows.map((row) => {
          const copy = { ...row }
          delete copy.font_size
          return copy
        })
        continue
      }

      throw error
    }
  }, [isMissingColumnError, supabase])

  const normalizeDeskImportPayload = useCallback((payload) => {
    if (!payload) {
      return { notes: [], checklists: [], checklistItems: [], decorations: [] }
    }

    if (Array.isArray(payload)) {
      return { notes: payload, checklists: [], checklistItems: [], decorations: [] }
    }

    const items = payload.items && typeof payload.items === 'object' ? payload.items : {}
    const checklists = Array.isArray(items.checklists)
      ? items.checklists
      : (Array.isArray(payload.checklists) ? payload.checklists : [])

    const explicitChecklistItems = Array.isArray(items.checklist_items)
      ? items.checklist_items
      : (Array.isArray(payload.checklist_items) ? payload.checklist_items : [])

    const nestedChecklistItems = checklists.flatMap((checklist) => {
      if (!Array.isArray(checklist?.items)) return []
      return checklist.items.map((entry, index) => ({
        checklist_id: checklist.id,
        text: entry?.text || '',
        is_checked: Boolean(entry?.is_checked),
        sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : index,
        due_at: normalizeChecklistReminderValue(entry?.due_at)
      }))
    })

    return {
      notes: Array.isArray(items.notes) ? items.notes : (Array.isArray(payload.notes) ? payload.notes : []),
      checklists,
      checklistItems: explicitChecklistItems.length > 0 ? explicitChecklistItems : nestedChecklistItems,
      decorations: Array.isArray(items.decorations) ? items.decorations : (Array.isArray(payload.decorations) ? payload.decorations : [])
    }
  }, [normalizeChecklistReminderValue])

  const importDeskPayloadIntoCurrentDesk = useCallback(async (payload) => {
    if (!selectedDeskId) return { notes: 0, checklists: 0, checklistItems: 0, decorations: 0 }

    const normalized = normalizeDeskImportPayload(payload)
    const positionOffset = 20

    const noteRows = normalized.notes.map((note) => ({
      desk_id: selectedDeskId,
      user_id: userId,
      content: note?.content || 'Imported note',
      color: note?.color || '#fff59d',
      text_color: note?.text_color || '#222222',
      font_size: normalizeFontSize(note?.font_size, 16),
      font_family: note?.font_family || 'inherit',
      x: (Number(note?.x) || 100) + positionOffset,
      y: (Number(note?.y) || 100) + positionOffset,
      rotation: toStoredRotation(Number(note?.rotation) || 0),
      width: getItemWidth(note),
      height: getItemHeight(note)
    }))

    const checklistRows = normalized.checklists.map((checklist) => ({
      __source_id: checklist?.id,
      desk_id: selectedDeskId,
      user_id: userId,
      title: checklist?.title || 'Imported checklist',
      color: checklist?.color || '#ffffff',
      text_color: checklist?.text_color || '#222222',
      font_size: normalizeFontSize(checklist?.font_size, 16),
      font_family: checklist?.font_family || 'inherit',
      x: (Number(checklist?.x) || 100) + positionOffset,
      y: (Number(checklist?.y) || 100) + positionOffset,
      rotation: toStoredRotation(Number(checklist?.rotation) || 0),
      width: getItemWidth(checklist),
      height: getItemHeight(checklist)
    }))

    const decorationRows = normalized.decorations.map((decoration) => ({
      desk_id: selectedDeskId,
      kind: decoration?.kind || 'pin',
      x: (Number(decoration?.x) || 110) + positionOffset,
      y: (Number(decoration?.y) || 110) + positionOffset,
      rotation: toStoredRotation(Number(decoration?.rotation) || 0),
      width: getItemWidth(decoration),
      height: getItemHeight(decoration)
    }))

    const insertedNotes = await insertRowsWithImportFallback('notes', noteRows)

    const checklistsWithoutMeta = checklistRows.map((row) => {
      const copy = { ...row }
      delete copy.__source_id
      return copy
    })
    const insertedChecklists = await insertRowsWithImportFallback('checklists', checklistsWithoutMeta)

    const checklistIdMap = new Map()
    checklistRows.forEach((row, index) => {
      if (!row.__source_id) return
      const inserted = insertedChecklists[index]
      if (!inserted?.id) return
      checklistIdMap.set(row.__source_id, inserted.id)
    })

    const checklistItemRows = normalized.checklistItems
      .map((entry, index) => {
        const targetChecklistId = checklistIdMap.get(entry?.checklist_id)
        if (!targetChecklistId) return null
        return {
          checklist_id: targetChecklistId,
          text: (entry?.text || '').trim(),
          is_checked: Boolean(entry?.is_checked),
          sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : index,
          due_at: normalizeChecklistReminderValue(entry?.due_at)
        }
      })
      .filter((entry) => entry && entry.text.length > 0)

    let insertedChecklistItems = []
    if (checklistItemRows.length > 0) {
      insertedChecklistItems = await insertChecklistItemsWithReminderFallback(checklistItemRows, { includeSelect: true })
    }

    let insertedDecorations = []
    if (decorationRows.length > 0) {
      const { data, error } = await supabase
        .from('decorations')
        .insert(decorationRows)
        .select()

      if (error) throw error
      insertedDecorations = data || []
    }

    return {
      notes: insertedNotes.length,
      checklists: insertedChecklists.length,
      checklistItems: insertedChecklistItems.length,
      decorations: insertedDecorations.length
    }
  }, [
    getItemHeight,
    getItemWidth,
    insertChecklistItemsWithReminderFallback,
    insertRowsWithImportFallback,
    normalizeChecklistReminderValue,
    normalizeDeskImportPayload,
    normalizeFontSize,
    selectedDeskId,
    supabase,
    toStoredRotation,
    userId
  ])

  const handleImportDeskFileSelection = useCallback(async (e) => {
    const selectedFile = e.target?.files?.[0]
    if (e.target) e.target.value = ''
    if (!selectedFile) return

    if (!canCurrentUserEditDeskItems) {
      setDeskMenuMessage('')
      setDeskMenuError('You do not have permission to import into this desk.')
      return
    }

    try {
      const rawContent = await selectedFile.text()
      const parsedPayload = JSON.parse(rawContent)
      const result = await importDeskPayloadIntoCurrentDesk(parsedPayload)

      await fetchDeskItems(selectedDeskId)
      await logDeskActivity({
        actionType: 'imported',
        itemType: 'desk',
        itemId: selectedDeskId,
        summary: 'imported desk content',
        metadata: {
          notes: result.notes,
          checklists: result.checklists,
          checklistItems: result.checklistItems,
          decorations: result.decorations
        }
      })

      setDeskMenuError('')
      setDeskMenuMessage(`Imported ${result.notes} note(s), ${result.checklists} checklist(s), ${result.checklistItems} checklist item(s), ${result.decorations} decoration(s).`)
    } catch (error) {
      console.error('Failed to import desk data:', error)
      setDeskMenuMessage('')
      if ((error?.message || '').toLowerCase().includes('json')) {
        setDeskMenuError('Invalid JSON file. Please import a valid desk export.')
      } else {
        setDeskMenuError(error?.message || 'Failed to import data.')
      }
    }
  }, [
    canCurrentUserEditDeskItems,
    fetchDeskItems,
    importDeskPayloadIntoCurrentDesk,
    logDeskActivity,
    selectedDeskId,
    setDeskMenuError,
    setDeskMenuMessage
  ])

  const exportCurrentDesk = useCallback(async () => {
    if (!selectedDeskId) return

    const desk = desks.find((entry) => entry.id === selectedDeskId)
    if (!desk) return

    try {
      const [notesResult, checklistsResult, decorationsResult] = await Promise.all([
        supabase.from('notes').select('*').eq('desk_id', selectedDeskId),
        supabase.from('checklists').select('*').eq('desk_id', selectedDeskId),
        supabase.from('decorations').select('*').eq('desk_id', selectedDeskId)
      ])

      if (notesResult.error || checklistsResult.error || decorationsResult.error) {
        throw notesResult.error || checklistsResult.error || decorationsResult.error
      }

      const checklistRows = checklistsResult.data || []
      const checklistIds = checklistRows.map((row) => row.id)
      let checklistItems = []

      if (checklistIds.length > 0) {
        const { data: checklistItemsData, error: checklistItemsError } = await supabase
          .from('checklist_items')
          .select('*')
          .in('checklist_id', checklistIds)
          .order('sort_order', { ascending: true })

        if (checklistItemsError) {
          throw checklistItemsError
        }

        checklistItems = checklistItemsData || []
      }

      const exportPayload = {
        schema_version: 1,
        exported_at: new Date().toISOString(),
        exported_by_user_id: userId,
        desk: {
          id: desk.id,
          name: desk.name,
          user_id: desk.user_id,
          is_collaborative: Boolean(desk.is_collaborative),
          background: desk.background || 'desk1',
          background_mode: desk.background_mode || null,
          custom_background_url: desk.custom_background_url || null,
          background_url: desk.background_url || null,
          created_at: desk.created_at || null
        },
        items: {
          notes: notesResult.data || [],
          checklists: checklistRows,
          checklist_items: checklistItems,
          decorations: decorationsResult.data || []
        }
      }

      const safeDeskName = sanitizeExportFileName(getDeskNameValue(desk))
      const exportDate = new Date().toISOString().slice(0, 10)
      const exportFileName = `${safeDeskName}-${exportDate}.json`

      triggerJsonDownload(exportFileName, exportPayload)
      await logDeskActivity({
        actionType: 'exported',
        itemType: 'desk',
        itemId: selectedDeskId,
        summary: 'exported this desk'
      })
      setShowDeskMenu(false)
      setBackgroundMenuError('')
      setDeskMenuError('')
      setDeskMenuMessage(`Exported ${getDeskNameValue(desk)}.`)
    } catch (error) {
      console.error('Failed to export desk:', error)
      setDeskMenuMessage('')
      setDeskMenuError(error?.message || 'Failed to export desk.')
    }
  }, [
    desks,
    getDeskNameValue,
    logDeskActivity,
    sanitizeExportFileName,
    selectedDeskId,
    setBackgroundMenuError,
    setDeskMenuError,
    setDeskMenuMessage,
    setShowDeskMenu,
    supabase,
    triggerJsonDownload,
    userId
  ])

  return {
    exportCurrentDesk,
    handleImportDeskFileSelection,
    importDeskPayloadIntoCurrentDesk
  }
}