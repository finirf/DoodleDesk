import { useCallback, useState } from 'react'

export default function useDeskNameDialog({
  desks,
  selectedDeskId,
  setShowDeskMenu,
  getDeskNameValue,
  createDesk,
  renameCurrentDesk
}) {
  const [deskNameDialog, setDeskNameDialog] = useState({
    isOpen: false,
    mode: 'create',
    value: '',
    isCollaborative: false,
    invitedFriendIds: []
  })
  const [deskNameError, setDeskNameError] = useState('')
  const [deskNameSaving, setDeskNameSaving] = useState(false)

  const openCreateDeskDialog = useCallback(() => {
    setDeskNameError('')
    setDeskNameDialog({
      isOpen: true,
      mode: 'create',
      value: `Desk ${desks.length + 1}`,
      isCollaborative: false,
      invitedFriendIds: []
    })
    setShowDeskMenu(false)
  }, [desks.length, setShowDeskMenu])

  const openRenameDeskDialog = useCallback(() => {
    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk) return

    setDeskNameError('')
    setDeskNameDialog({
      isOpen: true,
      mode: 'rename',
      value: getDeskNameValue(currentDesk) || 'Desk',
      isCollaborative: false,
      invitedFriendIds: []
    })
    setShowDeskMenu(false)
  }, [desks, getDeskNameValue, selectedDeskId, setShowDeskMenu])

  const toggleInvitedFriend = useCallback((friendId) => {
    setDeskNameDialog((prev) => {
      const selected = new Set(prev.invitedFriendIds || [])
      if (selected.has(friendId)) selected.delete(friendId)
      else selected.add(friendId)
      return { ...prev, invitedFriendIds: Array.from(selected) }
    })
  }, [])

  const closeDeskNameDialog = useCallback(() => {
    setDeskNameError('')
    setDeskNameSaving(false)
    setDeskNameDialog({ isOpen: false, mode: 'create', value: '', isCollaborative: false, invitedFriendIds: [] })
  }, [])

  const submitDeskNameDialog = useCallback(async (e) => {
    e.preventDefault()

    const nextName = deskNameDialog.value.trim()
    if (!nextName) {
      setDeskNameError('Please enter a desk name.')
      return
    }

    setDeskNameSaving(true)
    setDeskNameError('')

    const saveResult = deskNameDialog.mode === 'create'
      ? await createDesk(nextName, {
          isCollaborative: deskNameDialog.isCollaborative,
          invitedFriendIds: deskNameDialog.invitedFriendIds
        })
      : await renameCurrentDesk(nextName)

    if (saveResult.ok) {
      closeDeskNameDialog()
      return
    }

    setDeskNameSaving(false)
    setDeskNameError(saveResult.errorMessage || 'Could not save desk name. Check desk table columns and try again.')
  }, [closeDeskNameDialog, createDesk, deskNameDialog, renameCurrentDesk])

  return {
    deskNameDialog,
    setDeskNameDialog,
    deskNameError,
    setDeskNameError,
    deskNameSaving,
    openCreateDeskDialog,
    openRenameDeskDialog,
    toggleInvitedFriend,
    closeDeskNameDialog,
    submitDeskNameDialog
  }
}