import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'

// Handles initial auth bootstrap, redirect-based recovery sessions, and live session updates.
export default function useAuthSession() {
  const isDev = import.meta.env.DEV
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
        const { data: { session: persistedSession }, error } = await supabase.auth.getSession()
        if (error) console.error('Get session error:', error)
        if (!isMounted) return
        setSession(persistedSession)
        if (isDev) {
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
      if (isDev) {
        console.log('Auth state changed:', nextSession)
      }
    })

    return () => {
      isMounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [isDev])

  function exitRecoveryFlow() {
    setIsRecoveryFlow(false)
  }

  return { session, loading, isRecoveryFlow, exitRecoveryFlow }
}
