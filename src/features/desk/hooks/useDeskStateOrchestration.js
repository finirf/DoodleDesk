import { useDesksState } from './useDesksState'

export default function useDeskStateOrchestration({ getViewportMetrics }) {
  const deskState = useDesksState({ getViewportMetrics })

  return {
    // Desk management
    desks: deskState.desks,
    setDesks: deskState.setDesks,
    selectedDeskId: deskState.selectedDeskId,
    setSelectedDeskId: deskState.setSelectedDeskId,

    // Note editing
    notes: deskState.notes,
    setNotes: deskState.setNotes,
    editingId: deskState.editingId,
    setEditingId: deskState.setEditingId,
    editValue: deskState.editValue,
    setEditValue: deskState.setEditValue,
    editColor: deskState.editColor,
    setEditColor: deskState.setEditColor,
    editTextColor: deskState.editTextColor,
    setEditTextColor: deskState.setEditTextColor,
    editFontSize: deskState.editFontSize,
    setEditFontSize: deskState.setEditFontSize,
    editFontFamily: deskState.editFontFamily,
    setEditFontFamily: deskState.setEditFontFamily,
    showStyleEditor: deskState.showStyleEditor,
    setShowStyleEditor: deskState.setShowStyleEditor,

    // Checklist
    checklistEditItems: deskState.checklistEditItems,
    setChecklistEditItems: deskState.setChecklistEditItems,
    newChecklistItemText: deskState.newChecklistItemText,
    setNewChecklistItemText: deskState.setNewChecklistItemText,

    // Menu UI
    showNewNoteMenu: deskState.showNewNoteMenu,
    setShowNewNoteMenu: deskState.setShowNewNoteMenu,
    showDeskMenu: deskState.showDeskMenu,
    setShowDeskMenu: deskState.setShowDeskMenu,
    showProfileMenu: deskState.showProfileMenu,
    setShowProfileMenu: deskState.setShowProfileMenu,
    profileTab: deskState.profileTab,
    setProfileTab: deskState.setProfileTab,

    // Shelf
    newShelfNameInput: deskState.newShelfNameInput,
    setNewShelfNameInput: deskState.setNewShelfNameInput,
    newShelfParentId: deskState.newShelfParentId,
    setNewShelfParentId: deskState.setNewShelfParentId,
    shelfActionError: deskState.shelfActionError,
    setShelfActionError: deskState.setShelfActionError,
    showShelfHierarchyTools: deskState.showShelfHierarchyTools,
    setShowShelfHierarchyTools: deskState.setShowShelfHierarchyTools,

    // Background
    backgroundMode: deskState.backgroundMode,
    setBackgroundMode: deskState.setBackgroundMode,
    customBackgroundUrl: deskState.customBackgroundUrl,
    setCustomBackgroundUrl: deskState.setCustomBackgroundUrl,
    customBackgroundInput: deskState.customBackgroundInput,
    setCustomBackgroundInput: deskState.setCustomBackgroundInput,
    backgroundMenuError: deskState.backgroundMenuError,
    setBackgroundMenuError: deskState.setBackgroundMenuError,

    // Menu messages
    deskMenuMessage: deskState.deskMenuMessage,
    setDeskMenuMessage: deskState.setDeskMenuMessage,
    deskMenuError: deskState.deskMenuError,
    setDeskMenuError: deskState.setDeskMenuError,

    // Grid
    snapToGrid: deskState.snapToGrid,
    setSnapToGrid: deskState.setSnapToGrid,

    // Confirm dialog
    confirmDialog: deskState.confirmDialog,
    setConfirmDialog: deskState.setConfirmDialog,
    confirmDialogLoading: deskState.confirmDialogLoading,
    setConfirmDialogLoading: deskState.setConfirmDialogLoading,

    // Friends
    friends: deskState.friends,
    setFriends: deskState.setFriends,
    incomingFriendRequests: deskState.incomingFriendRequests,
    setIncomingFriendRequests: deskState.setIncomingFriendRequests,
    outgoingFriendRequests: deskState.outgoingFriendRequests,
    setOutgoingFriendRequests: deskState.setOutgoingFriendRequests,
    friendEmailInput: deskState.friendEmailInput,
    setFriendEmailInput: deskState.setFriendEmailInput,
    friendMessage: deskState.friendMessage,
    setFriendMessage: deskState.setFriendMessage,
    friendError: deskState.friendError,
    setFriendError: deskState.setFriendError,
    friendsLoading: deskState.friendsLoading,
    setFriendsLoading: deskState.setFriendsLoading,
    friendSubmitting: deskState.friendSubmitting,
    setFriendSubmitting: deskState.setFriendSubmitting,
    friendActionLoadingId: deskState.friendActionLoadingId,
    setFriendActionLoadingId: deskState.setFriendActionLoadingId,

    // Profile
    profileStats: deskState.profileStats,
    setProfileStats: deskState.setProfileStats,
    profileStatsLoading: deskState.profileStatsLoading,
    setProfileStatsLoading: deskState.setProfileStatsLoading,

    // Activity
    activityFeed: deskState.activityFeed,
    setActivityFeed: deskState.setActivityFeed,
    activityLoading: deskState.activityLoading,
    setActivityLoading: deskState.setActivityLoading,
    activityError: deskState.activityError,
    setActivityError: deskState.setActivityError,

    // Decoration
    activeDecorationHandleId: deskState.activeDecorationHandleId,
    setActiveDecorationHandleId: deskState.setActiveDecorationHandleId,

    // Layout
    viewportWidth: deskState.viewportWidth,
    sectionHeight: deskState.sectionHeight,
    canvasWidth: deskState.canvasWidth,
    canvasHeight: deskState.canvasHeight,
    setCanvasWidth: deskState.setCanvasWidth,
    setCanvasHeight: deskState.setCanvasHeight,

    // Refs
    deferredRemoteNotesRef: deskState.deferredRemoteNotesRef,
    historySyncingRef: deskState.historySyncingRef,
    notesRef: deskState.notesRef,
    fetchDesksRef: deskState.fetchDesksRef,
    fetchDeskItemsRef: deskState.fetchDeskItemsRef,
    fetchDeskActivityRef: deskState.fetchDeskActivityRef,
    resetDeskHistoryRef: deskState.resetDeskHistoryRef,
    clearSelectedDeskStateRef: deskState.clearSelectedDeskStateRef,
    syncDeskShelfPrefsRef: deskState.syncDeskShelfPrefsRef,
    undoNotesActionRef: deskState.undoNotesActionRef,
    redoNotesActionRef: deskState.redoNotesActionRef,
    flushDeferredNotesRef: deskState.flushDeferredNotesRef,
    autoSaveStatusTimeoutRef: deskState.autoSaveStatusTimeoutRef,
    newNoteMenuRef: deskState.newNoteMenuRef,
    deskMenuRef: deskState.deskMenuRef,
    profileMenuRef: deskState.profileMenuRef,
    shelfSupabaseSyncEnabledRef: deskState.shelfSupabaseSyncEnabledRef,
    shelfSyncTimeoutRef: deskState.shelfSyncTimeoutRef,
    deskCanvasRef: deskState.deskCanvasRef,
    importDeskInputRef: deskState.importDeskInputRef,

    // Collaboration
    historySyncing: deskState.historySyncing,
    setHistorySyncing: deskState.setHistorySyncing,
    forceSaveInProgress: deskState.forceSaveInProgress,
    setForceSaveInProgress: deskState.setForceSaveInProgress,
    autoSaveStatus: deskState.autoSaveStatus,
    setAutoSaveStatus: deskState.setAutoSaveStatus,
    selectedDeskMemberRole: deskState.selectedDeskMemberRole,
    setSelectedDeskMemberRole: deskState.setSelectedDeskMemberRole,
    selectedDeskMemberRoleLoading: deskState.selectedDeskMemberRoleLoading,
    setSelectedDeskMemberRoleLoading: deskState.setSelectedDeskMemberRoleLoading,
    deskMembers: deskState.deskMembers,
    setDeskMembers: deskState.setDeskMembers,
    deskMembersLoading: deskState.deskMembersLoading,
    setDeskMembersLoading: deskState.setDeskMembersLoading,
    deskMembersError: deskState.deskMembersError,
    setDeskMembersError: deskState.setDeskMembersError,
    deskMemberRequests: deskState.deskMemberRequests,
    setDeskMemberRequests: deskState.setDeskMemberRequests,
    deskMemberRequestsLoading: deskState.deskMemberRequestsLoading,
    setDeskMemberRequestsLoading: deskState.setDeskMemberRequestsLoading,
    deskMemberRequestsError: deskState.deskMemberRequestsError,
    setDeskMemberRequestsError: deskState.setDeskMemberRequestsError,
    deskMemberActionLoadingId: deskState.deskMemberActionLoadingId,
    setDeskMemberActionLoadingId: deskState.setDeskMemberActionLoadingId,
    deskMembersMessage: deskState.deskMembersMessage,
    setDeskMembersMessage: deskState.setDeskMembersMessage,

    // Edit state
    isSavingEdit: deskState.isSavingEdit,
    setIsSavingEdit: deskState.setIsSavingEdit,
    editSaveError: deskState.editSaveError,
    setEditSaveError: deskState.setEditSaveError,

    // Shelves
    deskShelves: deskState.deskShelves,
    setDeskShelves: deskState.setDeskShelves,
    deskShelfAssignments: deskState.deskShelfAssignments,
    setDeskShelfAssignments: deskState.setDeskShelfAssignments,
    expandedDeskShelves: deskState.expandedDeskShelves,
    setExpandedDeskShelves: deskState.setExpandedDeskShelves,
    shelfPrefsHydrated: deskState.shelfPrefsHydrated,
    setShelfPrefsHydrated: deskState.setShelfPrefsHydrated,
  }
}
