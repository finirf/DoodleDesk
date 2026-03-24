import { useCallback } from 'react'

function getClosedConfirmDialogState() {
  return {
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    tone: 'danger',
    onConfirm: null
  }
}

export default function useDeskConfirmDialogActions({
  confirmDialog,
  confirmDialogLoading,
  setConfirmDialog,
  setConfirmDialogLoading
}) {
  const resetConfirmDialog = useCallback(() => {
    setConfirmDialog(getClosedConfirmDialogState())
  }, [setConfirmDialog])

  const openConfirmDialog = useCallback(({ title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmLabel,
      tone,
      onConfirm: typeof onConfirm === 'function' ? onConfirm : null
    })
    setConfirmDialogLoading(false)
  }, [setConfirmDialog, setConfirmDialogLoading])

  const closeConfirmDialog = useCallback(() => {
    if (confirmDialogLoading) return
    resetConfirmDialog()
  }, [confirmDialogLoading, resetConfirmDialog])

  const confirmDialogAction = useCallback(async () => {
    if (confirmDialogLoading || typeof confirmDialog.onConfirm !== 'function') return

    setConfirmDialogLoading(true)
    try {
      await confirmDialog.onConfirm()
      resetConfirmDialog()
    } catch (error) {
      console.error('Confirmation action failed:', error)
    } finally {
      setConfirmDialogLoading(false)
    }
  }, [confirmDialog, confirmDialogLoading, resetConfirmDialog, setConfirmDialogLoading])

  return {
    openConfirmDialog,
    closeConfirmDialog,
    confirmDialogAction
  }
}
