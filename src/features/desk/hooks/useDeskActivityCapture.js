import { useRef, useCallback } from 'react'

/**
 * Hook to capture and buffer DoodleDesk activity events for export to Azure.
 * Tracks: note creation/edit, checklist toggles, session start/end, collaboration.
 * Events are buffered in memory and can be exported as CSV or JSON.
 */
export default function useDeskActivityCapture({ userId, selectedDeskId }) {
  // In-memory event buffer
  const eventsRef = useRef([])
  const sessionIdRef = useRef(null)
  const sessionStartTimeRef = useRef(null)

  // Initialize session on first capture
  const initializeSession = useCallback(() => {
    if (!sessionIdRef.current) {
      const now = new Date()
      sessionIdRef.current = `sess_${now.getTime()}_${userId}_${Math.random().toString(36).slice(2, 9)}`
      sessionStartTimeRef.current = now
    }
    return sessionIdRef.current
  }, [userId])

  // Capture a single activity event
  const captureEvent = useCallback(
    (eventType, eventData = {}) => {
      if (!userId || !selectedDeskId) return

      const sessionId = initializeSession()
      const now = new Date()
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      // Calculate session duration in seconds
      const sessionSeconds = sessionStartTimeRef.current
        ? Math.floor((now - sessionStartTimeRef.current) / 1000)
        : 0

      const event = {
        event_id: eventId,
        user_id: userId,
        desk_id: selectedDeskId,
        event_type: eventType,
        event_ts_utc: now.toISOString(),
        session_id: sessionId,
        note_id: eventData.noteId || null,
        edit_count: eventData.editCount || 0,
        collaboration_count: eventData.collaborationCount || 0,
        session_seconds: sessionSeconds,
        device_type: /mobile|tablet/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        platform: `${navigator.userAgent.split(' ').slice(-2).join(' ')}`,
        metadata_json: {
          app_version: '1.8.3',
          entry_point: eventData.entryPoint || 'canvas',
          ...eventData.metadata,
        },
      }

      eventsRef.current.push(event)
    },
    [userId, selectedDeskId, initializeSession]
  )

  // Capture note creation
  const captureNoteCreate = useCallback(
    (noteId) => {
      captureEvent('note_create', { noteId, editCount: 1 })
    },
    [captureEvent]
  )

  // Capture note edit
  const captureNoteEdit = useCallback(
    (noteId, editCount = 1) => {
      captureEvent('note_edit', { noteId, editCount })
    },
    [captureEvent]
  )

  // Capture checklist toggle
  const captureChecklistToggle = useCallback(
    (noteId) => {
      captureEvent('checklist_toggle', { noteId })
    },
    [captureEvent]
  )

  // Capture collaboration event
  const captureCollaboration = useCallback(
    (noteId, collaborationCount = 1) => {
      captureEvent('collaboration', { noteId, collaborationCount })
    },
    [captureEvent]
  )

  // Capture session start
  const captureSessionStart = useCallback(() => {
    initializeSession()
    captureEvent('session_start', {})
  }, [captureEvent, initializeSession])

  // Capture session end
  const captureSessionEnd = useCallback(() => {
    captureEvent('session_end', {})
  }, [captureEvent])

  // Clear events and reset session
  const clearEvents = useCallback(() => {
    eventsRef.current = []
    sessionIdRef.current = null
    sessionStartTimeRef.current = null
  }, [])

  // Get all captured events
  const getEvents = useCallback(() => eventsRef.current, [])

  // Get event count
  const getEventCount = useCallback(() => eventsRef.current.length, [])

  // Export events as JSON
  const exportAsJSON = useCallback(() => {
    return JSON.stringify(eventsRef.current, null, 2)
  }, [])

  // Export events as CSV
  const exportAsCSV = useCallback(() => {
    if (eventsRef.current.length === 0) {
      return 'No events to export'
    }

    // Define CSV headers
    const headers = [
      'event_id',
      'user_id',
      'desk_id',
      'event_type',
      'event_ts_utc',
      'session_id',
      'note_id',
      'edit_count',
      'collaboration_count',
      'session_seconds',
      'device_type',
      'platform',
      'metadata_json',
    ]

    // Convert events to CSV rows
    const rows = eventsRef.current.map((event) => [
      event.event_id,
      event.user_id,
      event.desk_id,
      event.event_type,
      event.event_ts_utc,
      event.session_id,
      event.note_id || '',
      event.edit_count,
      event.collaboration_count,
      event.session_seconds,
      event.device_type,
      `"${event.platform.replace(/"/g, '""')}"`, // Escape quotes in platform
      `"${JSON.stringify(event.metadata_json).replace(/"/g, '""')}"`, // Escape quotes in JSON
    ])

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    return csvContent
  }, [])

  // Download and save events as file
  const downloadEvents = useCallback(
    (format = 'json') => {
      if (eventsRef.current.length === 0) {
        console.warn('No events captured yet')
        return
      }

      let content, filename, mimeType

      if (format === 'csv') {
        content = exportAsCSV()
        filename = `doodledesk_activity_${Date.now()}.csv`
        mimeType = 'text/csv;charset=utf-8;'
      } else {
        content = exportAsJSON()
        filename = `doodledesk_activity_${Date.now()}.json`
        mimeType = 'application/json;charset=utf-8;'
      }

      // Create blob and download
      const blob = new Blob([content], { type: mimeType })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
    [exportAsJSON, exportAsCSV]
  )

  return {
    // Capture methods
    captureEvent,
    captureNoteCreate,
    captureNoteEdit,
    captureChecklistToggle,
    captureCollaboration,
    captureSessionStart,
    captureSessionEnd,

    // Query methods
    getEvents,
    getEventCount,

    // Export methods
    exportAsJSON,
    exportAsCSV,
    downloadEvents,

    // Utility
    clearEvents,
  }
}
