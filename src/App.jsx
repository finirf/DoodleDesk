import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  async function loadSession() {
    try {
      // 1. Try to get session from redirect URL (after OAuth login)
      const { data: redirectData, error: redirectError } = await supabase.auth.getSessionFromUrl()
      if (redirectError) console.error('Redirect session error:', redirectError)
      if (redirectData?.session) {
        setSession(redirectData.session)
        console.log('Session from redirect:', redirectData.session)
        // Clean up the URL hash (#access_token=...)
        if (window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      } else {
        // 2. Normal session retrieval (returning user or refresh)
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) console.error('Get session error:', error)
        setSession(session)
        console.log('Initial session:', session)
      }
    } catch (err) {
      console.error('Error loading session:', err)
    } finally {
      // Always stop loading regardless of errors
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

  // ...existing code...

}

function LoginScreen() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else setSuccess('Logged in!');
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess('Check your email to confirm your account!');
    }
    setLoading(false);
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
      <div style={{ margin: '30px auto', maxWidth: 320, textAlign: 'left', border: '1px solid #eee', borderRadius: 8, padding: 24 }}>
        <form onSubmit={handleEmailAuth}>
          <label htmlFor="email" style={{ fontWeight: 600 }}>{mode === 'login' ? 'Login' : 'Sign up'} with email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              margin: '10px 0 10px 0',
              fontSize: 16,
              borderRadius: 4,
              border: '1px solid #ccc'
            }}
          />
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              margin: '10px 0 10px 0',
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
              <span>Don't have an account?{' '}</span>
              <button type="button" onClick={() => setMode('signup')} style={{ color: '#4285F4', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Sign up</button>
            </>
          ) : (
            <>
              <span>Already have an account?{' '}</span>
              <button type="button" onClick={() => setMode('login')} style={{ color: '#4285F4', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Login</button>
            </>
          )}
        </div>
        {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  );
}
// ...existing code...

function Desk({ user }) {
  const [notes, setNotes] = useState([])
  // Debug output
  useEffect(() => {
    console.log('Desk user prop:', user)
  }, [user])

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
      <pre style={{ background: '#eee', padding: 10, borderRadius: 4, marginBottom: 16 }}>
        Debug: user = {JSON.stringify(user, null, 2)}
      </pre>
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