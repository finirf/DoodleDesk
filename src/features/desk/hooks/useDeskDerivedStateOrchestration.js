import { useRef } from 'react'
import {
  useDeskHistory,
  useDeskRefBridgeCallbacks,
  useDeskUiConfig,
  useDeskRealtimeChannelNames,
  useDeskAccessControl,
  useDeskHistoryState,
  useDeskModalStyles,
  getDeskBackgroundStyles,
  modalStyles
} from '../index'

/**
 * Orchestrates derived state computed from primary state: background styles, UI config,
 * modal styles, history capabilities, access control, and ref callbacks.
 * 
 * This hook consumes primary state from useDeskStateOrchestration and derives
 * read-only computed values used across the app (styling, permissions, history state).
 * It also bridges refs between state orchestration and action orchestration.
 * 
 * **Output domains:**
 * - History (historyPastRef, historyFutureRef, canUndo, canRedo, setHistoryVersion, cloneNotesSnapshot, etc.)
 * - Background rendering (backgroundImage, backgroundColor, backgroundSize, backgroundPosition, backgroundRepeat)
 * - Desk access (currentDesk, isCurrentDeskOwner, canCurrentUserEditDeskItems)
 * - Modal styles (modalOverlayStyle, modalCardStyle, modalTitleStyle, etc.)
 * - UI config (growThreshold, gridSize, menuLayerZIndex, menuPanelZIndex, snapPrefsStorageKey, etc.)
 * - Realtime channels (deskLiveChannelName, deskMembersLiveChannelName)
 * - Callbacks (realtimeFetchDesks, realtimeFetchDeskItems, realtimeFetchDeskActivity, handleSelectedDeskActivated, handleSelectedDeskCleared)
 * - Ref bridges (hasActivePointerInteractionRef for coordinating interaction state across hooks)
 * 
 * @param {Object} config
 * @param {Object} config.deskState - Primary state from useDeskStateOrchestration
 * @param {Object} config.userContext - User info (userId, email if available)
 * @returns {Object} Derived state and computed utilities
 */
export default function useDeskDerivedStateOrchestration({
  deskState,
  userContext
}) {
  const {
    selectedDeskId,
    canvasHeight,
    sectionHeight,
    backgroundMode,
    customBackgroundUrl,
    desks,
    selectedDeskMemberRole,
    selectedDeskMemberRoleLoading,
    fetchDesksRef,
    fetchDeskItemsRef,
    fetchDeskActivityRef,
    resetDeskHistoryRef,
    clearSelectedDeskStateRef,
    syncDeskShelfPrefsRef
  } = deskState

  const { userId } = userContext

  // ===== History State =====
  const {
    historyPastRef,
    historyFutureRef,
    pendingHistoryActionRef,
    previousNotesSnapshotRef,
    isApplyingHistoryRef,
    skipNextHistoryRef,
    historyVersion,
    setHistoryVersion,
    cloneSnapshot: cloneNotesSnapshot,
    areSnapshotsEqual: areNoteSnapshotsEqual,
    resetHistory: resetDeskHistory
  } = useDeskHistory()

  // ===== Ref Bridge Callbacks =====
  const {
    realtimeFetchDesks,
    realtimeFetchDeskItems,
    realtimeFetchDeskActivity,
    handleSelectedDeskActivated,
    handleSelectedDeskCleared,
    runSyncDeskShelfPrefs
  } = useDeskRefBridgeCallbacks({
    fetchDesksRef,
    fetchDeskItemsRef,
    fetchDeskActivityRef,
    resetDeskHistoryRef,
    clearSelectedDeskStateRef,
    syncDeskShelfPrefsRef
  })

  // ===== UI Configuration =====
  const {
    growThreshold,
    gridSize,
    menuLayerZIndex,
    menuPanelZIndex,
    lastDeskStorageKey,
    shelfPrefsStorageKey,
    snapPrefsStorageKey
  } = useDeskUiConfig({ userId })

  // ===== Section Count =====
  const sectionCount = Math.max(2, Math.ceil(canvasHeight / sectionHeight))

  // ===== Realtime Channel Names =====
  const {
    deskLiveChannelName,
    deskMembersLiveChannelName
  } = useDeskRealtimeChannelNames({
    selectedDeskId,
    userId
  })

  // ===== Background Styles =====
  const {
    backgroundImage,
    backgroundColor,
    backgroundSize,
    backgroundPosition,
    backgroundRepeat
  } = getDeskBackgroundStyles({
    backgroundMode,
    customBackgroundUrl,
    sectionCount,
    sectionHeight
  })

  // ===== Access Control =====
  const {
    currentDesk,
    isCurrentDeskOwner,
    canCurrentUserEditDeskItems
  } = useDeskAccessControl({
    desks,
    selectedDeskId,
    userId,
    selectedDeskMemberRole,
    selectedDeskMemberRoleLoading
  })

  // ===== History State Availability =====
  const {
    canUndo,
    canRedo
  } = useDeskHistoryState({
    historyVersion,
    historyPastRef,
    historyFutureRef
  })

  // ===== Modal Styles =====
  const {
    modalOverlayStyle,
    modalCardStyle,
    modalTitleStyle,
    modalActionsStyle,
    modalSecondaryButtonStyle,
    modalPrimaryButtonStyle,
    modalDangerButtonStyle
  } = useDeskModalStyles(modalStyles)

  // ===== Pointer Interaction Ref =====
  const hasActivePointerInteractionRef = useRef(() => false)

  return {
    // History
    historyPastRef,
    historyFutureRef,
    pendingHistoryActionRef,
    previousNotesSnapshotRef,
    isApplyingHistoryRef,
    skipNextHistoryRef,
    historyVersion,
    setHistoryVersion,
    cloneNotesSnapshot,
    areNoteSnapshotsEqual,
    resetDeskHistory,
    canUndo,
    canRedo,
    // Ref Bridge Callbacks
    realtimeFetchDesks,
    realtimeFetchDeskItems,
    realtimeFetchDeskActivity,
    handleSelectedDeskActivated,
    handleSelectedDeskCleared,
    runSyncDeskShelfPrefs,
    // UI Configuration
    growThreshold,
    gridSize,
    menuLayerZIndex,
    menuPanelZIndex,
    lastDeskStorageKey,
    shelfPrefsStorageKey,
    snapPrefsStorageKey,
    // Section Count
    sectionCount,
    // Realtime Channels
    deskLiveChannelName,
    deskMembersLiveChannelName,
    // Background Styles
    backgroundImage,
    backgroundColor,
    backgroundSize,
    backgroundPosition,
    backgroundRepeat,
    // Access Control
    currentDesk,
    isCurrentDeskOwner,
    canCurrentUserEditDeskItems,
    // Modal Styles
    modalOverlayStyle,
    modalCardStyle,
    modalTitleStyle,
    modalActionsStyle,
    modalSecondaryButtonStyle,
    modalPrimaryButtonStyle,
    modalDangerButtonStyle,
    // Refs
    hasActivePointerInteractionRef
  }
}
