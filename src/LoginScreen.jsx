import { useState } from 'react'
import { supabase } from './supabase'

export default function LoginScreen() {
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
                style={{ color: '#4285F4', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
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
                style={{ color: '#4285F4', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
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
