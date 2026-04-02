import { useState } from 'react'
import { supabase } from '../../../supabase'
import { analyzeAuthError } from '../utils/authErrorHandler'
import LinkPasswordModal from './LinkPasswordModal'
import './AuthScreen.css'

export default function LoginScreen() {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showLinkPasswordModal, setShowLinkPasswordModal] = useState(false)
  const [pendingLinkEmail, setPendingLinkEmail] = useState('')

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
        if (error) {
          const analyzed = analyzeAuthError(error, email)
          // If the error suggests OAuth or link password, offer those options
          if (analyzed.suggestOAuth || analyzed.suggestLinkPassword) {
            setError(analyzed.message)
            if (analyzed.suggestLinkPassword) {
              setPendingLinkEmail(email)
            }
          } else {
            setError(analyzed.message)
          }
        } else {
          setSuccess('Logged in!')
        }
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
        if (error) {
          const analyzed = analyzeAuthError(error, email)
          setError(analyzed.message)
          // If account already exists, offer to link password
          if (analyzed.suggestLinkPassword) {
            setPendingLinkEmail(email)
          }
        } else {
          setSuccess('Check your email to confirm your account!')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  function handleOpenLinkPasswordModal() {
    setShowLinkPasswordModal(true)
  }

  function handleCloseLinkPasswordModal() {
    setShowLinkPasswordModal(false)
    setPendingLinkEmail('')
    setError('')
  }

  function handleLinkPasswordSuccess() {
    setShowLinkPasswordModal(false)
    setPendingLinkEmail('')
    setError('')
    setSuccess('Password set! Please log in with your new password.')
    setTimeout(() => {
      setModeWithCleanup('login')
      setEmail('')
      setPassword('')
    }, 2000)
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand">
          <img
            src="/images/Decorations/DoodleDesk%20Logo.png"
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
                <div className="auth-password-field">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="auth-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
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
              {error && pendingLinkEmail && (
                <button
                  type="button"
                  onClick={handleOpenLinkPasswordModal}
                  className="auth-link-button"
                  style={{ marginBottom: '15px', textDecoration: 'underline' }}
                >
                  Create a password for this account instead
                </button>
              )}

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

          {showLinkPasswordModal && (
            <LinkPasswordModal
              email={pendingLinkEmail}
              onClose={handleCloseLinkPasswordModal}
              onSuccess={handleLinkPasswordSuccess}
            />
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