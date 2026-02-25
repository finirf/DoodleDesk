import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'

// Handles initial auth bootstrap, redirect-based recovery sessions, and live session updates.
export default function useAuthSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      const hash = window.location.hash || ''
      if (/(?:^|[&#])type=recovery(?:&|$)/i.test(hash)) {
        setIsRecoveryFlow(true)
      }

      try {
        const { data: redirectData, error: redirectError } = await supabase.auth.getSessionFromUrl()
        if (redirectError) console.error('Redirect session error:', redirectError)

        if (redirectData?.session) {
          if (!isMounted) return
          setSession(redirectData.session)
          console.log('Session from redirect:', redirectData.session)
          if (window.location.hash) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } else {
          const { data: { session: persistedSession }, error } = await supabase.auth.getSession()
          if (error) console.error('Get session error:', error)
          if (!isMounted) return
          setSession(persistedSession)
          console.log('Initial session:', persistedSession)
        }
      } catch (err) {
        console.error('Error loading session:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryFlow(true)
      }
      console.log('Auth state changed:', nextSession)
    })

    return () => {
      isMounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  function exitRecoveryFlow() {
    setIsRecoveryFlow(false)
  }

  return { session, loading, isRecoveryFlow, exitRecoveryFlow }
}
