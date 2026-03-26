import React from 'react'
import { useAuthSession } from './features/auth'
import {
  BUILT_IN_SHELVES,
  DECORATION_OPTIONS,
  DeskCanvasContainer,
  DeskCanvasItems,
  DeskCommandPalette,
  DeskErrorBoundary,
  DeskModals,
  DeskMoreMenu,
  DeskProfileMenu,
  DeskSnapToGridOverlay,
  DeskStatusBanners,
  DeskTopControls,
  DeskTopMenuShell,
  DeskWorkspaceMenu,
  FONT_OPTIONS,
  FourWayResizeIcon,
  NewNoteMenu,
  clampDimension,
  formatDate,
  getDeskNameValue,
  getChecklistReminderMeta,
  getItemCreatorLabel,
  getItemHeight,
  getItemKey,
  getProfileDisplayParts,
  getViewportMetrics,
  getItemWidth,
  isDeskCollaborative,
  isDecorationItem,
  isMissingTableError,
  isMissingColumnError,
  isMissingShelfStorageTableError,
  loadMergedDesksForUser,
  normalizeCustomBackgroundValue,
  normalizeChecklistReminderValue,
  normalizeFontSize,
  normalizeRotation,
  toStoredRotation,
  toReminderInputValue,
  useDeskActionOrchestration,
  useDeskDerivedStateOrchestration,
  useDeskLifecycleOrchestration,
  useDeskModalState,
  useDeskOperationsOrchestration,
  useDeskStateOrchestration,
  useDeskUiOrchestration,
  withTimeout
} from './features/desk'
import { AppAuthBoundary } from './features/auth'
import { supabase } from './supabase'

export default function App() {
  const { session, loading, isRecoveryFlow, exitRecoveryFlow } = useAuthSession()
  return (
    <AppAuthBoundary
      loading={loading}
      isRecoveryFlow={isRecoveryFlow}
      session={session}
      onBackToLogin={exitRecoveryFlow}
    >
      <DeskErrorBoundary>
        <Desk user={session?.user} />
      </DeskErrorBoundary>
    </AppAuthBoundary>
  )
}

