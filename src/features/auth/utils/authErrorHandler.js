/**
 * Analyzes Supabase auth errors to detect account linking edge cases.
 * Returns structured error info to help distinguish between:
 * - OAuth-only accounts (user signed up with Google but trying password)
 * - Invalid credentials (wrong password)
 * - User not found (new account)
 */

export function analyzeAuthError(error, email) {
  if (!error) return { type: 'UNKNOWN', message: '', suggestOAuth: false, suggestLinkPassword: false }

  const lowercaseMessage = (error.message || '').toLowerCase()

  // OAuth-only account: someone tries password login but has no password set
  // Supabase returns "Invalid login credentials" for both wrong password AND no password
  // We assume if they got an error here, it might be an OAuth-only account
  if (
    lowercaseMessage.includes('invalid login credentials') ||
    lowercaseMessage.includes('invalid_credentials') ||
    lowercaseMessage.includes('wrong email or password')
  ) {
    return {
      type: 'INVALID_CREDENTIALS',
      message:
        'Email or password is incorrect. If you registered with Google, please use "Continue with Google" instead. Or you can create a password for this account.',
      suggestOAuth: true,
      suggestLinkPassword: true,
      email,
    }
  }

  // Email not confirmed (OAuth account typically auto-confirms)
  if (lowercaseMessage.includes('email not confirmed') || lowercaseMessage.includes('email_not_confirmed')) {
    return {
      type: 'EMAIL_NOT_CONFIRMED',
      message: 'Please confirm your email before logging in.',
      suggestOAuth: true,
      suggestLinkPassword: false,
      email,
    }
  }

  // Generic signup errors
  if (lowercaseMessage.includes('user already registered') || lowercaseMessage.includes('already registered')) {
    return {
      type: 'USER_ALREADY_EXISTS',
      message:
        'An account with this email already exists. Try logging in instead, or use "Continue with Google" if you registered that way.',
      suggestOAuth: true,
      suggestLinkPassword: true,
      email,
    }
  }

  // Rate limited
  if (lowercaseMessage.includes('rate limit') || lowercaseMessage.includes('too_many_requests')) {
    return {
      type: 'RATE_LIMITED',
      message: 'Too many attempts. Please try again in a few minutes.',
      suggestOAuth: false,
      suggestLinkPassword: false,
    }
  }

  // Unknown error
  return {
    type: 'UNKNOWN',
    message: error.message || 'An error occurred. Please try again.',
    suggestOAuth: false,
    suggestLinkPassword: false,
    email,
  }
}
