/**
 * Custom hook to consolidate all state management for the Desk component.
 * Extracted from the monolithic App.jsx to improve modularity and readability.
 */

import { useState, useRef } from 'react'
import useMenuCloseOnOutsideClick from './useMenuCloseOnOutsideClick'
import useDeskViewport from './useDeskViewport'

export function useDesksState({ getViewportMetrics }) {
  // ========== Desk Selection & Lists ==========
  const [desks, setDesks] = useState([])
  const [selectedDeskId, setSelectedDeskId] = useState(null)

  // ========== Note/Item State ==========
  const [notes, setNotes] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editColor, setEditColor] = useState('#fff59d')
  const [editTextColor, setEditTextColor] = useState('#222222')
  const [editFontSize, setEditFontSize] = useState(16)
  const [editFontFamily, setEditFontFamily] = useState('inherit')
  const [editFontWeight, setEditFontWeight] = useState('normal')
  const [editFontStyle, setEditFontStyle] = useState('normal')
  const [showStyleEditor, setShowStyleEditor] = useState(false)
  const [checklistEditItems, setChecklistEditItems] = useState([])
  const [newChecklistItemText, setNewChecklistItemText] = useState('')

  // ========== Menu UI State ==========
  const [showNewNoteMenu, setShowNewNoteMenu] = useState(false)
  const [showDeskMenu, setShowDeskMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showShelfHierarchyTools, setShowShelfHierarchyTools] = useState(false)

  // ========== Shelf Management State ==========
  const [deskShelves, setDeskShelves] = useState([])
  const [deskShelfAssignments, setDeskShelfAssignments] = useState({})
  const [shelfPrefsHydrated, setShelfPrefsHydrated] = useState(false)
  const [expandedDeskShelves, setExpandedDeskShelves] = useState({
    __private: true,
    __shared: true,
    __sharing: true,
    __custom_root: true
  })
  const [newShelfNameInput, setNewShelfNameInput] = useState('')
  const [newShelfParentId, setNewShelfParentId] = useState('')
  const [shelfActionError, setShelfActionError] = useState('')

  // ========== Profile & Activity Tab State ==========
  const [profileTab, setProfileTab] = useState('profile')

  // ========== Desk Members State ==========
  const [deskMembersDialogOpen, setDeskMembersDialogOpen] = useState(false)
  const [deskMembers, setDeskMembers] = useState([])
  const [deskMembersLoading, setDeskMembersLoading] = useState(false)
  const [deskMemberRequests, setDeskMemberRequests] = useState([])
  const [deskMemberRequestsLoading, setDeskMemberRequestsLoading] = useState(false)
  const [deskMemberRequestsError, setDeskMemberRequestsError] = useState('')
  const [deskMembersError, setDeskMembersError] = useState('')
  const [deskMembersMessage, setDeskMembersMessage] = useState('')
  const [deskMemberActionLoadingId, setDeskMemberActionLoadingId] = useState(null)

  // ========== Auto-Save & Editing State ==========
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editSaveError, setEditSaveError] = useState('')

  // ========== Background State ==========
  const [backgroundMode, setBackgroundMode] = useState('desk1')
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState('')
  const [customBackgroundInput, setCustomBackgroundInput] = useState('')
  const [backgroundMenuError, setBackgroundMenuError] = useState('')

  // ========== Menu Message/Error State ==========
  const [deskMenuMessage, setDeskMenuMessage] = useState('')
  const [deskMenuError, setDeskMenuError] = useState('')

  // ========== Grid & Canvas State ==========
  const [snapToGrid, setSnapToGrid] = useState(false)

  // ========== Delete Confirmation State ==========
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    tone: 'danger',
    onConfirm: null
  })
  const [confirmDialogLoading, setConfirmDialogLoading] = useState(false)

  // ========== Friend Management State ==========
  const [friends, setFriends] = useState([])
  const [incomingFriendRequests, setIncomingFriendRequests] = useState([])
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState([])
  const [friendEmailInput, setFriendEmailInput] = useState('')
  const [friendMessage, setFriendMessage] = useState('')
  const [friendError, setFriendError] = useState('')
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendSubmitting, setFriendSubmitting] = useState(false)
  const [friendActionLoadingId, setFriendActionLoadingId] = useState(null)

  // ========== Profile Stats & Activity ==========
  const [profileStats, setProfileStats] = useState({ desks_created: 0, desks_deleted: 0 })
  const [profileStatsLoading, setProfileStatsLoading] = useState(false)
  const [activityFeed, setActivityFeed] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState('')

  // ========== Decoration State ==========
  const [activeDecorationHandleId, setActiveDecorationHandleId] = useState(null)

  // ========== Viewport & Canvas Dimensions ==========
  const {
    viewportWidth,
    sectionHeight,
    canvasWidth,
    canvasHeight,
    setCanvasWidth,
    setCanvasHeight
  } = useDeskViewport({ getViewportMetrics })

  // ========== Refs for Async Operations ==========
  const deferredRemoteNotesRef = useRef(null)
  const historySyncingRef = useRef(false)
  const notesRef = useRef([])
  const fetchDesksRef = useRef(null)
  const fetchDeskItemsRef = useRef(null)
  const fetchDeskActivityRef = useRef(null)
  const resetDeskHistoryRef = useRef(null)
  const clearSelectedDeskStateRef = useRef(null)
  const syncDeskShelfPrefsRef = useRef(null)
  const undoNotesActionRef = useRef(null)
  const redoNotesActionRef = useRef(null)
  const flushDeferredNotesRef = useRef(null)
  const autoSaveStatusTimeoutRef = useRef(null)

  // ========== Menu Refs ==========
  const {
    newNoteMenuRef,
    deskMenuRef,
    profileMenuRef
  } = useMenuCloseOnOutsideClick({
    showNewNoteMenu,
    showDeskMenu,
    showProfileMenu,
    setShowNewNoteMenu,
    setShowDeskMenu,
    setShowProfileMenu
  })

  // ========== Shelf & Persistence Refs ==========
  const shelfSupabaseSyncEnabledRef = useRef(true)
  const shelfSyncTimeoutRef = useRef(null)
  const deskCanvasRef = useRef(null)
  const importDeskInputRef = useRef(null)

  // ========== History & Sync State ==========
  const [historySyncing, setHistorySyncing] = useState(false)
  const [forceSaveInProgress, setForceSaveInProgress] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle')
  const [selectedDeskMemberRole, setSelectedDeskMemberRole] = useState('owner')
  const [selectedDeskMemberRoleLoading, setSelectedDeskMemberRoleLoading] = useState(false)

  // ========== Command Palette State (derived, will use hook) ==========
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('')
  const [commandPaletteActiveIndex, setCommandPaletteActiveIndex] = useState(0)
  const commandPaletteInputRef = useRef(null)

  return {
    // State
    desks,
    setDesks,
    selectedDeskId,
    setSelectedDeskId,
    notes,
    setNotes,
    editingId,
    setEditingId,
    editValue,
    setEditValue,
    editColor,
    setEditColor,
    editTextColor,
    setEditTextColor,
    editFontSize,
    setEditFontSize,
    editFontFamily,
    setEditFontFamily,
    editFontWeight,
    setEditFontWeight,
    editFontStyle,
    setEditFontStyle,
    showStyleEditor,
    setShowStyleEditor,
    checklistEditItems,
    setChecklistEditItems,
    newChecklistItemText,
    setNewChecklistItemText,

    // Menu UI
    showNewNoteMenu,
    setShowNewNoteMenu,
    showDeskMenu,
    setShowDeskMenu,
    showProfileMenu,
    setShowProfileMenu,
    showShelfHierarchyTools,
    setShowShelfHierarchyTools,

    // Shelves
    deskShelves,
    setDeskShelves,
    deskShelfAssignments,
    setDeskShelfAssignments,
    shelfPrefsHydrated,
    setShelfPrefsHydrated,
    expandedDeskShelves,
    setExpandedDeskShelves,
    newShelfNameInput,
    setNewShelfNameInput,
    newShelfParentId,
    setNewShelfParentId,
    shelfActionError,
    setShelfActionError,

    // Profile & Activity
    profileTab,
    setProfileTab,

    // Desk Members
    deskMembersDialogOpen,
    setDeskMembersDialogOpen,
    deskMembers,
    setDeskMembers,
    deskMembersLoading,
    setDeskMembersLoading,
    deskMemberRequests,
    setDeskMemberRequests,
    deskMemberRequestsLoading,
    setDeskMemberRequestsLoading,
    deskMemberRequestsError,
    setDeskMemberRequestsError,
    deskMembersError,
    setDeskMembersError,
    deskMembersMessage,
    setDeskMembersMessage,
    deskMemberActionLoadingId,
    setDeskMemberActionLoadingId,

    // Auto-Save
    isSavingEdit,
    setIsSavingEdit,
    editSaveError,
    setEditSaveError,

    // Background
    backgroundMode,
    setBackgroundMode,
    customBackgroundUrl,
    setCustomBackgroundUrl,
    customBackgroundInput,
    setCustomBackgroundInput,
    backgroundMenuError,
    setBackgroundMenuError,

    // Menu Messages
    deskMenuMessage,
    setDeskMenuMessage,
    deskMenuError,
    setDeskMenuError,

    // Grid
    snapToGrid,
    setSnapToGrid,

    // Delete Confirmation
    pendingDeleteId,
    setPendingDeleteId,
    confirmDialog,
    setConfirmDialog,
    confirmDialogLoading,
    setConfirmDialogLoading,

    // Friends
    friends,
    setFriends,
    incomingFriendRequests,
    setIncomingFriendRequests,
    outgoingFriendRequests,
    setOutgoingFriendRequests,
    friendEmailInput,
    setFriendEmailInput,
    friendMessage,
    setFriendMessage,
    friendError,
    setFriendError,
    friendsLoading,
    setFriendsLoading,
    friendSubmitting,
    setFriendSubmitting,
    friendActionLoadingId,
    setFriendActionLoadingId,

    // Profile Stats
    profileStats,
    setProfileStats,
    profileStatsLoading,
    setProfileStatsLoading,
    activityFeed,
    setActivityFeed,
    activityLoading,
    setActivityLoading,
    activityError,
    setActivityError,

    // Decorations
    activeDecorationHandleId,
    setActiveDecorationHandleId,

    // Viewport
    viewportWidth,
    sectionHeight,
    canvasWidth,
    canvasHeight,
    setCanvasWidth,
    setCanvasHeight,

    // Refs
    deferredRemoteNotesRef,
    historySyncingRef,
    notesRef,
    fetchDesksRef,
    fetchDeskItemsRef,
    fetchDeskActivityRef,
    resetDeskHistoryRef,
    clearSelectedDeskStateRef,
    syncDeskShelfPrefsRef,
    undoNotesActionRef,
    redoNotesActionRef,
    flushDeferredNotesRef,
    autoSaveStatusTimeoutRef,
    newNoteMenuRef,
    deskMenuRef,
    profileMenuRef,
    shelfSupabaseSyncEnabledRef,
    shelfSyncTimeoutRef,
    deskCanvasRef,
    importDeskInputRef,

    // History & Sync
    historySyncing,
    setHistorySyncing,
    forceSaveInProgress,
    setForceSaveInProgress,
    autoSaveStatus,
    setAutoSaveStatus,
    selectedDeskMemberRole,
    setSelectedDeskMemberRole,
    selectedDeskMemberRoleLoading,
    setSelectedDeskMemberRoleLoading,

    // Command Palette
    showCommandPalette,
    setShowCommandPalette,
    commandPaletteQuery,
    setCommandPaletteQuery,
    commandPaletteActiveIndex,
    setCommandPaletteActiveIndex,
    commandPaletteInputRef
  }
}
