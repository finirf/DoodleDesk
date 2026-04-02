import { useState } from 'react'
import { supabase } from '../../../supabase'
import './AuthScreen.css'

export default function ResetPasswordScreen({ hasRecoverySession, onBackToLogin }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
            src="/images/Decorations/DoodleDesk%20Logo.png"
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
                <div className="auth-password-field">
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    required
                    className="auth-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="auth-password-toggle"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <label htmlFor="confirm-password" className="auth-label">Confirm new password</label>
                <div className="auth-password-field">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="auth-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="auth-password-toggle"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

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