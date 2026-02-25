import { useState } from 'react'
import { supabase } from './supabase'
import './LoginScreen.css'

export default function ResetPasswordScreen({ hasRecoverySession, onBackToLogin }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess('Password updated. You can now log in with your new password.')
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
          <h1>Reset Password</h1>
          <p>Choose a new password for your DoodleDesk account.</p>
        </div>

        <div className="auth-card">
          {!hasRecoverySession ? (
            <>
              <div className="auth-message auth-message-error">
                This reset link is invalid or has expired. Request a new password reset from the login screen.
              </div>
              <div className="auth-switch-row">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="auth-link-button"
                >
                  Back to login
                </button>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleResetPassword} className="auth-form">
                <label htmlFor="new-password" className="auth-label">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  required
                  className="auth-input"
                />

                <label htmlFor="confirm-password" className="auth-label">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="auth-input"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-button"
                >
                  {loading ? 'Updating...' : 'Update password'}
                </button>
              </form>

              <div className="auth-switch-row">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="auth-link-button"
                >
                  Back to login
                </button>
              </div>
            </>
          )}

          {success && <div className="auth-message auth-message-success">{success}</div>}
          {error && <div className="auth-message auth-message-error">{error}</div>}
        </div>
      </div>
    </div>
  )
}
