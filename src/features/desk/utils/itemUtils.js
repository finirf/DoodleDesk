import { DECORATION_OPTIONS } from '../constants/deskConstants'

// Normalization and rendering helpers shared across notes, checklists, and decoration items.
export function getItemKey(item) {
  return `${item.item_type}:${item.id}`
}

export function isChecklistItem(item) {
  return item.item_type === 'checklist'
}

export function isDecorationItem(item) {
  return item.item_type === 'decoration'
}

export function getDecorationOption(kind) {
  return DECORATION_OPTIONS.find((option) => option.key === kind) || { key: 'custom', label: 'Decoration', emoji: '📌' }
}

export function getDefaultItemColor(itemType) {
  if (itemType === 'decoration') return 'transparent'
  return itemType === 'checklist' ? '#ffffff' : '#fff59d'
}

export function getItemColor(item) {
  const fallback = getDefaultItemColor(item?.item_type)
  const color = typeof item?.color === 'string' ? item.color.trim() : ''
  return color || fallback
}

export function getItemTextColor(item) {
  const value = typeof item?.text_color === 'string' ? item.text_color.trim() : ''
  return value || '#222222'
}

export function isMissingColumnError(error, columnName) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return message.includes(columnName) && (
    message.includes('column')
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('not found')
  )
}

export function normalizeFontSize(value, fallback = 16) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const rounded = Math.round(parsed)
  return Math.min(48, Math.max(10, rounded))
}

export function getItemFontSize(item) {
  return normalizeFontSize(item?.font_size, 16)
}

export function getItemFontFamily(item) {
  const value = typeof item?.font_family === 'string' ? item.font_family.trim() : ''
  return value || 'inherit'
}

export function getItemWidth(item) {
  const value = Number(item?.width)
  if (Number.isFinite(value) && value > 0) return value
  if (isDecorationItem(item)) return 88
  return 200
}

export function clampDimension(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function getAutoDecorationHeight() {
  return 88
}

export function getAutoChecklistHeight(item) {
  const itemCount = Array.isArray(item?.items) ? item.items.length : 0
  return clampDimension(74 + itemCount * 26, 96, 260)
}

export function getAutoNoteHeight(item) {
  const content = typeof item?.content === 'string' ? item.content : ''
  const newlineCount = content.length > 0 ? content.split('\n').length : 1
  const wrappedLineCount = Math.max(1, Math.ceil(content.length / 70))
  const estimatedLines = Math.max(newlineCount, wrappedLineCount)
  return clampDimension(68 + estimatedLines * 22, 88, 220)
}

export function getItemHeight(item) {
  const value = Number(item?.height)
  if (Number.isFinite(value) && value > 0) {
    if (isChecklistItem(item) && value === 160) {
      return getAutoChecklistHeight(item)
    }
    if (isDecorationItem(item)) {
      return value
    }
    if (!isChecklistItem(item) && value === 120) {
      return getAutoNoteHeight(item)
    }
    return value
  }

  if (isChecklistItem(item)) return getAutoChecklistHeight(item)
  if (isDecorationItem(item)) return getAutoDecorationHeight()
  return getAutoNoteHeight(item)
}

export function getItemTableName(item) {
  if (isChecklistItem(item)) return 'checklists'
  if (isDecorationItem(item)) return 'decorations'
  return 'notes'
}

export function getItemCreatorLabel(item, currentUserId) {
  const creatorPreferredName = typeof item?.created_by_name === 'string' ? item.created_by_name.trim() : ''
  if (creatorPreferredName) return creatorPreferredName
  const creatorEmail = typeof item?.created_by_email === 'string' ? item.created_by_email.trim() : ''
  if (creatorEmail) return creatorEmail
  if (item?.user_id && item.user_id === currentUserId) return 'You'
  return 'A collaborator'
}

export function isMissingShelfStorageTableError(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  const code = `${error?.code || ''}`.toLowerCase()
  return code === '42p01'
    || (
      (message.includes('desk_shelves') || message.includes('desk_shelf_assignments'))
      && (message.includes('does not exist') || message.includes('relation') || message.includes('not found'))
    )
}
