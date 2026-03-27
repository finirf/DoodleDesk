import { useEffect } from 'react'
import useDeskProfileData from './useDeskProfileData'
import useDeskSocialData from './useDeskSocialData'
import useDeskCollectionActions from './useDeskCollectionActions'
import { useDeskItemOperations } from './useDeskItemOperations'
import useDeskItemInteractions from './useDeskItemInteractions'
import useDeskNameDialog from './useDeskNameDialog'
import useDeskAccountActions from './useDeskAccountActions'
import useDeskMemberRequests from './useDeskMemberRequests'
import useDeskConfirmDialogActions from './useDeskConfirmDialogActions'
import useDeskMembershipActions from './useDeskMembershipActions'
import useDeskBackgroundActions from './useDeskBackgroundActions'
import useDeskImportExport from './useDeskImportExport'
import useDeskFriendActions from './useDeskFriendActions'
import useDeskShelfSyncActions from './useDeskShelfSyncActions'
import useDeskShelfHierarchyActions from './useDeskShelfHierarchyActions'
import useDeskHistoryActions from './useDeskHistoryActions'

/**
 * Orchestrates user-driven actions across all desk domains.
 * 
 * This is the primary action hook. It aggregates action handlers from 14+ domain-specific
 * hooks and exposes a unified interface for the UI. All user interactions flow through here:
 * profile updates, collection/desk operations, item CRUD, interactions, collaboration,
 * account management, and history control.
 * 
 * **Action domains:**
 * - Profile & user data (updatePreferredNameInput, savePreferredName, fetchCurrentUserProfile, fetchUserStats)
 * - Social (fetchFriends, handleSendFriendRequest, respondToFriendRequest, removeFriend, etc.)
 * - Desk collection (fetchDesks, handleSelectDesk, openCreateDeskDialog, deleteCurrentDesk, leaveCurrentDesk)
 * - Item CRUD (addStickyNote, addChecklistNote, duplicateItem, requestDeleteNote, confirmDeleteNote)
 * - Item interactions (grouping, dragging, rotating, resizing)
 * - Dialogs (desk name, delete account, member requests)
 * - Account (handleLogout, handleDeleteAccount)
 * - Membership (respondDeskMemberRequest, addDeskMember, removeDeskMember, updateDeskMemberRole)
 * - Background (setCurrentDeskBackground, setCurrentDeskCustomBackground)
 * - Import/export (exportCurrentDesk, handleImportDeskFileSelection)
 * - Shelf hierarchy (createDeskShelf, renameDeskShelf, deleteDeskShelf, toggleDeskShelfExpanded)
 * - History (undoNotesChange, redoNotesChange, forceSaveAndClearHistory)
 * 
 * @param {Object} config - Large configuration object with 14+ sub-configs for each domain
 * @returns {Object} Actions object with 70+ methods for all user-driven state mutations
 */
