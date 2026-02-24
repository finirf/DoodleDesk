import { useEffect, useState } from 'react'
import { supabase } from './supabase'

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
          // Clean URL hash (#access_token=...)
          if (window.location.hash) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } else {
          // 2️⃣ Fallback: get session from storage for returning users
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

      // Listen for auth changes (sign-in/sign-out)
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

  // If no session or user, show login/signup screen
  if (!session || !session.user) {
    return <LoginScreen />
  }

  // Otherwise show the Desk
  return <Desk user={session.user} />
}

function LoginScreen() {
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailAuth(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        else setSuccess('Logged in!')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setError(error.message)
        else setSuccess('Check your email to confirm your account!')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 40, minHeight: '100vh', textAlign: 'center' }}>
      <h2>DoodleDesk</h2>

      <button
        onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
        style={{
          padding: '10px 20px',
          fontSize: 16,
          cursor: 'pointer',
          background: '#4285F4',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          marginTop: 20,
          marginBottom: 30
        }}
      >
        Login with Google
      </button>

      <div
        style={{
          margin: '30px auto',
          maxWidth: 320,
          textAlign: 'left',
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 24
        }}
      >
        <form onSubmit={handleEmailAuth}>
          <label htmlFor="email" style={{ fontWeight: 600 }}>
            {mode === 'login' ? 'Login' : 'Sign up'} with email:
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              margin: '10px 0',
              fontSize: 16,
              borderRadius: 4,
              border: '1px solid #ccc'
            }}
          />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              margin: '10px 0',
              fontSize: 16,
              borderRadius: 4,
              border: '1px solid #ccc'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 16px',
              fontSize: 15,
              background: '#222',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              marginBottom: 10,
              width: '100%'
            }}
          >
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div style={{ marginTop: 10, textAlign: 'center' }}>
          {mode === 'login' ? (
            <>
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => setMode('signup')}
                style={{
                  color: '#4285F4',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  color: '#4285F4',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                Login
              </button>
            </>
          )}
        </div>

        {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  )
}

function Desk({ user }) {
  const [notes, setNotes] = useState([])

  useEffect(() => {
    fetchNotes()
  }, [])

  async function fetchNotes() {
    const { data, error } = await supabase.from('notes').select('*')
    if (!error) setNotes(data)
  }

  async function addNote() {
    await supabase.from('notes').insert([
      {
        user_id: user.id,
        content: 'New note',
        x: 100,
        y: 100,
        rotation: 0
      }
    ])
    fetchNotes()
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }


  // Drag state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Handle drag start
  function handleDragStart(e, note) {
    setDraggedId(note.id);
    setDragOffset({
      x: e.clientX - note.x,
      y: e.clientY - note.y
    });
  }

  // Handle drag move
  function handleDrag(e) {
    if (draggedId === null) return;
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === draggedId
          ? { ...note, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
          : note
      )
    );
  }

  // Handle drag end
  async function handleDragEnd(e) {
    if (draggedId === null) return;
    const note = notes.find((n) => n.id === draggedId);
    setDraggedId(null);
    // Persist new position
    await supabase.from('notes').update({ x: note.x, y: note.y }).eq('id', note.id);
    fetchNotes();
  }

  useEffect(() => {
    if (draggedId !== null) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  });

  return (
    <div style={{
      padding: 40,
      minHeight: '100vh',
      position: 'relative',
      backgroundImage: 'url("/desk.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          padding: '8px 16px',
          fontSize: 14,
          background: '#eee',
          border: '1px solid #ccc',
          borderRadius: 4,
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        Logout
      </button>

      <button
        onClick={addNote}
        style={{
          padding: '8px 16px',
          fontSize: 14,
          marginBottom: 20,
          cursor: 'pointer'
        }}
      >
        New Note
      </button>


      {notes.map((note) => (
        <div
          key={note.id}
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
                e.preventDefault();
                await supabase.from('notes').update({ content: editValue }).eq('id', note.id);
                setEditingId(null);
                setEditValue('');
                fetchNotes();
              }}
            >
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                autoFocus
                style={{ width: '100%', minHeight: 60, fontSize: 16, borderRadius: 4, border: '1px solid #ccc', resize: 'vertical', color: '#222' }}
              />
              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <button type="submit" style={{ marginRight: 8, padding: '4px 12px', borderRadius: 4, border: 'none', background: '#4285F4', color: '#fff', cursor: 'pointer' }}>Save</button>
                <button type="button" onClick={() => { setEditingId(null); setEditValue(''); }} style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: '#eee', color: '#333', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          ) : (
            <div
              onClick={() => { setEditingId(note.id); setEditValue(note.content); }}
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: 'pointer', minHeight: 40, color: '#222' }}
            >
              {note.content}
            </div>
          )}
        </div>
      ))}

      <Footer />
    </div>
  )
}

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