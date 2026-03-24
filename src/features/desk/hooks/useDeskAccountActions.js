import { useCallback, useState } from 'react'

export default function useDeskAccountActions({
  supabase,
  lastDeskStorageKey,
  shelfPrefsStorageKey
}) {
  const [deleteAccountError, setDeleteAccountError] = useState('')
  const [deleteAccountDialog, setDeleteAccountDialog] = useState({
    isOpen: false,
    confirmationText: ''
  })
  const [deleteAccountDeleting, setDeleteAccountDeleting] = useState(false)

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  const handleDeleteAccount = useCallback(async () => {
    setDeleteAccountError('')
    setDeleteAccountDialog({
      isOpen: true,
      confirmationText: ''
    })
  }, [])

  const closeDeleteAccountDialog = useCallback(() => {
    if (deleteAccountDeleting) return
    setDeleteAccountDialog({
      isOpen: false,
      confirmationText: ''
    })
  }, [deleteAccountDeleting])

  const submitDeleteAccountDialog = useCallback(async (e) => {
    e.preventDefault()
    if (deleteAccountDeleting) return

    if (deleteAccountDialog.confirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteAccountError('Type DELETE exactly to continue.')
      return
    }

    setDeleteAccountError('')
    setDeleteAccountDeleting(true)

    try {
      const { error } = await supabase.functions.invoke('delete-account')
      if (error) {
        const message = `${error?.message || ''}`.toLowerCase()
        if (message.includes('function') || message.includes('404')) {
          throw new Error('Delete-account function is not deployed yet. Deploy the Supabase Edge Function first.')
        }
        throw error
      }

      localStorage.removeItem(lastDeskStorageKey)
      localStorage.removeItem(shelfPrefsStorageKey)

      setDeleteAccountDialog({
        isOpen: false,
        confirmationText: ''
      })

      await supabase.auth.signOut()
    } catch (error) {
      console.error('Failed to delete account data:', error)
      setDeleteAccountError(error?.message || 'Could not delete account data.')
    } finally {
      setDeleteAccountDeleting(false)
    }
  }, [deleteAccountDeleting, deleteAccountDialog.confirmationText, lastDeskStorageKey, shelfPrefsStorageKey, supabase])

  return {
    deleteAccountError,
    setDeleteAccountError,
    deleteAccountDialog,
    setDeleteAccountDialog,
    deleteAccountDeleting,
    handleLogout,
    handleDeleteAccount,
    closeDeleteAccountDialog,
    submitDeleteAccountDialog
  }
}
