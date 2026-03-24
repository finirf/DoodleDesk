export function normalizeChecklistReminderValue(value) {
  if (!value) return null
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return null
  return parsedDate.toISOString()
}

export function toReminderInputValue(value) {
  if (!value) return ''
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return ''

  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')
  const hour = String(parsedDate.getHours()).padStart(2, '0')
  const minute = String(parsedDate.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}`
}

export function formatChecklistReminderValue(value) {
  if (!value) return ''
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return ''

  return parsedDate.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function getChecklistReminderMeta(entry) {
  const normalizedDueAt = normalizeChecklistReminderValue(entry?.due_at)
  if (!normalizedDueAt || entry?.is_checked) return null

  const dueDate = new Date(normalizedDueAt)
  const diffMs = dueDate.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)

  if (diffMs <= 0) {
    return {
      label: `Overdue ${Math.abs(diffMinutes)}m`,
      color: '#8b0000',
      background: '#ffe5e5'
    }
  }

  if (diffMs <= 30 * 60 * 1000) {
    return {
      label: `Due in ${Math.max(1, diffMinutes)}m`,
      color: '#7a4a00',
      background: '#fff3d6'
    }
  }

  return {
    label: `Due ${formatChecklistReminderValue(normalizedDueAt)}`,
    color: '#0b4f86',
    background: '#e8f4ff'
  }
}
