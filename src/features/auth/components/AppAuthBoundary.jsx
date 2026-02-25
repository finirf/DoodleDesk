import LoginScreen from './LoginScreen'
import ResetPasswordScreen from './ResetPasswordScreen'

export default function AppAuthBoundary({ loading, isRecoveryFlow, session, onBackToLogin, children }) {
  if (loading) {
    return (
      <div style={{ padding: 40, minHeight: '100vh', textAlign: 'center' }}>
        <h2>DoodleDesk</h2>
        <p>Loading...</p>
      </div>
    )
  }

  if (isRecoveryFlow) {
    return (
      <ResetPasswordScreen
        hasRecoverySession={Boolean(session?.user)}
        onBackToLogin={onBackToLogin}
      />
    )
  }

  if (!session || !session.user) {
    return <LoginScreen />
  }

  return children
}