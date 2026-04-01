import { useEffect } from 'react'

export default function useDeskGlobalUiEffects({
  hasModalOpen,
  activeDecorationHandleId,
  setActiveDecorationHandleId,
  confirmDialogIsOpen,
  confirmDialogLoading,
  deleteAccountDialogIsOpen,
  deleteAccountDeleting,
  setDeleteAccountDialog,
  pendingDeleteId,
  setPendingDeleteId,
  tutorialDialogOpen,
  closeTutorialDialog,
  closeConfirmDialog,
  undoNotesChange,
  redoNotesChange
}) {
  useEffect(() => {
    if (!activeDecorationHandleId) return

    function handleDecorationOutsideClick(e) {
      const clickedItemElement = e.target.closest?.('[data-item-key]')
      const clickedItemKey = clickedItemElement?.dataset?.itemKey || null

      if (clickedItemKey === activeDecorationHandleId) return
      setActiveDecorationHandleId(null)
    }

    window.addEventListener('pointerdown', handleDecorationOutsideClick)
    return () => window.removeEventListener('pointerdown', handleDecorationOutsideClick)
  }, [activeDecorationHandleId, setActiveDecorationHandleId])

  // Keyboard handlers intentionally track modal/history toggles only.
  useEffect(() => {
    function handleHistoryKeyDown(e) {
      if (hasModalOpen) return

      const target = e.target
      const tagName = typeof target?.tagName === 'string' ? target.tagName.toLowerCase() : ''
      const isTypingField = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || Boolean(target?.isContentEditable)
      if (isTypingField) return

      const isShortcutPressed = e.ctrlKey || e.metaKey
      if (!isShortcutPressed) return

      const normalizedKey = (e.key || '').toLowerCase()

      if (normalizedKey === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          void redoNotesChange()
        } else {
          void undoNotesChange()
        }
        return
      }

      if (normalizedKey === 'y') {
        e.preventDefault()
        void redoNotesChange()
      }
    }

    window.addEventListener('keydown', handleHistoryKeyDown)
    return () => window.removeEventListener('keydown', handleHistoryKeyDown)
  }, [hasModalOpen, redoNotesChange, undoNotesChange])

  // Escape-key modal handler intentionally tracks modal state flags.
  useEffect(() => {
    if (!hasModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (confirmDialogIsOpen && !confirmDialogLoading) {
          closeConfirmDialog()
          return
        }

        if (deleteAccountDialogIsOpen && !deleteAccountDeleting) {
          setDeleteAccountDialog({ isOpen: false, confirmationText: '' })
          return
        }

        if (pendingDeleteId) {
          setPendingDeleteId(null)
          return
        }

        if (tutorialDialogOpen) {
          closeTutorialDialog()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    confirmDialogIsOpen,
    confirmDialogLoading,
    deleteAccountDeleting,
    deleteAccountDialogIsOpen,
    hasModalOpen,
    pendingDeleteId,
    tutorialDialogOpen,
    closeConfirmDialog,
    closeTutorialDialog,
    setDeleteAccountDialog,
    setPendingDeleteId
  ])
}