function Desk({ user }) {
  const { desks, setDesks, selectedDeskId, setSelectedDeskId, notes, setNotes, editingId, setEditingId, editValue, setEditValue, editColor, setEditColor, editTextColor, setEditTextColor, editFontSize, setEditFontSize, editFontFamily, setEditFontFamily, showStyleEditor, setShowStyleEditor, checklistEditItems, setChecklistEditItems, newChecklistItemText, setNewChecklistItemText, showNewNoteMenu, setShowNewNoteMenu, showDeskMenu, setShowDeskMenu, showProfileMenu, setShowProfileMenu, profileTab, setProfileTab, newShelfNameInput, setNewShelfNameInput, newShelfParentId, setNewShelfParentId, shelfActionError, setShelfActionError, showShelfHierarchyTools, setShowShelfHierarchyTools, backgroundMode, setBackgroundMode, customBackgroundUrl, setCustomBackgroundUrl, customBackgroundInput, setCustomBackgroundInput, setBackgroundMenuError, deskMenuMessage, setDeskMenuMessage, deskMenuError, setDeskMenuError, snapToGrid, setSnapToGrid, confirmDialog, setConfirmDialog, confirmDialogLoading, setConfirmDialogLoading, friends, setFriends, incomingFriendRequests, setIncomingFriendRequests, outgoingFriendRequests, setOutgoingFriendRequests, friendEmailInput, setFriendEmailInput, friendMessage, setFriendMessage, friendError, setFriendError, friendsLoading, setFriendsLoading, friendSubmitting, setFriendSubmitting, friendActionLoadingId, setFriendActionLoadingId, profileStats, setProfileStats, profileStatsLoading, setProfileStatsLoading, activityFeed, setActivityFeed, activityLoading, setActivityLoading, activityError, setActivityError, activeDecorationHandleId, setActiveDecorationHandleId, viewportWidth, sectionHeight, canvasWidth, canvasHeight, setCanvasWidth, setCanvasHeight, deferredRemoteNotesRef, historySyncingRef, notesRef, fetchDesksRef, fetchDeskItemsRef, fetchDeskActivityRef, resetDeskHistoryRef, clearSelectedDeskStateRef, syncDeskShelfPrefsRef, undoNotesActionRef, redoNotesActionRef, flushDeferredNotesRef, autoSaveStatusTimeoutRef, newNoteMenuRef, deskMenuRef, profileMenuRef, shelfSupabaseSyncEnabledRef, shelfSyncTimeoutRef, deskCanvasRef, importDeskInputRef, historySyncing, setHistorySyncing, forceSaveInProgress, setForceSaveInProgress, autoSaveStatus, setAutoSaveStatus, selectedDeskMemberRole, setSelectedDeskMemberRole, selectedDeskMemberRoleLoading, setSelectedDeskMemberRoleLoading, deskMembers, setDeskMembers, deskMembersLoading, setDeskMembersLoading, deskMembersError, setDeskMembersError, deskMemberRequests, setDeskMemberRequests, deskMemberRequestsLoading, setDeskMemberRequestsLoading, deskMemberRequestsError, setDeskMemberRequestsError, deskMemberActionLoadingId, setDeskMemberActionLoadingId, deskMembersMessage, setDeskMembersMessage, isSavingEdit, setIsSavingEdit, editSaveError, setEditSaveError, deskShelves, setDeskShelves, deskShelfAssignments, setDeskShelfAssignments, expandedDeskShelves, setExpandedDeskShelves, shelfPrefsHydrated, setShelfPrefsHydrated } = useDeskStateOrchestration({ getViewportMetrics })

  const { pendingDeleteId, setPendingDeleteId, deleteAccountDialog, setDeleteAccountDialog, deleteAccountDeleting, deleteAccountError, setDeleteAccountError, deleteAccountConfirmationMatches, deskNameDialog, setDeskNameDialog, deskNameError, setDeskNameError, deskNameSaving, deskMembersDialogOpen, setDeskMembersDialogOpen } = useDeskModalState()

  const { historyPastRef, historyFutureRef, pendingHistoryActionRef, previousNotesSnapshotRef, isApplyingHistoryRef, skipNextHistoryRef, setHistoryVersion, cloneNotesSnapshot, areNoteSnapshotsEqual, resetDeskHistory, canUndo, canRedo, realtimeFetchDesks, realtimeFetchDeskItems, realtimeFetchDeskActivity, handleSelectedDeskActivated, handleSelectedDeskCleared, runSyncDeskShelfPrefs, growThreshold, gridSize, menuLayerZIndex, menuPanelZIndex, lastDeskStorageKey, shelfPrefsStorageKey, snapPrefsStorageKey, deskLiveChannelName, deskMembersLiveChannelName, backgroundImage, backgroundColor, backgroundSize, backgroundPosition, backgroundRepeat, currentDesk, isCurrentDeskOwner, canCurrentUserEditDeskItems, modalOverlayStyle, modalCardStyle, modalTitleStyle, modalActionsStyle, modalSecondaryButtonStyle, modalPrimaryButtonStyle, modalDangerButtonStyle, hasActivePointerInteractionRef } = useDeskDerivedStateOrchestration({ deskState: { selectedDeskId, canvasHeight: canvasHeight, sectionHeight, backgroundMode, customBackgroundUrl, desks, selectedDeskMemberRole, selectedDeskMemberRoleLoading, fetchDesksRef, fetchDeskItemsRef, fetchDeskActivityRef, resetDeskHistoryRef, clearSelectedDeskStateRef, syncDeskShelfPrefsRef, undoNotesActionRef, redoNotesActionRef, flushDeferredNotesRef, autoSaveStatusTimeoutRef, newNoteMenuRef, deskMenuRef, profileMenuRef, shelfSupabaseSyncEnabledRef, shelfSyncTimeoutRef, deskCanvasRef, importDeskInputRef }, userContext: { userId: user.id } })

  const { clearDeferredRemoteNotes, flushDeferredRemoteNotes, setNotesFromRemote, clearAutoSaveStatusTimeout, markAutoSaveSaving, markAutoSaveSaved, markAutoSaveError, insertChecklistItemsWithFallback, hasChecklistInCurrentNotes, fetchDeskActivity, getActivityActionLabel, logDeskActivity, syncOwnedDeskCollaborativeState, fetchDeskItems } = useDeskOperationsOrchestration({ remoteNotes: { historySyncingRef, hasActivePointerInteraction: () => hasActivePointerInteractionRef.current(), deferredRemoteNotesRef, skipNextHistoryRef, setNotes, cloneNotesSnapshot, autoSaveStatusTimeoutRef, setAutoSaveStatus, setEditSaveError }, checklistHelpers: { supabase, isMissingColumnError, notesRef }, activity: { supabase, userId: user.id, selectedDeskId, profileTab, setActivityFeed, setActivityError, setActivityLoading, isMissingTableError, withTimeout }, dataQueries: { supabase, userId: user.id, desks, deskShelfAssignments, setDesks, setExpandedDeskShelves, isMissingColumnError, withTimeout, setEditSaveError, getItemHeight, getItemWidth, isDecorationItem, growThreshold, viewportWidth, sectionHeight, setCanvasWidth, setCanvasHeight } })

  const { preferredNameInput, preferredNameSaving, preferredNameError, preferredNameMessage, updatePreferredNameInput, fetchCurrentUserProfile, savePreferredName, fetchUserStats, fetchFriends, fetchDesks, handleSelectDesk, addStickyNote, addChecklistNote, addDecoration, moveItemLayer, addChecklistEditItem, closeItemEditor, commitItemEdits, toggleChecklistItem, duplicateItem, requestDeleteNote, confirmDeleteNote, draggedId, rotatingId, resizingId, resizeOverlay, groupedItemKeys, groupedItemSizes, hasActivePointerInteraction, handleGroupSelectionClick, toggleItemGrouping, handleDragStart, handleResizeMouseDown, handleRotateMouseDown, openCreateDeskDialog, openRenameDeskDialog, toggleInvitedFriend, closeDeskNameDialog, submitDeskNameDialog, handleLogout, handleDeleteAccount, closeDeleteAccountDialog, submitDeleteAccountDialog, hasModalOpen, respondDeskMemberRequest, closeConfirmDialog, confirmDialogAction, deleteCurrentDesk, leaveCurrentDesk, openDeskMembersDialog, closeDeskMembersDialog, addDeskMember, removeDeskMember, updateDeskMemberRole, requestDeskMemberAdd, setCurrentDeskBackground, setCurrentDeskCustomBackground, exportCurrentDesk, handleImportDeskFileSelection, handleSendFriendRequest, sendFriendRequestToDeskMember, respondToFriendRequest, cancelOutgoingFriendRequest, removeFriend, syncDeskShelfPrefsToSupabase, getDeskGroupLabel, getDeskAssignedCustomShelfId, getDeskEffectiveShelfId, getChildDeskShelves, getCustomShelfOptions, toggleDeskShelfExpanded, createDeskShelf, setSelectedDeskCustomShelf, renameDeskShelf, deleteDeskShelf, undoNotesChange, redoNotesChange, forceSaveAndClearHistory } = useDeskActionOrchestration({ profileData: { supabase, userId: user.id, userEmail: user.email, selectedDeskId, fetchDeskItems }, socialData: { supabase, userId: user.id, setProfileStats, setProfileStatsLoading, setFriendsLoading, setFriendError, setIncomingFriendRequests, setOutgoingFriendRequests, setFriends }, collectionActions: { supabase, userId: user.id, userEmail: user.email, desks, selectedDeskId, lastDeskStorageKey, loadMergedDesksForUser, normalizeCustomBackgroundValue, setDesks, setSelectedDeskId, setBackgroundMode, setCustomBackgroundUrl, setCustomBackgroundInput, setBackgroundMenuError, setShowDeskMenu, setDeskMenuMessage, setDeskMenuError, setEditingId, setEditValue, setChecklistEditItems, setNewChecklistItemText, setPendingDeleteId, setActiveDecorationHandleId }, itemOperations: { supabase, userId: user.id, selectedDeskId, setNotes, editingId, setEditingId, editValue, setEditValue, editColor, setEditColor, editTextColor, setEditTextColor, editFontSize, setEditFontSize, editFontFamily, setEditFontFamily, checklistEditItems, setChecklistEditItems, newChecklistItemText, setNewChecklistItemText, pendingDeleteId, setPendingDeleteId, notesRef, canCurrentUserEditDeskItems, canvasWidth, fetchDeskItems, logDeskActivity, markAutoSaveSaving, markAutoSaveSaved, markAutoSaveError, getViewportMetrics, isSavingEdit, setIsSavingEdit, setEditSaveError, setActiveDecorationHandleId, setShowStyleEditor }, itemInteractions: { canCurrentUserEditDeskItems, editingId, notesRef, setNotes, canvasWidth, sectionHeight, growThreshold, gridSize, snapToGrid, setCanvasWidth, setCanvasHeight, getItemKey, getItemWidth, getItemHeight, isDecorationItem, clampDimension, normalizeRotation, flushDeferredRemoteNotes, clearDeferredRemoteNotes }, nameDialog: { desks, selectedDeskId, setShowDeskMenu, getDeskNameValue }, accountActions: { supabase, lastDeskStorageKey, shelfPrefsStorageKey }, memberRequests: { supabase, desks, selectedDeskId, userId: user.id, setDeskMembers, setDeskMembersLoading, setDeskMembersError, setDeskMemberRequests, setDeskMemberRequestsLoading, setDeskMemberRequestsError, setDeskMembersMessage, setDeskMemberActionLoadingId, syncOwnedDeskCollaborativeState }, confirmDialogActions: { confirmDialog, confirmDialogLoading, setConfirmDialog, setConfirmDialogLoading }, membershipActions: { supabase, userId: user.id, selectedDeskId, desks, deskMembers, deskMemberRequests, isCurrentDeskOwner, lastDeskStorageKey, getDeskNameValue, syncOwnedDeskCollaborativeState, isMissingColumnError, setDesks, setSelectedDeskId, setBackgroundMode, setCustomBackgroundUrl, setCustomBackgroundInput, setNotes, setShowDeskMenu, setDeskMembersDialogOpen, setDeskMembersMessage, setDeskMembersError, setDeskMemberRequestsError, setDeskMemberActionLoadingId }, backgroundActions: { supabase, userId: user.id, selectedDeskId, desks, normalizeCustomBackgroundValue, setBackgroundMode, setCustomBackgroundUrl, setCustomBackgroundInput, setBackgroundMenuError, setDesks, setShowDeskMenu }, importExport: { supabase, desks, selectedDeskId, userId: user.id, canCurrentUserEditDeskItems, setDeskMenuMessage, setDeskMenuError, setShowDeskMenu, setBackgroundMenuError, getDeskNameValue, logDeskActivity, fetchDeskItems, isMissingColumnError, normalizeChecklistReminderValue, normalizeFontSize, toStoredRotation, getItemWidth, getItemHeight, insertChecklistItemsWithReminderFallback: insertChecklistItemsWithFallback }, friendActions: { supabase, userId: user.id, userEmail: user.email, friendEmailInput, setFriendEmailInput, setFriendSubmitting, setFriendError, setFriendMessage, setDeskMembersError, setDeskMembersMessage, setDeskMemberActionLoadingId, friends, getProfileDisplayParts, setFriendActionLoadingId }, shelfSyncActions: { supabase, userId: user.id, shelfSupabaseSyncEnabledRef }, shelfHierarchyActions: { desks, deskShelves, deskShelfAssignments, selectedDeskId, userId: user.id, newShelfNameInput, newShelfParentId, isDeskCollaborative, setDeskShelves, setDeskShelfAssignments, setExpandedDeskShelves, setNewShelfNameInput, setNewShelfParentId, setShelfActionError }, historyActions: { supabase, userId: user.id, selectedDeskId, canCurrentUserEditDeskItems, forceSaveInProgress, setForceSaveInProgress, markAutoSaveSaving, markAutoSaveSaved, markAutoSaveError, setEditSaveError, historySyncingRef, pendingHistoryActionRef, historyPastRef, historyFutureRef, isApplyingHistoryRef, previousNotesSnapshotRef, notesRef, setNotes, cloneNotesSnapshot, setHistorySyncing, setHistoryVersion, resetDeskHistory, insertChecklistItemsWithReminderFallback: insertChecklistItemsWithFallback, isMissingColumnError }, hasActivePointerInteractionRef, modalState: { pendingDeleteId, confirmDialog, deskMembersDialogOpen } })

  useDeskLifecycleOrchestration({ bootstrap: { userId: user.id, fetchDesks, fetchFriends, fetchUserStats }, globalUi: { hasModalOpen, activeDecorationHandleId, setActiveDecorationHandleId, confirmDialogIsOpen: confirmDialog.isOpen, confirmDialogLoading, deleteAccountDialogIsOpen: deleteAccountDialog.isOpen, deleteAccountDeleting, setDeleteAccountDialog, pendingDeleteId, setPendingDeleteId, closeConfirmDialog, undoNotesChange, redoNotesChange }, refBridge: { fetchDesksRef, fetchDeskItemsRef, fetchDeskActivityRef, resetDeskHistoryRef, syncDeskShelfPrefsRef, undoNotesActionRef, redoNotesActionRef, flushDeferredNotesRef, clearSelectedDeskStateRef, fetchDesks, fetchDeskItems, fetchDeskActivity, resetDeskHistory, syncDeskShelfPrefsToSupabase, undoNotesChange, redoNotesChange, flushDeferredRemoteNotes, setSelectedDeskMemberRole, setSelectedDeskMemberRoleLoading, setNotesFromRemote, setActivityFeed, setActivityError }, realtime: { supabase, userId: user.id, selectedDeskId, profileTab, deskLiveChannelName, deskMembersLiveChannelName, hasChecklistInCurrentNotes, onFetchDesks: realtimeFetchDesks, onFetchDeskItems: realtimeFetchDeskItems, onFetchDeskActivity: realtimeFetchDeskActivity }, shelfPreferences: { supabase, userId: user.id, shelfPrefsStorageKey, shelfSupabaseSyncEnabledRef, shelfSyncTimeoutRef, shelfPrefsHydrated, setShelfPrefsHydrated, deskShelves, setDeskShelves, deskShelfAssignments, setDeskShelfAssignments, expandedDeskShelves, setExpandedDeskShelves, desks, isMissingShelfStorageTableError, onSyncDeskShelfPrefs: runSyncDeskShelfPrefs }, selectedDeskLifecycle: { supabase, userId: user.id, selectedDeskId, desks, onSelectedDeskCleared: handleSelectedDeskCleared, onSelectedDeskActivated: handleSelectedDeskActivated, setSelectedDeskMemberRole, setSelectedDeskMemberRoleLoading }, localPreferences: { selectedDeskId, lastDeskStorageKey, snapPrefsStorageKey, snapToGrid, setSnapToGrid }, historySync: { historySyncing, historySyncingRef, pendingHistoryActionRef, undoNotesActionRef, redoNotesActionRef, flushDeferredNotesRef }, historyTracking: { notes, notesRef, cloneNotesSnapshot, areNoteSnapshotsEqual, hasActivePointerInteraction, historyPastRef, historyFutureRef, previousNotesSnapshotRef, isApplyingHistoryRef, skipNextHistoryRef, setHistoryVersion }, cleanup: { clearAutoSaveStatusTimeout, shelfSyncTimeoutRef } })

  const { isMobileLayout, isCurrentUserViewer, pendingFriendRequestCount, totalItemsCount, joinDate, topOverlayTop, topMenuTop, newNoteDesktopTop, mobileNoteMaxWidth, autoSaveLabel, autoSaveBadgeStyle, menuInputStyle, menuCompactInputStyle, menuPrimaryActionStyle, menuSubtleActionStyle, menuSuccessActionStyle, menuDangerActionStyle, menuNeutralActionStyle, menuSectionDividerStyle, renderDeskShelfTree, renderShelfOrganizerPanel, showCommandPalette, commandPaletteQuery, commandPaletteActiveIndex, commandPaletteInputRef, commandPaletteFilteredActions, setCommandPaletteQuery, setCommandPaletteActiveIndex, closeCommandPalette, executeCommandPaletteAction } = useDeskUiOrchestration({ derivedValues: { desks, getDeskNameValue, viewportWidth, currentDesk, userId: user.id, selectedDeskMemberRole, selectedDeskMemberRoleLoading, incomingFriendRequests, notes, userCreatedAt: user.created_at, formatDate, getDeskEffectiveShelfId, getCustomShelfOptions, historySyncing, isSavingEdit, autoSaveStatus }, shelfTreeRenderers: { builtInShelves: BUILT_IN_SHELVES, handleSelectDesk, selectedDeskId, getDeskNameValue, getDeskGroupLabel, getChildDeskShelves, expandedDeskShelves, toggleDeskShelfExpanded, showShelfHierarchyTools, setShowShelfHierarchyTools, newShelfNameInput, setNewShelfNameInput, setShelfActionError, createDeskShelf, newShelfParentId, setNewShelfParentId, currentDesk, getDeskAssignedCustomShelfId, setSelectedDeskCustomShelf, shelfActionError, renameDeskShelf, deleteDeskShelf }, commandPalette: { hasModalOpen, selectedDeskId, canCurrentUserEditDeskItems, snapToGrid, setSnapToGrid, forceSaveInProgress, historySyncing, canUndo, canRedo, getDeskNameValue, handleSelectDesk, fetchCurrentUserProfile, fetchDeskActivity, addStickyNote, addChecklistNote, addDecoration, decorationOptions: DECORATION_OPTIONS, forceSaveAndClearHistory, undoNotesChange, redoNotesChange, setShowDeskMenu, setShowProfileMenu, setShowNewNoteMenu } })

  const [showMoreMenu, setShowMoreMenu] = React.useState(false)
  const moreMenuRef = React.useRef(null)

  return (
    <DeskCanvasContainer
      ref={deskCanvasRef}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      isMobileLayout={isMobileLayout}
      backgroundColor={backgroundColor}
      backgroundImage={backgroundImage}
      backgroundSize={backgroundSize}
      backgroundPosition={backgroundPosition}
      backgroundRepeat={backgroundRepeat}
    >
      {snapToGrid && <DeskSnapToGridOverlay gridSize={gridSize} />}

      <DeskTopControls
        isMobileLayout={isMobileLayout}
        topOverlayTop={topOverlayTop}
        menuLayerZIndex={menuLayerZIndex}
        canUndo={canUndo}
        canRedo={canRedo}
        hasModalOpen={hasModalOpen}
        canCurrentUserEditDeskItems={canCurrentUserEditDeskItems}
        historySyncing={historySyncing}
        onUndo={() => void undoNotesChange()}
        onRedo={() => void redoNotesChange()}
        onForceSave={() => void forceSaveAndClearHistory()}
        selectedDeskId={selectedDeskId}
        forceSaveInProgress={forceSaveInProgress}
        autoSaveLabel={autoSaveLabel}
        autoSaveBadgeStyle={autoSaveBadgeStyle}
      />

      <DeskTopMenuShell
        isMobileLayout={isMobileLayout}
        topMenuTop={topMenuTop}
        menuLayerZIndex={menuLayerZIndex}
      >
        <DeskWorkspaceMenu
          deskMenuRef={deskMenuRef}
          isMobileLayout={isMobileLayout}
          menuLayerZIndex={menuLayerZIndex}
          menuPanelZIndex={menuPanelZIndex}
          showDeskMenu={showDeskMenu}
          setShowDeskMenu={setShowDeskMenu}
          setShowProfileMenu={setShowProfileMenu}
          setShowNewNoteMenu={setShowNewNoteMenu}
          setShowMoreMenu={setShowMoreMenu}
          currentDeskName={currentDesk ? getDeskNameValue(currentDesk) : 'Select Desk'}
          currentDesk={currentDesk}
          isCurrentDeskOwner={isCurrentDeskOwner}
          canShowManageMembers={Boolean(currentDesk && (isCurrentDeskOwner || isDeskCollaborative(currentDesk) || currentDesk.user_id !== user.id))}
          desks={desks}
          deskShelves={deskShelves}
          renderDeskShelfTree={renderDeskShelfTree}
          renderShelfOrganizerPanel={renderShelfOrganizerPanel}
          openCreateDeskDialog={openCreateDeskDialog}
          openRenameDeskDialog={openRenameDeskDialog}
          deleteCurrentDesk={deleteCurrentDesk}
          openDeskMembersDialog={openDeskMembersDialog}
          leaveCurrentDesk={leaveCurrentDesk}
          deskMenuMessage={deskMenuMessage}
          deskMenuError={deskMenuError}
        />

        <DeskProfileMenu
          profileMenuRef={profileMenuRef}
          isMobileLayout={isMobileLayout}
          menuLayerZIndex={menuLayerZIndex}
          menuPanelZIndex={menuPanelZIndex}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          setFriendError={setFriendError}
          setFriendMessage={setFriendMessage}
          setShowDeskMenu={setShowDeskMenu}
          setShowNewNoteMenu={setShowNewNoteMenu}
          setShowMoreMenu={setShowMoreMenu}
          fetchCurrentUserProfile={fetchCurrentUserProfile}
          selectedDeskId={selectedDeskId}
          fetchDeskActivity={fetchDeskActivity}
          pendingFriendRequestCount={pendingFriendRequestCount}
          setProfileTab={setProfileTab}
          profileTab={profileTab}
          preferredNameInput={preferredNameInput}
          updatePreferredNameInput={updatePreferredNameInput}
          menuInputStyle={menuInputStyle}
          savePreferredName={savePreferredName}
          preferredNameSaving={preferredNameSaving}
          menuPrimaryActionStyle={menuPrimaryActionStyle}
          preferredNameMessage={preferredNameMessage}
          preferredNameError={preferredNameError}
          userEmail={user.email}
          joinDate={joinDate}
          desks={desks}
          totalItemsCount={totalItemsCount}
          profileStatsLoading={profileStatsLoading}
          profileStats={profileStats}
          fetchUserStats={fetchUserStats}
          menuSubtleActionStyle={menuSubtleActionStyle}
          menuSectionDividerStyle={menuSectionDividerStyle}
          deleteAccountError={deleteAccountError}
          handleDeleteAccount={handleDeleteAccount}
          friendEmailInput={friendEmailInput}
          setFriendEmailInput={setFriendEmailInput}
          handleSendFriendRequest={handleSendFriendRequest}
          friendSubmitting={friendSubmitting}
          friendsLoading={friendsLoading}
          fetchFriends={fetchFriends}
          friendMessage={friendMessage}
          friendError={friendError}
          incomingFriendRequests={incomingFriendRequests}
          getProfileDisplayParts={getProfileDisplayParts}
          respondToFriendRequest={respondToFriendRequest}
          menuSuccessActionStyle={menuSuccessActionStyle}
          menuDangerActionStyle={menuDangerActionStyle}
          friends={friends}
          friendActionLoadingId={friendActionLoadingId}
          removeFriend={removeFriend}
          menuNeutralActionStyle={menuNeutralActionStyle}
          outgoingFriendRequests={outgoingFriendRequests}
          cancelOutgoingFriendRequest={cancelOutgoingFriendRequest}
          activityLoading={activityLoading}
          activityError={activityError}
          activityFeed={activityFeed}
          getActivityActionLabel={getActivityActionLabel}
          formatDate={formatDate}
          handleLogout={handleLogout}
        />

        <DeskMoreMenu
          moreMenuRef={moreMenuRef}
          isMobileLayout={isMobileLayout}
          menuLayerZIndex={menuLayerZIndex}
          menuPanelZIndex={menuPanelZIndex}
          showMoreMenu={showMoreMenu}
          setShowMoreMenu={setShowMoreMenu}
          setShowDeskMenu={setShowDeskMenu}
          setShowProfileMenu={setShowProfileMenu}
          setShowNewNoteMenu={setShowNewNoteMenu}
          currentDesk={currentDesk}
          isCurrentDeskOwner={isCurrentDeskOwner}
          canCurrentUserEditDeskItems={canCurrentUserEditDeskItems}
          setCurrentDeskBackground={setCurrentDeskBackground}
          backgroundMode={backgroundMode}
          customBackgroundInput={customBackgroundInput}
          setCustomBackgroundInput={setCustomBackgroundInput}
          menuCompactInputStyle={menuCompactInputStyle}
          setCurrentDeskCustomBackground={setCurrentDeskCustomBackground}
          menuPrimaryActionStyle={menuPrimaryActionStyle}
          exportCurrentDesk={exportCurrentDesk}
          importDeskInputRef={importDeskInputRef}
          handleImportDeskFileSelection={handleImportDeskFileSelection}
          snapToGrid={snapToGrid}
          setSnapToGrid={setSnapToGrid}
        />
      </DeskTopMenuShell>

      <NewNoteMenu
        menuRef={newNoteMenuRef}
        isOpen={showNewNoteMenu}
        isMobileLayout={isMobileLayout}
        onToggle={() => {
          const nextOpen = !showNewNoteMenu
          setShowNewNoteMenu(nextOpen)
          if (nextOpen) {
            setShowDeskMenu(false)
            setShowProfileMenu(false)
            setShowMoreMenu(false)
          }
        }}
        isDeskSelected={Boolean(selectedDeskId && canCurrentUserEditDeskItems)}
        onAddStickyNote={addStickyNote}
        onAddChecklist={addChecklistNote}
        decorationOptions={DECORATION_OPTIONS}
        onAddDecoration={addDecoration}
        menuLayerZIndex={menuLayerZIndex}
        menuPanelZIndex={menuPanelZIndex}
        desktopTop={newNoteDesktopTop}
        desktopLeft={20}
      />

      <DeskCommandPalette
        isOpen={showCommandPalette}
        onClose={closeCommandPalette}
        menuLayerZIndex={menuLayerZIndex}
        isMobileLayout={isMobileLayout}
        inputRef={commandPaletteInputRef}
        query={commandPaletteQuery}
        onQueryChange={setCommandPaletteQuery}
        actions={commandPaletteFilteredActions}
        activeIndex={commandPaletteActiveIndex}
        onActiveIndexChange={setCommandPaletteActiveIndex}
        onExecuteAction={executeCommandPaletteAction}
      />

      <DeskStatusBanners
        selectedDeskId={selectedDeskId}
        isCurrentUserViewer={isCurrentUserViewer}
        isMobileLayout={isMobileLayout}
        menuLayerZIndex={menuLayerZIndex}
      />

      <DeskCanvasItems
        notes={notes}
        currentDesk={currentDesk}
        userId={user.id}
        isDeskCollaborative={isDeskCollaborative}
        getItemCreatorLabel={getItemCreatorLabel}
        mobileNoteMaxWidth={mobileNoteMaxWidth}
        isMobileLayout={isMobileLayout}
        editingId={editingId}
        editColor={editColor}
        editTextColor={editTextColor}
        editFontFamily={editFontFamily}
        draggedId={draggedId}
        groupedItemKeys={groupedItemKeys}
        groupedItemSizes={groupedItemSizes}
        activeDecorationHandleId={activeDecorationHandleId}
        setActiveDecorationHandleId={setActiveDecorationHandleId}
        rotatingId={rotatingId}
        resizingId={resizingId}
        handleGroupSelectionClick={handleGroupSelectionClick}
        toggleItemGrouping={toggleItemGrouping}
        handleDragStart={handleDragStart}
        handleRotateMouseDown={handleRotateMouseDown}
        handleResizeMouseDown={handleResizeMouseDown}
        requestDeleteNote={requestDeleteNote}
        moveItemLayer={moveItemLayer}
        duplicateItem={duplicateItem}
        commitItemEdits={commitItemEdits}
        canCurrentUserEditDeskItems={canCurrentUserEditDeskItems}
        setIsSavingEdit={setIsSavingEdit}
        setEditSaveError={setEditSaveError}
        setEditingId={setEditingId}
        setShowStyleEditor={setShowStyleEditor}
        setEditColor={setEditColor}
        setEditTextColor={setEditTextColor}
        setEditFontSize={setEditFontSize}
        setEditFontFamily={setEditFontFamily}
        setEditValue={setEditValue}
        setChecklistEditItems={setChecklistEditItems}
        setNewChecklistItemText={setNewChecklistItemText}
        normalizeChecklistReminderValue={normalizeChecklistReminderValue}
        checklistEditItems={checklistEditItems}
        newChecklistItemText={newChecklistItemText}
        addChecklistEditItem={addChecklistEditItem}
        toReminderInputValue={toReminderInputValue}
        normalizeFontSize={normalizeFontSize}
        fontOptions={FONT_OPTIONS}
        showStyleEditor={showStyleEditor}
        editValue={editValue}
        editFontSize={editFontSize}
        isSavingEdit={isSavingEdit}
        closeItemEditor={closeItemEditor}
        editSaveError={editSaveError}
        toggleChecklistItem={toggleChecklistItem}
        getChecklistReminderMeta={getChecklistReminderMeta}
      />

      <DeskModals
        pendingDeleteId={pendingDeleteId}
        confirmDeleteNote={confirmDeleteNote}
        setPendingDeleteId={setPendingDeleteId}
        confirmDialog={confirmDialog}
        confirmDialogLoading={confirmDialogLoading}
        confirmDialogAction={confirmDialogAction}
        closeConfirmDialog={closeConfirmDialog}
        deleteAccountDialog={deleteAccountDialog}
        submitDeleteAccountDialog={submitDeleteAccountDialog}
        deleteAccountError={deleteAccountError}
        setDeleteAccountError={setDeleteAccountError}
        setDeleteAccountDialog={setDeleteAccountDialog}
        deleteAccountDeleting={deleteAccountDeleting}
        deleteAccountConfirmationMatches={deleteAccountConfirmationMatches}
        closeDeleteAccountDialog={closeDeleteAccountDialog}
        deskNameDialog={deskNameDialog}
        submitDeskNameDialog={submitDeskNameDialog}
        deskNameError={deskNameError}
        setDeskNameError={setDeskNameError}
        setDeskNameDialog={setDeskNameDialog}
        friends={friends}
        getProfileDisplayParts={getProfileDisplayParts}
        toggleInvitedFriend={toggleInvitedFriend}
        closeDeskNameDialog={closeDeskNameDialog}
        deskNameSaving={deskNameSaving}
        deskMembersDialogOpen={deskMembersDialogOpen}
        deskMembersMessage={deskMembersMessage}
        deskMembersError={deskMembersError}
        deskMembersLoading={deskMembersLoading}
        deskMembers={deskMembers}
        deskMemberRequests={deskMemberRequests}
        deskMemberRequestsLoading={deskMemberRequestsLoading}
        deskMemberRequestsError={deskMemberRequestsError}
        deskMemberActionLoadingId={deskMemberActionLoadingId}
        removeDeskMember={removeDeskMember}
        addDeskMember={addDeskMember}
        sendFriendRequestToDeskMember={sendFriendRequestToDeskMember}
        currentUserId={user.id}
        friendIds={friends.map((friend) => friend.id)}
        outgoingFriendRequestUserIds={outgoingFriendRequests.map((request) => request.receiver_id)}
        incomingFriendRequestUserIds={incomingFriendRequests.map((request) => request.sender_id)}
        requestDeskMemberAdd={requestDeskMemberAdd}
        respondDeskMemberRequest={respondDeskMemberRequest}
        updateDeskMemberRole={updateDeskMemberRole}
        isCurrentDeskOwner={isCurrentDeskOwner}
        closeDeskMembersDialog={closeDeskMembersDialog}
        resizeOverlay={resizeOverlay}
        ResizeIconComponent={FourWayResizeIcon}
        modalOverlayStyle={modalOverlayStyle}
        modalCardStyle={modalCardStyle}
        modalTitleStyle={modalTitleStyle}
        modalActionsStyle={modalActionsStyle}
        modalSecondaryButtonStyle={modalSecondaryButtonStyle}
        modalPrimaryButtonStyle={modalPrimaryButtonStyle}
        modalDangerButtonStyle={modalDangerButtonStyle}
      />
    </DeskCanvasContainer>
  )
}
