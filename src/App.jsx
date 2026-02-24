import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  if (!session) {
    return (
      <div style={{ padding: 40 }}>
        <h2>DoodleDesk</h2>
        <button
          onClick={() =>
            supabase.auth.signInWithOAuth({ provider: 'google' })
          }
        >
          Login with Google
        </button>
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
    const { data, error } = await supabase
      .from('notes')
      .select('*')

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
    <div style={{ padding: 40 }}>
      <button onClick={addNote}>New Note</button>

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
    </div>
  )
}

export default App