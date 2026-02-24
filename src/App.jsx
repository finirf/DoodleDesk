import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import LoginScreen from './LoginScreen'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSession() {
      try {
        // 1️⃣ Check if coming back from OAuth redirect
        const { data: redirectData, error: redirectError } = await supabase.auth.getSessionFromUrl()
        if (redirectError) console.error('Redirect session error:', redirectError)
        if (redirectData?.session) {
          setSession(redirectData.session)
          console.log('Session from redirect:', redirectData.session)
          if (window.location.hash) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } else {
          // 2️⃣ Fallback: get session from storage
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error) console.error('Get session error:', error)
          setSession(session)
          console.log('Initial session:', session)
        }
      } catch (err) {
        console.error('Error loading session:', err)
      } finally {
        setLoading(false)
      }

      // Listen for auth changes
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        console.log('Auth state changed:', session)
      })
      return () => listener.subscription.unsubscribe()
    }

    loadSession()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 40, minHeight: '100vh', textAlign: 'center' }}>
        <h2>DoodleDesk</h2>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session || !session.user) {
    return <LoginScreen />
  }

  return <Desk user={session.user} />
}

// ------------------- Desk -------------------
function Desk({ user }) {
  const [notes, setNotes] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [sectionHeight, setSectionHeight] = useState(() => window.innerHeight || 800)
  const [canvasHeight, setCanvasHeight] = useState(() => {
    const initialHeight = window.innerHeight || 800
    return initialHeight * 2
  })
  const draggedIdRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const notesRef = useRef([])
  const rotatingNoteIdRef = useRef(null)
  const rotationOffsetRef = useRef(0)
  const rotationCenterRef = useRef({ x: 0, y: 0 })

  const noteWidth = 200
  const noteHeight = 120
  const growThreshold = 180

  const sectionCount = Math.max(2, Math.ceil(canvasHeight / sectionHeight))
  const backgroundImage = Array.from({ length: sectionCount }, (_, index) =>
    index % 2 === 0 ? "url('/desk.png')" : "url('/desk2.png')"
  ).join(', ')
  const backgroundSize = Array.from({ length: sectionCount }, () => `100% ${sectionHeight}px`).join(', ')
  const backgroundPosition = Array.from({ length: sectionCount }, (_, index) =>
    index === 0 ? 'top center' : `center ${index * sectionHeight}px`
  ).join(', ')
  const backgroundRepeat = Array.from({ length: sectionCount }, () => 'no-repeat').join(', ')

  useEffect(() => {
    fetchNotes()
  }, [])

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    function handleResize() {
      const nextSectionHeight = window.innerHeight || 800
      setSectionHeight(nextSectionHeight)
      setCanvasHeight((prev) => Math.max(prev, nextSectionHeight * 2))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!pendingDeleteId) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setPendingDeleteId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [pendingDeleteId])

  async function fetchNotes() {
    const { data, error } = await supabase.from('notes').select('*').eq('user_id', user.id)
    if (!error && data) {
      setNotes(data)

      const maxNoteY = data.reduce((maxY, note) => Math.max(maxY, Number(note.y) || 0), 0)
      const requiredHeight = maxNoteY + noteHeight + growThreshold
      const requiredSections = Math.max(2, Math.ceil(requiredHeight / sectionHeight))
      setCanvasHeight((prev) => Math.max(prev, requiredSections * sectionHeight))
    }
  }

  async function addNote() {
    const { data, error } = await supabase
      .from('notes')
      .insert([{ user_id: user.id, content: 'New note', x: 100, y: 100, rotation: 0 }])
      .select()
    if (!error) setNotes((prev) => [...prev, ...data])
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function normalizeRotation(value) {
    return ((value % 360) + 360) % 360
  }

  function toStoredRotation(value) {
    return Math.round(normalizeRotation(value))
  }

  async function persistRotation(noteId, rotationValue) {
    const storedRotation = toStoredRotation(rotationValue)
    const { error } = await supabase
      .from('notes')
      .update({ rotation: storedRotation })
      .eq('id', noteId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to save note rotation:', error)
      return null
    }

    return storedRotation
  }

  function getPointerAngleFromCenter(pageX, pageY) {
    return (Math.atan2(pageY - rotationCenterRef.current.y, pageX - rotationCenterRef.current.x) * 180) / Math.PI
  }

  function handleRotateMouseDown(e, noteId) {
    e.preventDefault()
    e.stopPropagation()

    const noteElement = e.currentTarget.closest('[data-note-id]')
    if (!noteElement) return

    const rect = noteElement.getBoundingClientRect()
    const centerX = rect.left + window.scrollX + rect.width / 2
    const centerY = rect.top + window.scrollY + rect.height / 2
    rotationCenterRef.current = { x: centerX, y: centerY }

    const currentNote = notesRef.current.find((note) => note.id === noteId)
    if (!currentNote) return

    const currentRotation = Number(currentNote.rotation) || 0
    const pointerAngle = getPointerAngleFromCenter(e.pageX, e.pageY)
    rotationOffsetRef.current = currentRotation - pointerAngle
    rotatingNoteIdRef.current = noteId

    window.addEventListener('mousemove', handleRotateMouseMove)
    window.addEventListener('mouseup', handleRotateMouseUp)
  }

  function handleRotateMouseMove(e) {
    const activeRotatingId = rotatingNoteIdRef.current
    if (!activeRotatingId) return

    const pointerAngle = getPointerAngleFromCenter(e.pageX, e.pageY)
    const nextRotation = normalizeRotation(pointerAngle + rotationOffsetRef.current)

    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeRotatingId ? { ...note, rotation: nextRotation } : note
      )
    )
  }

  async function handleRotateMouseUp(e) {
    const activeRotatingId = rotatingNoteIdRef.current

    rotatingNoteIdRef.current = null
    window.removeEventListener('mousemove', handleRotateMouseMove)
    window.removeEventListener('mouseup', handleRotateMouseUp)

    if (!activeRotatingId) return

    let nextRotation = null

    if (e) {
      const pointerAngle = getPointerAngleFromCenter(e.pageX, e.pageY)
      nextRotation = normalizeRotation(pointerAngle + rotationOffsetRef.current)

      setNotes((prev) =>
        prev.map((note) =>
          note.id === activeRotatingId ? { ...note, rotation: nextRotation } : note
        )
      )
    } else {
      const noteToPersist = notesRef.current.find((note) => note.id === activeRotatingId)
      if (!noteToPersist) return
      nextRotation = Number(noteToPersist.rotation) || 0
    }

    const savedRotation = await persistRotation(activeRotatingId, nextRotation)
    if (savedRotation !== null) {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === activeRotatingId ? { ...note, rotation: savedRotation } : note
        )
      )
    }
  }

  function requestDeleteNote(noteId) {
    setPendingDeleteId(noteId)
  }

  async function confirmDeleteNote() {
    if (!pendingDeleteId) return

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', pendingDeleteId)
      .eq('user_id', user.id)

    if (!error) {
      setNotes((prev) => prev.filter((note) => note.id !== pendingDeleteId))
      if (editingId === pendingDeleteId) {
        setEditingId(null)
        setEditValue('')
      }
    }

    setPendingDeleteId(null)
  }

  function handleDragStart(e, note) {
    if (editingId) return

    setDraggedId(note.id)
    draggedIdRef.current = note.id

    const offset = { x: e.pageX - note.x, y: e.pageY - note.y }
    setDragOffset(offset)
    dragOffsetRef.current = offset

    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', handleDragEnd)
  }

  function handleDragMove(e) {
    const activeDraggedId = draggedIdRef.current
    if (!activeDraggedId) return

    const nextX = e.pageX - dragOffsetRef.current.x
    const nextY = e.pageY - dragOffsetRef.current.y

    setCanvasHeight((prev) => {
      if (nextY + noteHeight + growThreshold <= prev) return prev
      const requiredHeight = nextY + noteHeight + growThreshold
      const requiredSections = Math.ceil(requiredHeight / sectionHeight)
      return Math.max(prev, requiredSections * sectionHeight)
    })

    const maxX = Math.max(0, window.innerWidth - noteWidth)
    const boundedX = Math.min(Math.max(0, nextX), maxX)
    const boundedY = Math.max(0, nextY)

    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeDraggedId
          ? { ...note, x: boundedX, y: boundedY }
          : note
      )
    )
  }

  async function handleDragEnd(e) {
    const activeDraggedId = draggedIdRef.current

    setDraggedId(null)
    draggedIdRef.current = null
    window.removeEventListener('mousemove', handleDragMove)
    window.removeEventListener('mouseup', handleDragEnd)

    if (!activeDraggedId) return

    let nextPosition = null

    if (e) {
      const nextX = e.pageX - dragOffsetRef.current.x
      const nextY = e.pageY - dragOffsetRef.current.y
      const maxX = Math.max(0, window.innerWidth - noteWidth)
      nextPosition = {
        x: Math.min(Math.max(0, nextX), maxX),
        y: Math.max(0, nextY)
      }

      setNotes((prev) =>
        prev.map((note) =>
          note.id === activeDraggedId ? { ...note, x: nextPosition.x, y: nextPosition.y } : note
        )
      )
    } else {
      const noteToPersist = notesRef.current.find((note) => note.id === activeDraggedId)
      if (!noteToPersist) return
      nextPosition = { x: noteToPersist.x, y: noteToPersist.y }
    }

    await supabase
      .from('notes')
      .update({ x: nextPosition.x, y: nextPosition.y })
      .eq('id', activeDraggedId)
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: canvasHeight,
        padding: 20,
        backgroundImage,
        backgroundSize,
        backgroundPosition,
        backgroundRepeat
      }}
    >
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          padding: '8px 16px',
          fontSize: 14,
          cursor: 'pointer'
        }}
      >
        Logout
      </button>

      <button
        onClick={addNote}
        style={{ padding: '8px 16px', fontSize: 14, marginBottom: 20, cursor: 'pointer' }}
      >
        New Note
      </button>

      {notes.map((note) => (
        <div
          key={note.id}
          data-note-id={note.id}
          onMouseDown={editingId ? undefined : (e) => handleDragStart(e, note)}
          style={{
            position: 'absolute',
            left: note.x,
            top: note.y,
            transform: `rotate(${note.rotation || 0}deg)`,
            background: '#fffa91',
            padding: 20,
            width: 200,
            boxShadow: '3px 3px 10px rgba(0,0,0,0.3)',
            cursor: editingId ? 'text' : draggedId === note.id ? 'grabbing' : 'grab',
            zIndex: draggedId === note.id ? 100 : 1
          }}
        >
          {editingId === note.id ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const noteToSave = notesRef.current.find((item) => item.id === note.id)
                const nextRotation = toStoredRotation(Number(noteToSave?.rotation) || 0)

                const { error } = await supabase
                  .from('notes')
                  .update({ content: editValue, rotation: nextRotation })
                  .eq('id', note.id)
                  .eq('user_id', user.id)

                if (!error) {
                  setNotes((prev) =>
                    prev.map((item) =>
                      item.id === note.id ? { ...item, content: editValue, rotation: nextRotation } : item
                    )
                  )
                }

                setEditingId(null)
                setEditValue('')
              }}
            >
              <div style={{ marginBottom: 8, textAlign: 'center' }}>
                <button
                  type="button"
                  onMouseDown={(e) => handleRotateMouseDown(e, note.id)}
                  aria-label="Rotate note"
                  title="Hold and drag to rotate"
                  style={{
                    width: 24,
                    height: 24,
                    fontSize: 16,
                    lineHeight: 1,
                    borderRadius: 4,
                    border: 'none',
                    background: '#777',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  ↻
                </button>
              </div>

              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  minHeight: 60,
                  fontSize: 16,
                  borderRadius: 4,
                  border: '1px solid #ccc',
                  resize: 'vertical',
                  color: '#222'
                }}
              />
              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => requestDeleteNote(note.id)}
                  style={{
                    marginRight: 4,
                    padding: '2px 6px',
                    fontSize: 11,
                    borderRadius: 4,
                    border: 'none',
                    background: '#d32f2f',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
                <button
                  type="submit"
                  style={{
                    marginRight: 4,
                    padding: '2px 6px',
                    fontSize: 11,
                    borderRadius: 4,
                    border: 'none',
                    background: '#4285F4',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setEditValue('')
                  }}
                  style={{
                    padding: '2px 6px',
                    fontSize: 11,
                    borderRadius: 4,
                    border: 'none',
                    background: '#eee',
                    color: '#333',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div
              onClick={() => {
                setEditingId(note.id)
                setEditValue(note.content)
              }}
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                cursor: 'pointer',
                minHeight: 40,
                color: '#222'
              }}
            >
              {note.content}
            </div>
          )}
        </div>
      ))}

      {pendingDeleteId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              width: 280,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              textAlign: 'center'
            }}
          >
            <div style={{ marginBottom: 12, color: '#222' }}>Delete this note?</div>
            <button
              type="button"
              onClick={confirmDeleteNote}
              style={{
                marginRight: 8,
                padding: '6px 12px',
                borderRadius: 4,
                border: 'none',
                background: '#d32f2f',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: 'none',
                background: '#eee',
                color: '#333',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

// ------------------- Footer -------------------
function Footer() {
  return (
    <footer
      style={{
        position: 'fixed',
        bottom: 10,
        width: '100%',
        textAlign: 'center',
        fontSize: 14,
        color: '#555'
      }}
    >
      <a href="/privacy.html" style={{ color: '#555', textDecoration: 'underline' }}>
        Privacy Policy
      </a>
    </footer>
  )
}