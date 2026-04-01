export function buildChecklistPersistencePlan({
  checklistEditItems,
  existingItems,
  normalizeReminder
}) {
  const normalizeDueAt = typeof normalizeReminder === 'function'
    ? normalizeReminder
    : (value) => value

  const nextItems = (checklistEditItems || [])
    .map((entry, index) => ({
      id: entry?.id ?? undefined,
      text: (entry?.text || '').trim(),
      is_checked: Boolean(entry?.is_checked),
      sort_order: index,
      due_at: normalizeDueAt(entry?.due_at)
    }))
    .filter((entry) => entry.text.length > 0)

  const existingItemIds = new Set(
    (existingItems || [])
      .map((entry) => entry?.id)
      .filter((value) => Boolean(value))
  )

  const nextItemIds = new Set(
    nextItems
      .map((entry) => entry?.id)
      .filter((value) => Boolean(value))
  )

  const removedItemIds = [...existingItemIds].filter((id) => !nextItemIds.has(id))

  const existingChecklistItems = nextItems.filter((entry) => entry.id !== undefined && entry.id !== null)
  const newChecklistItems = nextItems.filter((entry) => entry.id === undefined || entry.id === null)

  return {
    nextItems,
    existingChecklistItems,
    newChecklistItems,
    removedItemIds
  }
}
