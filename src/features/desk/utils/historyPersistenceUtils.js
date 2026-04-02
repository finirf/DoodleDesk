import {
  getItemColor,
  getItemFontFamily,
  getItemFontSize,
  getItemHeight,
  getItemTextColor,
  getItemWidth,
  getStoredItemFontFamily,
  isChecklistItem,
  isDecorationItem,
  toStoredRotation
} from './itemUtils'
import { normalizeChecklistReminderValue } from './reminderUtils'

function getComparableChecklistItems(items = []) {
  return (items || []).map((entry, index) => ({
    text: (entry?.text || '').trim(),
    is_checked: Boolean(entry?.is_checked),
    sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : index,
    due_at: normalizeChecklistReminderValue(entry?.due_at)
  }))
}

function getComparableDeskItem(item) {
  if (!item) return null

  if (isChecklistItem(item)) {
    return {
      item_type: 'checklist',
      id: item.id,
      desk_id: item.desk_id,
      user_id: item.user_id || null,
      title: item.title || '',
      color: getItemColor(item),
      text_color: getItemTextColor(item),
      font_size: getItemFontSize(item),
      font_family: getItemFontFamily(item),
      x: Number(item.x) || 0,
      y: Number(item.y) || 0,
      rotation: toStoredRotation(Number(item.rotation) || 0),
      width: getItemWidth(item),
      height: getItemHeight(item),
      items: getComparableChecklistItems(item.items)
    }
  }

  if (isDecorationItem(item)) {
    return {
      item_type: 'decoration',
      id: item.id,
      desk_id: item.desk_id,
      kind: item.kind || 'pin',
      x: Number(item.x) || 0,
      y: Number(item.y) || 0,
      rotation: toStoredRotation(Number(item.rotation) || 0),
      width: getItemWidth(item),
      height: getItemHeight(item)
    }
  }

  return {
    item_type: 'note',
    id: item.id,
    desk_id: item.desk_id,
    user_id: item.user_id || null,
    content: item.content || '',
    color: getItemColor(item),
    text_color: getItemTextColor(item),
    font_size: getItemFontSize(item),
    font_family: getStoredItemFontFamily(item),
    x: Number(item.x) || 0,
    y: Number(item.y) || 0,
    rotation: toStoredRotation(Number(item.rotation) || 0),
    width: getItemWidth(item),
    height: getItemHeight(item)
  }
}

export function areComparableDeskItemsEqual(leftItem, rightItem) {
  return JSON.stringify(getComparableDeskItem(leftItem)) === JSON.stringify(getComparableDeskItem(rightItem))
}

export function getPersistableDeskItem(item, currentUserId) {
  const comparable = getComparableDeskItem(item)
  if (!comparable || !comparable.id || !comparable.desk_id) return null

  if (comparable.item_type === 'checklist') {
    return {
      item_type: 'checklist',
      table: 'checklists',
      id: comparable.id,
      payload: {
        id: comparable.id,
        desk_id: comparable.desk_id,
        user_id: comparable.user_id || currentUserId,
        title: comparable.title,
        color: comparable.color,
        text_color: comparable.text_color,
        font_size: comparable.font_size,
        font_family: comparable.font_family,
        x: comparable.x,
        y: comparable.y,
        rotation: comparable.rotation,
        width: comparable.width,
        height: comparable.height
      },
      checklistItems: comparable.items || []
    }
  }

  if (comparable.item_type === 'decoration') {
    return {
      item_type: 'decoration',
      table: 'decorations',
      id: comparable.id,
      payload: {
        id: comparable.id,
        desk_id: comparable.desk_id,
        kind: comparable.kind,
        x: comparable.x,
        y: comparable.y,
        rotation: comparable.rotation,
        width: comparable.width,
        height: comparable.height
      }
    }
  }

  return {
    item_type: 'note',
    table: 'notes',
    id: comparable.id,
    payload: {
      id: comparable.id,
      desk_id: comparable.desk_id,
      user_id: comparable.user_id || currentUserId,
      content: comparable.content,
      color: comparable.color,
      text_color: comparable.text_color,
      font_size: comparable.font_size,
      font_family: comparable.font_family,
      x: comparable.x,
      y: comparable.y,
      rotation: comparable.rotation,
      width: comparable.width,
      height: comparable.height
    }
  }
}