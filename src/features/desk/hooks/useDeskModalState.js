/**
 * useDeskModalState
 * Consolidates all modal/dialog state management into a single hook.
 * Manages: itemDelete, confirmDialog, deleteAccount, deskName, deskMembers modals.
 */
import { useState } from 'react'

export default function useDeskModalState() {
  // Item deletion confirmation
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  // Generic confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    action: null,
    loading: false
  })

  // Delete account confirmation
  const [deleteAccountDialog, setDeleteAccountDialog] = useState({
    isOpen: false,
    deleting: false,
    error: null,
    confirmationInput: ''
  })

  // Desk create/rename dialog
  const [deskNameDialog, setDeskNameDialog] = useState({
    isOpen: false,
    type: null,
    desk: null,
    error: null,
    saving: false
  })

  // Desk members management dialog
  const [deskMembersDialogOpen, setDeskMembersDialogOpen] = useState(false)

  // New-user tutorial dialog
  const [tutorialDialogOpen, setTutorialDialogOpen] = useState(false)

  // Unified modal close operations
  const closeAllModals = () => {
    setPendingDeleteId(null)
    setConfirmDialog({ isOpen: false, action: null, loading: false })
    setDeleteAccountDialog({ isOpen: false, deleting: false, error: null, confirmationInput: '' })
    setDeskNameDialog({ isOpen: false, type: null, desk: null, error: null, saving: false })
    setDeskMembersDialogOpen(false)
    setTutorialDialogOpen(false)
  }

  return {
    // Item delete state
    pendingDeleteId,
    setPendingDeleteId,
    // Confirm dialog state
    confirmDialog,
    setConfirmDialog,
    confirmDialogLoading: confirmDialog.loading,
    setConfirmDialogLoading: (loading) => setConfirmDialog(prev => ({ ...prev, loading })),
    // Delete account state
    deleteAccountDialog,
    setDeleteAccountDialog,
    deleteAccountDeleting: deleteAccountDialog.deleting,
    setDeleteAccountDeleting: (deleting) => setDeleteAccountDialog(prev => ({ ...prev, deleting })),
    deleteAccountError: deleteAccountDialog.error,
    setDeleteAccountError: (error) => setDeleteAccountDialog(prev => ({ ...prev, error })),
    deleteAccountConfirmationMatches: deleteAccountDialog.confirmationInput === 'delete my account',
    // Desk name dialog state
    deskNameDialog,
    setDeskNameDialog,
    deskNameError: deskNameDialog.error,
    setDeskNameError: (error) => setDeskNameDialog(prev => ({ ...prev, error })),
    deskNameSaving: deskNameDialog.saving,
    // Desk members dialog state
    deskMembersDialogOpen,
    setDeskMembersDialogOpen,
    // Tutorial dialog state
    tutorialDialogOpen,
    setTutorialDialogOpen,
    // Unified operations
    closeAllModals
  }
}
