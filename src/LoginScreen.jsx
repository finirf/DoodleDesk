import { useState } from 'react'
import { supabase } from './supabase'
import './LoginScreen.css'

export default function LoginScreen() {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function setModeWithCleanup(nextMode) {
    if (nextMode === 'forgot') {
      setPassword('')
    }
    setMode(nextMode)
  }

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
      } else if (mode === 'forgot') {
        const redirectTo = `${window.location.origin}${window.location.pathname}`
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Password reset email sent. Check your inbox for the reset link.')
        }
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
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand">
          <img
            src="/DoodleDesk%20Logo.png"
            alt="DoodleDesk logo"
            className="auth-logo"
          />
          <h1>DoodleDesk</h1>
          <p>Organize ideas, notes, and checklists in one focused workspace.</p>
        </div>

        <div className="auth-card">
          <form onSubmit={handleEmailAuth} className="auth-form">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              className="auth-input"
            />
            {mode !== 'forgot' && (
              <>
                <label htmlFor="password" className="auth-label">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="auth-input"
                />
              </>
            )}

            {mode === 'login' && (
              <div className="auth-inline-row">
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setSuccess('')
                    setModeWithCleanup('forgot')
                  }}
                  className="auth-link-button"
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="auth-submit-button"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Login'
                  : mode === 'forgot'
                    ? 'Send reset link'
                    : 'Create account'}
            </button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div className="auth-divider" aria-hidden="true">
                <span>or continue with</span>
              </div>

              <button
                className="auth-google-button"
                onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
                type="button"
              >
                Continue with Google
              </button>
            </>
          )}

          <div className="auth-switch-row">
          {mode === 'login' ? (
            <>
              <span>Don&apos;t have an account? </span>
              <button
                type="button"
                onClick={() => setModeWithCleanup('signup')}
                className="auth-link-button"
              >
                Sign up
              </button>
            </>
          ) : mode === 'signup' ? (
            <>
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => setModeWithCleanup('login')}
                className="auth-link-button"
              >
                Login
              </button>
            </>
          ) : (
            <>
              <span>Remembered your password? </span>
              <button
                type="button"
                onClick={() => setModeWithCleanup('login')}
                className="auth-link-button"
              >
                Back to login
              </button>
            </>
          )}
          </div>

          {success && <div className="auth-message auth-message-success">{success}</div>}
          {error && <div className="auth-message auth-message-error">{error}</div>}
        </div>
      </div>
    </div>
  )
}