export default function useDeskActionOrchestration({
  profileData,
  socialData,
  collectionActions,
  itemOperations,
  itemInteractions,
  nameDialog,
  accountActions,
  memberRequests,
  confirmDialogActions,
  membershipActions,
  backgroundActions,
  importExport,
  friendActions,
  shelfSyncActions,
  shelfHierarchyActions,
  historyActions,
  hasActivePointerInteractionRef,
  modalState
}) {
  const {
    preferredNameInput,
    preferredNameSaving,
    preferredNameError,
    preferredNameMessage,
    updatePreferredNameInput,
    ensureCurrentUserProfile,
    fetchCurrentUserProfile,
    savePreferredName
  } = useDeskProfileData(profileData)

  const {
    fetchUserStats,
    incrementUserStat,
    fetchFriends,
    sendFriendRequestToUser
  } = useDeskSocialData({
    ...socialData,
    ensureCurrentUserProfile
  })

  const {
    getDeskBackgroundValue,
    getDeskCustomBackgroundUrl,
    fetchDesks,
    createDesk,
    renameCurrentDesk,
    handleSelectDesk
  } = useDeskCollectionActions({
    ...collectionActions,
    incrementUserStat
  })

  const {
    addStickyNote,
    addChecklistNote,
    addDecoration,
    persistRotation,
    persistItemPosition,
    persistItemSize,
    persistItemGroup,
    moveItemLayer,
    addChecklistEditItem,
    closeItemEditor,
    commitItemEdits,
    toggleChecklistItem,
    duplicateItem,
    requestDeleteNote,
    confirmDeleteNote
  } = useDeskItemOperations(itemOperations)

  const {
    draggedId,
    rotatingId,
    resizingId,
    resizeOverlay,
    groupedItemGroupMap,
    groupedItemKeys,
    groupedItemSizes,
    finalizeGroupingSession,
    groupItemsByKeys,
    hasActivePointerInteraction,
    handleGroupSelectionClick,
    toggleItemGrouping,
    handleDragStart,
    handleResizeMouseDown,
    handleRotateMouseDown
  } = useDeskItemInteractions({
    ...itemInteractions,
    persistItemPosition,
    persistItemSize,
    persistRotation,
    persistItemGroup
  })

  useEffect(() => {
    hasActivePointerInteractionRef.current = hasActivePointerInteraction
  }, [hasActivePointerInteraction, hasActivePointerInteractionRef])

  const {
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
  } = useDeskNameDialog({
    ...nameDialog,
    createDesk,
    renameCurrentDesk
  })

  const {
    deleteAccountError,
    setDeleteAccountError,
    deleteAccountDialog,
    setDeleteAccountDialog,
    deleteAccountDeleting,
    handleLogout,
    handleDeleteAccount,
    closeDeleteAccountDialog,
    submitDeleteAccountDialog
  } = useDeskAccountActions(accountActions)

  const hasModalOpen = Boolean(
    modalState.pendingDeleteId
    || modalState.confirmDialog.isOpen
    || deleteAccountDialog.isOpen
    || deskNameDialog.isOpen
    || modalState.deskMembersDialogOpen
  )

  const deleteAccountConfirmationMatches = deleteAccountDialog.confirmationText.trim().toUpperCase() === 'DELETE'

  const {
    fetchDeskMembers,
    fetchDeskMemberRequests,
    respondDeskMemberRequest
  } = useDeskMemberRequests(memberRequests)

  const {
    openConfirmDialog,
    closeConfirmDialog,
    confirmDialogAction
  } = useDeskConfirmDialogActions(confirmDialogActions)

  const {
    deleteCurrentDesk,
    leaveCurrentDesk,
    openDeskMembersDialog,
    closeDeskMembersDialog,
    addDeskMember,
    removeDeskMember,
    updateDeskMemberRole,
    requestDeskMemberAdd
  } = useDeskMembershipActions({
    ...membershipActions,
    getDeskBackgroundValue,
    getDeskCustomBackgroundUrl,
    openConfirmDialog,
    incrementUserStat,
    fetchDeskMembers,
    fetchDeskMemberRequests
  })

  const {
    setCurrentDeskBackground,
    setCurrentDeskCustomBackground
  } = useDeskBackgroundActions(backgroundActions)

  const {
    exportCurrentDesk,
    handleImportDeskFileSelection
  } = useDeskImportExport(importExport)

  const {
    handleSendFriendRequest,
    sendFriendRequestToDeskMember,
    respondToFriendRequest,
    cancelOutgoingFriendRequest,
    removeFriend
  } = useDeskFriendActions({
    ...friendActions,
    sendFriendRequestToUser,
    fetchFriends,
    openConfirmDialog
  })

  const {
    syncDeskShelfPrefsToSupabase
  } = useDeskShelfSyncActions(shelfSyncActions)

  const {
    getDeskGroupLabel,
    getDeskAssignedCustomShelfId,
    getDeskEffectiveShelfId,
    getChildDeskShelves,
    getCustomShelfOptions,
    toggleDeskShelfExpanded,
    createDeskShelf,
    setSelectedDeskCustomShelf,
    renameDeskShelf,
    deleteDeskShelf
  } = useDeskShelfHierarchyActions({
    ...shelfHierarchyActions,
    openConfirmDialog
  })

  const {
    undoNotesChange,
    redoNotesChange,
    forceSaveAndClearHistory
  } = useDeskHistoryActions({
    ...historyActions,
    hasModalOpen,
    closeItemEditor
  })

  return {
    preferredNameInput,
    preferredNameSaving,
    preferredNameError,
    preferredNameMessage,
    updatePreferredNameInput,
    fetchCurrentUserProfile,
    savePreferredName,
    fetchUserStats,
    fetchFriends,
    getDeskBackgroundValue,
    getDeskCustomBackgroundUrl,
    fetchDesks,
    handleSelectDesk,
    addStickyNote,
    addChecklistNote,
    addDecoration,
    moveItemLayer,
    addChecklistEditItem,
    closeItemEditor,
    commitItemEdits,
    toggleChecklistItem,
    duplicateItem,
    requestDeleteNote,
    confirmDeleteNote,
    draggedId,
    rotatingId,
    resizingId,
    resizeOverlay,
    groupedItemGroupMap,
    groupedItemKeys,
    groupedItemSizes,
    finalizeGroupingSession,
    groupItemsByKeys,
    hasActivePointerInteraction,
    handleGroupSelectionClick,
    toggleItemGrouping,
    handleDragStart,
    handleResizeMouseDown,
    handleRotateMouseDown,
    deskNameDialog,
    setDeskNameDialog,
    deskNameError,
    setDeskNameError,
    deskNameSaving,
    openCreateDeskDialog,
    openRenameDeskDialog,
    toggleInvitedFriend,
    closeDeskNameDialog,
    submitDeskNameDialog,
    deleteAccountError,
    setDeleteAccountError,
    deleteAccountDialog,
    setDeleteAccountDialog,
    deleteAccountDeleting,
    handleLogout,
    handleDeleteAccount,
    closeDeleteAccountDialog,
    submitDeleteAccountDialog,
    hasModalOpen,
    deleteAccountConfirmationMatches,
    respondDeskMemberRequest,
    closeConfirmDialog,
    confirmDialogAction,
    deleteCurrentDesk,
    leaveCurrentDesk,
    openDeskMembersDialog,
    closeDeskMembersDialog,
    addDeskMember,
    removeDeskMember,
    updateDeskMemberRole,
    requestDeskMemberAdd,
    setCurrentDeskBackground,
    setCurrentDeskCustomBackground,
    exportCurrentDesk,
    handleImportDeskFileSelection,
    handleSendFriendRequest,
    sendFriendRequestToDeskMember,
    respondToFriendRequest,
    cancelOutgoingFriendRequest,
    removeFriend,
    syncDeskShelfPrefsToSupabase,
    getDeskGroupLabel,
    getDeskAssignedCustomShelfId,
    getDeskEffectiveShelfId,
    getChildDeskShelves,
    getCustomShelfOptions,
    toggleDeskShelfExpanded,
    createDeskShelf,
    setSelectedDeskCustomShelf,
    renameDeskShelf,
    deleteDeskShelf,
    undoNotesChange,
    redoNotesChange,
    forceSaveAndClearHistory
  }
}
