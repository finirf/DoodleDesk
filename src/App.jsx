import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 40, minHeight: '100vh', position: 'relative' }}>
        <h2>DoodleDesk</h2>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ padding: 40, minHeight: '100vh', position: 'relative' }}>
        <h2>DoodleDesk</h2>
        <button
          onClick={() =>
            supabase.auth.signInWithOAuth({ provider: 'google' })
          }
          style={{
            padding: '10px 20px',
            fontSize: 16,
            cursor: 'pointer',
            background: '#4285F4',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            marginTop: 20
          }}
        >
          Login with Google
        </button>

        <Footer />
      </div>
    )
  }

  return <Desk user={session.user} />
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

  return (
    <div style={{ padding: 40, minHeight: '100vh', position: 'relative' }}>
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

      {notes.map(note => (
        <div
          key={note.id}
          style={{
            position: 'absolute',
            left: note.x,
            top: note.y,
            transform: `rotate(${note.rotation || 0}deg)`,
            background: '#fffa91',
            padding: 20,
            width: 200,
            boxShadow: '3px 3px 10px rgba(0,0,0,0.3)'
          }}
        >
          {note.content}
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
      <a
        href="/privacy.html"
        style={{ color: '#555', textDecoration: 'underline' }}
      >
        Privacy Policy
      </a>
    </footer>
  )
}

export default App