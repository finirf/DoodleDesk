export { default as DeskCanvasContainer } from './components/DeskCanvasContainer'
export { default as DeskCanvasItems } from './components/DeskCanvasItems'
export { default as DeskCommandPalette } from './components/DeskCommandPalette'
export { default as DeskErrorBoundary } from './components/DeskErrorBoundary'
export { default as DeskModals } from './components/DeskModals'
export { default as DeskMoreMenu } from './components/DeskMoreMenu'
export { default as DeskProfileMenu } from './components/DeskProfileMenu'
export { default as DeskSnapToGridOverlay } from './components/DeskSnapToGridOverlay'
export { default as DeskStatusBanners } from './components/DeskStatusBanners'
export { default as DeskTopControls } from './components/DeskTopControls'
export { default as DeskTopMenuShell } from './components/DeskTopMenuShell'
export { default as DeskWorkspaceMenu } from './components/DeskWorkspaceMenu'
export {
  DeskMenuItemButton,
  DeskMenuPanel,
  DeskMenuTriggerButton,
  DeskTopControlButton
} from './components/DeskUiPrimitives'
export { default as FourWayResizeIcon } from './components/FourWayResizeIcon'
export { default as NewNoteMenu } from './components/NewNoteMenu'
export { useDesksState } from './hooks/useDesksState'
export { useDeskItemOperations } from './hooks/useDeskItemOperations'
export { default as useDeskViewport } from './hooks/useDeskViewport'
export { default as useMenuCloseOnOutsideClick } from './hooks/useMenuCloseOnOutsideClick'
export { default as useDeskAccessControl } from './hooks/useDeskAccessControl'
export { default as useDeskAccountActions } from './hooks/useDeskAccountActions'
export { default as useDeskActionOrchestration } from './hooks/useDeskActionOrchestration'
export { default as useDeskActivity } from './hooks/useDeskActivity'
export { default as useDeskBackgroundActions } from './hooks/useDeskBackgroundActions'
export { default as useDeskBootstrapEffects } from './hooks/useDeskBootstrapEffects'
export { default as useDeskChecklistHelpers } from './hooks/useDeskChecklistHelpers'
export { default as useDeskCleanupEffects } from './hooks/useDeskCleanupEffects'
export { default as useDeskCollectionActions } from './hooks/useDeskCollectionActions'
export { default as useDeskCommandPalette } from './hooks/useDeskCommandPalette'
export { default as useDeskConfirmDialogActions } from './hooks/useDeskConfirmDialogActions'
export { default as useDeskDataQueries } from './hooks/useDeskDataQueries'
export { default as useDeskDerivedStateOrchestration } from './hooks/useDeskDerivedStateOrchestration'
export { default as useDeskFriendActions } from './hooks/useDeskFriendActions'
export { default as useDeskGlobalUiEffects } from './hooks/useDeskGlobalUiEffects'
export { default as useDeskHistory } from './hooks/useDeskHistory'
export { default as useDeskHistoryActions } from './hooks/useDeskHistoryActions'
export { default as useDeskHistoryState } from './hooks/useDeskHistoryState'
export { default as useDeskHistorySync } from './hooks/useDeskHistorySync'
export { default as useDeskHistoryTracking } from './hooks/useDeskHistoryTracking'
export { default as useDeskImportExport } from './hooks/useDeskImportExport'
export { default as useDeskItemInteractions } from './hooks/useDeskItemInteractions'
export { default as useDeskLifecycleOrchestration } from './hooks/useDeskLifecycleOrchestration'
export { default as useDeskLocalPreferences } from './hooks/useDeskLocalPreferences'
export { default as useDeskMemberRequests } from './hooks/useDeskMemberRequests'
export { default as useDeskMembershipActions } from './hooks/useDeskMembershipActions'
export { default as useDeskModalState } from './hooks/useDeskModalState'
export { default as useDeskModalStyles } from './hooks/useDeskModalStyles'
export { default as useDeskNameDialog } from './hooks/useDeskNameDialog'
export { default as useDeskOperationsOrchestration } from './hooks/useDeskOperationsOrchestration'
export { default as useDeskProfileData } from './hooks/useDeskProfileData'
export { default as useDeskRealtimeChannelNames } from './hooks/useDeskRealtimeChannelNames'
export { default as useDeskRealtimeSubscriptions } from './hooks/useDeskRealtimeSubscriptions'
export { default as useDeskRefBridgeCallbacks } from './hooks/useDeskRefBridgeCallbacks'
export { default as useDeskRefBridgeEffects } from './hooks/useDeskRefBridgeEffects'
export { default as useDeskRemoteNotesAndAutosave } from './hooks/useDeskRemoteNotesAndAutosave'
export { default as useDeskShelfHierarchyActions } from './hooks/useDeskShelfHierarchyActions'
export { default as useDeskShelfPreferences } from './hooks/useDeskShelfPreferences'
export { default as useDeskShelfSyncActions } from './hooks/useDeskShelfSyncActions'
export { default as useDeskShelfTreeRenderers } from './hooks/useDeskShelfTreeRenderers'
export { default as useDeskSocialData } from './hooks/useDeskSocialData'
export { default as useDeskStateOrchestration } from './hooks/useDeskStateOrchestration'
export { default as useDeskUiConfig } from './hooks/useDeskUiConfig'
export { default as useDeskUiDerivedValues } from './hooks/useDeskUiDerivedValues'
export { default as useDeskUiOrchestration } from './hooks/useDeskUiOrchestration'
export { default as useSelectedDeskLifecycle } from './hooks/useSelectedDeskLifecycle'
export { BUILT_IN_SHELVES, DECORATION_OPTIONS, FONT_OPTIONS } from './constants/deskConstants'
export { modalStyles } from './constants/modalStyles'
export { loadMergedDesksForUser } from './data/deskQueries'
export { getDeskBackgroundStyles } from './utils/backgroundUtils'
export {
  formatDate,
  getDeskNameValue,
  getProfileDisplayParts,
  getViewportMetrics,
  isDeskCollaborative,
  normalizeCustomBackgroundValue,
  normalizeHexColor,
  normalizeHttpUrl,
  isMissingTableError,
  withTimeout
} from './utils/deskHelpers'
export {
  formatChecklistReminderValue,
  getChecklistReminderMeta,
  normalizeChecklistReminderValue,
  toReminderInputValue
} from './utils/reminderUtils'
export {
  clampDimension,
  getDecorationOption,
  getDefaultItemColor,
  getItemColor,
  getItemCreatorLabel,
  getItemFontFamily,
  getItemFontSize,
  getItemHeight,
  getItemKey,
  getItemTableName,
  getItemTextColor,
  getItemWidth,
  isChecklistItem,
  isDecorationItem,
  isMissingColumnError,
  isMissingShelfStorageTableError,
  normalizeFontSize,
  normalizeRotation,
  toStoredRotation,
  insertChecklistItemsWithReminderFallback
} from './utils/itemUtils'