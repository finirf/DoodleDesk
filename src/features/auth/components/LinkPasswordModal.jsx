import { useState } from 'react'
import { supabase } from '../../../supabase'
import './AuthScreen.css'

/**
 * Modal/inline component for users to set a password on their OAuth-linked account.
 * Used when a user with a Google-only account wants to add password-based login.
 */
export default function LinkPasswordModal({ email, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSetPassword(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.')
      return
    }

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
      // updateUser on authenticated user adds/updates password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

      if (updateError) {
        setError(updateError.message || 'Failed to set password. Please try again.')
      } else {
        setSuccess('Password set successfully! You can now log in with your email and password.')
        setTimeout(() => {
          onSuccess?.()
        }, 2000)
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-content">
        <h2>Create a Password</h2>
        <p className="auth-modal-subtitle">Add a password to your {email} account so you can log in without Google next time.</p>

        <form onSubmit={handleSetPassword} className="auth-form">
          <label htmlFor="link-password" className="auth-label">
            Password
          </label>
          <div className="auth-password-field">
            <input
              id="link-password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Choose a password"
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

          <label htmlFor="link-confirm-password" className="auth-label">
            Confirm password
          </label>
          <div className="auth-password-field">
            <input
              id="link-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
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

          {error && <div className="auth-message auth-message-error">{error}</div>}
          {success && <div className="auth-message auth-message-success">{success}</div>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="submit"
              disabled={loading || !!success}
              className="auth-submit-button"
              style={{ flex: 1 }}
            >
              {loading ? 'Setting password...' : 'Set Password'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="auth-cancel-button"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
