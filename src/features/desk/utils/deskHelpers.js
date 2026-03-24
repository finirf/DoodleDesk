export function normalizeHttpUrl(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''

  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

export function normalizeHexColor(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''

  const match = raw.match(/^#(?:[\da-fA-F]{3}|[\da-fA-F]{6}|[\da-fA-F]{8})$/)
  if (!match) return ''
  return raw.toLowerCase()
}

export function normalizeCustomBackgroundValue(value) {
  return normalizeHexColor(value) || normalizeHttpUrl(value)
}

export function getDeskNameValue(desk) {
  return desk?.name || desk?.desk_name || 'Untitled desk'
}

export function isDeskCollaborative(desk) {
  return Boolean(desk?.is_collaborative)
}

export function formatDate(dateLike) {
  if (!dateLike) return 'Unknown'
  const date = new Date(dateLike)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function getProfileDisplayParts(profileLike) {
  const preferredName = typeof profileLike?.preferred_name === 'string' ? profileLike.preferred_name.trim() : ''
  const email = typeof profileLike?.email === 'string' ? profileLike.email.trim() : ''

  if (preferredName && email && preferredName.toLowerCase() !== email.toLowerCase()) {
    return { primary: preferredName, secondary: email }
  }

  return {
    primary: preferredName || email || 'Unknown user',
    secondary: ''
  }
}

export function getViewportMetrics() {
  const visualViewport = window.visualViewport
  return {
    width: Math.round(visualViewport?.width || window.innerWidth || 1280),
    height: Math.round(visualViewport?.height || window.innerHeight || 800)
  }
}

export async function withTimeout(promise, timeoutMs) {
  let timeoutId = null
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Query timeout after ${timeoutMs}ms`)),
      timeoutMs
    )
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export function isMissingTableError(error, tableName) {
  if (!error) return false
  if (error.code === '42P01') return true
  const searchable = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase()
  return searchable.includes('does not exist') && searchable.includes((tableName || '').toLowerCase())
}