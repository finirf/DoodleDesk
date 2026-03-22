import { Component, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { AppAuthBoundary, useAuthSession } from './features/auth'
import {
  BUILT_IN_SHELVES,
  DECORATION_OPTIONS,
  DeskModals,
  DeskMenuItemButton,
  DeskMenuPanel,
  DeskMenuTriggerButton,
  DeskTopControlButton,
  FONT_OPTIONS,
  FourWayResizeIcon,
  NewNoteMenu,
  clampDimension,
  formatDate,
  getDeskBackgroundStyles,
  getDecorationOption,
  getDeskNameValue,
  getDefaultItemColor,
  getItemColor,
  getItemCreatorLabel,
  getItemFontFamily,
  getItemFontSize,
  getItemHeight,
  getItemKey,
  getProfileDisplayParts,
  getItemTableName,
  getItemTextColor,
  getViewportMetrics,
  getItemWidth,
  isChecklistItem,
  isDeskCollaborative,
  isDecorationItem,
  isMissingColumnError,
  isMissingShelfStorageTableError,
  loadMergedDesksForUser,
  modalStyles,
  normalizeCustomBackgroundValue,
  normalizeFontSize,
  useDeskViewport,
  useMenuCloseOnOutsideClick
} from './features/desk'

class DeskErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Desk render error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc' }}>
          <div style={{ maxWidth: 520, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)', padding: 20 }}>
            <h2 style={{ marginTop: 0, marginBottom: 8, color: '#0f172a' }}>Something went wrong</h2>
            <p style={{ marginTop: 0, marginBottom: 14, color: '#334155', lineHeight: 1.5 }}>
              We hit a runtime issue while loading your desk. Please reload the app.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '10px 14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

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

// ------------------- Desk -------------------
function Desk({ user }) {
  const [desks, setDesks] = useState([])
  const [selectedDeskId, setSelectedDeskId] = useState(null)
  const [notes, setNotes] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editColor, setEditColor] = useState('#fff59d')
  const [editTextColor, setEditTextColor] = useState('#222222')
  const [editFontSize, setEditFontSize] = useState(16)
  const [editFontFamily, setEditFontFamily] = useState('inherit')
  const [showStyleEditor, setShowStyleEditor] = useState(false)
  const [checklistEditItems, setChecklistEditItems] = useState([])
  const [newChecklistItemText, setNewChecklistItemText] = useState('')
  const [showNewNoteMenu, setShowNewNoteMenu] = useState(false)
  const [showDeskMenu, setShowDeskMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('')
  const [commandPaletteActiveIndex, setCommandPaletteActiveIndex] = useState(0)
  const [showShelfHierarchyTools, setShowShelfHierarchyTools] = useState(false)
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
  const [profileTab, setProfileTab] = useState('profile')
  const [deskNameDialog, setDeskNameDialog] = useState({
    isOpen: false,
    mode: 'create',
    value: '',
    isCollaborative: false,
    invitedFriendIds: []
  })
  const [deskNameError, setDeskNameError] = useState('')
  const [deskNameSaving, setDeskNameSaving] = useState(false)
  const [deskMembersDialogOpen, setDeskMembersDialogOpen] = useState(false)
  const [deskMembers, setDeskMembers] = useState([])
  const [deskMembersLoading, setDeskMembersLoading] = useState(false)
  const [deskMemberRequests, setDeskMemberRequests] = useState([])
  const [deskMemberRequestsLoading, setDeskMemberRequestsLoading] = useState(false)
  const [deskMemberRequestsError, setDeskMemberRequestsError] = useState('')
  const [deskMembersError, setDeskMembersError] = useState('')
  const [deskMembersMessage, setDeskMembersMessage] = useState('')
  const [deskMemberActionLoadingId, setDeskMemberActionLoadingId] = useState(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editSaveError, setEditSaveError] = useState('')
  const [backgroundMode, setBackgroundMode] = useState('desk1')
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState('')
  const [customBackgroundInput, setCustomBackgroundInput] = useState('')
  const [backgroundMenuError, setBackgroundMenuError] = useState('')
  const [deskMenuMessage, setDeskMenuMessage] = useState('')
  const [deskMenuError, setDeskMenuError] = useState('')
  const [snapToGrid, setSnapToGrid] = useState(false)
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
  const [friends, setFriends] = useState([])
  const [incomingFriendRequests, setIncomingFriendRequests] = useState([])
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState([])
  const [friendEmailInput, setFriendEmailInput] = useState('')
  const [friendMessage, setFriendMessage] = useState('')
  const [friendError, setFriendError] = useState('')
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendSubmitting, setFriendSubmitting] = useState(false)
  const [friendActionLoadingId, setFriendActionLoadingId] = useState(null)
  const [profileStats, setProfileStats] = useState({ desks_created: 0, desks_deleted: 0 })
  const [profileStatsLoading, setProfileStatsLoading] = useState(false)
  const [activityFeed, setActivityFeed] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState('')
  const [preferredNameInput, setPreferredNameInput] = useState('')
  const [preferredNameSaving, setPreferredNameSaving] = useState(false)
  const [preferredNameError, setPreferredNameError] = useState('')
  const [preferredNameMessage, setPreferredNameMessage] = useState('')
  const [deleteAccountError, setDeleteAccountError] = useState('')
  const [deleteAccountDialog, setDeleteAccountDialog] = useState({
    isOpen: false,
    confirmationText: ''
  })
  const [deleteAccountDeleting, setDeleteAccountDeleting] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [activeDecorationHandleId, setActiveDecorationHandleId] = useState(null)
  const [rotatingId, setRotatingId] = useState(null)
  const [resizingId, setResizingId] = useState(null)
  const [resizeOverlay, setResizeOverlay] = useState(null)
  const [_dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const {
    viewportWidth,
    sectionHeight,
    canvasWidth,
    canvasHeight,
    setCanvasWidth,
    setCanvasHeight
  } = useDeskViewport({ getViewportMetrics })
  const draggedIdRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const dragPointerIdRef = useRef(null)
  const dragLastPositionRef = useRef(null)
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef(false)
  const isRotatingRef = useRef(false)
  const resizeLastDimensionsRef = useRef(null)
  const rotateLastValueRef = useRef(null)
  const deferredRemoteNotesRef = useRef(null)
  const historySyncingRef = useRef(false)
  const notesRef = useRef([])
  const rotatingNoteIdRef = useRef(null)
  const rotatingPointerIdRef = useRef(null)
  const rotationOffsetRef = useRef(0)
  const rotationCenterRef = useRef({ x: 0, y: 0 })
  const resizingPointerIdRef = useRef(null)
  const resizeStartRef = useRef({
    itemKey: null,
    startPageX: 0,
    startPageY: 0,
    startWidth: 200,
    startHeight: 120
  })
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
  const shelfSupabaseSyncEnabledRef = useRef(true)
  const shelfSyncTimeoutRef = useRef(null)
  const deskCanvasRef = useRef(null)
  const importDeskInputRef = useRef(null)
  const commandPaletteInputRef = useRef(null)
  const historyPastRef = useRef([])
  const historyFutureRef = useRef([])
  const pendingHistoryActionRef = useRef(null)
  const previousNotesSnapshotRef = useRef([])
  const isApplyingHistoryRef = useRef(false)
  const skipNextHistoryRef = useRef(false)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [historySyncing, setHistorySyncing] = useState(false)
  const [forceSaveInProgress, setForceSaveInProgress] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle')
  const [selectedDeskMemberRole, setSelectedDeskMemberRole] = useState('owner')
  const [selectedDeskMemberRoleLoading, setSelectedDeskMemberRoleLoading] = useState(false)
  const autoSaveStatusTimeoutRef = useRef(null)

  const growThreshold = 180
  const gridSize = 20
  const menuLayerZIndex = 6000
  const menuPanelZIndex = menuLayerZIndex + 1
  const sectionCount = Math.max(2, Math.ceil(canvasHeight / sectionHeight))
  const lastDeskStorageKey = `doodledesk:lastDesk:${user.id}`
  const shelfPrefsStorageKey = `doodledesk:deskShelves:${user.id}`
  const snapPrefsStorageKey = `doodledesk:snapToGrid:${user.id}`
  const deskLiveChannelName = useMemo(
    () => (selectedDeskId ? `desk-live:${selectedDeskId}:${user.id}` : ''),
    [selectedDeskId, user.id]
  )
  const deskMembersLiveChannelName = useMemo(
    () => `desk-members-live:${user.id}`,
    [user.id]
  )
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
  const deleteAccountConfirmationMatches = deleteAccountDialog.confirmationText.trim().toUpperCase() === 'DELETE'
  const canUndo = historyVersion >= 0 && historyPastRef.current.length > 0
  const canRedo = historyVersion >= 0 && historyFutureRef.current.length > 0
  const autoSaveLabel = historySyncing
    ? 'Syncing history...'
    : (isSavingEdit || autoSaveStatus === 'saving'
        ? 'Saving...'
        : (autoSaveStatus === 'error' ? 'Save issue' : 'All changes saved'))
  const autoSaveBadgeStyle = {
    padding: '7px 10px',
    fontSize: 12,
    borderRadius: 999,
    border: autoSaveStatus === 'error' ? '1px solid var(--ui-danger)' : '1px solid var(--ui-border-strong)',
    background: autoSaveStatus === 'error' ? 'var(--ui-danger-soft)' : 'var(--ui-glass)',
    color: autoSaveStatus === 'error' ? 'var(--ui-danger)' : 'var(--ui-ink)',
    whiteSpace: 'nowrap',
    animation: (historySyncing || isSavingEdit || autoSaveStatus === 'saving')
      ? 'deskFloatPulse var(--motion-slow) ease-in-out infinite'
      : 'none'
  }
  const menuInputStyle = {
    flex: 1,
    padding: '7px 8px',
    borderRadius: 8,
    border: '1px solid var(--ui-border-strong)',
    background: 'var(--ui-surface)',
    color: 'var(--ui-ink)',
    fontSize: 13
  }
  const menuCompactInputStyle = {
    ...menuInputStyle,
    minWidth: 0,
    padding: '5px 7px',
    fontSize: 12
  }
  const menuSelectStyle = {
    width: '100%',
    borderRadius: 8,
    border: '1px solid var(--ui-border-strong)',
    padding: '5px 7px',
    fontSize: 12,
    background: 'var(--ui-surface)',
    color: 'var(--ui-ink)'
  }
  const menuPrimaryActionStyle = {
    padding: '7px 10px',
    borderRadius: 8,
    border: '1px solid var(--ui-primary-strong)',
    background: 'var(--ui-primary)',
    color: '#fff',
    fontSize: 12,
    whiteSpace: 'nowrap'
  }
  const menuSubtleActionStyle = {
    padding: '5px 8px',
    borderRadius: 8,
    border: '1px solid var(--ui-border)',
    background: 'var(--ui-surface)',
    color: 'var(--ui-ink)',
    fontSize: 12
  }
  const menuSuccessActionStyle = {
    border: '1px solid var(--ui-success)',
    borderRadius: 8,
    padding: '4px 8px',
    background: 'var(--ui-success)',
    color: '#fff',
    fontSize: 12
  }
  const menuDangerActionStyle = {
    border: '1px solid var(--ui-danger)',
    borderRadius: 8,
    padding: '4px 8px',
    background: 'var(--ui-danger)',
    color: '#fff',
    fontSize: 12
  }
  const menuNeutralActionStyle = {
    border: '1px solid var(--ui-border)',
    borderRadius: 8,
    padding: '4px 8px',
    background: 'var(--ui-surface-soft)',
    color: 'var(--ui-ink-muted)',
    fontSize: 12
  }
  const menuSectionDividerStyle = {
    borderTop: '1px solid var(--ui-border)',
    marginTop: 12,
    paddingTop: 10
  }
  const hasModalOpen = Boolean(
    pendingDeleteId ||
    deskNameDialog.isOpen ||
    deskMembersDialogOpen ||
    confirmDialog.isOpen ||
    deleteAccountDialog.isOpen
  )
  const {
    overlay: modalOverlayStyle,
    card: modalCardStyle,
    title: modalTitleStyle,
    actions: modalActionsStyle,
    secondaryButton: modalSecondaryButtonStyle,
    primaryButton: modalPrimaryButtonStyle,
    dangerButton: modalDangerButtonStyle
  } = modalStyles

  function addChecklistEditItem() {
    const text = newChecklistItemText.trim()
    if (!text) return

    setChecklistEditItems((prev) => [...prev, { text, is_checked: false, due_at: null }])
    setNewChecklistItemText('')
  }

  // Utility: wrap a promise with a timeout to prevent indefinite hangs
  async function withTimeout(promise, timeoutMs) {
    let timeoutId = null
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Query timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    })

    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  function normalizeChecklistReminderValue(value) {
    if (!value) return null
    const parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) return null
    return parsedDate.toISOString()
  }

  function toReminderInputValue(value) {
    if (!value) return ''
    const parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) return ''

    const year = parsedDate.getFullYear()
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
    const day = String(parsedDate.getDate()).padStart(2, '0')
    const hour = String(parsedDate.getHours()).padStart(2, '0')
    const minute = String(parsedDate.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day}T${hour}:${minute}`
  }

  function formatChecklistReminderValue(value) {
    if (!value) return ''
    const parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) return ''

    return parsedDate.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  function getChecklistReminderMeta(entry) {
    const normalizedDueAt = normalizeChecklistReminderValue(entry?.due_at)
    if (!normalizedDueAt || entry?.is_checked) return null

    const dueDate = new Date(normalizedDueAt)
    const diffMs = dueDate.getTime() - Date.now()
    const diffMinutes = Math.round(diffMs / 60000)

    if (diffMs <= 0) {
      return {
        label: `Overdue ${Math.abs(diffMinutes)}m`,
        color: '#8b0000',
        background: '#ffe5e5'
      }
    }

    if (diffMs <= 30 * 60 * 1000) {
      return {
        label: `Due in ${Math.max(1, diffMinutes)}m`,
        color: '#7a4a00',
        background: '#fff3d6'
      }
    }

    return {
      label: `Due ${formatChecklistReminderValue(normalizedDueAt)}`,
      color: '#0b4f86',
      background: '#e8f4ff'
    }
  }

  async function insertChecklistItemsWithReminderFallback(rows, options = {}) {
    if (!rows.length) {
      return options.includeSelect ? [] : null
    }

    let nextRows = rows

    while (true) {
      let query = supabase
        .from('checklist_items')
        .insert(nextRows)

      if (options.includeSelect) {
        query = query.select()
      }

      const { data, error } = await query

      if (!error) {
        return options.includeSelect ? (data || []) : null
      }

      if (isMissingColumnError(error, 'due_at')) {
        nextRows = nextRows.map((row) => {
          const nextRow = { ...row }
          delete nextRow.due_at
          return nextRow
        })
        continue
      }

      throw error
    }
  }

  function cloneNotesSnapshot(items) {
    if (typeof structuredClone === 'function') {
      return structuredClone(items)
    }
    return JSON.parse(JSON.stringify(items))
  }

  function areNoteSnapshotsEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right)
  }

  function hasActivePointerInteraction() {
    return Boolean(isDraggingRef.current || isResizingRef.current || isRotatingRef.current)
  }

  function flushDeferredRemoteNotes() {
    if (historySyncingRef.current || hasActivePointerInteraction()) return
    if (!deferredRemoteNotesRef.current) return

    const deferredNotes = deferredRemoteNotesRef.current
    deferredRemoteNotesRef.current = null
    skipNextHistoryRef.current = true
    setNotes(cloneNotesSnapshot(deferredNotes))
  }

  function setNotesFromRemote(nextNotes) {
    if (historySyncingRef.current || hasActivePointerInteraction()) {
      deferredRemoteNotesRef.current = cloneNotesSnapshot(nextNotes)
      return
    }

    skipNextHistoryRef.current = true
    setNotes(cloneNotesSnapshot(nextNotes))
  }

  function resetDeskHistory(baselineNotes = []) {
    historyPastRef.current = []
    historyFutureRef.current = []
    previousNotesSnapshotRef.current = cloneNotesSnapshot(baselineNotes)
    setHistoryVersion((prev) => prev + 1)
  }

  function closeItemEditor() {
    setIsSavingEdit(false)
    setEditSaveError('')
    setEditingId(null)
    setEditValue('')
    setChecklistEditItems([])
    setNewChecklistItemText('')
    setShowStyleEditor(false)
    setEditColor('#fff59d')
    setEditTextColor('#222222')
    setEditFontSize(16)
    setEditFontFamily('inherit')
  }

  function clearAutoSaveStatusTimeout() {
    if (!autoSaveStatusTimeoutRef.current) return
    clearTimeout(autoSaveStatusTimeoutRef.current)
    autoSaveStatusTimeoutRef.current = null
  }

  function markAutoSaveSaving() {
    clearAutoSaveStatusTimeout()
    setAutoSaveStatus('saving')
  }

  function markAutoSaveSaved() {
    clearAutoSaveStatusTimeout()
    setAutoSaveStatus('saved')
    autoSaveStatusTimeoutRef.current = setTimeout(() => {
      setAutoSaveStatus('idle')
      autoSaveStatusTimeoutRef.current = null
    }, 1800)
  }

  function markAutoSaveError(message = '') {
    clearAutoSaveStatusTimeout()
    setAutoSaveStatus('error')
    if (message) {
      setEditSaveError(message)
    }
  }

  const hasChecklistInCurrentNotes = useCallback((checklistId) => {
    if (!checklistId) return false
    return notesRef.current.some((row) => isChecklistItem(row) && row.id === checklistId)
  }, [])

  function isMissingTableError(error, tableName) {
    if (!error) return false
    if (error.code === '42P01') return true
    const searchable = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase()
    return searchable.includes('does not exist') && searchable.includes((tableName || '').toLowerCase())
  }

  function getActivityActionLabel(activity) {
    const details = activity?.details && typeof activity.details === 'object' ? activity.details : {}
    const actorLabel = activity?.actor_display || 'Someone'
    const actionType = activity?.action_type || 'updated'
    const itemType = activity?.item_type || 'item'
    const summary = typeof details.summary === 'string' ? details.summary.trim() : ''

    if (summary) return `${actorLabel} ${summary}`

    switch (actionType) {
      case 'created':
        return `${actorLabel} created a ${itemType}`
      case 'edited':
        return `${actorLabel} edited a ${itemType}`
      case 'deleted':
        return `${actorLabel} deleted a ${itemType}`
      case 'duplicated':
        return `${actorLabel} duplicated a ${itemType}`
      case 'checked':
        return `${actorLabel} checked off a ${itemType}`
      case 'unchecked':
        return `${actorLabel} unchecked a ${itemType}`
      case 'imported':
        return `${actorLabel} imported desk content`
      case 'exported':
        return `${actorLabel} exported this desk`
      default:
        return `${actorLabel} updated a ${itemType}`
    }
  }

  async function fetchDeskActivity(deskId = selectedDeskId) {
    if (!deskId) {
      setActivityFeed([])
      setActivityError('')
      return
    }

    setActivityLoading(true)

    try {
      const { data: rows, error } = await withTimeout(
        supabase
          .from('desk_activity')
          .select('*')
          .eq('desk_id', deskId)
          .order('created_at', { ascending: false })
          .limit(40),
        8000
      )

      if (error) throw error

      const actorIds = Array.from(new Set((rows || []).map((row) => row.actor_user_id).filter(Boolean)))
      let actorProfilesById = new Map()

      if (actorIds.length > 0) {
        const { data: actorProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, preferred_name')
          .in('id', actorIds)

        // Allow partial failure: if profile fetch fails, show activity feed without resolved names
        if (profileError) {
          console.warn('Failed to load activity feed actor profiles, using fallback labels:', profileError)
        } else if (actorProfiles) {
          actorProfilesById = new Map((actorProfiles || []).map((row) => [
            row.id,
            row.preferred_name?.trim() || row.email || 'Unknown user'
          ]))
        }
      }

      const hydratedRows = (rows || []).map((row) => ({
        ...row,
        actor_display: row.actor_user_id === user.id
          ? 'You'
          : (actorProfilesById.get(row.actor_user_id) || 'Unknown user')
      }))

      setActivityFeed(hydratedRows)
      setActivityError('')
    } catch (error) {
      if (isMissingTableError(error, 'desk_activity')) {
        setActivityFeed([])
        setActivityError('Run the backend SQL activity feed migration to enable this tab.')
      } else {
        console.error('Failed to fetch desk activity:', error)
        setActivityError(error?.message || 'Could not load activity feed.')
      }
    } finally {
      setActivityLoading(false)
    }
  }

  async function logDeskActivity({ actionType, itemType, itemId, summary = '', metadata = null }) {
    if (!selectedDeskId) return

    const details = {
      summary,
      ...(metadata && typeof metadata === 'object' ? metadata : {})
    }

    const payload = {
      desk_id: selectedDeskId,
      actor_user_id: user.id,
      action_type: actionType,
      item_type: itemType,
      item_id: itemId ? String(itemId) : null,
      details
    }

    const { error } = await supabase
      .from('desk_activity')
      .insert([payload])

    if (error) {
      if (isMissingTableError(error, 'desk_activity')) return
      console.error('Failed to log desk activity:', error)
      return
    }

    if (profileTab === 'activity') {
      await fetchDeskActivity(selectedDeskId)
    }
  }

  function getComparableChecklistItems(items = []) {
    return (items || []).map((entry, index) => ({
      text: (entry?.text || '').trim(),
      is_checked: Boolean(entry?.is_checked),
      sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : index,
      due_at: normalizeChecklistReminderValue(entry?.due_at)
    }))
  }

  function getComparableDeskItem(item) {
    if (!item) return null

    if (isChecklistItem(item)) {
      return {
        item_type: 'checklist',
        id: item.id,
        desk_id: item.desk_id,
        user_id: item.user_id || null,
        title: item.title || '',
        color: getItemColor(item),
        text_color: getItemTextColor(item),
        font_size: getItemFontSize(item),
        font_family: getItemFontFamily(item),
        x: Number(item.x) || 0,
        y: Number(item.y) || 0,
        rotation: toStoredRotation(Number(item.rotation) || 0),
        width: getItemWidth(item),
        height: getItemHeight(item),
        items: getComparableChecklistItems(item.items)
      }
    }

    if (isDecorationItem(item)) {
      return {
        item_type: 'decoration',
        id: item.id,
        desk_id: item.desk_id,
        kind: item.kind || 'pin',
        x: Number(item.x) || 0,
        y: Number(item.y) || 0,
        rotation: toStoredRotation(Number(item.rotation) || 0),
        width: getItemWidth(item),
        height: getItemHeight(item)
      }
    }

    return {
      item_type: 'note',
      id: item.id,
      desk_id: item.desk_id,
      user_id: item.user_id || null,
      content: item.content || '',
      color: getItemColor(item),
      text_color: getItemTextColor(item),
      font_size: getItemFontSize(item),
      font_family: getItemFontFamily(item),
      x: Number(item.x) || 0,
      y: Number(item.y) || 0,
      rotation: toStoredRotation(Number(item.rotation) || 0),
      width: getItemWidth(item),
      height: getItemHeight(item)
    }
  }

  function areComparableDeskItemsEqual(leftItem, rightItem) {
    return JSON.stringify(getComparableDeskItem(leftItem)) === JSON.stringify(getComparableDeskItem(rightItem))
  }

  function getPersistableDeskItem(item) {
    const comparable = getComparableDeskItem(item)
    if (!comparable || !comparable.id || !comparable.desk_id) return null

    if (comparable.item_type === 'checklist') {
      return {
        item_type: 'checklist',
        table: 'checklists',
        id: comparable.id,
        payload: {
          id: comparable.id,
          desk_id: comparable.desk_id,
          user_id: comparable.user_id || user.id,
          title: comparable.title,
          color: comparable.color,
          text_color: comparable.text_color,
          font_size: comparable.font_size,
          font_family: comparable.font_family,
          x: comparable.x,
          y: comparable.y,
          rotation: comparable.rotation,
          width: comparable.width,
          height: comparable.height
        },
        checklistItems: comparable.items || []
      }
    }

    if (comparable.item_type === 'decoration') {
      return {
        item_type: 'decoration',
        table: 'decorations',
        id: comparable.id,
        payload: {
          id: comparable.id,
          desk_id: comparable.desk_id,
          kind: comparable.kind,
          x: comparable.x,
          y: comparable.y,
          rotation: comparable.rotation,
          width: comparable.width,
          height: comparable.height
        }
      }
    }

    return {
      item_type: 'note',
      table: 'notes',
      id: comparable.id,
      payload: {
        id: comparable.id,
        desk_id: comparable.desk_id,
        user_id: comparable.user_id || user.id,
        content: comparable.content,
        color: comparable.color,
        text_color: comparable.text_color,
        font_size: comparable.font_size,
        font_family: comparable.font_family,
        x: comparable.x,
        y: comparable.y,
        rotation: comparable.rotation,
        width: comparable.width,
        height: comparable.height
      }
    }
  }

  async function upsertRowsWithSchemaFallback(table, rows) {
    if (!rows.length) return

    let nextRows = rows

    while (true) {
      const { error } = await supabase
        .from(table)
        .upsert(nextRows, { onConflict: 'id' })

      if (!error) return

      if (isMissingColumnError(error, 'user_id')) {
        nextRows = nextRows.map((row) => {
          const nextRow = { ...row }
          delete nextRow.user_id
          return nextRow
        })
        continue
      }

      if (isMissingColumnError(error, 'text_color')) {
        nextRows = nextRows.map((row) => {
          const nextRow = { ...row }
          delete nextRow.text_color
          return nextRow
        })
        continue
      }

      if (isMissingColumnError(error, 'font_size')) {
        nextRows = nextRows.map((row) => {
          const nextRow = { ...row }
          delete nextRow.font_size
          return nextRow
        })
        continue
      }

      throw error
    }
  }

  async function persistHistoryTransition(previousSnapshot, nextSnapshot) {
    if (!selectedDeskId) return

    const previousByKey = new Map((previousSnapshot || []).map((item) => [getItemKey(item), item]))
    const nextByKey = new Map((nextSnapshot || []).map((item) => [getItemKey(item), item]))
    const allKeys = new Set([...previousByKey.keys(), ...nextByKey.keys()])

    const deleteIdsByTable = {
      notes: [],
      checklists: [],
      decorations: []
    }
    const upsertRowsByTable = {
      notes: [],
      checklists: [],
      decorations: []
    }
    const checklistIdsNeedingItemSync = new Set()
    const checklistItemsByChecklistId = new Map()

    allKeys.forEach((itemKey) => {
      const previousItem = previousByKey.get(itemKey)
      const nextItem = nextByKey.get(itemKey)

      if (!previousItem && !nextItem) return

      if (previousItem && !nextItem) {
        const persistable = getPersistableDeskItem(previousItem)
        if (persistable?.table && persistable?.id) {
          deleteIdsByTable[persistable.table].push(persistable.id)
        }
        return
      }

      if (!previousItem && nextItem) {
        const persistable = getPersistableDeskItem(nextItem)
        if (persistable?.table && persistable?.payload) {
          upsertRowsByTable[persistable.table].push(persistable.payload)
          if (persistable.item_type === 'checklist') {
            checklistIdsNeedingItemSync.add(persistable.id)
            checklistItemsByChecklistId.set(persistable.id, persistable.checklistItems || [])
          }
        }
        return
      }

      if (previousItem && nextItem && !areComparableDeskItemsEqual(previousItem, nextItem)) {
        const persistable = getPersistableDeskItem(nextItem)
        if (persistable?.table && persistable?.payload) {
          upsertRowsByTable[persistable.table].push(persistable.payload)
          if (persistable.item_type === 'checklist') {
            checklistIdsNeedingItemSync.add(persistable.id)
            checklistItemsByChecklistId.set(persistable.id, persistable.checklistItems || [])
          }
        }
      }
    })

    for (const table of ['notes', 'checklists', 'decorations']) {
      const rowsToUpsert = upsertRowsByTable[table]
      if (rowsToUpsert.length > 0) {
        await upsertRowsWithSchemaFallback(table, rowsToUpsert)
      }
    }

    for (const checklistId of checklistIdsNeedingItemSync) {
      const { error: deleteItemsError } = await supabase
        .from('checklist_items')
        .delete()
        .eq('checklist_id', checklistId)

      if (deleteItemsError) throw deleteItemsError

      const nextItems = (checklistItemsByChecklistId.get(checklistId) || [])
        .map((entry, index) => ({
          checklist_id: checklistId,
          text: (entry?.text || '').trim(),
          is_checked: Boolean(entry?.is_checked),
          sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : index,
          due_at: normalizeChecklistReminderValue(entry?.due_at)
        }))
        .filter((entry) => entry.text.length > 0)

      if (nextItems.length > 0) {
        await insertChecklistItemsWithReminderFallback(nextItems)
      }
    }

    for (const table of ['decorations', 'notes', 'checklists']) {
      const idsToDelete = deleteIdsByTable[table]
      if (idsToDelete.length > 0) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('desk_id', selectedDeskId)
          .in('id', idsToDelete)

        if (error) throw error
      }
    }
  }

  async function undoNotesChange() {
    if (!canCurrentUserEditDeskItems) return
    if (historySyncingRef.current) {
      pendingHistoryActionRef.current = 'undo'
      return
    }

    const previousSnapshot = historyPastRef.current.pop()
    if (!previousSnapshot) return

    const currentSnapshot = cloneNotesSnapshot(notesRef.current)
    historyFutureRef.current.push(currentSnapshot)
    isApplyingHistoryRef.current = true
    previousNotesSnapshotRef.current = cloneNotesSnapshot(previousSnapshot)
    setNotes(cloneNotesSnapshot(previousSnapshot))
    closeItemEditor()
    setHistoryVersion((prev) => prev + 1)

    setHistorySyncing(true)
    try {
      await persistHistoryTransition(currentSnapshot, previousSnapshot)
    } catch (error) {
      console.error('Failed to persist undo operation:', error)
      setEditSaveError(error?.message || 'Undo failed to sync. Reverting local changes.')

      historyFutureRef.current.pop()
      historyPastRef.current.push(cloneNotesSnapshot(previousSnapshot))
      isApplyingHistoryRef.current = true
      previousNotesSnapshotRef.current = cloneNotesSnapshot(currentSnapshot)
      setNotes(cloneNotesSnapshot(currentSnapshot))
      setHistoryVersion((prev) => prev + 1)
    } finally {
      setHistorySyncing(false)
    }
  }

  async function redoNotesChange() {
    if (!canCurrentUserEditDeskItems) return
    if (historySyncingRef.current) {
      pendingHistoryActionRef.current = 'redo'
      return
    }

    const nextSnapshot = historyFutureRef.current.pop()
    if (!nextSnapshot) return

    const currentSnapshot = cloneNotesSnapshot(notesRef.current)
    historyPastRef.current.push(currentSnapshot)
    isApplyingHistoryRef.current = true
    previousNotesSnapshotRef.current = cloneNotesSnapshot(nextSnapshot)
    setNotes(cloneNotesSnapshot(nextSnapshot))
    closeItemEditor()
    setHistoryVersion((prev) => prev + 1)

    setHistorySyncing(true)
    try {
      await persistHistoryTransition(currentSnapshot, nextSnapshot)
    } catch (error) {
      console.error('Failed to persist redo operation:', error)
      setEditSaveError(error?.message || 'Redo failed to sync. Reverting local changes.')

      historyPastRef.current.pop()
      historyFutureRef.current.push(cloneNotesSnapshot(nextSnapshot))
      isApplyingHistoryRef.current = true
      previousNotesSnapshotRef.current = cloneNotesSnapshot(currentSnapshot)
      setNotes(cloneNotesSnapshot(currentSnapshot))
      setHistoryVersion((prev) => prev + 1)
    } finally {
      setHistorySyncing(false)
    }
  }

  async function forceSaveAndClearHistory() {
    if (!selectedDeskId) return
    if (!canCurrentUserEditDeskItems) return
    if (hasModalOpen) return
    if (historySyncingRef.current || forceSaveInProgress) return

    setForceSaveInProgress(true)
    markAutoSaveSaving()

    try {
      const localSnapshot = cloneNotesSnapshot(notesRef.current)

      const [
        { data: remoteNotes, error: remoteNotesError },
        { data: remoteChecklists, error: remoteChecklistsError },
        { data: remoteDecorations, error: remoteDecorationsError }
      ] = await Promise.all([
        supabase.from('notes').select('*').eq('desk_id', selectedDeskId),
        supabase.from('checklists').select('*').eq('desk_id', selectedDeskId),
        supabase.from('decorations').select('*').eq('desk_id', selectedDeskId)
      ])

      if (remoteNotesError) throw remoteNotesError
      if (remoteChecklistsError) throw remoteChecklistsError
      if (remoteDecorationsError) throw remoteDecorationsError

      const checklistRows = remoteChecklists || []
      const checklistIds = checklistRows.map((row) => row.id)
      let checklistItemsMap = new Map()

      if (checklistIds.length > 0) {
        const { data: remoteChecklistItems, error: remoteChecklistItemsError } = await supabase
          .from('checklist_items')
          .select('*')
          .in('checklist_id', checklistIds)
          .order('sort_order', { ascending: true })

        if (remoteChecklistItemsError) throw remoteChecklistItemsError

        checklistItemsMap = (remoteChecklistItems || []).reduce((acc, entry) => {
          const existing = acc.get(entry.checklist_id) || []
          existing.push(entry)
          acc.set(entry.checklist_id, existing)
          return acc
        }, new Map())
      }

      const remoteSnapshot = [
        ...(remoteNotes || []).map((row) => ({ ...row, item_type: 'note' })),
        ...checklistRows.map((row) => ({
          ...row,
          item_type: 'checklist',
          items: checklistItemsMap.get(row.id) || []
        })),
        ...(remoteDecorations || []).map((row) => ({ ...row, item_type: 'decoration' }))
      ]

      await persistHistoryTransition(remoteSnapshot, localSnapshot)
      resetDeskHistory(localSnapshot)
      pendingHistoryActionRef.current = null
      markAutoSaveSaved()
    } catch (error) {
      console.error('Force save failed:', error)
      markAutoSaveError(error?.message || 'Force save failed. Please try again.')
    } finally {
      setForceSaveInProgress(false)
    }
  }

  function getDeskGroupLabel(desk) {
    if (!desk) return 'Private'
    if (desk.user_id !== user.id) return 'Shared'
    return isDeskCollaborative(desk) ? 'Sharing' : 'Private'
  }

  function getDeskDefaultShelfId(desk) {
    if (!desk) return '__private'
    if (desk.user_id !== user.id) return '__shared'
    return isDeskCollaborative(desk) ? '__sharing' : '__private'
  }

  function getDeskAssignedCustomShelfId(deskId) {
    const assignment = deskShelfAssignments[String(deskId)]
    if (!assignment) return ''
    return deskShelves.some((shelf) => shelf.id === assignment) ? assignment : ''
  }

  function getDeskEffectiveShelfId(desk) {
    const customAssignment = getDeskAssignedCustomShelfId(desk.id)
    if (customAssignment) return customAssignment
    return getDeskDefaultShelfId(desk)
  }

  function getChildDeskShelves(parentId) {
    const normalizedParent = parentId || null
    return deskShelves
      .filter((shelf) => (shelf.parent_id || null) === normalizedParent)
      .sort((left, right) => left.name.localeCompare(right.name))
  }

  function getCustomShelfOptions(parentId = '', depth = 0) {
    const children = getChildDeskShelves(parentId)
    return children.flatMap((shelf) => [
      { id: shelf.id, name: shelf.name, depth },
      ...getCustomShelfOptions(shelf.id, depth + 1)
    ])
  }

  function toggleDeskShelfExpanded(shelfId) {
    setExpandedDeskShelves((prev) => ({ ...prev, [shelfId]: !prev[shelfId] }))
  }

  function createDeskShelf() {
    const name = newShelfNameInput.trim()
    if (!name) {
      setShelfActionError('Shelf name is required.')
      return
    }

    if (newShelfParentId && !deskShelves.some((shelf) => shelf.id === newShelfParentId)) {
      setShelfActionError('Selected parent shelf no longer exists.')
      return
    }

    const siblingNameExists = deskShelves.some((shelf) =>
      (shelf.parent_id || null) === (newShelfParentId || null)
      && shelf.name.trim().toLowerCase() === name.toLowerCase()
    )
    if (siblingNameExists) {
      setShelfActionError('A shelf with that name already exists at this level.')
      return
    }

    const nextShelf = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
      name,
      parent_id: newShelfParentId || null
    }

    setDeskShelves((prev) => [...prev, nextShelf])
    setExpandedDeskShelves((prev) => ({ ...prev, [nextShelf.id]: true, __custom_root: true }))
    setNewShelfNameInput('')
    setNewShelfParentId('')
    setShelfActionError('')
  }

  function setSelectedDeskCustomShelf(shelfId) {
    if (!selectedDeskId) return

    setDeskShelfAssignments((prev) => {
      const nextAssignments = { ...prev }
      if (!shelfId) {
        delete nextAssignments[String(selectedDeskId)]
      } else {
        nextAssignments[String(selectedDeskId)] = shelfId
      }
      return nextAssignments
    })
    setShelfActionError('')
  }

  function renameDeskShelf(shelfId) {
    const currentShelf = deskShelves.find((shelf) => shelf.id === shelfId)
    if (!currentShelf) return

    const nextNameInput = window.prompt('Rename shelf', currentShelf.name)
    if (nextNameInput === null) return

    const nextName = nextNameInput.trim()
    if (!nextName) {
      setShelfActionError('Shelf name is required.')
      return
    }

    const siblingNameExists = deskShelves.some((shelf) =>
      shelf.id !== shelfId
      && (shelf.parent_id || null) === (currentShelf.parent_id || null)
      && shelf.name.trim().toLowerCase() === nextName.toLowerCase()
    )
    if (siblingNameExists) {
      setShelfActionError('A sibling shelf already uses that name.')
      return
    }

    setDeskShelves((prev) => prev.map((shelf) => (
      shelf.id === shelfId ? { ...shelf, name: nextName } : shelf
    )))
    setShelfActionError('')
  }

  function deleteDeskShelf(shelfId) {
    const currentShelf = deskShelves.find((shelf) => shelf.id === shelfId)
    if (!currentShelf) return

    const childShelfCount = deskShelves.filter((shelf) => (shelf.parent_id || null) === shelfId).length
    const assignedDeskCount = Object.values(deskShelfAssignments).filter((assignedShelfId) => assignedShelfId === shelfId).length

    openConfirmDialog({
      title: 'Delete Shelf',
      message: `Delete "${currentShelf.name}"? ${childShelfCount > 0 ? `${childShelfCount} child shelf(s) will move up. ` : ''}${assignedDeskCount > 0 ? `${assignedDeskCount} desk assignment(s) will be moved safely.` : ''}`,
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        const parentShelfId = currentShelf.parent_id || null

        setDeskShelves((prev) =>
          prev
            .filter((shelf) => shelf.id !== shelfId)
            .map((shelf) => (
              (shelf.parent_id || null) === shelfId
                ? { ...shelf, parent_id: parentShelfId }
                : shelf
            ))
        )

        setDeskShelfAssignments((prev) => {
          const nextAssignments = { ...prev }
          Object.entries(nextAssignments).forEach(([deskId, assignedShelfId]) => {
            if (assignedShelfId !== shelfId) return
            if (parentShelfId) {
              nextAssignments[deskId] = parentShelfId
            } else {
              delete nextAssignments[deskId]
            }
          })
          return nextAssignments
        })

        setExpandedDeskShelves((prev) => {
          const nextExpanded = { ...prev }
          delete nextExpanded[shelfId]
          return nextExpanded
        })

        setShelfActionError('')
      }
    })
  }

  async function syncDeskShelfPrefsToSupabase(shelvesSnapshot, assignmentsSnapshot) {
    if (!shelfSupabaseSyncEnabledRef.current) return

    const sanitizedShelves = shelvesSnapshot
      .filter((shelf) => shelf && typeof shelf.id === 'string' && typeof shelf.name === 'string')
      .map((shelf) => ({
        id: shelf.id,
        user_id: user.id,
        name: shelf.name,
        parent_id: shelf.parent_id || null
      }))

    const validShelfIds = new Set(sanitizedShelves.map((shelf) => shelf.id))
    const sanitizedAssignments = Object.entries(assignmentsSnapshot)
      .filter(([deskId, shelfId]) => typeof deskId === 'string' && typeof shelfId === 'string' && validShelfIds.has(shelfId))
      .map(([deskId, shelfId]) => ({ desk_id: deskId, shelf_id: shelfId, user_id: user.id }))

    const [existingShelvesResult, existingAssignmentsResult] = await Promise.all([
      supabase.from('desk_shelves').select('id').eq('user_id', user.id),
      supabase.from('desk_shelf_assignments').select('desk_id').eq('user_id', user.id)
    ])

    if (existingShelvesResult.error) throw existingShelvesResult.error
    if (existingAssignmentsResult.error) throw existingAssignmentsResult.error

    const existingShelfIds = new Set((existingShelvesResult.data || []).map((row) => row.id))
    const nextShelfIds = new Set(sanitizedShelves.map((shelf) => shelf.id))

    const shelvesToDelete = [...existingShelfIds].filter((shelfId) => !nextShelfIds.has(shelfId))

    if (sanitizedShelves.length > 0) {
      const { error: upsertShelvesError } = await supabase
        .from('desk_shelves')
        .upsert(sanitizedShelves, { onConflict: 'id' })
      if (upsertShelvesError) throw upsertShelvesError
    } else if (existingShelfIds.size > 0) {
      const { error: clearShelvesError } = await supabase
        .from('desk_shelves')
        .delete()
        .eq('user_id', user.id)
      if (clearShelvesError) throw clearShelvesError
    }

    if (shelvesToDelete.length > 0) {
      const { error: deleteShelvesError } = await supabase
        .from('desk_shelves')
        .delete()
        .eq('user_id', user.id)
        .in('id', shelvesToDelete)
      if (deleteShelvesError) throw deleteShelvesError
    }

    const existingAssignmentDeskIds = new Set((existingAssignmentsResult.data || []).map((row) => String(row.desk_id)))
    const nextAssignmentDeskIds = new Set(sanitizedAssignments.map((row) => String(row.desk_id)))
    const assignmentsToDelete = [...existingAssignmentDeskIds].filter((deskId) => !nextAssignmentDeskIds.has(deskId))

    if (sanitizedAssignments.length > 0) {
      const { error: upsertAssignmentsError } = await supabase
        .from('desk_shelf_assignments')
        .upsert(sanitizedAssignments, { onConflict: 'user_id,desk_id' })
      if (upsertAssignmentsError) throw upsertAssignmentsError
    }

    if (assignmentsToDelete.length > 0) {
      const { error: deleteAssignmentsError } = await supabase
        .from('desk_shelf_assignments')
        .delete()
        .eq('user_id', user.id)
        .in('desk_id', assignmentsToDelete)
      if (deleteAssignmentsError) throw deleteAssignmentsError
    }
  }

  const runFetchDesksEffect = useEffectEvent(() => {
    void fetchDesks()
  })

  const runSyncDeskShelfPrefsEffect = useEffectEvent(async (shelvesSnapshot, assignmentsSnapshot) => {
    await syncDeskShelfPrefsToSupabase(shelvesSnapshot, assignmentsSnapshot)
  })

  const runFetchFriendsEffect = useEffectEvent(() => {
    void fetchFriends()
  })

  const runFetchUserStatsEffect = useEffectEvent(() => {
    void fetchUserStats()
  })

  const runFetchDeskItemsEffect = useEffectEvent((deskId) => {
    void fetchDeskItems(deskId)
  })

  const runFetchDeskActivityEffect = useEffectEvent((deskId) => {
    void fetchDeskActivity(deskId)
  })

  const runResetDeskHistoryEffect = useEffectEvent((baselineNotes = []) => {
    resetDeskHistory(baselineNotes)
  })

  const runUndoNotesEffect = useEffectEvent(() => {
    void undoNotesChange()
  })

  const runRedoNotesEffect = useEffectEvent(() => {
    void redoNotesChange()
  })

  const runCloseConfirmDialogEffect = useEffectEvent(() => {
    closeConfirmDialog()
  })

  // Intentionally keyed to authenticated user identity changes.
  useEffect(() => {
    runFetchDesksEffect()
  }, [user.id])

  // Intentionally keyed to authenticated user identity changes.
  useEffect(() => {
    const channel = supabase
      .channel(deskMembersLiveChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'desk_members',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          runFetchDesksEffect()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [deskMembersLiveChannelName, user.id])

  useEffect(() => {
    if (shelfSyncTimeoutRef.current) {
      clearTimeout(shelfSyncTimeoutRef.current)
      shelfSyncTimeoutRef.current = null
    }

    setShelfPrefsHydrated(false)
    let isCancelled = false

    const defaultExpanded = { __private: true, __shared: true, __sharing: true, __custom_root: true }

    const loadFromLocalStorage = () => {
      try {
        const rawValue = localStorage.getItem(shelfPrefsStorageKey)
        if (!rawValue) {
          return {
            shelves: [],
            assignments: {},
            expanded: defaultExpanded
          }
        }

        const parsed = JSON.parse(rawValue)
        const parsedShelves = Array.isArray(parsed?.shelves)
          ? parsed.shelves.filter((shelf) => shelf && typeof shelf.id === 'string' && typeof shelf.name === 'string')
          : []
        const parsedAssignments = parsed?.assignments && typeof parsed.assignments === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.assignments).filter((entry) => {
                const [deskId, shelfId] = entry
                return typeof deskId === 'string' && typeof shelfId === 'string'
              })
            )
          : {}
        const parsedExpanded = parsed?.expanded && typeof parsed.expanded === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.expanded).filter((entry) => {
                const [shelfId, expanded] = entry
                return typeof shelfId === 'string' && typeof expanded === 'boolean'
              })
            )
          : {}

        return {
          shelves: parsedShelves,
          assignments: parsedAssignments,
          expanded: { ...defaultExpanded, ...parsedExpanded }
        }
      } catch (error) {
        console.error('Failed to load local desk shelf preferences:', error)
        return {
          shelves: [],
          assignments: {},
          expanded: defaultExpanded
        }
      }
    }

    const applyLoadedState = (loadedState) => {
      if (isCancelled) return
      setDeskShelves(loadedState.shelves)
      setDeskShelfAssignments(loadedState.assignments)
      setExpandedDeskShelves(loadedState.expanded)
      setShelfPrefsHydrated(true)
    }

    async function loadShelfPrefs() {
      const localState = loadFromLocalStorage()

      if (!shelfSupabaseSyncEnabledRef.current) {
        applyLoadedState(localState)
        return
      }

      try {
        const [shelvesResult, assignmentsResult] = await Promise.all([
          supabase
            .from('desk_shelves')
            .select('id, name, parent_id')
            .eq('user_id', user.id),
          supabase
            .from('desk_shelf_assignments')
            .select('desk_id, shelf_id')
            .eq('user_id', user.id)
        ])

        if (shelvesResult.error) throw shelvesResult.error
        if (assignmentsResult.error) throw assignmentsResult.error

        const supabaseShelves = (shelvesResult.data || [])
          .filter((shelf) => shelf && typeof shelf.id === 'string' && typeof shelf.name === 'string')
          .map((shelf) => ({ id: shelf.id, name: shelf.name, parent_id: shelf.parent_id || null }))

        const validShelfIds = new Set(supabaseShelves.map((shelf) => shelf.id))
        const supabaseAssignments = Object.fromEntries(
          (assignmentsResult.data || [])
            .filter((row) => {
              const deskId = String(row?.desk_id || '')
              const shelfId = typeof row?.shelf_id === 'string' ? row.shelf_id : ''
              return deskId.length > 0 && validShelfIds.has(shelfId)
            })
            .map((row) => [String(row.desk_id), row.shelf_id])
        )

        applyLoadedState({
          shelves: supabaseShelves,
          assignments: supabaseAssignments,
          expanded: localState.expanded
        })
      } catch (error) {
        if (isMissingShelfStorageTableError(error)) {
          shelfSupabaseSyncEnabledRef.current = false
        } else {
          console.error('Failed loading desk shelves from Supabase, using local fallback:', error)
        }
        applyLoadedState(localState)
      }
    }

    loadShelfPrefs()

    return () => {
      isCancelled = true
      if (shelfSyncTimeoutRef.current) {
        clearTimeout(shelfSyncTimeoutRef.current)
        shelfSyncTimeoutRef.current = null
      }
    }
  }, [shelfPrefsStorageKey, user.id])

  // Intentionally re-evaluated when hydrated shelf snapshots change.
  useEffect(() => {
    if (!shelfPrefsHydrated) return
    try {
      localStorage.setItem(
        shelfPrefsStorageKey,
        JSON.stringify({
          shelves: deskShelves,
          assignments: deskShelfAssignments,
          expanded: expandedDeskShelves
        })
      )
    } catch (error) {
      console.error('Failed to persist desk shelf preferences:', error)
    }

    if (!shelfSupabaseSyncEnabledRef.current) return

    if (shelfSyncTimeoutRef.current) {
      clearTimeout(shelfSyncTimeoutRef.current)
      shelfSyncTimeoutRef.current = null
    }

    const shelvesSnapshot = [...deskShelves]
    const assignmentsSnapshot = { ...deskShelfAssignments }

    shelfSyncTimeoutRef.current = setTimeout(async () => {
      try {
        await runSyncDeskShelfPrefsEffect(shelvesSnapshot, assignmentsSnapshot)
      } catch (error) {
        if (isMissingShelfStorageTableError(error)) {
          shelfSupabaseSyncEnabledRef.current = false
          return
        }
        console.error('Failed to sync desk shelf preferences to Supabase:', error)
      }
    }, 250)

    return () => {
      if (shelfSyncTimeoutRef.current) {
        clearTimeout(shelfSyncTimeoutRef.current)
        shelfSyncTimeoutRef.current = null
      }
    }
  }, [shelfPrefsHydrated, shelfPrefsStorageKey, deskShelves, deskShelfAssignments, expandedDeskShelves])

  useEffect(() => {
    if (!shelfPrefsHydrated) return
    if (desks.length === 0) return

    const validDeskIds = new Set(desks.map((desk) => String(desk.id)))
    const validShelfIds = new Set(deskShelves.map((shelf) => shelf.id))

    setDeskShelfAssignments((prev) => {
      const nextEntries = Object.entries(prev).filter(([deskId, shelfId]) => validDeskIds.has(deskId) && validShelfIds.has(shelfId))
      const didChange = nextEntries.length !== Object.keys(prev).length
      return didChange ? Object.fromEntries(nextEntries) : prev
    })
  }, [shelfPrefsHydrated, desks, deskShelves])

  // Intentionally keyed to authenticated user identity changes.
  useEffect(() => {
    runFetchFriendsEffect()
  }, [user.id])

  // Intentionally keyed to authenticated user identity changes.
  useEffect(() => {
    runFetchUserStatsEffect()
  }, [user.id])

  // Intentionally keyed to selected desk switches.
  useEffect(() => {
    if (!selectedDeskId) {
      setSelectedDeskMemberRole('owner')
      setSelectedDeskMemberRoleLoading(false)
      setNotesFromRemote([])
      setActivityFeed([])
      setActivityError('')
      return
    }

    runResetDeskHistoryEffect([])
    runFetchDeskItemsEffect(selectedDeskId)
    runFetchDeskActivityEffect(selectedDeskId)
  }, [selectedDeskId])

  useEffect(() => {
    if (!selectedDeskId) {
      setSelectedDeskMemberRole('owner')
      setSelectedDeskMemberRoleLoading(false)
      return
    }

    const desk = desks.find((entry) => entry.id === selectedDeskId)
    if (!desk) {
      setSelectedDeskMemberRole('viewer')
      setSelectedDeskMemberRoleLoading(false)
      return
    }

    if (desk.user_id === user.id) {
      setSelectedDeskMemberRole('owner')
      setSelectedDeskMemberRoleLoading(false)
      return
    }

    let isCancelled = false
    setSelectedDeskMemberRoleLoading(true)

    async function loadSelectedDeskMemberRole() {
      try {
        const { data, error } = await supabase
          .from('desk_members')
          .select('role')
          .eq('desk_id', selectedDeskId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) {
          if (isMissingColumnError(error, 'role')) {
            if (!isCancelled) setSelectedDeskMemberRole('editor')
            return
          }
          throw error
        }

        if (!isCancelled) {
          setSelectedDeskMemberRole(data?.role === 'viewer' ? 'viewer' : 'editor')
        }
      } catch (error) {
        console.error('Failed to fetch selected desk member role:', error)
        if (!isCancelled) {
          setSelectedDeskMemberRole('viewer')
        }
      } finally {
        if (!isCancelled) {
          setSelectedDeskMemberRoleLoading(false)
        }
      }
    }

    loadSelectedDeskMemberRole()

    return () => {
      isCancelled = true
    }
  }, [selectedDeskId, user.id, desks])

  // Intentionally keyed to realtime identity/scope changes.
  useEffect(() => {
    if (!selectedDeskId) return

    let itemRefreshTimeoutId = null
    let deskRefreshTimeoutId = null

    const scheduleDeskItemRefresh = () => {
      if (itemRefreshTimeoutId) {
        clearTimeout(itemRefreshTimeoutId)
      }

      itemRefreshTimeoutId = setTimeout(() => {
        itemRefreshTimeoutId = null
        runFetchDeskItemsEffect(selectedDeskId)
      }, 140)
    }

    const scheduleDeskListRefresh = () => {
      if (deskRefreshTimeoutId) {
        clearTimeout(deskRefreshTimeoutId)
      }

      deskRefreshTimeoutId = setTimeout(() => {
        deskRefreshTimeoutId = null
        runFetchDesksEffect()
      }, 140)
    }

    const channel = supabase
      .channel(deskLiveChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `desk_id=eq.${selectedDeskId}`
        },
        () => {
          scheduleDeskItemRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklists',
          filter: `desk_id=eq.${selectedDeskId}`
        },
        () => {
          scheduleDeskItemRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'decorations',
          filter: `desk_id=eq.${selectedDeskId}`
        },
        () => {
          scheduleDeskItemRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_items'
        },
        (payload) => {
          const checklistId = payload?.new?.checklist_id || payload?.old?.checklist_id || null
          if (!hasChecklistInCurrentNotes(checklistId)) return
          scheduleDeskItemRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'desks',
          filter: `id=eq.${selectedDeskId}`
        },
        () => {
          scheduleDeskListRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'desk_members',
          filter: `desk_id=eq.${selectedDeskId}`
        },
        () => {
          scheduleDeskListRefresh()
          scheduleDeskItemRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'desk_activity',
          filter: `desk_id=eq.${selectedDeskId}`
        },
        () => {
          if (profileTab === 'activity') {
            runFetchDeskActivityEffect(selectedDeskId)
          }
        }
      )
      .subscribe()

    return () => {
      if (itemRefreshTimeoutId) {
        clearTimeout(itemRefreshTimeoutId)
      }
      if (deskRefreshTimeoutId) {
        clearTimeout(deskRefreshTimeoutId)
      }
      supabase.removeChannel(channel)
    }
  }, [deskLiveChannelName, hasChecklistInCurrentNotes, profileTab, selectedDeskId, user.id])

  useEffect(() => {
    if (!selectedDeskId) return
    localStorage.setItem(lastDeskStorageKey, String(selectedDeskId))
  }, [lastDeskStorageKey, selectedDeskId])

  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(snapPrefsStorageKey)
      if (storedValue === '1') {
        setSnapToGrid(true)
      } else if (storedValue === '0') {
        setSnapToGrid(false)
      } else {
        setSnapToGrid(false)
      }
    } catch (error) {
      console.error('Failed to load snap-to-grid preference:', error)
      setSnapToGrid(false)
    }
  }, [snapPrefsStorageKey])

  useEffect(() => {
    try {
      localStorage.setItem(snapPrefsStorageKey, snapToGrid ? '1' : '0')
    } catch (error) {
      console.error('Failed to save snap-to-grid preference:', error)
    }
  }, [snapPrefsStorageKey, snapToGrid])

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    historySyncingRef.current = historySyncing
    if (!historySyncing) {
      const pendingAction = pendingHistoryActionRef.current
      pendingHistoryActionRef.current = null
      if (pendingAction === 'undo') {
        void undoNotesChange()
        return
      }
      if (pendingAction === 'redo') {
        void redoNotesChange()
        return
      }
      flushDeferredRemoteNotes()
    }
  }, [historySyncing])

  useEffect(() => {
    return () => {
      clearAutoSaveStatusTimeout()
      if (shelfSyncTimeoutRef.current) {
        clearTimeout(shelfSyncTimeoutRef.current)
        shelfSyncTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const currentSnapshot = cloneNotesSnapshot(notes)

    if (skipNextHistoryRef.current) {
      skipNextHistoryRef.current = false
      previousNotesSnapshotRef.current = currentSnapshot
      return
    }

    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false
      previousNotesSnapshotRef.current = currentSnapshot
      return
    }

    // Pointer interactions emit many move updates; record one history step on release.
    if (hasActivePointerInteraction()) {
      return
    }

    const previousSnapshot = previousNotesSnapshotRef.current
    if (areNoteSnapshotsEqual(previousSnapshot, currentSnapshot)) {
      return
    }

    historyPastRef.current.push(cloneNotesSnapshot(previousSnapshot))
    if (historyPastRef.current.length > 60) {
      historyPastRef.current.shift()
    }
    historyFutureRef.current = []
    previousNotesSnapshotRef.current = currentSnapshot
    setHistoryVersion((prev) => prev + 1)
  }, [notes])

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
          runRedoNotesEffect()
        } else {
          runUndoNotesEffect()
        }
        return
      }

      if (normalizedKey === 'y') {
        e.preventDefault()
        runRedoNotesEffect()
      }
    }

    window.addEventListener('keydown', handleHistoryKeyDown)
    return () => window.removeEventListener('keydown', handleHistoryKeyDown)
  }, [hasModalOpen])

  useEffect(() => {
    function handleCommandPaletteShortcut(e) {
      const isShortcutPressed = e.ctrlKey || e.metaKey
      if (!isShortcutPressed) return

      const normalizedKey = (e.key || '').toLowerCase()
      if (normalizedKey !== 'k') return

      e.preventDefault()
      if (showCommandPalette) {
        setShowCommandPalette(false)
        setCommandPaletteQuery('')
        setCommandPaletteActiveIndex(0)
      } else {
        if (hasModalOpen) return
        setShowCommandPalette(true)
        setCommandPaletteQuery('')
        setCommandPaletteActiveIndex(0)
        setShowDeskMenu(false)
        setShowProfileMenu(false)
        setShowNewNoteMenu(false)
      }
    }

    window.addEventListener('keydown', handleCommandPaletteShortcut)
    return () => window.removeEventListener('keydown', handleCommandPaletteShortcut)
  }, [hasModalOpen, showCommandPalette])

  useEffect(() => {
    if (!showCommandPalette) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimeout = setTimeout(() => {
      commandPaletteInputRef.current?.focus()
      commandPaletteInputRef.current?.select()
    }, 0)

    return () => {
      clearTimeout(focusTimeout)
      document.body.style.overflow = previousOverflow
    }
  }, [showCommandPalette])

  const sortedDesks = useMemo(() => [...desks].sort((left, right) => getDeskNameValue(left).localeCompare(getDeskNameValue(right))), [desks])
  const currentDesk = desks.find((desk) => desk.id === selectedDeskId) || null
  const isMobileLayout = viewportWidth <= 820
  const isCompactMobileLayout = viewportWidth <= 560
  const isCurrentDeskOwner = Boolean(currentDesk && currentDesk.user_id === user.id)
  const canCurrentUserEditDeskItems = Boolean(
    currentDesk
    && (
      currentDesk.user_id === user.id
      || (!selectedDeskMemberRoleLoading && selectedDeskMemberRole === 'editor')
    )
  )
  const isCurrentUserViewer = Boolean(
    currentDesk
    && currentDesk.user_id !== user.id
    && !selectedDeskMemberRoleLoading
    && selectedDeskMemberRole === 'viewer'
  )
  const pendingFriendRequestCount = incomingFriendRequests.length
  const totalItemsCount = notes.length
  const joinDate = formatDate(user.created_at)
  const desksByShelfId = sortedDesks.reduce((accumulator, desk) => {
    const shelfId = getDeskEffectiveShelfId(desk)
    if (!accumulator[shelfId]) accumulator[shelfId] = []
    accumulator[shelfId].push(desk)
    return accumulator
  }, {})
  const customShelfOptions = getCustomShelfOptions()
  const topOverlayTop = isMobileLayout ? 12 : 20
  const topMenuTop = isMobileLayout ? (isCompactMobileLayout ? 64 : 12) : 20
  const newNoteDesktopTop = topMenuTop
  const mobileNoteMaxWidth = Math.max(180, viewportWidth - 32)

  const commandPaletteActions = useMemo(() => {
    const canEditCurrentDesk = Boolean(selectedDeskId && canCurrentUserEditDeskItems)

    const quickActions = [
      {
        id: 'open-desk-menu',
        label: 'Open Desk Menu',
        description: 'Manage desks, shelves, import/export, and backgrounds.',
        keywords: 'menu desk shelves import export background',
        disabled: false,
        run: () => {
          setShowDeskMenu(true)
          setShowProfileMenu(false)
          setShowNewNoteMenu(false)
        }
      },
      {
        id: 'open-profile-menu',
        label: 'Open Profile Panel',
        description: 'View profile, friends, and desk activity.',
        keywords: 'profile friends activity',
        disabled: false,
        run: () => {
          setShowProfileMenu(true)
          setShowDeskMenu(false)
          setShowNewNoteMenu(false)
          fetchCurrentUserProfile()
          if (selectedDeskId) {
            fetchDeskActivity(selectedDeskId)
          }
        }
      },
      {
        id: 'create-sticky-note',
        label: 'Create Sticky Note',
        description: 'Add a new sticky note to the selected desk.',
        keywords: 'create note sticky add',
        disabled: !canEditCurrentDesk,
        run: () => {
          void addStickyNote()
        }
      },
      {
        id: 'create-checklist',
        label: 'Create Checklist',
        description: 'Add a new checklist to the selected desk.',
        keywords: 'create checklist add task',
        disabled: !canEditCurrentDesk,
        run: () => {
          void addChecklistNote()
        }
      },
      {
        id: 'add-decoration',
        label: `Add ${DECORATION_OPTIONS[0]?.label || 'Decoration'}`,
        description: 'Place a decoration on the selected desk.',
        keywords: 'add decoration style',
        disabled: !canEditCurrentDesk,
        run: () => {
          void addDecoration(DECORATION_OPTIONS[0]?.key || 'mug')
        }
      },
      {
        id: 'toggle-snap-grid',
        label: snapToGrid ? 'Turn Snap To Grid Off' : 'Turn Snap To Grid On',
        description: 'Toggle movement snapping to a 20px grid.',
        keywords: 'snap grid toggle',
        disabled: !canEditCurrentDesk,
        run: () => {
          setSnapToGrid((prev) => !prev)
        }
      },
      {
        id: 'force-save',
        label: 'Force Save Desk',
        description: 'Sync desk now and reset undo/redo baseline.',
        keywords: 'save sync force',
        disabled: !canEditCurrentDesk || forceSaveInProgress || historySyncing,
        run: () => {
          void forceSaveAndClearHistory()
        }
      },
      {
        id: 'undo',
        label: 'Undo',
        description: 'Undo the latest change.',
        keywords: 'undo history',
        disabled: !canUndo || hasModalOpen || !canCurrentUserEditDeskItems,
        run: () => {
          void undoNotesChange()
        }
      },
      {
        id: 'redo',
        label: 'Redo',
        description: 'Redo the latest undone change.',
        keywords: 'redo history',
        disabled: !canRedo || hasModalOpen || !canCurrentUserEditDeskItems,
        run: () => {
          void redoNotesChange()
        }
      }
    ]

    const deskActions = sortedDesks.map((desk) => ({
      id: `switch-desk:${desk.id}`,
      label: `Switch to ${getDeskNameValue(desk)}`,
      description: desk.id === selectedDeskId ? 'Current desk' : 'Open this desk now.',
      keywords: `switch desk ${getDeskNameValue(desk)}`,
      disabled: desk.id === selectedDeskId,
      run: () => {
        handleSelectDesk(desk)
      }
    }))

    return [...quickActions, ...deskActions]
  }, [selectedDeskId, canCurrentUserEditDeskItems, snapToGrid, forceSaveInProgress, historySyncing, canUndo, canRedo, hasModalOpen, sortedDesks])

  const commandPaletteFilteredActions = useMemo(() => {
    const normalizedQuery = commandPaletteQuery.trim().toLowerCase()
    if (!normalizedQuery) return commandPaletteActions

    return commandPaletteActions.filter((action) => {
      const haystack = `${action.label} ${action.description} ${action.keywords || ''}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [commandPaletteQuery, commandPaletteActions])

  useEffect(() => {
    if (!showCommandPalette) return

    function resetPalette() {
      setShowCommandPalette(false)
      setCommandPaletteQuery('')
      setCommandPaletteActiveIndex(0)
    }

    function handleCommandPaletteKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        resetPalette()
        return
      }

      if (commandPaletteFilteredActions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCommandPaletteActiveIndex((prev) => (prev + 1) % commandPaletteFilteredActions.length)
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCommandPaletteActiveIndex((prev) => (
          (prev - 1 + commandPaletteFilteredActions.length) % commandPaletteFilteredActions.length
        ))
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        const selectedAction = commandPaletteFilteredActions[commandPaletteActiveIndex]
        if (!selectedAction || selectedAction.disabled) return
        resetPalette()
        selectedAction.run()
      }
    }

    window.addEventListener('keydown', handleCommandPaletteKeyDown)
    return () => window.removeEventListener('keydown', handleCommandPaletteKeyDown)
  }, [commandPaletteActiveIndex, commandPaletteFilteredActions, showCommandPalette])

  useEffect(() => {
    setCommandPaletteActiveIndex(0)
  }, [commandPaletteQuery])

  useEffect(() => {
    if (commandPaletteFilteredActions.length === 0) {
      setCommandPaletteActiveIndex(0)
      return
    }

    setCommandPaletteActiveIndex((prev) => Math.min(prev, commandPaletteFilteredActions.length - 1))
  }, [commandPaletteFilteredActions.length])

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
  }, [activeDecorationHandleId])

  // Escape-key modal handler intentionally tracks modal state flags.
  useEffect(() => {
    if (!hasModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (confirmDialog.isOpen && !confirmDialogLoading) {
          runCloseConfirmDialogEffect()
          return
        }

        if (deleteAccountDialog.isOpen && !deleteAccountDeleting) {
          setDeleteAccountDialog({ isOpen: false, confirmationText: '' })
          return
        }

        if (pendingDeleteId) {
          setPendingDeleteId(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [confirmDialog.isOpen, confirmDialogLoading, deleteAccountDeleting, deleteAccountDialog.isOpen, hasModalOpen, pendingDeleteId])

  function getDeskBackgroundValue(desk) {
    const modeFromColumn = typeof desk?.background_mode === 'string' ? desk.background_mode.trim() : ''
    const modeFromFallback = typeof desk?.background === 'string' ? desk.background.trim() : ''
    const nextMode = modeFromColumn || modeFromFallback
    if (nextMode === 'desk1' || nextMode === 'desk2' || nextMode === 'desk3' || nextMode === 'desk4') {
      return nextMode
    }

    const customUrl = getDeskCustomBackgroundUrl(desk)
    if ((nextMode === 'custom' && customUrl) || customUrl) {
      return 'custom'
    }

    return 'desk1'
  }

  function getDeskCustomBackgroundUrl(desk) {
    const candidates = [desk?.custom_background_url, desk?.background_url, desk?.background]
    for (const candidate of candidates) {
      const normalized = normalizeCustomBackgroundValue(candidate)
      if (normalized) return normalized
    }
    return ''
  }

  async function fetchDesks() {
    let loadedDesks = []
    try {
      loadedDesks = await loadMergedDesksForUser({
        supabase,
        userId: user.id
      })
    } catch (error) {
      console.error(error?.message || 'Failed to fetch desks', error)
      return
    }

    setDesks(loadedDesks)

    if (loadedDesks.length === 0) {
      setSelectedDeskId(null)
      setBackgroundMode('desk1')
      return
    }

    setSelectedDeskId((prev) => {
      const lastDeskId = localStorage.getItem(lastDeskStorageKey)
      const nextDesk = loadedDesks.find((desk) => desk.id === prev)
        || loadedDesks.find((desk) => desk.id === lastDeskId)
        || loadedDesks[0]
      const nextBackgroundMode = getDeskBackgroundValue(nextDesk)
      const nextCustomBackground = getDeskCustomBackgroundUrl(nextDesk)
      setBackgroundMode(nextBackgroundMode)
      setCustomBackgroundUrl(nextBackgroundMode === 'custom' ? nextCustomBackground : '')
      setCustomBackgroundInput(nextBackgroundMode === 'custom' ? nextCustomBackground : '')
      setBackgroundMenuError('')
      return nextDesk.id
    })
  }

  async function createDesk(nextDeskName, options = {}) {
    const trimmedName = (nextDeskName || '').trim()
    if (!trimmedName) {
      return { ok: false, errorMessage: 'Please enter a desk name.' }
    }

    const isCollaborative = Boolean(options.isCollaborative)
    const invitedFriendIds = Array.isArray(options.invitedFriendIds)
      ? Array.from(new Set(options.invitedFriendIds.filter((friendId) => friendId && friendId !== user.id)))
      : []
    const shouldStartCollaborative = isCollaborative && invitedFriendIds.length > 0

    let createdDesk = null
    let createError = null

    const { data: withFlagData, error: withFlagError } = await supabase
      .from('desks')
      .insert([{ user_id: user.id, name: trimmedName, background: 'desk1', is_collaborative: shouldStartCollaborative }])
      .select()

    if (withFlagError) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('desks')
        .insert([{ user_id: user.id, name: trimmedName, background: 'desk1' }])
        .select()

      createError = fallbackError
      createdDesk = fallbackData?.[0]
      if (createdDesk && shouldStartCollaborative) {
        createdDesk = { ...createdDesk, is_collaborative: true }
      }
    } else {
      createdDesk = withFlagData?.[0]
    }

    if (createError || !createdDesk) {
      console.error('Failed to create desk:', createError)
      return { ok: false, errorMessage: createError?.message || 'Failed to create desk.' }
    }

    if (shouldStartCollaborative) {
      if (invitedFriendIds.length > 0) {
        const invitedRows = invitedFriendIds.map((friendId) => ({
          desk_id: createdDesk.id,
          user_id: friendId
        }))

        const { error: invitedMemberInsertError } = await supabase
          .from('desk_members')
          .insert(invitedRows, { ignoreDuplicates: true })

        if (invitedMemberInsertError) {
          console.error('Failed to add collaborators:', invitedMemberInsertError)
          
          // Rollback: delete members (if any were partially inserted)
          const { error: rollbackMembersError } = await supabase
            .from('desk_members')
            .delete()
            .eq('desk_id', createdDesk.id)
          
          if (rollbackMembersError) {
            console.error('Failed to rollback desk members during desk creation:', rollbackMembersError)
          }
          
          // Rollback: delete desk
          const { error: rollbackDeskError } = await supabase
            .from('desks')
            .delete()
            .eq('id', createdDesk.id)
            .eq('user_id', user.id)
          
          if (rollbackDeskError) {
            console.error('Failed to rollback desk during creation:', rollbackDeskError)
            return { 
              ok: false, 
              errorMessage: 'Inviting collaborators failed and desk cleanup was incomplete. Please check your desk list.' 
            }
          }
          
          return { ok: false, errorMessage: invitedMemberInsertError?.message || 'Failed to invite collaborators.' }
        }
      }
    }

    setDesks((prev) => [...prev, createdDesk])
    setSelectedDeskId(createdDesk.id)
    setBackgroundMode(getDeskBackgroundValue(createdDesk))
    setCustomBackgroundUrl('')
    setCustomBackgroundInput('')
    setBackgroundMenuError('')
    setShowDeskMenu(false)
    await incrementUserStat('desks_created', 1)
    return { ok: true }
  }

  async function syncOwnedDeskCollaborativeState(deskId, members = []) {
    if (!deskId) return

    const targetDesk = desks.find((desk) => desk.id === deskId)
    if (!targetDesk || targetDesk.user_id !== user.id) return
    const hasCustomShelfAssignment = Boolean(getDeskAssignedCustomShelfId(deskId))

    const shouldBeCollaborative = members.some((member) => !member.is_owner)
    const isCurrentlyCollaborative = Boolean(targetDesk.is_collaborative)

    if (isCurrentlyCollaborative !== shouldBeCollaborative) {
      setDesks((prev) =>
        prev.map((desk) =>
          desk.id === deskId ? { ...desk, is_collaborative: shouldBeCollaborative } : desk
        )
      )

      if (!hasCustomShelfAssignment) {
        const nextBuiltInShelfId = shouldBeCollaborative ? '__sharing' : '__private'
        setExpandedDeskShelves((prev) => ({ ...prev, [nextBuiltInShelfId]: true }))
      }
    }

    const { error } = await supabase
      .from('desks')
      .update({ is_collaborative: shouldBeCollaborative })
      .eq('id', deskId)
      .eq('user_id', user.id)

    if (error && !isMissingColumnError(error, 'is_collaborative')) {
      console.error('Failed to sync desk collaborative state:', error)
    }
  }

  function openConfirmDialog({ title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm }) {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmLabel,
      tone,
      onConfirm: typeof onConfirm === 'function' ? onConfirm : null
    })
    setConfirmDialogLoading(false)
  }

  function closeConfirmDialog() {
    if (confirmDialogLoading) return
    setConfirmDialog({
      isOpen: false,
      title: '',
      message: '',
      confirmLabel: 'Confirm',
      tone: 'danger',
      onConfirm: null
    })
  }

  async function confirmDialogAction() {
    if (confirmDialogLoading || typeof confirmDialog.onConfirm !== 'function') return

    setConfirmDialogLoading(true)
    try {
      await confirmDialog.onConfirm()
      setConfirmDialog({
        isOpen: false,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        tone: 'danger',
        onConfirm: null
      })
    } catch (error) {
      console.error('Confirmation action failed:', error)
    } finally {
      setConfirmDialogLoading(false)
    }
  }

  async function deleteCurrentDesk() {
    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk) return

    openConfirmDialog({
      title: 'Delete Desk',
      message: `Delete "${getDeskNameValue(currentDesk)}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        const { error } = await supabase
          .from('desks')
          .delete()
          .eq('id', currentDesk.id)
          .eq('user_id', user.id)

        if (error) {
          console.error('Failed to delete desk:', error)
          return
        }

        const savedDeskId = localStorage.getItem(lastDeskStorageKey)
        if (savedDeskId && savedDeskId === String(currentDesk.id)) {
          localStorage.removeItem(lastDeskStorageKey)
        }

        const remainingDesks = desks.filter((desk) => desk.id !== currentDesk.id)
        setDesks(remainingDesks)

        if (remainingDesks.length === 0) {
          setSelectedDeskId(null)
          setBackgroundMode('desk1')
          setCustomBackgroundUrl('')
          setCustomBackgroundInput('')
          setNotes([])
        } else {
          const nextDesk = remainingDesks[0]
          setSelectedDeskId(nextDesk.id)
          const nextBackgroundMode = getDeskBackgroundValue(nextDesk)
          setBackgroundMode(nextBackgroundMode)
          setCustomBackgroundUrl(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(nextDesk) : '')
          setCustomBackgroundInput(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(nextDesk) : '')
        }

        setShowDeskMenu(false)
        await incrementUserStat('desks_deleted', 1)
      }
    })
  }

  async function leaveCurrentDesk() {
    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk || currentDesk.user_id === user.id) return

    openConfirmDialog({
      title: 'Leave Desk',
      message: `Leave "${getDeskNameValue(currentDesk)}"?`,
      confirmLabel: 'Leave',
      tone: 'danger',
      onConfirm: async () => {
        const { error } = await supabase
          .from('desk_members')
          .delete()
          .eq('desk_id', currentDesk.id)
          .eq('user_id', user.id)

        if (error) {
          console.error('Failed to leave desk:', error)
          return
        }

        const savedDeskId = localStorage.getItem(lastDeskStorageKey)
        if (savedDeskId && savedDeskId === String(currentDesk.id)) {
          localStorage.removeItem(lastDeskStorageKey)
        }

        const remainingDesks = desks.filter((desk) => desk.id !== currentDesk.id)
        setDesks(remainingDesks)

        if (remainingDesks.length === 0) {
          setSelectedDeskId(null)
          setBackgroundMode('desk1')
          setCustomBackgroundUrl('')
          setCustomBackgroundInput('')
          setNotes([])
        } else {
          const nextDesk = remainingDesks[0]
          setSelectedDeskId(nextDesk.id)
          const nextBackgroundMode = getDeskBackgroundValue(nextDesk)
          setBackgroundMode(nextBackgroundMode)
          setCustomBackgroundUrl(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(nextDesk) : '')
          setCustomBackgroundInput(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(nextDesk) : '')
        }

        setShowDeskMenu(false)
      }
    })
  }

  async function renameCurrentDesk(nextNameInput) {
    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk) {
      return { ok: false, errorMessage: 'No desk selected.' }
    }

    const nextName = (nextNameInput || '').trim()
    if (!nextName) {
      return { ok: false, errorMessage: 'Please enter a desk name.' }
    }

    const { error } = await supabase
      .from('desks')
      .update({ name: nextName })
      .eq('id', currentDesk.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to rename desk:', error)
      return { ok: false, errorMessage: error?.message || 'Failed to rename desk.' }
    }

    setDesks((prev) => prev.map((desk) => (desk.id === currentDesk.id ? { ...desk, name: nextName } : desk)))
    setShowDeskMenu(false)
    return { ok: true }
  }

  async function fetchDeskMembers(deskId) {
    if (!deskId) {
      setDeskMembers([])
      return []
    }

    const desk = desks.find((entry) => entry.id === deskId)
    if (!desk) {
      setDeskMembers([])
      return []
    }

    setDeskMembersLoading(true)
    setDeskMembersError('')

    try {
      const { data: membershipRows, error: membershipError } = await supabase
        .from('desk_members')
        .select('id, user_id, role, created_at')
        .eq('desk_id', deskId)
        .order('created_at', { ascending: true })

      if (membershipError) throw membershipError

      const memberRows = membershipRows || []
      const memberIds = Array.from(new Set([
        desk.user_id,
        ...memberRows.map((row) => row.user_id)
      ]))

      if (memberIds.length === 0) {
        setDeskMembers([])
        return []
      }

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, preferred_name')
        .in('id', memberIds)

      if (profileError) throw profileError

      const profileById = new Map((profileRows || []).map((row) => [
        row.id,
        {
          email: row.email || 'Unknown user',
          preferred_name: row.preferred_name || ''
        }
      ]))
      const membershipByUserId = new Map(memberRows.map((row) => [row.user_id, row]))
      const normalizedMembers = memberIds.map((memberId) => {
        const membershipRow = membershipByUserId.get(memberId)
        return {
          membership_id: membershipRow?.id || null,
          user_id: memberId,
          email: profileById.get(memberId)?.email || 'Unknown user',
          preferred_name: profileById.get(memberId)?.preferred_name || '',
          is_owner: memberId === desk.user_id,
          role: memberId === desk.user_id ? 'owner' : (membershipRow?.role === 'viewer' ? 'viewer' : 'editor')
        }
      })

      const sortedMembers = normalizedMembers.sort((left, right) => {
        if (left.is_owner && !right.is_owner) return -1
        if (!left.is_owner && right.is_owner) return 1
        return left.email.localeCompare(right.email)
      })

      setDeskMembers(sortedMembers)
      return sortedMembers
    } catch (error) {
      console.error('Failed to fetch desk members:', error)
      setDeskMembersError(error?.message || 'Could not load desk members.')
      setDeskMembers([])
      return []
    } finally {
      setDeskMembersLoading(false)
    }
  }

  async function fetchDeskMemberRequests(deskId) {
    if (!deskId) {
      setDeskMemberRequests([])
      return
    }

    const desk = desks.find((entry) => entry.id === deskId)
    if (!desk) {
      setDeskMemberRequests([])
      return
    }

    const isOwnerView = desk.user_id === user.id

    setDeskMemberRequestsLoading(true)
    setDeskMemberRequestsError('')

    try {
      let query = supabase
        .from('desk_member_requests')
        .select('id, desk_id, requester_id, target_friend_id, owner_id, status, created_at')
        .eq('desk_id', deskId)
        .order('created_at', { ascending: false })

      if (isOwnerView) {
        query = query.eq('status', 'pending')
      } else {
        query = query.eq('requester_id', user.id).eq('status', 'pending')
      }

      const { data: requestRows, error: requestError } = await query
      if (requestError) throw requestError

      const rows = requestRows || []
      if (rows.length === 0) {
        setDeskMemberRequests([])
        return
      }

      const profileIds = Array.from(new Set(rows.flatMap((row) => [row.requester_id, row.target_friend_id]).filter(Boolean)))
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, preferred_name')
        .in('id', profileIds)

      if (profileError) throw profileError

      const profileById = new Map((profileRows || []).map((row) => [
        row.id,
        {
          email: row.email || 'Unknown user',
          preferred_name: row.preferred_name || ''
        }
      ]))

      setDeskMemberRequests(rows.map((row) => ({
        ...row,
        requester_email: profileById.get(row.requester_id)?.email || 'Unknown user',
        requester_preferred_name: profileById.get(row.requester_id)?.preferred_name || '',
        target_friend_email: profileById.get(row.target_friend_id)?.email || 'Unknown user',
        target_friend_preferred_name: profileById.get(row.target_friend_id)?.preferred_name || ''
      })))
    } catch (error) {
      console.error('Failed to fetch desk member requests:', error)
      setDeskMemberRequestsError(error?.message || 'Could not load desk member requests.')
      setDeskMemberRequests([])
    } finally {
      setDeskMemberRequestsLoading(false)
    }
  }

  async function openDeskMembersDialog() {
    const desk = desks.find((entry) => entry.id === selectedDeskId)
    if (!desk) return

    setDeskMembersDialogOpen(true)
    setDeskMembersMessage('')
    setDeskMembersError('')
    setDeskMemberRequestsError('')
    setDeskMemberActionLoadingId(null)
    await Promise.all([
      fetchDeskMembers(desk.id),
      fetchDeskMemberRequests(desk.id)
    ])
  }

  function closeDeskMembersDialog() {
    setDeskMembersDialogOpen(false)
    setDeskMembersError('')
    setDeskMemberRequestsError('')
    setDeskMembersMessage('')
    setDeskMemberActionLoadingId(null)
  }

  async function addDeskMember(friendId) {
    if (!selectedDeskId || !friendId) return

    setDeskMemberActionLoadingId(`add:${friendId}`)
    setDeskMembersError('')
    setDeskMembersMessage('')

    const { error } = await supabase
      .from('desk_members')
      .insert([{ desk_id: selectedDeskId, user_id: friendId }], { ignoreDuplicates: true })

    if (error) {
      console.error('Failed to add desk member:', error)
      setDeskMembersError(error?.message || 'Could not add member.')
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage('Member added.')
    const updatedMembers = await fetchDeskMembers(selectedDeskId)
    await syncOwnedDeskCollaborativeState(selectedDeskId, updatedMembers)
    setDeskMemberActionLoadingId(null)
  }

  async function removeDeskMember(memberUserId) {
    if (!selectedDeskId || !memberUserId) return

    setDeskMemberActionLoadingId(`remove:${memberUserId}`)
    setDeskMembersError('')
    setDeskMembersMessage('')

    const { error } = await supabase
      .from('desk_members')
      .delete()
      .eq('desk_id', selectedDeskId)
      .eq('user_id', memberUserId)

    if (error) {
      console.error('Failed to remove desk member:', error)
      setDeskMembersError(error?.message || 'Could not remove member.')
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage('Member removed.')
    const updatedMembers = await fetchDeskMembers(selectedDeskId)
    await syncOwnedDeskCollaborativeState(selectedDeskId, updatedMembers)
    setDeskMemberActionLoadingId(null)
  }

  async function updateDeskMemberRole(memberUserId, nextRole) {
    if (!selectedDeskId || !memberUserId) return
    if (nextRole !== 'editor' && nextRole !== 'viewer') return
    if (!isCurrentDeskOwner) return

    const targetMember = deskMembers.find((member) => member.user_id === memberUserId)
    if (!targetMember || targetMember.is_owner || targetMember.role === nextRole) return

    setDeskMemberActionLoadingId(`role:${memberUserId}`)
    setDeskMembersError('')
    setDeskMembersMessage('')

    const { error } = await supabase
      .from('desk_members')
      .update({ role: nextRole })
      .eq('desk_id', selectedDeskId)
      .eq('user_id', memberUserId)

    if (error) {
      console.error('Failed to update desk member role:', error)
      if (isMissingColumnError(error, 'role')) {
        setDeskMembersError('Desk member roles are not available yet. Run the latest SQL in BACKEND_SQL_README.md.')
      } else {
        setDeskMembersError(error?.message || 'Could not update role.')
      }
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage(nextRole === 'viewer' ? 'Member changed to Viewer.' : 'Member changed to Editor.')
    await fetchDeskMembers(selectedDeskId)
    setDeskMemberActionLoadingId(null)
  }

  async function requestDeskMemberAdd(friendId) {
    if (!selectedDeskId || !friendId) return

    const desk = desks.find((entry) => entry.id === selectedDeskId)
    if (!desk) return

    if (desk.user_id === user.id) {
      await addDeskMember(friendId)
      return
    }

    const alreadyMember = deskMembers.some((member) => member.user_id === friendId)
    if (alreadyMember) {
      setDeskMembersMessage('This friend is already in the desk.')
      return
    }

    const alreadyRequested = deskMemberRequests.some((request) => request.target_friend_id === friendId && request.status === 'pending')
    if (alreadyRequested) {
      setDeskMembersMessage('You already requested this friend.')
      return
    }

    setDeskMemberActionLoadingId(`request:${friendId}`)
    setDeskMembersError('')
    setDeskMemberRequestsError('')
    setDeskMembersMessage('')

    const { error } = await supabase
      .from('desk_member_requests')
      .insert([{
        desk_id: selectedDeskId,
        requester_id: user.id,
        target_friend_id: friendId,
        owner_id: desk.user_id,
        status: 'pending'
      }])

    if (error) {
      console.error('Failed to create desk member request:', error)
      setDeskMembersError(error?.message || 'Could not send request to owner.')
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage('Request sent to desk owner.')
    await fetchDeskMemberRequests(selectedDeskId)
    setDeskMemberActionLoadingId(null)
  }

  async function respondDeskMemberRequest(request, nextStatus) {
    if (!request?.id || !selectedDeskId) return

    const actionKey = `${nextStatus}:${request.id}`
    setDeskMemberActionLoadingId(actionKey)
    setDeskMembersError('')
    setDeskMemberRequestsError('')
    setDeskMembersMessage('')

    if (nextStatus === 'approved') {
      const { error: addError } = await supabase
        .from('desk_members')
        .insert([{ desk_id: selectedDeskId, user_id: request.target_friend_id }], { ignoreDuplicates: true })

      if (addError) {
        console.error('Failed to add approved desk member:', addError)
        setDeskMembersError(addError?.message || 'Could not add approved member.')
        setDeskMemberActionLoadingId(null)
        return
      }
    }

    const { error: updateError } = await supabase
      .from('desk_member_requests')
      .update({ status: nextStatus })
      .eq('id', request.id)

    if (updateError) {
      console.error('Failed to update desk member request:', updateError)
      setDeskMembersError(updateError?.message || 'Could not update request.')
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage(nextStatus === 'approved' ? 'Request approved and member added.' : 'Request declined.')
    const [updatedMembers] = await Promise.all([
      fetchDeskMembers(selectedDeskId),
      fetchDeskMemberRequests(selectedDeskId)
    ])
    if (nextStatus === 'approved') {
      await syncOwnedDeskCollaborativeState(selectedDeskId, updatedMembers)
    }
    setDeskMemberActionLoadingId(null)
  }

  function openCreateDeskDialog() {
    setDeskNameError('')
    setDeskNameDialog({
      isOpen: true,
      mode: 'create',
      value: `Desk ${desks.length + 1}`,
      isCollaborative: false,
      invitedFriendIds: []
    })
    setShowDeskMenu(false)
  }

  function openRenameDeskDialog() {
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
  }

  function toggleInvitedFriend(friendId) {
    setDeskNameDialog((prev) => {
      const selected = new Set(prev.invitedFriendIds || [])
      if (selected.has(friendId)) selected.delete(friendId)
      else selected.add(friendId)
      return { ...prev, invitedFriendIds: Array.from(selected) }
    })
  }

  function closeDeskNameDialog() {
    setDeskNameError('')
    setDeskNameSaving(false)
    setDeskNameDialog({ isOpen: false, mode: 'create', value: '', isCollaborative: false, invitedFriendIds: [] })
  }

  async function submitDeskNameDialog(e) {
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
  }

  async function setCurrentDeskBackground(mode) {
    if (!selectedDeskId) return

    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk || currentDesk.user_id !== user.id) {
      return
    }

    let updateError = null

    const { error: backgroundModeError } = await supabase
      .from('desks')
      .update({ background_mode: mode, background: mode })
      .eq('id', selectedDeskId)
      .eq('user_id', user.id)

    if (backgroundModeError) {
      const { error: backgroundError } = await supabase
        .from('desks')
        .update({ background: mode })
        .eq('id', selectedDeskId)
        .eq('user_id', user.id)
      updateError = backgroundError
    }

    if (updateError) {
      console.error('Failed to update desk background:', updateError)
      setBackgroundMenuError(updateError?.message || 'Could not update background.')
      return
    }

    setBackgroundMode(mode)
    setCustomBackgroundUrl('')
    setCustomBackgroundInput('')
    setBackgroundMenuError('')
    setDesks((prev) =>
      prev.map((desk) =>
        desk.id === selectedDeskId ? { ...desk, background_mode: mode, background: mode } : desk
      )
    )
    setShowDeskMenu(false)
  }

  async function setCurrentDeskCustomBackground(urlInput) {
    if (!selectedDeskId) return

    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk || currentDesk.user_id !== user.id) return

    const normalizedUrl = normalizeCustomBackgroundValue(urlInput)
    if (!normalizedUrl) {
      setBackgroundMenuError('Please enter a valid hex color or http(s) image URL.')
      return
    }

    let updateError = null

    const { error: customModeError } = await supabase
      .from('desks')
      .update({ background_mode: 'custom', background: normalizedUrl })
      .eq('id', selectedDeskId)
      .eq('user_id', user.id)

    if (customModeError) {
      const { error: fallbackError } = await supabase
        .from('desks')
        .update({ background: normalizedUrl })
        .eq('id', selectedDeskId)
        .eq('user_id', user.id)
      updateError = fallbackError
    }

    if (updateError) {
      console.error('Failed to set custom background:', updateError)
      setBackgroundMenuError(updateError?.message || 'Could not set custom background.')
      return
    }

    setBackgroundMode('custom')
    setCustomBackgroundUrl(normalizedUrl)
    setCustomBackgroundInput(normalizedUrl)
    setBackgroundMenuError('')
    setDesks((prev) =>
      prev.map((desk) =>
        desk.id === selectedDeskId ? { ...desk, background_mode: 'custom', background: normalizedUrl } : desk
      )
    )
  }

  function sanitizeExportFileName(value) {
    const trimmed = (value || '').trim()
    if (!trimmed) return 'desk'
    return trimmed
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80)
      .toLowerCase() || 'desk'
  }

  function triggerJsonDownload(fileName, payload) {
    const serialized = JSON.stringify(payload, null, 2)
    const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' })
    const downloadUrl = URL.createObjectURL(blob)
    const downloadAnchor = document.createElement('a')
    downloadAnchor.href = downloadUrl
    downloadAnchor.download = fileName
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    URL.revokeObjectURL(downloadUrl)
  }

  function areRectanglesOverlapping(leftRect, rightRect, gap = 8) {
    return !(
      leftRect.x + leftRect.width + gap <= rightRect.x
      || rightRect.x + rightRect.width + gap <= leftRect.x
      || leftRect.y + leftRect.height + gap <= rightRect.y
      || rightRect.y + rightRect.height + gap <= leftRect.y
    )
  }

  function findAvailableSpawnPosition({ baseX, baseY, width, height }) {
    const availableWidth = Math.round(canvasWidth || getViewportMetrics().width)
    const maxX = Math.max(0, availableWidth - width)
    const normalizedBaseX = Math.min(Math.max(0, Number(baseX) || 0), maxX)
    const normalizedBaseY = Math.max(0, Number(baseY) || 0)
    const diagonalStep = 24
    const maxAttempts = 24

    for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
      const candidate = {
        x: Math.min(Math.max(0, normalizedBaseX + attempt * diagonalStep), maxX),
        y: Math.max(0, normalizedBaseY + attempt * diagonalStep),
        width,
        height
      }

      const hasOverlap = notesRef.current.some((item) => {
        const existing = {
          x: Number(item?.x) || 0,
          y: Number(item?.y) || 0,
          width: getItemWidth(item),
          height: getItemHeight(item)
        }
        return areRectanglesOverlapping(candidate, existing)
      })

      if (!hasOverlap) {
        return { x: candidate.x, y: candidate.y }
      }
    }

    return {
      x: normalizedBaseX,
      y: normalizedBaseY + (maxAttempts + 1) * diagonalStep
    }
  }

  async function exportCurrentDesk() {
    if (!selectedDeskId) return

    const desk = desks.find((entry) => entry.id === selectedDeskId)
    if (!desk) return

    try {
      const [notesResult, checklistsResult, decorationsResult] = await Promise.all([
        supabase.from('notes').select('*').eq('desk_id', selectedDeskId),
        supabase.from('checklists').select('*').eq('desk_id', selectedDeskId),
        supabase.from('decorations').select('*').eq('desk_id', selectedDeskId)
      ])

      if (notesResult.error || checklistsResult.error || decorationsResult.error) {
        throw notesResult.error || checklistsResult.error || decorationsResult.error
      }

      const checklistRows = checklistsResult.data || []
      const checklistIds = checklistRows.map((row) => row.id)
      let checklistItems = []

      if (checklistIds.length > 0) {
        const { data: checklistItemsData, error: checklistItemsError } = await supabase
          .from('checklist_items')
          .select('*')
          .in('checklist_id', checklistIds)
          .order('sort_order', { ascending: true })

        if (checklistItemsError) {
          throw checklistItemsError
        }

        checklistItems = checklistItemsData || []
      }

      const exportPayload = {
        schema_version: 1,
        exported_at: new Date().toISOString(),
        exported_by_user_id: user.id,
        desk: {
          id: desk.id,
          name: desk.name,
          user_id: desk.user_id,
          is_collaborative: Boolean(desk.is_collaborative),
          background: desk.background || 'desk1',
          background_mode: desk.background_mode || null,
          custom_background_url: desk.custom_background_url || null,
          background_url: desk.background_url || null,
          created_at: desk.created_at || null
        },
        items: {
          notes: notesResult.data || [],
          checklists: checklistRows,
          checklist_items: checklistItems,
          decorations: decorationsResult.data || []
        }
      }

      const safeDeskName = sanitizeExportFileName(getDeskNameValue(desk))
      const exportDate = new Date().toISOString().slice(0, 10)
      const exportFileName = `${safeDeskName}-${exportDate}.json`

      triggerJsonDownload(exportFileName, exportPayload)
      await logDeskActivity({
        actionType: 'exported',
        itemType: 'desk',
        itemId: selectedDeskId,
        summary: 'exported this desk'
      })
      setShowDeskMenu(false)
      setBackgroundMenuError('')
      setDeskMenuError('')
      setDeskMenuMessage(`Exported ${getDeskNameValue(desk)}.`)
    } catch (error) {
      console.error('Failed to export desk:', error)
      setDeskMenuMessage('')
      setDeskMenuError(error?.message || 'Failed to export desk.')
    }
  }

  async function insertRowsWithImportFallback(table, rows) {
    if (!rows.length) return []

    let nextRows = rows

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .insert(nextRows)
        .select()

      if (!error) return data || []

      if (isMissingColumnError(error, 'user_id')) {
        nextRows = nextRows.map((row) => {
          const copy = { ...row }
          delete copy.user_id
          return copy
        })
        continue
      }

      if (isMissingColumnError(error, 'text_color')) {
        nextRows = nextRows.map((row) => {
          const copy = { ...row }
          delete copy.text_color
          return copy
        })
        continue
      }

      if (isMissingColumnError(error, 'font_size')) {
        nextRows = nextRows.map((row) => {
          const copy = { ...row }
          delete copy.font_size
          return copy
        })
        continue
      }

      throw error
    }
  }

  function normalizeDeskImportPayload(payload) {
    if (!payload) {
      return { notes: [], checklists: [], checklistItems: [], decorations: [] }
    }

    if (Array.isArray(payload)) {
      return { notes: payload, checklists: [], checklistItems: [], decorations: [] }
    }

    const items = payload.items && typeof payload.items === 'object' ? payload.items : {}
    const checklists = Array.isArray(items.checklists)
      ? items.checklists
      : (Array.isArray(payload.checklists) ? payload.checklists : [])

    const explicitChecklistItems = Array.isArray(items.checklist_items)
      ? items.checklist_items
      : (Array.isArray(payload.checklist_items) ? payload.checklist_items : [])

    const nestedChecklistItems = checklists.flatMap((checklist) => {
      if (!Array.isArray(checklist?.items)) return []
      return checklist.items.map((entry, index) => ({
        checklist_id: checklist.id,
        text: entry?.text || '',
        is_checked: Boolean(entry?.is_checked),
        sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : index,
        due_at: normalizeChecklistReminderValue(entry?.due_at)
      }))
    })

    return {
      notes: Array.isArray(items.notes) ? items.notes : (Array.isArray(payload.notes) ? payload.notes : []),
      checklists,
      checklistItems: explicitChecklistItems.length > 0 ? explicitChecklistItems : nestedChecklistItems,
      decorations: Array.isArray(items.decorations) ? items.decorations : (Array.isArray(payload.decorations) ? payload.decorations : [])
    }
  }

  async function importDeskPayloadIntoCurrentDesk(payload) {
    if (!selectedDeskId) return { notes: 0, checklists: 0, checklistItems: 0, decorations: 0 }

    const normalized = normalizeDeskImportPayload(payload)
    const positionOffset = 20

    const noteRows = normalized.notes.map((note) => ({
      desk_id: selectedDeskId,
      user_id: user.id,
      content: note?.content || 'Imported note',
      color: note?.color || '#fff59d',
      text_color: note?.text_color || '#222222',
      font_size: normalizeFontSize(note?.font_size, 16),
      font_family: note?.font_family || 'inherit',
      x: (Number(note?.x) || 100) + positionOffset,
      y: (Number(note?.y) || 100) + positionOffset,
      rotation: toStoredRotation(Number(note?.rotation) || 0),
      width: getItemWidth(note),
      height: getItemHeight(note)
    }))

    const checklistRows = normalized.checklists.map((checklist) => ({
      __source_id: checklist?.id,
      desk_id: selectedDeskId,
      user_id: user.id,
      title: checklist?.title || 'Imported checklist',
      color: checklist?.color || '#ffffff',
      text_color: checklist?.text_color || '#222222',
      font_size: normalizeFontSize(checklist?.font_size, 16),
      font_family: checklist?.font_family || 'inherit',
      x: (Number(checklist?.x) || 100) + positionOffset,
      y: (Number(checklist?.y) || 100) + positionOffset,
      rotation: toStoredRotation(Number(checklist?.rotation) || 0),
      width: getItemWidth(checklist),
      height: getItemHeight(checklist)
    }))

    const decorationRows = normalized.decorations.map((decoration) => ({
      desk_id: selectedDeskId,
      kind: decoration?.kind || 'pin',
      x: (Number(decoration?.x) || 110) + positionOffset,
      y: (Number(decoration?.y) || 110) + positionOffset,
      rotation: toStoredRotation(Number(decoration?.rotation) || 0),
      width: getItemWidth(decoration),
      height: getItemHeight(decoration)
    }))

    const insertedNotes = await insertRowsWithImportFallback('notes', noteRows)

    const checklistsWithoutMeta = checklistRows.map((row) => {
      const copy = { ...row }
      delete copy.__source_id
      return copy
    })
    const insertedChecklists = await insertRowsWithImportFallback('checklists', checklistsWithoutMeta)

    const checklistIdMap = new Map()
    checklistRows.forEach((row, index) => {
      if (!row.__source_id) return
      const inserted = insertedChecklists[index]
      if (!inserted?.id) return
      checklistIdMap.set(row.__source_id, inserted.id)
    })

    const checklistItemRows = normalized.checklistItems
      .map((entry, index) => {
        const targetChecklistId = checklistIdMap.get(entry?.checklist_id)
        if (!targetChecklistId) return null
        return {
          checklist_id: targetChecklistId,
          text: (entry?.text || '').trim(),
          is_checked: Boolean(entry?.is_checked),
          sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : index,
          due_at: normalizeChecklistReminderValue(entry?.due_at)
        }
      })
      .filter((entry) => entry && entry.text.length > 0)

    let insertedChecklistItems = []
    if (checklistItemRows.length > 0) {
      insertedChecklistItems = await insertChecklistItemsWithReminderFallback(checklistItemRows, { includeSelect: true })
    }

    let insertedDecorations = []
    if (decorationRows.length > 0) {
      const { data, error } = await supabase
        .from('decorations')
        .insert(decorationRows)
        .select()

      if (error) throw error
      insertedDecorations = data || []
    }

    return {
      notes: insertedNotes.length,
      checklists: insertedChecklists.length,
      checklistItems: insertedChecklistItems.length,
      decorations: insertedDecorations.length
    }
  }

  async function handleImportDeskFileSelection(e) {
    const selectedFile = e.target?.files?.[0]
    if (e.target) e.target.value = ''
    if (!selectedFile) return

    if (!canCurrentUserEditDeskItems) {
      setDeskMenuMessage('')
      setDeskMenuError('You do not have permission to import into this desk.')
      return
    }

    try {
      const rawContent = await selectedFile.text()
      const parsedPayload = JSON.parse(rawContent)
      const result = await importDeskPayloadIntoCurrentDesk(parsedPayload)

      await fetchDeskItems(selectedDeskId)
      await logDeskActivity({
        actionType: 'imported',
        itemType: 'desk',
        itemId: selectedDeskId,
        summary: 'imported desk content',
        metadata: {
          notes: result.notes,
          checklists: result.checklists,
          checklistItems: result.checklistItems,
          decorations: result.decorations
        }
      })

      setDeskMenuError('')
      setDeskMenuMessage(`Imported ${result.notes} note(s), ${result.checklists} checklist(s), ${result.checklistItems} checklist item(s), ${result.decorations} decoration(s).`)
    } catch (error) {
      console.error('Failed to import desk data:', error)
      setDeskMenuMessage('')
      if ((error?.message || '').toLowerCase().includes('json')) {
        setDeskMenuError('Invalid JSON file. Please import a valid desk export.')
      } else {
        setDeskMenuError(error?.message || 'Failed to import data.')
      }
    }
  }

  function handleSelectDesk(desk) {
    if (!desk || desk.id === selectedDeskId) {
      setShowDeskMenu(false)
      return
    }

    setSelectedDeskId(desk.id)
    const nextBackgroundMode = getDeskBackgroundValue(desk)
    setBackgroundMode(nextBackgroundMode)
    setCustomBackgroundUrl(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(desk) : '')
    setCustomBackgroundInput(nextBackgroundMode === 'custom' ? getDeskCustomBackgroundUrl(desk) : '')
    setBackgroundMenuError('')
    setDeskMenuMessage('')
    setDeskMenuError('')
    setEditingId(null)
    setEditValue('')
    setChecklistEditItems([])
    setNewChecklistItemText('')
    setPendingDeleteId(null)
    setActiveDecorationHandleId(null)
    setShowDeskMenu(false)
  }

  async function fetchDeskItems(deskId) {
    if (!deskId) {
      setNotesFromRemote([])
      return
    }

    try {
      const [
        { data: notesData, error: notesError },
        { data: checklistsData, error: checklistsError },
        { data: decorationsData, error: decorationsError }
      ] = await withTimeout(
        Promise.all([
          supabase.from('notes').select('*').eq('desk_id', deskId),
          supabase.from('checklists').select('*').eq('desk_id', deskId),
          supabase.from('decorations').select('*').eq('desk_id', deskId)
        ]),
        10000
      )

    if (notesError) {
      console.error('Failed to fetch notes:', notesError)
    }
    if (checklistsError) {
      console.error('Failed to fetch checklists:', checklistsError)
    }
    if (decorationsError) {
      console.error('Failed to fetch decorations:', decorationsError)
    }

    const checklistRows = checklistsData || []
    const checklistIds = checklistRows.map((row) => row.id)

    let checklistItemsMap = new Map()

    if (checklistIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .in('checklist_id', checklistIds)
        .order('sort_order', { ascending: true })

      if (itemsError) {
        console.error('Failed to fetch checklist items:', itemsError)
      } else {
        checklistItemsMap = (itemsData || []).reduce((acc, item) => {
          const existing = acc.get(item.checklist_id) || []
          existing.push(item)
          acc.set(item.checklist_id, existing)
          return acc
        }, new Map())
      }
    }

    const mappedNotes = (notesData || []).map((note) => ({ ...note, item_type: 'note' }))
    const mappedChecklists = checklistRows.map((checklist) => ({
      ...checklist,
      item_type: 'checklist',
      items: checklistItemsMap.get(checklist.id) || []
    }))
    const mappedDecorations = (decorationsData || []).map((decoration) => ({ ...decoration, item_type: 'decoration' }))

    const creatorIds = Array.from(
      new Set(
        [...mappedNotes, ...mappedChecklists]
          .map((item) => item.user_id)
          .filter((value) => Boolean(value))
      )
    )

    let creatorEmailById = new Map()
    if (creatorIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, preferred_name')
        .in('id', creatorIds)

      if (profileError) {
        console.error('Failed to fetch item creator profiles:', profileError)
      } else {
        creatorEmailById = new Map((profileRows || []).map((row) => [
          row.id,
          {
            email: row.email || '',
            preferredName: row.preferred_name || ''
          }
        ]))
      }
    }

    const combined = [...mappedNotes, ...mappedChecklists, ...mappedDecorations].map((item) => {
      if (isDecorationItem(item)) return item
      const creatorProfile = creatorEmailById.get(item.user_id)
      if (!creatorProfile) return item
      return {
        ...item,
        created_by_email: creatorProfile.email,
        created_by_name: creatorProfile.preferredName
      }
    })
    setNotesFromRemote(combined)

    const maxNoteBottom = combined.reduce((maxY, item) => {
      const itemBottom = (Number(item.y) || 0) + getItemHeight(item)
      return Math.max(maxY, itemBottom)
    }, 0)
    const maxNoteRight = combined.reduce((maxX, item) => {
      const itemRight = (Number(item.x) || 0) + getItemWidth(item)
      return Math.max(maxX, itemRight)
    }, 0)
    const requiredWidth = maxNoteRight + growThreshold
    const requiredHeight = maxNoteBottom + growThreshold
    setCanvasWidth((prev) => Math.max(prev, requiredWidth, viewportWidth))
    const requiredSections = Math.max(2, Math.ceil(requiredHeight / sectionHeight))
    setCanvasHeight((prev) => Math.max(prev, requiredSections * sectionHeight))
    } catch (error) {
      console.error('Failed to fetch desk items:', error)
      if (error?.message?.includes('timeout')) {
        setEditSaveError('Desk items took too long to load. Please try again.')
      }
      setNotesFromRemote([])
    }
  }

  async function addStickyNote() {
    if (!canCurrentUserEditDeskItems) return
    if (!selectedDeskId) return

    const spawnPosition = findAvailableSpawnPosition({ baseX: 100, baseY: 100, width: 200, height: 120 })

    let data = null
    let error = null

    const withUserResult = await supabase
      .from('notes')
      .insert([{ desk_id: selectedDeskId, user_id: user.id, content: 'New note', color: '#fff59d', font_family: 'inherit', x: spawnPosition.x, y: spawnPosition.y, rotation: 0, width: 200, height: 120 }])
      .select()

    data = withUserResult.data
    error = withUserResult.error

    if (error) {
      const fallbackResult = await supabase
        .from('notes')
        .insert([{ desk_id: selectedDeskId, content: 'New note', color: '#fff59d', font_family: 'inherit', x: spawnPosition.x, y: spawnPosition.y, rotation: 0, width: 200, height: 120 }])
        .select()

      data = fallbackResult.data
      error = fallbackResult.error
    }

    const createdNote = data?.[0]

    if (createdNote) {
      setNotes((prev) => [...prev, { ...createdNote, item_type: 'note' }])
      await fetchDeskItems(selectedDeskId)
      await logDeskActivity({
        actionType: 'created',
        itemType: 'note',
        itemId: createdNote.id,
        summary: 'created a note'
      })
    } else {
      console.error('Failed to create note:', error)
      setEditSaveError(error?.message || 'Failed to create note.')
    }

    setShowNewNoteMenu(false)
  }

  async function addChecklistNote() {
    if (!canCurrentUserEditDeskItems) return
    if (!selectedDeskId) return

    const spawnPosition = findAvailableSpawnPosition({ baseX: 100, baseY: 100, width: 220, height: 160 })

    let data = null
    let error = null

    const withUserResult = await supabase
      .from('checklists')
      .insert([{ desk_id: selectedDeskId, user_id: user.id, title: 'Checklist', color: '#ffffff', font_family: 'inherit', x: spawnPosition.x, y: spawnPosition.y, rotation: 0, width: 220, height: 160 }])
      .select()

    data = withUserResult.data
    error = withUserResult.error

    if (error) {
      const fallbackResult = await supabase
        .from('checklists')
        .insert([{ desk_id: selectedDeskId, title: 'Checklist', color: '#ffffff', font_family: 'inherit', x: spawnPosition.x, y: spawnPosition.y, rotation: 0, width: 220, height: 160 }])
        .select()

      data = fallbackResult.data
      error = fallbackResult.error
    }

    const createdChecklist = data?.[0]

    if (!createdChecklist) {
      console.error('Failed to create checklist:', error)
      setEditSaveError(error?.message || 'Failed to create checklist.')
      setShowNewNoteMenu(false)
      return
    }

    const { data: itemData, error: itemError } = await supabase
      .from('checklist_items')
      .insert([{ checklist_id: createdChecklist.id, text: 'New item', is_checked: false, sort_order: 0 }])
      .select()

    if (itemError) {
      console.error('Failed to create checklist item:', itemError)
    }

    setNotes((prev) => [
      ...prev,
      {
        ...createdChecklist,
        item_type: 'checklist',
        items: itemData || []
      }
    ])

    await fetchDeskItems(selectedDeskId)
    await logDeskActivity({
      actionType: 'created',
      itemType: 'checklist',
      itemId: createdChecklist.id,
      summary: 'created a checklist'
    })

    setShowNewNoteMenu(false)
  }

  async function addDecoration(kind) {
    if (!canCurrentUserEditDeskItems) return
    if (!selectedDeskId) return

    const spawnPosition = findAvailableSpawnPosition({ baseX: 110, baseY: 110, width: 88, height: 88 })

    const option = getDecorationOption(kind)
    const { data, error } = await supabase
      .from('decorations')
      .insert([{ desk_id: selectedDeskId, kind: option.key, x: spawnPosition.x, y: spawnPosition.y, rotation: 0, width: 88, height: 88 }])
      .select()

    const createdDecoration = data?.[0]

    if (createdDecoration) {
      setNotes((prev) => [...prev, { ...createdDecoration, item_type: 'decoration' }])
      await fetchDeskItems(selectedDeskId)
      await logDeskActivity({
        actionType: 'created',
        itemType: 'decoration',
        itemId: createdDecoration.id,
        summary: 'added a decoration'
      })
    } else {
      console.error('Failed to create decoration:', error)
      setEditSaveError(error?.message || 'Failed to create decoration.')
    }

    setShowNewNoteMenu(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function handleDeleteAccount() {
    setDeleteAccountError('')
    setDeleteAccountDialog({
      isOpen: true,
      confirmationText: ''
    })
  }

  function closeDeleteAccountDialog() {
    if (deleteAccountDeleting) return
    setDeleteAccountDialog({
      isOpen: false,
      confirmationText: ''
    })
  }

  async function submitDeleteAccountDialog(e) {
    e.preventDefault()
    if (deleteAccountDeleting) return

    if (deleteAccountDialog.confirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteAccountError('Type DELETE exactly to continue.')
      return
    }

    setDeleteAccountError('')
    setDeleteAccountDeleting(true)

    try {
      const { error } = await supabase.functions.invoke('delete-account')
      if (error) {
        const message = `${error?.message || ''}`.toLowerCase()
        if (message.includes('function') || message.includes('404')) {
          throw new Error('Delete-account function is not deployed yet. Deploy the Supabase Edge Function first.')
        }
        throw error
      }

      localStorage.removeItem(lastDeskStorageKey)
      localStorage.removeItem(shelfPrefsStorageKey)

      setDeleteAccountDialog({
        isOpen: false,
        confirmationText: ''
      })

      await supabase.auth.signOut()
    } catch (error) {
      console.error('Failed to delete account data:', error)
      setDeleteAccountError(error?.message || 'Could not delete account data.')
    } finally {
      setDeleteAccountDeleting(false)
    }

  }

  async function ensureCurrentUserProfile() {
    const email = (user.email || '').trim().toLowerCase()
    if (!email) return

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email }, { onConflict: 'id' })

    if (error) {
      console.error('Failed to ensure profile exists:', error)
    }
  }

  async function fetchCurrentUserProfile() {
    setPreferredNameError('')
    setPreferredNameMessage('')

    try {
      await ensureCurrentUserProfile()
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_name')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      setPreferredNameInput((data?.preferred_name || '').trim())
    } catch (error) {
      console.error('Failed to fetch current profile:', error)
      const message = error?.message || ''
      if (message.toLowerCase().includes('preferred_name')) {
        setPreferredNameError('Preferred name is not available yet. Add a preferred_name column to profiles first.')
      } else {
        setPreferredNameError('Could not load preferred name.')
      }
    }
  }

  async function savePreferredName() {
    const nextPreferredName = preferredNameInput.trim()

    setPreferredNameSaving(true)
    setPreferredNameError('')
    setPreferredNameMessage('')

    try {
      await ensureCurrentUserProfile()
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_name: nextPreferredName || null })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      setPreferredNameMessage('Preferred name saved.')
      if (selectedDeskId) {
        await fetchDeskItems(selectedDeskId)
      }
    } catch (error) {
      console.error('Failed to save preferred name:', error)
      const message = error?.message || ''
      if (message.toLowerCase().includes('preferred_name')) {
        setPreferredNameError('Preferred name is not available yet. Add a preferred_name column to profiles first.')
      } else {
        setPreferredNameError(error?.message || 'Could not save preferred name.')
      }
    } finally {
      setPreferredNameSaving(false)
    }
  }

  async function ensureUserStats() {
    const { error } = await supabase
      .from('user_stats')
      .upsert({ user_id: user.id }, { onConflict: 'user_id' })

    if (error) {
      console.error('Failed to ensure user stats row:', error)
    }
  }

  async function fetchUserStats() {
    setProfileStatsLoading(true)
    try {
      await ensureUserStats()
      const { data, error } = await supabase
        .from('user_stats')
        .select('desks_created, desks_deleted')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      setProfileStats({
        desks_created: Number(data?.desks_created) || 0,
        desks_deleted: Number(data?.desks_deleted) || 0
      })
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
      setProfileStats({ desks_created: 0, desks_deleted: 0 })
    } finally {
      setProfileStatsLoading(false)
    }
  }

  async function incrementUserStat(statColumn, amount = 1) {
    if (statColumn !== 'desks_created' && statColumn !== 'desks_deleted') return

    try {
      await ensureUserStats()

      const { data, error } = await supabase
        .from('user_stats')
        .select('desks_created, desks_deleted')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      const currentCreated = Number(data?.desks_created) || 0
      const currentDeleted = Number(data?.desks_deleted) || 0
      const nextValues = statColumn === 'desks_created'
        ? { desks_created: currentCreated + amount, desks_deleted: currentDeleted }
        : { desks_created: currentCreated, desks_deleted: currentDeleted + amount }

      const { error: updateError } = await supabase
        .from('user_stats')
        .update(nextValues)
        .eq('user_id', user.id)

      if (updateError) {
        throw updateError
      }

      setProfileStats(nextValues)
    } catch (error) {
      console.error('Failed to update user stats:', error)
    }
  }


  async function fetchFriends() {
    setFriendsLoading(true)
    setFriendError('')

    try {
      await ensureCurrentUserProfile()

      const [incomingResult, outgoingResult, acceptedResult] = await Promise.all([
        supabase
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at')
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at')
          .eq('sender_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at')
          .or(`and(sender_id.eq.${user.id},status.eq.accepted),and(receiver_id.eq.${user.id},status.eq.accepted)`)
          .order('created_at', { ascending: false })
      ])

      if (incomingResult.error || outgoingResult.error || acceptedResult.error) {
        throw incomingResult.error || outgoingResult.error || acceptedResult.error
      }

      const incomingRows = incomingResult.data || []
      const outgoingRows = outgoingResult.data || []
      const acceptedRows = acceptedResult.data || []

      const profileIds = new Set()
      incomingRows.forEach((row) => profileIds.add(row.sender_id))
      outgoingRows.forEach((row) => profileIds.add(row.receiver_id))
      acceptedRows.forEach((row) => {
        const otherId = row.sender_id === user.id ? row.receiver_id : row.sender_id
        profileIds.add(otherId)
      })

      let profileEmailById = new Map()
      const profileIdList = Array.from(profileIds)

      if (profileIdList.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, preferred_name')
          .in('id', profileIdList)

        if (profilesError) {
          throw profilesError
        }

        profileEmailById = new Map((profilesData || []).map((profile) => [
          profile.id,
          {
            email: profile.email || 'Unknown user',
            preferred_name: profile.preferred_name || ''
          }
        ]))
      }

      setIncomingFriendRequests(
        incomingRows.map((row) => ({
          ...row,
          email: profileEmailById.get(row.sender_id)?.email || 'Unknown user',
          preferred_name: profileEmailById.get(row.sender_id)?.preferred_name || ''
        }))
      )

      setOutgoingFriendRequests(
        outgoingRows.map((row) => ({
          ...row,
          email: profileEmailById.get(row.receiver_id)?.email || 'Unknown user',
          preferred_name: profileEmailById.get(row.receiver_id)?.preferred_name || ''
        }))
      )

      setFriends(
        acceptedRows.map((row) => {
          const friendId = row.sender_id === user.id ? row.receiver_id : row.sender_id
          return {
            id: friendId,
            email: profileEmailById.get(friendId)?.email || 'Unknown user',
            preferred_name: profileEmailById.get(friendId)?.preferred_name || ''
          }
        })
      )
    } catch (error) {
      console.error('Failed to fetch friends:', error)
      setFriendError(error?.message || 'Could not load friends right now.')
    } finally {
      setFriendsLoading(false)
    }
  }

  async function sendFriendRequestToUser(targetUserId, targetEmail) {
    if (!targetUserId) {
      return { ok: false, errorMessage: 'Could not resolve target user.' }
    }

    if (targetUserId === user.id) {
      return { ok: false, errorMessage: 'You cannot add yourself as a friend.' }
    }

    const safeTargetEmail = (targetEmail || '').trim().toLowerCase()

    await ensureCurrentUserProfile()

    const { data: existingRows, error: existingError } = await supabase
      .from('friend_requests')
      .select('id, status, sender_id, receiver_id')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
      .limit(1)

    if (existingError) {
      return { ok: false, errorMessage: existingError?.message || 'Could not check existing friend requests.' }
    }

    const existingRow = existingRows?.[0]
    if (existingRow) {
      if (existingRow.status === 'accepted') {
        return { ok: false, errorMessage: 'You are already friends with this user.' }
      }

      if (existingRow.status === 'pending') {
        if (existingRow.receiver_id === user.id) {
          return { ok: false, errorMessage: 'This user already sent you a request. Accept it in the Friends tab.' }
        }
        return { ok: false, errorMessage: 'Friend request already sent.' }
      }
    }

    const { error: insertError } = await supabase
      .from('friend_requests')
      .insert([{ sender_id: user.id, receiver_id: targetUserId, status: 'pending' }])

    if (insertError) {
      return { ok: false, errorMessage: insertError?.message || 'Could not send friend request.' }
    }

    return {
      ok: true,
      successMessage: `Friend request sent${safeTargetEmail ? ` to ${safeTargetEmail}` : ''}.`
    }
  }

  async function handleSendFriendRequest(e) {
    e.preventDefault()

    const targetEmail = friendEmailInput.trim().toLowerCase()
    if (!targetEmail) {
      setFriendError('Enter an email address to add a friend.')
      return
    }

    if (targetEmail === (user.email || '').trim().toLowerCase()) {
      setFriendError('You cannot add yourself as a friend.')
      return
    }

    setFriendSubmitting(true)
    setFriendError('')
    setFriendMessage('')

    try {
      const { data: targetProfiles, error: targetError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', targetEmail)
        .limit(1)

      if (targetError) {
        throw targetError
      }

      const targetProfile = targetProfiles?.[0]
      if (!targetProfile) {
        setFriendError('No user found with that email yet.')
        return
      }

      const sendResult = await sendFriendRequestToUser(targetProfile.id, targetEmail)
      if (!sendResult.ok) {
        setFriendError(sendResult.errorMessage || 'Could not send friend request.')
        return
      }

      setFriendMessage(sendResult.successMessage || `Friend request sent to ${targetEmail}.`)
      setFriendEmailInput('')
      await fetchFriends()
    } catch (error) {
      console.error('Failed to send friend request:', error)
      setFriendError(error?.message || 'Could not send friend request.')
    } finally {
      setFriendSubmitting(false)
    }
  }

  async function sendFriendRequestToDeskMember(memberUserId, memberEmail) {
    setDeskMembersError('')
    setDeskMembersMessage('')

    const loadingKey = `friend-request:${memberUserId}`
    setDeskMemberActionLoadingId(loadingKey)

    const sendResult = await sendFriendRequestToUser(memberUserId, memberEmail)
    if (!sendResult.ok) {
      setDeskMembersError(sendResult.errorMessage || 'Could not send friend request.')
      setDeskMemberActionLoadingId(null)
      return
    }

    setDeskMembersMessage(sendResult.successMessage || 'Friend request sent.')
    await fetchFriends()
    setDeskMemberActionLoadingId(null)
  }

  async function respondToFriendRequest(requestId, nextStatus) {
    setFriendError('')
    setFriendMessage('')

    const { error } = await supabase
      .from('friend_requests')
      .update({ status: nextStatus })
      .eq('id', requestId)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')

    if (error) {
      console.error('Failed to update friend request:', error)
      setFriendError(error?.message || 'Could not update request.')
      return
    }

    setFriendMessage(nextStatus === 'accepted' ? 'Friend request accepted.' : 'Friend request declined.')
    await fetchFriends()
  }

  async function cancelOutgoingFriendRequest(requestId) {
    setFriendError('')
    setFriendMessage('')

    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId)
      .eq('sender_id', user.id)
      .eq('status', 'pending')

    if (error) {
      console.error('Failed to cancel friend request:', error)
      setFriendError(error?.message || 'Could not cancel request.')
      return
    }

    setFriendMessage('Friend request canceled.')
    await fetchFriends()
  }

  async function removeFriend(friendId) {
    if (!friendId) return

    const friend = friends.find((entry) => entry.id === friendId)
    const friendDisplay = getProfileDisplayParts(friend)

    openConfirmDialog({
      title: 'Remove Friend',
      message: `Remove ${friendDisplay.primary || 'this friend'} from your friends list?`,
      confirmLabel: 'Remove',
      tone: 'danger',
      onConfirm: async () => {
        setFriendActionLoadingId(friendId)
        setFriendError('')
        setFriendMessage('')

        const { error } = await supabase
          .from('friend_requests')
          .delete()
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId},status.eq.accepted),and(sender_id.eq.${friendId},receiver_id.eq.${user.id},status.eq.accepted)`)

        if (error) {
          console.error('Failed to remove friend:', error)
          setFriendError(error?.message || 'Could not remove friend.')
          setFriendActionLoadingId(null)
          return
        }

        setFriendMessage('Friend removed.')
        await fetchFriends()
        setFriendActionLoadingId(null)
      }
    })
  }

  function normalizeRotation(value) {
    return ((value % 360) + 360) % 360
  }

  function toStoredRotation(value) {
    return Math.round(normalizeRotation(value))
  }

  async function persistRotation(itemKey, rotationValue) {
    const item = notesRef.current.find((row) => getItemKey(row) === itemKey)
    if (!item) return null

    markAutoSaveSaving()

    const storedRotation = toStoredRotation(rotationValue)
    const table = getItemTableName(item)
    const { error } = await supabase
      .from(table)
      .update({ rotation: storedRotation, desk_id: selectedDeskId })
      .eq('id', item.id)
      .eq('desk_id', selectedDeskId)

    if (error) {
      console.error('Failed to save item rotation:', error)
      markAutoSaveError(error?.message || 'Failed to save rotation.')
      return null
    }

    markAutoSaveSaved()
    return storedRotation
  }

  async function persistItemPosition(itemKey, x, y) {
    const item = notesRef.current.find((row) => getItemKey(row) === itemKey)
    if (!item) return

    const normalizedX = Math.max(0, Math.round(Number.isFinite(Number(x)) ? Number(x) : Number(item.x) || 0))
    const normalizedY = Math.max(0, Math.round(Number.isFinite(Number(y)) ? Number(y) : Number(item.y) || 0))

    if (Number(item.x) === normalizedX && Number(item.y) === normalizedY) {
      markAutoSaveSaved()
      return
    }

    markAutoSaveSaving()

    const table = getItemTableName(item)
    const { error } = await supabase
      .from(table)
      .update({ x: normalizedX, y: normalizedY })
      .eq('id', item.id)
      .eq('desk_id', selectedDeskId)

    if (error) {
      console.error('Failed to save item position:', error)
      markAutoSaveError(error?.message || 'Failed to save position.')
      return
    }

    markAutoSaveSaved()
  }

  async function persistItemSize(itemKey, width, height) {
    const item = notesRef.current.find((row) => getItemKey(row) === itemKey)
    if (!item) return

    markAutoSaveSaving()

    const table = getItemTableName(item)
    const { error } = await supabase
      .from(table)
      .update({ width, height, desk_id: selectedDeskId })
      .eq('id', item.id)
      .eq('desk_id', selectedDeskId)

    if (error) {
      console.error('Failed to save item size:', error)
      markAutoSaveError(error?.message || 'Failed to save size.')
      return
    }

    markAutoSaveSaved()
  }

  function moveItemLayer(itemKey, direction) {
    setNotes((prev) => {
      const currentIndex = prev.findIndex((entry) => getItemKey(entry) === itemKey)
      if (currentIndex === -1) return prev

      const nextItems = [...prev]
      const [target] = nextItems.splice(currentIndex, 1)

      if (direction === 'front') {
        nextItems.push(target)
      } else {
        nextItems.unshift(target)
      }

      return nextItems
    })
  }

  function getEventPosition(event) {
    if (event?.touches?.length) {
      const touch = event.touches[0]
      return {
        pageX: touch.pageX,
        pageY: touch.pageY,
        clientX: touch.clientX,
        clientY: touch.clientY
      }
    }

    if (event?.changedTouches?.length) {
      const touch = event.changedTouches[0]
      return {
        pageX: touch.pageX,
        pageY: touch.pageY,
        clientX: touch.clientX,
        clientY: touch.clientY
      }
    }

    return {
      pageX: event?.pageX ?? 0,
      pageY: event?.pageY ?? 0,
      clientX: event?.clientX ?? 0,
      clientY: event?.clientY ?? 0
    }
  }

  function handleResizeMouseDown(e, item) {
    if (!canCurrentUserEditDeskItems) return
    if (typeof e.button === 'number' && e.button !== 0) return
    if (typeof e.isPrimary === 'boolean' && !e.isPrimary) return

    e.preventDefault()
    e.stopPropagation()

    const { pageX, pageY, clientX, clientY } = getEventPosition(e)

    const itemKey = getItemKey(item)
    const startWidth = getItemWidth(item)
    const startHeight = getItemHeight(item)
    isResizingRef.current = true
    resizeLastDimensionsRef.current = { width: startWidth, height: startHeight }
    resizingPointerIdRef.current = typeof e.pointerId === 'number' ? e.pointerId : null

    resizeStartRef.current = {
      itemKey,
      startPageX: pageX,
      startPageY: pageY,
      startWidth,
      startHeight
    }

    setResizingId(itemKey)
    setResizeOverlay({
      x: clientX,
      y: clientY,
      scale: 1,
      ratioLocked: false,
      width: startWidth,
      height: startHeight
    })

    window.addEventListener('pointermove', handleResizeMouseMove)
    window.addEventListener('pointerup', handleResizeMouseUp)
    window.addEventListener('pointercancel', handleResizeMouseUp)
  }

  function handleResizeMouseMove(e) {
    if (resizingPointerIdRef.current !== null && e.pointerId !== resizingPointerIdRef.current) return

    const activeItemKey = resizeStartRef.current.itemKey
    if (!activeItemKey) return

    const { pageX, pageY, clientX, clientY } = getEventPosition(e)

    const activeItem = notesRef.current.find((item) => getItemKey(item) === activeItemKey)
    if (!activeItem) return

    const deltaX = pageX - resizeStartRef.current.startPageX
    const deltaY = pageY - resizeStartRef.current.startPageY
    const isDecoration = isDecorationItem(activeItem)
    const isRatioLocked = isDecoration || e.shiftKey

    const minWidth = isDecoration ? 44 : 120
    const minHeight = isDecoration ? 44 : 100
    const maxWidth = isDecoration ? 360 : 700
    const maxHeight = isDecoration ? 360 : 700

    let nextWidth = 0
    let nextHeight = 0
    let scale = 1

    if (isRatioLocked) {
      const widthScale = (resizeStartRef.current.startWidth + deltaX) / resizeStartRef.current.startWidth
      const heightScale = (resizeStartRef.current.startHeight + deltaY) / resizeStartRef.current.startHeight
      scale = Math.max(0.1, (widthScale + heightScale) / 2)
      nextWidth = clampDimension(Math.round(resizeStartRef.current.startWidth * scale), minWidth, maxWidth)
      nextHeight = clampDimension(Math.round(resizeStartRef.current.startHeight * scale), minHeight, maxHeight)

      if (isDecoration) {
        const lockedSide = Math.min(nextWidth, nextHeight)
        nextWidth = lockedSide
        nextHeight = lockedSide
      }
    } else {
      nextWidth = Math.round(resizeStartRef.current.startWidth + deltaX)
      nextHeight = Math.round(resizeStartRef.current.startHeight + deltaY)
      nextWidth = clampDimension(nextWidth, minWidth, maxWidth)
      nextHeight = clampDimension(nextHeight, minHeight, maxHeight)

      const widthScale = nextWidth / resizeStartRef.current.startWidth
      const heightScale = nextHeight / resizeStartRef.current.startHeight
      scale = (widthScale + heightScale) / 2
    }

    setNotes((prev) =>
      prev.map((item) =>
        getItemKey(item) === activeItemKey ? { ...item, width: nextWidth, height: nextHeight } : item
      )
    )
    resizeLastDimensionsRef.current = { width: nextWidth, height: nextHeight }

    setResizeOverlay({
      x: clientX,
      y: clientY,
      scale,
      ratioLocked: isRatioLocked,
      width: nextWidth,
      height: nextHeight
    })
  }

  async function handleResizeMouseUp(e) {
    if (resizingPointerIdRef.current !== null && e?.pointerId !== undefined && e.pointerId !== resizingPointerIdRef.current) return

    const activeItemKey = resizeStartRef.current.itemKey
    isResizingRef.current = false
    resizingPointerIdRef.current = null

    window.removeEventListener('pointermove', handleResizeMouseMove)
    window.removeEventListener('pointerup', handleResizeMouseUp)
    window.removeEventListener('pointercancel', handleResizeMouseUp)

    setResizingId(null)
    setResizeOverlay(null)

    if (!activeItemKey) {
      resizeLastDimensionsRef.current = null
      flushDeferredRemoteNotes()
      return
    }

    let nextDimensions = resizeLastDimensionsRef.current
    if (!nextDimensions) {
      const resizedItem = notesRef.current.find((item) => getItemKey(item) === activeItemKey)
      if (!resizedItem) {
        resizeStartRef.current.itemKey = null
        flushDeferredRemoteNotes()
        return
      }
      nextDimensions = {
        width: getItemWidth(resizedItem),
        height: getItemHeight(resizedItem)
      }
    }

    setNotes((prev) =>
      prev.map((item) =>
        getItemKey(item) === activeItemKey
          ? { ...item, width: nextDimensions.width, height: nextDimensions.height }
          : item
      )
    )

    await persistItemSize(activeItemKey, nextDimensions.width, nextDimensions.height)
    resizeStartRef.current.itemKey = null
    resizeLastDimensionsRef.current = null
    flushDeferredRemoteNotes()
  }

  async function saveItemEdits(item) {
    const nextRotation = toStoredRotation(Number(item.rotation) || 0)
    const nextColor = (editColor || getItemColor(item)).trim() || getDefaultItemColor(item.item_type)
    const nextTextColor = (editTextColor || getItemTextColor(item)).trim() || '#222222'
    const nextFontSize = normalizeFontSize(editFontSize, getItemFontSize(item))
    const nextFontFamily = (editFontFamily || 'inherit').trim() || 'inherit'
    const itemKey = getItemKey(item)

    if (!isChecklistItem(item)) {
      const basePayload = {
        content: editValue,
        rotation: nextRotation,
        color: nextColor,
        font_family: nextFontFamily,
        desk_id: selectedDeskId
      }
      let persistedTextColor = nextTextColor
      let persistedFontSize = nextFontSize

      let { error: saveError } = await supabase
        .from('notes')
        .update({ ...basePayload, text_color: nextTextColor, font_size: nextFontSize })
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)

      if (saveError && isMissingColumnError(saveError, 'text_color')) {
        const { error: retryError } = await supabase
          .from('notes')
          .update(basePayload)
          .eq('id', item.id)
          .eq('desk_id', selectedDeskId)

        if (!retryError) {
          saveError = null
          persistedTextColor = getItemTextColor(item)
          persistedFontSize = getItemFontSize(item)
        } else {
          saveError = retryError
        }
      } else if (saveError && isMissingColumnError(saveError, 'font_size')) {
        const { error: retryError } = await supabase
          .from('notes')
          .update({ ...basePayload, text_color: nextTextColor })
          .eq('id', item.id)
          .eq('desk_id', selectedDeskId)

        if (!retryError) {
          saveError = null
          persistedFontSize = getItemFontSize(item)
        } else {
          saveError = retryError
        }
      }

      if (saveError) {
        console.error('Failed to save note:', saveError)
        return { ok: false, errorMessage: saveError?.message || 'Failed to save note.' }
      }

      setNotes((prev) =>
        prev.map((row) =>
          getItemKey(row) === itemKey ? {
            ...row,
            content: editValue,
            rotation: nextRotation,
            color: nextColor,
            text_color: persistedTextColor,
            font_size: persistedFontSize,
            font_family: nextFontFamily
          } : row
        )
      )
      return { ok: true }
    }

    const nextItems = checklistEditItems
      .map((entry, index) => ({
        text: (entry.text || '').trim(),
        is_checked: Boolean(entry.is_checked),
        sort_order: index,
        due_at: normalizeChecklistReminderValue(entry.due_at)
      }))
      .filter((entry) => entry.text.length > 0)

    const baseChecklistPayload = {
      title: editValue.trim() || 'Checklist',
      rotation: nextRotation,
      color: nextColor,
      font_family: nextFontFamily,
      desk_id: selectedDeskId
    }
    let persistedTextColor = nextTextColor
    let persistedFontSize = nextFontSize

    let { error: checklistSaveError } = await supabase
      .from('checklists')
      .update({ ...baseChecklistPayload, text_color: nextTextColor, font_size: nextFontSize })
      .eq('id', item.id)
      .eq('desk_id', selectedDeskId)

    if (checklistSaveError && isMissingColumnError(checklistSaveError, 'text_color')) {
      const { error: retryChecklistError } = await supabase
        .from('checklists')
        .update(baseChecklistPayload)
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)

      if (!retryChecklistError) {
        checklistSaveError = null
        persistedTextColor = getItemTextColor(item)
        persistedFontSize = getItemFontSize(item)
      } else {
        checklistSaveError = retryChecklistError
      }
    } else if (checklistSaveError && isMissingColumnError(checklistSaveError, 'font_size')) {
      const { error: retryChecklistError } = await supabase
        .from('checklists')
        .update({ ...baseChecklistPayload, text_color: nextTextColor })
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)

      if (!retryChecklistError) {
        checklistSaveError = null
        persistedFontSize = getItemFontSize(item)
      } else {
        checklistSaveError = retryChecklistError
      }
    }

    if (checklistSaveError) {
      console.error('Failed to save checklist:', checklistSaveError)
      return { ok: false, errorMessage: checklistSaveError?.message || 'Failed to save checklist.' }
    }

    const { error: deleteItemsError } = await supabase
      .from('checklist_items')
      .delete()
      .eq('checklist_id', item.id)

    if (deleteItemsError) {
      console.error('Failed clearing checklist items:', deleteItemsError)
      return { ok: false, errorMessage: deleteItemsError?.message || 'Failed updating checklist items.' }
    }

    let insertedItems = []
    if (nextItems.length > 0) {
      try {
        insertedItems = await insertChecklistItemsWithReminderFallback(
          nextItems.map((entry) => ({ ...entry, checklist_id: item.id })),
          { includeSelect: true }
        )
      } catch (insertItemsError) {
        console.error('Failed saving checklist items:', insertItemsError)
        return { ok: false, errorMessage: insertItemsError?.message || 'Failed saving checklist items.' }
      }
    }

    setNotes((prev) =>
      prev.map((row) =>
        getItemKey(row) === itemKey
          ? {
              ...row,
              title: editValue.trim() || 'Checklist',
              rotation: nextRotation,
              color: nextColor,
              text_color: persistedTextColor,
              font_size: persistedFontSize,
              font_family: nextFontFamily,
              items: insertedItems
            }
          : row
      )
    )

    return { ok: true }
  }

  async function commitItemEdits(item) {
    if (!canCurrentUserEditDeskItems) return
    if (isSavingEdit) return

    markAutoSaveSaving()
    setIsSavingEdit(true)
    setEditSaveError('')

    let saveResult = { ok: false }
    try {
      saveResult = await saveItemEdits(item)
    } catch (error) {
      console.error('Unexpected save error:', error)
      setEditSaveError('Save failed. Please try again.')
      markAutoSaveError('Save failed. Please try again.')
      return
    } finally {
      setIsSavingEdit(false)
    }

    if (!saveResult.ok) {
      setEditSaveError(saveResult.errorMessage || 'Save failed. Please check your connection and try again.')
      markAutoSaveError(saveResult.errorMessage || 'Save failed. Please check your connection and try again.')
      return
    }

    setEditingId(null)
    setEditValue('')
    setChecklistEditItems([])
    setNewChecklistItemText('')
    setShowStyleEditor(false)
    setEditColor('#fff59d')
    setEditTextColor('#222222')
    setEditFontSize(16)
    setEditFontFamily('inherit')
    setEditSaveError('')
    await logDeskActivity({
      actionType: 'edited',
      itemType: isChecklistItem(item) ? 'checklist' : 'note',
      itemId: item.id,
      summary: isChecklistItem(item) ? 'edited a checklist' : 'edited a note'
    })
    markAutoSaveSaved()
  }

  async function toggleChecklistItem(itemKey, itemIndex) {
    if (!canCurrentUserEditDeskItems) return
    const checklist = notesRef.current.find((row) => getItemKey(row) === itemKey)
    if (!checklist || !isChecklistItem(checklist)) return

    const targetItem = checklist.items?.[itemIndex]
    if (!targetItem) return

    const nextChecked = !targetItem.is_checked

    markAutoSaveSaving()

    setNotes((prev) =>
      prev.map((row) =>
        getItemKey(row) === itemKey
          ? {
              ...row,
              items: row.items.map((entry, index) =>
                index === itemIndex ? { ...entry, is_checked: nextChecked } : entry
              )
            }
          : row
      )
    )

    const { error } = await supabase
      .from('checklist_items')
      .update({ is_checked: nextChecked })
      .eq('id', targetItem.id)

    if (error) {
      console.error('Failed to toggle checklist item:', error)
      markAutoSaveError(error?.message || 'Failed to save checklist item.')
      await fetchDeskItems(selectedDeskId)
      return
    }

    await logDeskActivity({
      actionType: nextChecked ? 'checked' : 'unchecked',
      itemType: 'checklist item',
      itemId: targetItem.id,
      summary: nextChecked ? 'checked off a checklist item' : 'unchecked a checklist item'
    })

    markAutoSaveSaved()
  }

  function getPointerAngleFromCenter(pageX, pageY) {
    return (Math.atan2(pageY - rotationCenterRef.current.y, pageX - rotationCenterRef.current.x) * 180) / Math.PI
  }

  function handleRotateMouseDown(e, item) {
    if (!canCurrentUserEditDeskItems) return
    if (typeof e.button === 'number' && e.button !== 0) return
    if (typeof e.isPrimary === 'boolean' && !e.isPrimary) return

    e.preventDefault()
    e.stopPropagation()

    const { pageX, pageY } = getEventPosition(e)

    const noteElement = e.currentTarget.closest('[data-note-id]')
    if (!noteElement) return

    const rect = noteElement.getBoundingClientRect()
    const centerX = rect.left + window.scrollX + rect.width / 2
    const centerY = rect.top + window.scrollY + rect.height / 2
    rotationCenterRef.current = { x: centerX, y: centerY }

    const currentRotation = Number(item.rotation) || 0
    const pointerAngle = getPointerAngleFromCenter(pageX, pageY)
    rotationOffsetRef.current = currentRotation - pointerAngle
    const itemKey = getItemKey(item)
    isRotatingRef.current = true
    rotateLastValueRef.current = normalizeRotation(currentRotation)
    rotatingPointerIdRef.current = typeof e.pointerId === 'number' ? e.pointerId : null
    rotatingNoteIdRef.current = itemKey
    setRotatingId(itemKey)

    window.addEventListener('pointermove', handleRotateMouseMove)
    window.addEventListener('pointerup', handleRotateMouseUp)
    window.addEventListener('pointercancel', handleRotateMouseUp)
  }

  function handleRotateMouseMove(e) {
    if (rotatingPointerIdRef.current !== null && e.pointerId !== rotatingPointerIdRef.current) return

    const activeRotatingId = rotatingNoteIdRef.current
    if (!activeRotatingId) return

    const { pageX, pageY } = getEventPosition(e)

    const pointerAngle = getPointerAngleFromCenter(pageX, pageY)
    const nextRotation = normalizeRotation(pointerAngle + rotationOffsetRef.current)
    rotateLastValueRef.current = nextRotation

    setNotes((prev) =>
      prev.map((item) =>
        getItemKey(item) === activeRotatingId ? { ...item, rotation: nextRotation } : item
      )
    )
  }

  async function handleRotateMouseUp(e) {
    if (rotatingPointerIdRef.current !== null && e?.pointerId !== undefined && e.pointerId !== rotatingPointerIdRef.current) return

    const activeRotatingId = rotatingNoteIdRef.current

    isRotatingRef.current = false
    rotatingNoteIdRef.current = null
    rotatingPointerIdRef.current = null
    setRotatingId(null)
    window.removeEventListener('pointermove', handleRotateMouseMove)
    window.removeEventListener('pointerup', handleRotateMouseUp)
    window.removeEventListener('pointercancel', handleRotateMouseUp)

    if (!activeRotatingId) {
      rotateLastValueRef.current = null
      flushDeferredRemoteNotes()
      return
    }

    let nextRotation = null

    if (rotateLastValueRef.current !== null) {
      nextRotation = rotateLastValueRef.current
    } else if (e) {
      const { pageX, pageY } = getEventPosition(e)
      const pointerAngle = getPointerAngleFromCenter(pageX, pageY)
      nextRotation = normalizeRotation(pointerAngle + rotationOffsetRef.current)
    } else {
      const itemToPersist = notesRef.current.find((item) => getItemKey(item) === activeRotatingId)
      if (!itemToPersist) {
        rotateLastValueRef.current = null
        flushDeferredRemoteNotes()
        return
      }
      nextRotation = Number(itemToPersist.rotation) || 0
    }

    setNotes((prev) =>
      prev.map((item) =>
        getItemKey(item) === activeRotatingId ? { ...item, rotation: nextRotation } : item
      )
    )

    const savedRotation = await persistRotation(activeRotatingId, nextRotation)
    if (savedRotation !== null) {
      setNotes((prev) =>
        prev.map((item) =>
          getItemKey(item) === activeRotatingId ? { ...item, rotation: savedRotation } : item
        )
      )
    }

    rotateLastValueRef.current = null
    flushDeferredRemoteNotes()
  }

  function requestDeleteNote(itemKey) {
    if (!canCurrentUserEditDeskItems) return
    setPendingDeleteId(itemKey)
  }

  function getDuplicatePosition(item) {
    const offset = 24
    const nextX = Math.max(0, (Number(item?.x) || 0) + offset)
    const nextY = Math.max(0, (Number(item?.y) || 0) + offset)
    return { x: nextX, y: nextY }
  }

  async function duplicateItem(itemKey) {
    if (!canCurrentUserEditDeskItems) return
    if (!selectedDeskId) return

    const sourceItem = notesRef.current.find((row) => getItemKey(row) === itemKey)
    if (!sourceItem) return

    markAutoSaveSaving()

    const { x: nextX, y: nextY } = getDuplicatePosition(sourceItem)

    try {
      if (isDecorationItem(sourceItem)) {
        const { data, error } = await supabase
          .from('decorations')
          .insert([{
            desk_id: selectedDeskId,
            kind: sourceItem.kind || 'pin',
            x: nextX,
            y: nextY,
            rotation: toStoredRotation(Number(sourceItem.rotation) || 0),
            width: getItemWidth(sourceItem),
            height: getItemHeight(sourceItem)
          }])
          .select()

        const duplicatedDecoration = data?.[0]
        if (!duplicatedDecoration || error) {
          throw error || new Error('Failed to duplicate decoration.')
        }

        setNotes((prev) => [...prev, { ...duplicatedDecoration, item_type: 'decoration' }])
        setActiveDecorationHandleId(`decoration-${duplicatedDecoration.id}`)
        await fetchDeskItems(selectedDeskId)
        await logDeskActivity({
          actionType: 'duplicated',
          itemType: 'decoration',
          itemId: duplicatedDecoration.id,
          summary: 'duplicated a decoration'
        })
        markAutoSaveSaved()
        return
      }

      if (isChecklistItem(sourceItem)) {
        let checklistData = null
        let checklistError = null

        const withUserResult = await supabase
          .from('checklists')
          .insert([{
            desk_id: selectedDeskId,
            user_id: sourceItem.user_id || user.id,
            title: sourceItem.title || 'Checklist',
            color: getItemColor(sourceItem),
            font_family: getItemFontFamily(sourceItem),
            x: nextX,
            y: nextY,
            rotation: toStoredRotation(Number(sourceItem.rotation) || 0),
            width: getItemWidth(sourceItem),
            height: getItemHeight(sourceItem)
          }])
          .select()

        checklistData = withUserResult.data
        checklistError = withUserResult.error

        if (checklistError) {
          const fallbackResult = await supabase
            .from('checklists')
            .insert([{
              desk_id: selectedDeskId,
              title: sourceItem.title || 'Checklist',
              color: getItemColor(sourceItem),
              font_family: getItemFontFamily(sourceItem),
              x: nextX,
              y: nextY,
              rotation: toStoredRotation(Number(sourceItem.rotation) || 0),
              width: getItemWidth(sourceItem),
              height: getItemHeight(sourceItem)
            }])
            .select()

          checklistData = fallbackResult.data
          checklistError = fallbackResult.error
        }

        const createdChecklist = checklistData?.[0]
        if (!createdChecklist || checklistError) {
          throw checklistError || new Error('Failed to duplicate checklist.')
        }

        const sourceItems = (sourceItem.items || []).map((entry, index) => ({
          checklist_id: createdChecklist.id,
          text: (entry?.text || '').trim(),
          is_checked: Boolean(entry?.is_checked),
          sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : index,
          due_at: normalizeChecklistReminderValue(entry?.due_at)
        })).filter((entry) => entry.text.length > 0)

        let insertedItems = []
        if (sourceItems.length > 0) {
          insertedItems = await insertChecklistItemsWithReminderFallback(sourceItems, { includeSelect: true })
        }

        setNotes((prev) => [
          ...prev,
          {
            ...createdChecklist,
            item_type: 'checklist',
            items: insertedItems
          }
        ])
        await fetchDeskItems(selectedDeskId)
        await logDeskActivity({
          actionType: 'duplicated',
          itemType: 'checklist',
          itemId: createdChecklist.id,
          summary: 'duplicated a checklist'
        })
        markAutoSaveSaved()
        return
      }

      let noteData = null
      let noteError = null

      const withUserResult = await supabase
        .from('notes')
        .insert([{
          desk_id: selectedDeskId,
          user_id: sourceItem.user_id || user.id,
          content: sourceItem.content || 'New note',
          color: getItemColor(sourceItem),
          font_family: getItemFontFamily(sourceItem),
          x: nextX,
          y: nextY,
          rotation: toStoredRotation(Number(sourceItem.rotation) || 0),
          width: getItemWidth(sourceItem),
          height: getItemHeight(sourceItem)
        }])
        .select()

      noteData = withUserResult.data
      noteError = withUserResult.error

      if (noteError) {
        const fallbackResult = await supabase
          .from('notes')
          .insert([{
            desk_id: selectedDeskId,
            content: sourceItem.content || 'New note',
            color: getItemColor(sourceItem),
            font_family: getItemFontFamily(sourceItem),
            x: nextX,
            y: nextY,
            rotation: toStoredRotation(Number(sourceItem.rotation) || 0),
            width: getItemWidth(sourceItem),
            height: getItemHeight(sourceItem)
          }])
          .select()

        noteData = fallbackResult.data
        noteError = fallbackResult.error
      }

      const duplicatedNote = noteData?.[0]
      if (!duplicatedNote || noteError) {
        throw noteError || new Error('Failed to duplicate note.')
      }

      setNotes((prev) => [...prev, { ...duplicatedNote, item_type: 'note' }])
      await fetchDeskItems(selectedDeskId)
      await logDeskActivity({
        actionType: 'duplicated',
        itemType: 'note',
        itemId: duplicatedNote.id,
        summary: 'duplicated a note'
      })
      markAutoSaveSaved()
    } catch (error) {
      console.error('Failed to duplicate item:', error)
      markAutoSaveError(error?.message || 'Failed to duplicate item.')
    }
  }

  async function confirmDeleteNote() {
    if (!canCurrentUserEditDeskItems) return
    if (!pendingDeleteId) return

    const item = notesRef.current.find((row) => getItemKey(row) === pendingDeleteId)
    if (!item) {
      setPendingDeleteId(null)
      return
    }

    let error = null

    if (isChecklistItem(item)) {
      const { error: checklistError } = await supabase
        .from('checklists')
        .delete()
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)
      error = checklistError
    } else if (isDecorationItem(item)) {
      const { error: decorationError } = await supabase
        .from('decorations')
        .delete()
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)
      error = decorationError
    } else {
      const { error: noteError } = await supabase
        .from('notes')
        .delete()
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)
      error = noteError
    }

    if (!error) {
      setNotes((prev) => prev.filter((row) => getItemKey(row) !== pendingDeleteId))
      if (editingId === pendingDeleteId) {
        setEditingId(null)
        setEditValue('')
        setChecklistEditItems([])
        setNewChecklistItemText('')
      }
    }

    setPendingDeleteId(null)
  }

  function handleDragStart(e, item) {
    if (!canCurrentUserEditDeskItems) return
    if (typeof e.button === 'number' && e.button !== 0) return
    if (typeof e.isPrimary === 'boolean' && !e.isPrimary) return
    if (editingId) return

    const { pageX, pageY } = getEventPosition(e)

    const itemKey = getItemKey(item)
    isDraggingRef.current = true
    setDraggedId(itemKey)
    draggedIdRef.current = itemKey
    dragPointerIdRef.current = typeof e.pointerId === 'number' ? e.pointerId : null
    dragLastPositionRef.current = { x: item.x, y: item.y }

    const offset = { x: pageX - item.x, y: pageY - item.y }
    setDragOffset(offset)
    dragOffsetRef.current = offset

    window.addEventListener('pointermove', handleDragMove)
    window.addEventListener('pointerup', handleDragEnd)
    window.addEventListener('pointercancel', handleDragEnd)
  }

  function handleDragMove(e) {
    if (dragPointerIdRef.current !== null && e.pointerId !== dragPointerIdRef.current) return

    const activeDraggedId = draggedIdRef.current
    if (!activeDraggedId) {
      dragLastPositionRef.current = null
      return
    }

    const { pageX, pageY } = getEventPosition(e)

    const activeItem = notesRef.current.find((item) => getItemKey(item) === activeDraggedId)
    const activeItemWidth = getItemWidth(activeItem)
    const activeItemHeight = getItemHeight(activeItem)

    const nextX = pageX - dragOffsetRef.current.x
    const nextY = pageY - dragOffsetRef.current.y
    const requiredWidth = Math.ceil(nextX + activeItemWidth + growThreshold)
    const effectiveCanvasWidth = Math.max(canvasWidth, requiredWidth)

    setCanvasWidth((prev) => {
      if (requiredWidth <= prev) return prev
      return requiredWidth
    })

    setCanvasHeight((prev) => {
      if (nextY + activeItemHeight + growThreshold <= prev) return prev
      const requiredHeight = nextY + activeItemHeight + growThreshold
      const requiredSections = Math.ceil(requiredHeight / sectionHeight)
      return Math.max(prev, requiredSections * sectionHeight)
    })

    const maxX = Math.max(0, effectiveCanvasWidth - activeItemWidth)
    const boundedX = Math.min(Math.max(0, nextX), maxX)
    const boundedY = Math.max(0, nextY)
    const snappedX = snapToGrid ? Math.min(Math.max(0, Math.round(boundedX / gridSize) * gridSize), maxX) : boundedX
    const snappedY = snapToGrid ? Math.max(0, Math.round(boundedY / gridSize) * gridSize) : boundedY
    dragLastPositionRef.current = { x: snappedX, y: snappedY }

    setNotes((prev) =>
      prev.map((item) =>
        getItemKey(item) === activeDraggedId
          ? { ...item, x: snappedX, y: snappedY }
          : item
      )
    )
  }

  async function handleDragEnd(e) {
    if (dragPointerIdRef.current !== null && e?.pointerId !== undefined && e.pointerId !== dragPointerIdRef.current) return

    const activeDraggedId = draggedIdRef.current

    setDraggedId(null)
    draggedIdRef.current = null
    dragPointerIdRef.current = null
    isDraggingRef.current = false
    window.removeEventListener('pointermove', handleDragMove)
    window.removeEventListener('pointerup', handleDragEnd)
    window.removeEventListener('pointercancel', handleDragEnd)

    if (!activeDraggedId) {
      dragLastPositionRef.current = null
      return
    }

    let nextPosition = null
    const lastPosition = dragLastPositionRef.current

    if (lastPosition) {
      nextPosition = lastPosition
    } else if (e) {
      const { pageX, pageY } = getEventPosition(e)
      const nextX = pageX - dragOffsetRef.current.x
      const nextY = pageY - dragOffsetRef.current.y
      const activeItem = notesRef.current.find((item) => getItemKey(item) === activeDraggedId)
      const activeItemWidth = getItemWidth(activeItem)
      const requiredWidth = Math.ceil(nextX + activeItemWidth + growThreshold)
      const availableWidth = Math.max(canvasWidth, requiredWidth)
      const maxX = Math.max(0, availableWidth - activeItemWidth)
      const boundedX = Math.min(Math.max(0, nextX), maxX)
      const boundedY = Math.max(0, nextY)
      nextPosition = {
        x: snapToGrid ? Math.min(Math.max(0, Math.round(boundedX / gridSize) * gridSize), maxX) : boundedX,
        y: snapToGrid ? Math.max(0, Math.round(boundedY / gridSize) * gridSize) : boundedY
      }

      setCanvasWidth((prev) => Math.max(prev, requiredWidth))
    } else {
      const itemToPersist = notesRef.current.find((item) => getItemKey(item) === activeDraggedId)
      if (!itemToPersist) return
      nextPosition = { x: itemToPersist.x, y: itemToPersist.y }
    }

    setNotes((prev) =>
      prev.map((item) =>
        getItemKey(item) === activeDraggedId ? { ...item, x: nextPosition.x, y: nextPosition.y } : item
      )
    )

    await persistItemPosition(activeDraggedId, nextPosition.x, nextPosition.y)
    dragLastPositionRef.current = null
    flushDeferredRemoteNotes()
  }

  function closeCommandPalette() {
    setShowCommandPalette(false)
    setCommandPaletteQuery('')
    setCommandPaletteActiveIndex(0)
  }

  function executeCommandPaletteAction(action) {
    if (!action || action.disabled) return
    closeCommandPalette()
    action.run()
  }

  function renderDeskRow(desk, depth = 0) {
    return (
      <button
        key={desk.id}
        type="button"
        onClick={() => handleSelectDesk(desk)}
        style={{
          width: '100%',
          padding: '8px 10px',
          paddingLeft: 10 + depth * 14,
          border: 'none',
          borderRadius: 4,
          marginBottom: 2,
          background: desk.id === selectedDeskId ? '#eef4ff' : '#fff',
          color: '#222',
          cursor: 'pointer',
          fontWeight: desk.id === selectedDeskId ? 600 : 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getDeskNameValue(desk)}
        </span>
        <span
          style={{
            fontSize: 11,
            color: '#666',
            fontWeight: 500,
            flexShrink: 0,
            textAlign: 'right'
          }}
        >
          {getDeskGroupLabel(desk)}
        </span>
      </button>
    )
  }

  function renderCustomShelfTree(shelf, depth = 1) {
    const shelfDesks = desksByShelfId[shelf.id] || []
    const childShelves = getChildDeskShelves(shelf.id)
    const isExpanded = expandedDeskShelves[shelf.id] ?? true

    return (
      <div key={shelf.id}>
        <div
          style={{
            display: 'flex',
            gap: 4,
            alignItems: 'stretch',
            marginBottom: 2
          }}
        >
          <button
            type="button"
            onClick={() => toggleDeskShelfExpanded(shelf.id)}
            style={{
              flex: 1,
              textAlign: 'left',
              padding: '6px 10px',
              paddingLeft: 10 + depth * 14,
              border: 'none',
              borderRadius: 4,
              background: '#f8f9fb',
              color: '#333',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {isExpanded ? '▼' : '▶'} {shelf.name}
          </button>
          {showShelfHierarchyTools && (
            <>
              <button
                type="button"
                onClick={() => renameDeskShelf(shelf.id)}
                aria-label={`Rename shelf ${shelf.name}`}
                title="Rename shelf"
                style={{
                  border: 'none',
                  borderRadius: 4,
                  background: '#e8f0fe',
                  color: '#1a73e8',
                  cursor: 'pointer',
                  padding: '0 7px',
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => deleteDeskShelf(shelf.id)}
                aria-label={`Delete shelf ${shelf.name}`}
                title="Delete shelf"
                style={{
                  border: 'none',
                  borderRadius: 4,
                  background: '#fdecea',
                  color: '#d93025',
                  cursor: 'pointer',
                  padding: '0 7px',
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                ×
              </button>
            </>
          )}
        </div>
        {isExpanded && (
          <>
            {shelfDesks.map((desk) => renderDeskRow(desk, depth + 1))}
            {childShelves.map((childShelf) => renderCustomShelfTree(childShelf, depth + 1))}
          </>
        )}
      </div>
    )
  }

  return (
    <div
      ref={deskCanvasRef}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: canvasWidth,
        boxSizing: 'border-box',
        minHeight: canvasHeight,
        paddingTop: isMobileLayout ? 104 : 20,
        paddingRight: isMobileLayout ? 12 : 20,
        paddingBottom: isMobileLayout ? 92 : 20,
        paddingLeft: isMobileLayout ? 12 : 20,
        backgroundColor,
        backgroundImage,
        backgroundSize,
        backgroundPosition,
        backgroundRepeat
      }}
    >
      {snapToGrid && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: `repeating-linear-gradient(to right, rgba(0,0,0,0.08), rgba(0,0,0,0.08) 1px, transparent 1px, transparent ${gridSize}px), repeating-linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.08) 1px, transparent 1px, transparent ${gridSize}px)`,
            zIndex: 0
          }}
        />
      )}

      <div
        style={{
          position: isMobileLayout ? 'absolute' : 'fixed',
          top: isMobileLayout ? topOverlayTop : 'auto',
          bottom: isMobileLayout ? 'auto' : 20,
          left: isMobileLayout ? 12 : 20,
          display: 'flex',
          gap: 8,
          zIndex: menuLayerZIndex
        }}
      >
        <DeskTopControlButton
          type="button"
          onClick={() => void undoNotesChange()}
          isMobileLayout={isMobileLayout}
          disabled={!canUndo || hasModalOpen || !canCurrentUserEditDeskItems}
          title="Undo (Ctrl/Cmd+Z)"
        >
          {historySyncing ? 'Syncing...' : 'Undo'}
        </DeskTopControlButton>
        <DeskTopControlButton
          type="button"
          onClick={() => void redoNotesChange()}
          isMobileLayout={isMobileLayout}
          disabled={!canRedo || hasModalOpen || !canCurrentUserEditDeskItems}
          title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)"
        >
          Redo
        </DeskTopControlButton>
        <DeskTopControlButton
          type="button"
          onClick={() => void forceSaveAndClearHistory()}
          isMobileLayout={isMobileLayout}
          disabled={!selectedDeskId || hasModalOpen || forceSaveInProgress || historySyncing || !canCurrentUserEditDeskItems}
          title="Force-save current desk content and clear undo/redo history"
          aria-live="polite"
          style={{
            ...autoSaveBadgeStyle,
            padding: isMobileLayout ? '8px 10px' : autoSaveBadgeStyle.padding,
            opacity: !selectedDeskId || hasModalOpen || forceSaveInProgress || historySyncing || !canCurrentUserEditDeskItems ? 0.6 : 1
          }}
        >
          {forceSaveInProgress ? 'Saving...' : autoSaveLabel}
        </DeskTopControlButton>
      </div>

      <div
        style={{
          position: isMobileLayout ? 'fixed' : 'fixed',
          top: topMenuTop,
          right: isMobileLayout ? 12 : 20,
          left: isMobileLayout ? 12 : 'auto',
          display: 'flex',
          flexDirection: isMobileLayout ? 'column' : 'row',
          gap: 8,
          alignItems: 'stretch',
          zIndex: menuLayerZIndex
        }}
      >
        <div ref={deskMenuRef} style={{ position: 'relative', width: isMobileLayout ? '100%' : 'auto', zIndex: menuLayerZIndex }}>
          <DeskMenuTriggerButton
            onClick={() => {
              const nextOpen = !showDeskMenu
              setShowDeskMenu(nextOpen)
              if (nextOpen && isMobileLayout) {
                setShowProfileMenu(false)
                setShowNewNoteMenu(false)
              }
            }}
            isMobileLayout={isMobileLayout}
          >
            {currentDesk ? getDeskNameValue(currentDesk) : 'Select Desk'} ▼
          </DeskMenuTriggerButton>

          {showDeskMenu && (
            <DeskMenuPanel
              isMobileLayout={isMobileLayout}
              menuPanelZIndex={menuPanelZIndex}
            >
              <div style={{ maxHeight: 180, overflowY: 'auto', borderBottom: '1px solid var(--ui-border)', marginBottom: 6 }}>
                {desks.length === 0 && deskShelves.length === 0 ? (
                  <div style={{ padding: '8px 10px', fontSize: 13, opacity: 0.75 }}>No desks yet</div>
                ) : (
                  <>
                    {BUILT_IN_SHELVES.map((shelfDef) => {
                      const isExpanded = expandedDeskShelves[shelfDef.id] ?? true
                      const shelfDesks = desksByShelfId[shelfDef.id] || []

                      return (
                        <div key={shelfDef.id}>
                          <DeskMenuItemButton
                            type="button"
                            onClick={() => toggleDeskShelfExpanded(shelfDef.id)}
                            strong
                            style={{
                              background: 'var(--ui-surface-soft)',
                              color: 'var(--ui-ink-muted)',
                              fontSize: 12,
                              padding: '6px 10px',
                              marginBottom: 2
                            }}
                          >
                            {isExpanded ? '▼' : '▶'} {shelfDef.label}
                          </DeskMenuItemButton>
                          {isExpanded && shelfDesks.map((desk) => renderDeskRow(desk, 1))}
                        </div>
                      )
                    })}

                    <div>
                      <DeskMenuItemButton
                        type="button"
                        onClick={() => toggleDeskShelfExpanded('__custom_root')}
                        strong
                        style={{
                          background: 'var(--ui-surface-soft)',
                          color: 'var(--ui-ink-muted)',
                          fontSize: 12,
                          padding: '6px 10px',
                          marginBottom: 2
                        }}
                      >
                        {(expandedDeskShelves.__custom_root ?? true) ? '▼' : '▶'} Custom Shelves
                      </DeskMenuItemButton>
                      {(expandedDeskShelves.__custom_root ?? true) && (
                        getChildDeskShelves(null).map((shelf) => renderCustomShelfTree(shelf, 1))
                      )}
                    </div>
                  </>
                )}

                <DeskMenuItemButton
                  type="button"
                  onClick={() => setShowShelfHierarchyTools((prev) => !prev)}
                  strong
                  style={{
                    padding: '7px 10px',
                    border: '1px solid var(--ui-border)',
                    background: 'var(--ui-surface)',
                    color: 'var(--ui-ink-muted)',
                    fontSize: 12,
                    letterSpacing: 0.2,
                    marginBottom: 2
                  }}
                >
                  Shelf Organizer
                </DeskMenuItemButton>

                {showShelfHierarchyTools && (
                  <>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6, marginBottom: 4 }}>Shelf Hierarchy</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        value={newShelfNameInput}
                        onChange={(e) => {
                          setShelfActionError('')
                          setNewShelfNameInput(e.target.value)
                        }}
                        placeholder="New shelf name"
                        style={menuCompactInputStyle}
                      />
                      <DeskMenuItemButton
                        type="button"
                        onClick={createDeskShelf}
                        fullWidth={false}
                        style={menuPrimaryActionStyle}
                      >
                        Add
                      </DeskMenuItemButton>
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <select
                        value={newShelfParentId}
                        onChange={(e) => {
                          setShelfActionError('')
                          setNewShelfParentId(e.target.value)
                        }}
                        style={menuSelectStyle}
                      >
                        <option value="">Top-level custom shelf</option>
                        {customShelfOptions.map((shelfOption) => (
                          <option key={shelfOption.id} value={shelfOption.id}>
                            {'· '.repeat(shelfOption.depth)}{shelfOption.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {currentDesk && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)', marginBottom: 4 }}>Move current desk</div>
                        <select
                          value={getDeskAssignedCustomShelfId(currentDesk.id)}
                          onChange={(e) => setSelectedDeskCustomShelf(e.target.value)}
                          style={menuSelectStyle}
                        >
                          <option value="">Auto ({getDeskGroupLabel(currentDesk)})</option>
                          {customShelfOptions.map((shelfOption) => (
                            <option key={shelfOption.id} value={shelfOption.id}>
                              {'· '.repeat(shelfOption.depth)}{shelfOption.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {shelfActionError && (
                      <div style={{ marginTop: 4, color: 'var(--ui-danger)', fontSize: 11 }}>{shelfActionError}</div>
                    )}
                  </>
                )}
              </div>

              <DeskMenuItemButton
                type="button"
                onClick={openCreateDeskDialog}
                strong
              >
                + New Desk
              </DeskMenuItemButton>

              {currentDesk && isCurrentDeskOwner && (
                <DeskMenuItemButton
                  type="button"
                  onClick={openRenameDeskDialog}
                >
                  Rename Desk
                </DeskMenuItemButton>
              )}

              {currentDesk && isCurrentDeskOwner && (
                <DeskMenuItemButton
                  type="button"
                  onClick={deleteCurrentDesk}
                  danger
                >
                  Delete Desk
                </DeskMenuItemButton>
              )}

              {currentDesk && (isCurrentDeskOwner || isDeskCollaborative(currentDesk) || currentDesk.user_id !== user.id) && (
                <DeskMenuItemButton
                  type="button"
                  onClick={openDeskMembersDialog}
                >
                  Manage Members
                </DeskMenuItemButton>
              )}

              {currentDesk && !isCurrentDeskOwner && (
                <DeskMenuItemButton
                  type="button"
                  onClick={leaveCurrentDesk}
                  danger
                >
                  Leave Desk
                </DeskMenuItemButton>
              )}

              {currentDesk && (
                <DeskMenuItemButton
                  type="button"
                  onClick={exportCurrentDesk}
                >
                  Export Desk (.json)
                </DeskMenuItemButton>
              )}

              {currentDesk && canCurrentUserEditDeskItems && (
                <>
                  <DeskMenuItemButton
                    type="button"
                    onClick={() => importDeskInputRef.current?.click()}
                  >
                    Import Desk (.json)
                  </DeskMenuItemButton>
                  <input
                    ref={importDeskInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportDeskFileSelection}
                    style={{ display: 'none' }}
                  />
                </>
              )}

              {currentDesk && canCurrentUserEditDeskItems && (
                <DeskMenuItemButton
                  type="button"
                  onClick={() => setSnapToGrid((prev) => !prev)}
                  active={snapToGrid}
                  style={{
                    fontWeight: snapToGrid ? 700 : 500
                  }}
                >
                  Snap To Grid: {snapToGrid ? 'On' : 'Off'}
                </DeskMenuItemButton>
              )}

              {(deskMenuMessage || deskMenuError) && (
                <div style={{ padding: '6px 10px', fontSize: 12, color: deskMenuError ? 'var(--ui-danger)' : 'var(--ui-success)' }}>
                  {deskMenuError || deskMenuMessage}
                </div>
              )}

              {currentDesk && isCurrentDeskOwner && (
                <div style={{ padding: '7px 10px', fontSize: 12, opacity: 0.8 }}>Change Background</div>
              )}
              {currentDesk && isCurrentDeskOwner && (
                <div style={{ display: 'flex', flexWrap: isMobileLayout ? 'wrap' : 'nowrap', gap: 4, padding: '0 8px 6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk1')}
                  disabled={!currentDesk || !isCurrentDeskOwner}
                  style={{
                    flex: isMobileLayout ? '1 1 calc(50% - 2px)' : 1,
                    padding: '6px 6px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: backgroundMode === 'desk1' ? '2px solid #4285F4' : '1px solid #ddd',
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url('/brownDesk.png')",
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat',
                    color: '#111',
                    fontWeight: 600,
                    textShadow: '0 1px 1px rgba(255,255,255,0.8)',
                    cursor: currentDesk && isCurrentDeskOwner ? 'pointer' : 'not-allowed'
                  }}
                >
                  Brown Desk
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk2')}
                  disabled={!currentDesk || !isCurrentDeskOwner}
                  style={{
                    flex: isMobileLayout ? '1 1 calc(50% - 2px)' : 1,
                    padding: '6px 6px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: backgroundMode === 'desk2' ? '2px solid #4285F4' : '1px solid #ddd',
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url('/grayDesk.png')",
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat',
                    color: '#111',
                    fontWeight: 600,
                    textShadow: '0 1px 1px rgba(255,255,255,0.8)',
                    cursor: currentDesk && isCurrentDeskOwner ? 'pointer' : 'not-allowed'
                  }}
                >
                  Gray Desk
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk3')}
                  disabled={!currentDesk || !isCurrentDeskOwner}
                  style={{
                    flex: isMobileLayout ? '1 1 calc(50% - 2px)' : 1,
                    padding: '6px 6px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: backgroundMode === 'desk3' ? '2px solid #4285F4' : '1px solid #ddd',
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url('/leavesDesk.jpg')",
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat',
                    color: '#111',
                    fontWeight: 600,
                    textShadow: '0 1px 1px rgba(255,255,255,0.8)',
                    cursor: currentDesk && isCurrentDeskOwner ? 'pointer' : 'not-allowed'
                  }}
                >
                  Leaves Desk
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk4')}
                  disabled={!currentDesk || !isCurrentDeskOwner}
                  style={{
                    flex: isMobileLayout ? '1 1 calc(50% - 2px)' : 1,
                    padding: '6px 6px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: backgroundMode === 'desk4' ? '2px solid #4285F4' : '1px solid #ddd',
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url('/flowersDesk.png')",
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat',
                    color: '#111',
                    fontWeight: 600,
                    textShadow: '0 1px 1px rgba(255,255,255,0.8)',
                    cursor: currentDesk && isCurrentDeskOwner ? 'pointer' : 'not-allowed'
                  }}
                >
                  Flowers Desk
                </button>
                </div>
              )}

              {currentDesk && isCurrentDeskOwner && (
                <div style={{ padding: '0 8px 8px' }}>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Custom URL or Hex Color</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={customBackgroundInput}
                      onChange={(e) => {
                        setBackgroundMenuError('')
                        setCustomBackgroundInput(e.target.value)
                      }}
                      placeholder="https://... or #1f2937"
                      style={menuCompactInputStyle}
                    />
                    <DeskMenuItemButton
                      type="button"
                      onClick={() => setCurrentDeskCustomBackground(customBackgroundInput)}
                      fullWidth={false}
                      style={menuPrimaryActionStyle}
                    >
                      Apply
                    </DeskMenuItemButton>
                  </div>
                  {backgroundMenuError && (
                    <div style={{ marginTop: 4, color: 'var(--ui-danger)', fontSize: 11 }}>{backgroundMenuError}</div>
                  )}
                </div>
              )}
            </DeskMenuPanel>
          )}
        </div>

        <div ref={profileMenuRef} style={{ position: 'relative', width: isMobileLayout ? '100%' : 'auto', zIndex: menuLayerZIndex }}>
          <DeskMenuTriggerButton
            type="button"
            onClick={() => {
              const nextOpen = !showProfileMenu
              setShowProfileMenu(nextOpen)
              setFriendError('')
              setFriendMessage('')
              if (nextOpen) {
                if (isMobileLayout) {
                  setShowDeskMenu(false)
                  setShowNewNoteMenu(false)
                }
                fetchCurrentUserProfile()
                if (selectedDeskId) {
                  fetchDeskActivity(selectedDeskId)
                }
              }
            }}
            isMobileLayout={isMobileLayout}
          >
            Profile{pendingFriendRequestCount > 0 ? ` (${pendingFriendRequestCount})` : ''} ▼
          </DeskMenuTriggerButton>

          {showProfileMenu && (
            <DeskMenuPanel
              isMobileLayout={isMobileLayout}
              menuPanelZIndex={menuPanelZIndex}
              minWidth={340}
              width={isMobileLayout ? '100%' : 340}
              style={{
                padding: 10,
                maxHeight: isMobileLayout ? 420 : 500,
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <DeskMenuItemButton
                  type="button"
                  onClick={() => setProfileTab('profile')}
                  active={profileTab === 'profile'}
                  style={{
                    flex: 1,
                    padding: '7px 8px',
                    fontSize: 13
                  }}
                >
                  Profile
                </DeskMenuItemButton>
                <DeskMenuItemButton
                  type="button"
                  onClick={() => setProfileTab('friends')}
                  active={profileTab === 'friends'}
                  style={{
                    flex: 1,
                    padding: '7px 8px',
                    fontSize: 13
                  }}
                >
                  Friends{pendingFriendRequestCount > 0 ? ` (${pendingFriendRequestCount})` : ''}
                </DeskMenuItemButton>
                <DeskMenuItemButton
                  type="button"
                  onClick={() => {
                    setProfileTab('activity')
                    if (selectedDeskId) {
                      void fetchDeskActivity(selectedDeskId)
                    }
                  }}
                  active={profileTab === 'activity'}
                  style={{
                    flex: 1,
                    padding: '7px 8px',
                    fontSize: 13
                  }}
                >
                  Activity
                </DeskMenuItemButton>
              </div>

              {profileTab === 'profile' ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>{user.email || 'Unknown user'}</div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: 'var(--ui-ink-muted)' }}>Preferred name</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        value={preferredNameInput}
                        onChange={(e) => {
                          if (preferredNameError) setPreferredNameError('')
                          if (preferredNameMessage) setPreferredNameMessage('')
                          setPreferredNameInput(e.target.value)
                        }}
                        placeholder="How you want your name shown"
                        style={menuInputStyle}
                      />
                      <DeskMenuItemButton
                        type="button"
                        onClick={savePreferredName}
                        disabled={preferredNameSaving}
                        fullWidth={false}
                        style={{
                          ...menuPrimaryActionStyle,
                          opacity: preferredNameSaving ? 0.75 : 1,
                          cursor: preferredNameSaving ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {preferredNameSaving ? 'Saving...' : 'Save'}
                      </DeskMenuItemButton>
                    </div>
                    {preferredNameMessage && (
                      <div style={{ marginTop: 5, color: 'var(--ui-success)', fontSize: 12 }}>{preferredNameMessage}</div>
                    )}
                    {preferredNameError && (
                      <div style={{ marginTop: 5, color: 'var(--ui-danger)', fontSize: 12 }}>{preferredNameError}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Join date: {joinDate}</div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Desks currently active: {desks.length}</div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Items on current desk: {totalItemsCount}</div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    Desks created: {profileStatsLoading ? '...' : profileStats.desks_created}
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 10 }}>
                    Desks deleted: {profileStatsLoading ? '...' : profileStats.desks_deleted}
                  </div>

                  <DeskMenuItemButton
                    type="button"
                    onClick={fetchUserStats}
                    disabled={profileStatsLoading}
                    fullWidth={false}
                    style={{
                      ...menuSubtleActionStyle,
                      cursor: profileStatsLoading ? 'not-allowed' : 'pointer',
                      opacity: profileStatsLoading ? 0.7 : 1
                    }}
                  >
                    {profileStatsLoading ? 'Refreshing...' : 'Refresh stats'}
                  </DeskMenuItemButton>

                  <div style={menuSectionDividerStyle}>
                    {deleteAccountError && (
                      <div style={{ marginBottom: 6, color: 'var(--ui-danger)', fontSize: 12, textAlign: 'right' }}>{deleteAccountError}</div>
                    )}
                    <DeskMenuItemButton
                      type="button"
                      onClick={handleDeleteAccount}
                      danger
                      style={{ display: 'inline-block', width: 'auto' }}
                    >
                      Delete account
                    </DeskMenuItemButton>
                  </div>
                </div>
              ) : profileTab === 'friends' ? (
                <div>
                  <form onSubmit={handleSendFriendRequest} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <input
                      value={friendEmailInput}
                      onChange={(e) => setFriendEmailInput(e.target.value)}
                      placeholder="friend@email.com"
                      style={menuInputStyle}
                    />
                    <DeskMenuItemButton
                      type="submit"
                      disabled={friendSubmitting}
                      fullWidth={false}
                      style={{
                        ...menuPrimaryActionStyle,
                        cursor: friendSubmitting ? 'not-allowed' : 'pointer',
                        opacity: friendSubmitting ? 0.75 : 1
                      }}
                    >
                      {friendSubmitting ? 'Sending...' : 'Add'}
                    </DeskMenuItemButton>
                  </form>

                  <DeskMenuItemButton
                    type="button"
                    onClick={fetchFriends}
                    disabled={friendsLoading}
                    fullWidth={false}
                    style={{
                      marginBottom: 10,
                      ...menuSubtleActionStyle,
                      cursor: friendsLoading ? 'not-allowed' : 'pointer',
                      opacity: friendsLoading ? 0.7 : 1
                    }}
                  >
                    {friendsLoading ? 'Refreshing...' : 'Refresh'}
                  </DeskMenuItemButton>

                  {friendMessage && (
                    <div style={{ marginBottom: 8, color: 'var(--ui-success)', fontSize: 12 }}>
                      {friendMessage}
                    </div>
                  )}
                  {friendError && (
                    <div style={{ marginBottom: 8, color: 'var(--ui-danger)', fontSize: 12 }}>
                      {friendError}
                    </div>
                  )}

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Incoming Requests</div>
                    {incomingFriendRequests.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.75 }}>No incoming requests</div>
                    ) : (
                      incomingFriendRequests.map((request) => {
                        const requestDisplay = getProfileDisplayParts(request)
                        return (
                        <div key={request.id} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--ui-border)' }}>
                          <div style={{ fontSize: 13, marginBottom: 4 }}>
                            {requestDisplay.primary}
                            {requestDisplay.secondary && (
                              <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)' }}>{requestDisplay.secondary}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <DeskMenuItemButton
                              type="button"
                              onClick={() => respondToFriendRequest(request.id, 'accepted')}
                              fullWidth={false}
                              style={menuSuccessActionStyle}
                            >
                              Accept
                            </DeskMenuItemButton>
                            <DeskMenuItemButton
                              type="button"
                              onClick={() => respondToFriendRequest(request.id, 'declined')}
                              fullWidth={false}
                              style={menuDangerActionStyle}
                            >
                              Decline
                            </DeskMenuItemButton>
                          </div>
                        </div>
                        )
                      })
                    )}
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Friends</div>
                    {friends.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.75 }}>No friends yet</div>
                    ) : (
                      friends.map((friend) => {
                        const friendDisplay = getProfileDisplayParts(friend)
                        return (
                        <div
                          key={friend.id}
                          style={{
                            marginBottom: 6,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {friendDisplay.primary}
                            {friendDisplay.secondary && (
                              <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)' }}>{friendDisplay.secondary}</div>
                            )}
                          </span>
                          <DeskMenuItemButton
                            type="button"
                            onClick={() => removeFriend(friend.id)}
                            disabled={friendActionLoadingId === friend.id}
                            fullWidth={false}
                            style={{
                              ...menuNeutralActionStyle,
                              cursor: friendActionLoadingId === friend.id ? 'not-allowed' : 'pointer',
                              opacity: friendActionLoadingId === friend.id ? 0.7 : 1,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {friendActionLoadingId === friend.id ? 'Removing...' : 'Remove'}
                          </DeskMenuItemButton>
                        </div>
                        )
                      })
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Sent Requests</div>
                    {outgoingFriendRequests.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.75 }}>No pending sent requests</div>
                    ) : (
                      outgoingFriendRequests.map((request) => {
                        const requestDisplay = getProfileDisplayParts(request)
                        return (
                        <div key={request.id} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {requestDisplay.primary}
                            {requestDisplay.secondary && (
                              <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)' }}>{requestDisplay.secondary}</div>
                            )}
                          </span>
                          <DeskMenuItemButton
                            type="button"
                            onClick={() => cancelOutgoingFriendRequest(request.id)}
                            fullWidth={false}
                            style={{ ...menuNeutralActionStyle, whiteSpace: 'nowrap' }}
                          >
                            Cancel
                          </DeskMenuItemButton>
                        </div>
                        )
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  {!selectedDeskId ? (
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Select a desk to view activity.</div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>Recent activity</div>
                        <DeskMenuItemButton
                          type="button"
                          onClick={() => fetchDeskActivity(selectedDeskId)}
                          disabled={activityLoading}
                          fullWidth={false}
                          style={{
                            ...menuSubtleActionStyle,
                            cursor: activityLoading ? 'not-allowed' : 'pointer',
                            opacity: activityLoading ? 0.7 : 1
                          }}
                        >
                          {activityLoading ? 'Refreshing...' : 'Refresh'}
                        </DeskMenuItemButton>
                      </div>

                      {activityError && (
                        <div style={{ marginBottom: 8, color: 'var(--ui-danger)', fontSize: 12 }}>
                          {activityError}
                        </div>
                      )}

                      {activityFeed.length === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.75 }}>No desk activity yet.</div>
                      ) : (
                        <div>
                          {activityFeed.map((entry) => (
                            <div key={entry.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--ui-border)' }}>
                              <div style={{ fontSize: 13, color: 'var(--ui-ink)' }}>{getActivityActionLabel(entry)}</div>
                              <div style={{ marginTop: 2, fontSize: 11, color: 'var(--ui-ink-soft)' }}>{formatDate(entry.created_at)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div style={menuSectionDividerStyle}>
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 2px',
                    color: 'var(--ui-ink-soft)',
                    fontSize: 13,
                    textDecoration: 'underline',
                    marginBottom: 4
                  }}
                >
                  Privacy Policy
                </a>
                <DeskMenuItemButton
                  type="button"
                  onClick={handleLogout}
                  danger
                  style={{ padding: '7px 2px', background: 'transparent', borderColor: 'transparent' }}
                >
                  Logout
                </DeskMenuItemButton>
              </div>
            </DeskMenuPanel>
          )}
        </div>
      </div>

      <NewNoteMenu
        menuRef={newNoteMenuRef}
        isOpen={showNewNoteMenu}
        isMobileLayout={isMobileLayout}
        onToggle={() => {
          const nextOpen = !showNewNoteMenu
          setShowNewNoteMenu(nextOpen)
          if (nextOpen && isMobileLayout) {
            setShowDeskMenu(false)
            setShowProfileMenu(false)
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

      {showCommandPalette && (
        <div
          onClick={closeCommandPalette}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: menuLayerZIndex + 30,
            background: 'rgba(8, 14, 26, 0.42)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: isMobileLayout ? '12px' : '64px 20px 20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(720px, 100%)',
              borderRadius: 16,
              border: '1px solid var(--ui-border)',
              background: 'var(--ui-glass)',
              boxShadow: 'var(--ui-shadow-floating)',
              backdropFilter: 'blur(14px)',
              overflow: 'hidden',
              animation: 'deskPanelIn var(--motion-base) cubic-bezier(0.18, 0.85, 0.27, 1)'
            }}
          >
            <div style={{ padding: isMobileLayout ? 10 : 12, borderBottom: '1px solid var(--ui-border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ui-ink)', marginBottom: 8 }}>
                Command Palette
              </div>
              <input
                ref={commandPaletteInputRef}
                value={commandPaletteQuery}
                onChange={(e) => setCommandPaletteQuery(e.target.value)}
                placeholder="Type a command or desk name..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: 10,
                  border: '1px solid var(--ui-border-strong)',
                  background: 'var(--ui-surface)',
                  color: 'var(--ui-ink)',
                  fontSize: 14,
                  padding: '10px 12px'
                }}
              />
              <div style={{ marginTop: 7, fontSize: 11, color: 'var(--ui-ink-soft)' }}>
                Enter to run, Up/Down to navigate, Esc to close, Ctrl/Cmd+K to toggle.
              </div>
            </div>

            <div style={{ maxHeight: isMobileLayout ? 300 : 360, overflowY: 'auto', padding: 8 }}>
              {commandPaletteFilteredActions.length === 0 ? (
                <div
                  style={{
                    padding: '12px 10px',
                    borderRadius: 10,
                    background: 'var(--ui-surface-soft)',
                    color: 'var(--ui-ink-soft)',
                    fontSize: 13
                  }}
                >
                  No commands found. Try "desk", "note", "profile", or a desk name.
                </div>
              ) : (
                commandPaletteFilteredActions.map((action, index) => {
                  const isActive = index === commandPaletteActiveIndex
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onMouseEnter={() => setCommandPaletteActiveIndex(index)}
                      onClick={() => executeCommandPaletteAction(action)}
                      disabled={action.disabled}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        borderRadius: 10,
                        border: isActive ? '1px solid var(--ui-primary)' : '1px solid transparent',
                        background: isActive ? 'var(--ui-primary-soft)' : 'transparent',
                        color: action.disabled ? 'var(--ui-ink-soft)' : 'var(--ui-ink)',
                        opacity: action.disabled ? 0.65 : 1,
                        padding: '9px 10px',
                        marginBottom: 4,
                        cursor: action.disabled ? 'not-allowed' : 'pointer',
                        transition: 'background var(--motion-fast) ease, border-color var(--motion-fast) ease'
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{action.label}</div>
                      <div style={{ fontSize: 11, marginTop: 2, color: 'var(--ui-ink-soft)' }}>{action.description}</div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedDeskId && (
        <div
          style={{
            position: 'fixed',
            top: isMobileLayout ? 68 : 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: menuLayerZIndex + 2,
            color: 'var(--ui-ink)',
            background: 'var(--ui-glass)',
            border: '1px solid var(--ui-border-strong)',
            boxShadow: 'var(--ui-shadow-floating)',
            backdropFilter: 'blur(10px)',
            animation: 'deskPanelIn var(--motion-base) cubic-bezier(0.18, 0.85, 0.27, 1)',
            display: 'inline-block',
            padding: isMobileLayout ? '8px 10px' : '9px 12px',
            borderRadius: 10,
            fontSize: isMobileLayout ? 12 : 13,
            fontWeight: 600,
            maxWidth: isMobileLayout ? 'calc(100vw - 24px)' : 'min(560px, calc(100vw - 40px))',
            textAlign: 'center'
          }}
        >
          Create a desk from the top-right menu to get started.
        </div>
      )}

      {isCurrentUserViewer && (
        <div
          style={{
            color: '#6a4f00',
            background: 'rgba(255, 248, 225, 0.95)',
            display: 'inline-block',
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #f2d18f',
            marginTop: 8,
            boxShadow: '0 6px 16px rgba(106, 79, 0, 0.12)',
            animation: 'deskPanelIn var(--motion-base) cubic-bezier(0.18, 0.85, 0.27, 1)'
          }}
        >
          Viewer mode: you can view this desk, but only Editors and Owner can make changes.
        </div>
      )}

      {notes.map((item, index) => {
        const itemKey = getItemKey(item)
        const isChecklist = isChecklistItem(item)
        const isDecoration = isDecorationItem(item)
        const decorationOption = isDecoration ? getDecorationOption(item.kind) : null
        const shouldShowCreatorLabel = Boolean(currentDesk && isDeskCollaborative(currentDesk) && !isDecoration)
        const creatorLabel = shouldShowCreatorLabel ? getItemCreatorLabel(item, user.id) : ''
        const itemWidth = getItemWidth(item)
        const renderedItemWidth = isMobileLayout && !isDecoration
          ? Math.min(itemWidth, mobileNoteMaxWidth)
          : itemWidth
        const itemHeight = getItemHeight(item)
        const contentMinHeight = Math.max(40, itemHeight - 40)
        const baseZIndex = index + 1

        return (
          <div
            key={itemKey}
            data-note-id={item.id}
            data-item-key={itemKey}
            onPointerDown={
              editingId || (isMobileLayout && !isDecoration)
                ? undefined
                : (e) => handleDragStart(e, item)
            }
            onClick={
              isDecoration
                ? () => setActiveDecorationHandleId((prev) => (prev === itemKey ? null : itemKey))
                : undefined
            }
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              transform: `rotate(${item.rotation || 0}deg)`,
              background: isDecoration ? 'transparent' : (editingId === itemKey ? editColor : getItemColor(item)),
              color: isDecoration ? undefined : (editingId === itemKey ? editTextColor : getItemTextColor(item)),
              padding: isDecoration ? 8 : 20,
              width: renderedItemWidth,
              minHeight: itemHeight,
              borderRadius: 0,
              boxShadow: isDecoration ? 'none' : '3px 3px 10px rgba(0,0,0,0.3)',
              mixBlendMode: 'normal',
              opacity: 1,
              fontFamily: editingId === itemKey ? editFontFamily : getItemFontFamily(item),
              touchAction: editingId === itemKey ? 'auto' : (isMobileLayout && !isDecoration ? 'pan-y' : 'none'),
              cursor: draggedId === itemKey
                ? 'grabbing'
                : (isMobileLayout && !isDecoration ? 'default' : 'grab'),
              zIndex: draggedId === itemKey
                ? 3000
                : (editingId === itemKey || (isDecoration && activeDecorationHandleId === itemKey) ? 2500 : baseZIndex)
            }}
          >
            {isDecoration ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    fontSize: Math.max(24, Math.round(Math.min(getItemWidth(item), getItemHeight(item)) * 0.58)),
                    lineHeight: 1,
                    filter: 'saturate(1.2) contrast(1.08)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.35)'
                  }}
                >
                  {decorationOption?.emoji || '📌'}
                </div>
                {activeDecorationHandleId === itemKey && (
                  <>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        requestDeleteNote(itemKey)
                      }}
                      aria-label="Delete decoration"
                      title="Delete decoration"
                      style={{
                        position: 'absolute',
                        right: -6,
                        top: -6,
                        width: 22,
                        height: 22,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#d32f2f',
                        color: '#fff',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        fontSize: 14,
                        lineHeight: 1
                      }}
                    >
                      ×
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        moveItemLayer(itemKey, 'back')
                      }}
                      aria-label="Send decoration to back"
                      title="Send to back"
                      style={{
                        position: 'absolute',
                        left: -6,
                        top: -6,
                        width: 22,
                        height: 22,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#777',
                        color: '#fff',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        fontSize: 10,
                        lineHeight: 1,
                        fontWeight: 700
                      }}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        moveItemLayer(itemKey, 'front')
                      }}
                      aria-label="Send decoration to front"
                      title="Send to front"
                      style={{
                        position: 'absolute',
                        left: 18,
                        top: -6,
                        width: 22,
                        height: 22,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#777',
                        color: '#fff',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        fontSize: 10,
                        lineHeight: 1,
                        fontWeight: 700
                      }}
                    >
                      F
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        void duplicateItem(itemKey)
                      }}
                      aria-label="Duplicate decoration"
                      title="Duplicate decoration"
                      style={{
                        position: 'absolute',
                        left: 42,
                        top: -6,
                        width: 22,
                        height: 22,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#777',
                        color: '#fff',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        fontSize: 11,
                        lineHeight: 1,
                        fontWeight: 700
                      }}
                    >
                      D
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => handleRotateMouseDown(e, item)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Rotate decoration"
                      title="Hold and drag to rotate"
                      style={{
                        position: 'absolute',
                        left: -6,
                        bottom: -6,
                        width: 22,
                        height: 22,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        border: 'none',
                        background: rotatingId === itemKey ? '#4285F4' : '#777',
                        color: '#fff',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        fontSize: 14,
                        lineHeight: 1
                      }}
                    >
                      ↻
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => handleResizeMouseDown(e, item)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Resize decoration"
                      title="Hold and move cursor to resize"
                      style={{
                        position: 'absolute',
                        right: -6,
                        bottom: -6,
                        width: 22,
                        height: 22,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        border: 'none',
                        background: resizingId === itemKey ? '#4285F4' : '#777',
                        color: '#fff',
                        cursor: 'pointer',
                        pointerEvents: 'auto'
                      }}
                    >
                      <FourWayResizeIcon size={12} color="#fff" />
                    </button>
                  </>
                )}
              </div>
            ) : editingId === itemKey ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  await commitItemEdits(item)
                }}
              >
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onPointerDown={(e) => handleRotateMouseDown(e, item)}
                    aria-label="Rotate note"
                    title="Hold and drag to rotate"
                    style={{
                      width: 24,
                      height: 24,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      lineHeight: 1,
                      borderRadius: 4,
                      border: 'none',
                      background: rotatingId === itemKey ? '#4285F4' : '#777',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    ↻
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => handleResizeMouseDown(e, item)}
                    aria-label="Resize note"
                    title="Hold and move cursor to resize"
                    style={{
                      width: 24,
                      height: 24,
                      marginLeft: 6,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      lineHeight: 1,
                      borderRadius: 4,
                      border: 'none',
                      background: resizingId === itemKey ? '#4285F4' : '#777',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <FourWayResizeIcon size={14} color="#fff" />
                  </button>
                  {!isChecklist && (
                    <>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={() => moveItemLayer(itemKey, 'back')}
                        aria-label="Send note to back"
                        title="Send to back"
                        style={{
                          width: 24,
                          height: 24,
                          marginLeft: 6,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          lineHeight: 1,
                          borderRadius: 4,
                          border: 'none',
                          background: '#777',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={() => moveItemLayer(itemKey, 'front')}
                        aria-label="Send note to front"
                        title="Send to front"
                        style={{
                          width: 24,
                          height: 24,
                          marginLeft: 6,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          lineHeight: 1,
                          borderRadius: 4,
                          border: 'none',
                          background: '#777',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        F
                      </button>
                    </>
                  )}
                </div>

                {isChecklist ? (
                  <>
                    <input
                      value={editValue}
                      onChange={(e) => {
                        if (editSaveError) setEditSaveError('')
                        setEditValue(e.target.value)
                      }}
                      placeholder="Checklist title"
                      style={{
                        width: '100%',
                        marginBottom: 8,
                        fontSize: editFontSize,
                        borderRadius: 4,
                        border: '1px solid #ccc',
                        background: '#eaf4ff',
                        color: '#222',
                        padding: '6px 8px',
                        fontFamily: editFontFamily,
                        boxSizing: 'border-box'
                      }}
                    />

                    <div style={{ marginBottom: 8 }}>
                      {checklistEditItems.map((entry, index) => (
                        <div
                          key={`${itemKey}-edit-${index}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setChecklistEditItems((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
                            }}
                            aria-label="Remove checklist item"
                            title="Remove item"
                            style={{
                              width: 20,
                              height: 20,
                              padding: 0,
                              borderRadius: 4,
                              border: 'none',
                              background: '#d32f2f',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: 12,
                              lineHeight: 1,
                              flexShrink: 0
                            }}
                          >
                            ×
                          </button>
                          <input
                            value={entry.text}
                            onChange={(e) => {
                              const nextText = e.target.value
                              if (editSaveError) setEditSaveError('')
                              setChecklistEditItems((prev) =>
                                prev.map((current, currentIndex) =>
                                  currentIndex === index ? { ...current, text: nextText } : current
                                )
                              )
                            }}
                            style={{
                              flex: 1,
                              minWidth: 120,
                              fontSize: editFontSize,
                              borderRadius: 4,
                              border: '1px solid #ccc',
                              background: '#eaf4ff',
                              color: '#222',
                              padding: '4px 6px',
                              fontFamily: editFontFamily,
                              boxSizing: 'border-box'
                            }}
                          />
                          <input
                            type="datetime-local"
                            value={toReminderInputValue(entry.due_at)}
                            onChange={(e) => {
                              const nextDueAt = normalizeChecklistReminderValue(e.target.value)
                              if (editSaveError) setEditSaveError('')
                              setChecklistEditItems((prev) =>
                                prev.map((current, currentIndex) => (
                                  currentIndex === index ? { ...current, due_at: nextDueAt } : current
                                ))
                              )
                            }}
                            aria-label="Checklist reminder"
                            title="Reminder time"
                            style={{
                              width: 170,
                              fontSize: 12,
                              borderRadius: 4,
                              border: '1px solid #ccc',
                              background: '#f8fbff',
                              color: '#222',
                              padding: '4px 6px',
                              boxSizing: 'border-box'
                            }}
                          />
                          {entry.due_at && (
                            <button
                              type="button"
                              onClick={() => {
                                if (editSaveError) setEditSaveError('')
                                setChecklistEditItems((prev) =>
                                  prev.map((current, currentIndex) => (
                                    currentIndex === index ? { ...current, due_at: null } : current
                                  ))
                                )
                              }}
                              style={{
                                padding: '3px 6px',
                                fontSize: 11,
                                borderRadius: 4,
                                border: 'none',
                                background: '#888',
                                color: '#fff',
                                cursor: 'pointer'
                              }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      ))}

                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={newChecklistItemText}
                          onChange={(e) => {
                            if (editSaveError) setEditSaveError('')
                            setNewChecklistItemText(e.target.value)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addChecklistEditItem()
                            }
                          }}
                          autoFocus
                          placeholder="New item"
                          style={{
                            flex: 1,
                            fontSize: editFontSize,
                            borderRadius: 4,
                            border: '1px solid #ccc',
                            background: '#eaf4ff',
                            color: '#222',
                            padding: '4px 6px',
                            fontFamily: editFontFamily,
                            boxSizing: 'border-box'
                          }}
                        />
                        <button
                          type="button"
                          onClick={addChecklistEditItem}
                          style={{
                            padding: '2px 8px',
                            fontSize: 11,
                            borderRadius: 4,
                            border: 'none',
                            background: '#666',
                            color: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <textarea
                    value={editValue}
                    onChange={(e) => {
                      if (editSaveError) setEditSaveError('')
                      setEditValue(e.target.value)
                    }}
                    autoFocus
                    style={{
                      width: '100%',
                      minHeight: 60,
                      fontSize: editFontSize,
                      borderRadius: 4,
                      border: '1px solid #ccc',
                      background: '#eaf4ff',
                      resize: 'vertical',
                      color: '#222',
                      fontFamily: editFontFamily,
                      boxSizing: 'border-box'
                    }}
                  />
                )}

                {showStyleEditor && (
                  <div
                    style={{
                      marginTop: 8,
                      marginBottom: 8,
                      padding: 8,
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(0,0,0,0.15)',
                      display: 'flex',
                      gap: 6,
                      flexDirection: 'column'
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#222' }}>
                        Box
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => {
                            if (editSaveError) setEditSaveError('')
                            setEditColor(e.target.value)
                          }}
                          style={{ width: 28, height: 24, border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
                        />
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#222', flex: 1 }}>
                        Font
                        <select
                          value={editFontFamily}
                          onChange={(e) => {
                            if (editSaveError) setEditSaveError('')
                            setEditFontFamily(e.target.value)
                          }}
                          style={{
                            flex: 1,
                            minWidth: 110,
                            borderRadius: 4,
                            border: '1px solid #bbb',
                            background: '#fff',
                            color: '#222',
                            padding: '3px 6px',
                            fontSize: 12
                          }}
                        >
                          {FONT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#222' }}>
                        Text
                        <input
                          type="color"
                          value={editTextColor}
                          onChange={(e) => {
                            if (editSaveError) setEditSaveError('')
                            setEditTextColor(e.target.value)
                          }}
                          style={{ width: 28, height: 24, border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
                        />
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#222' }}>
                        Size
                        <input
                          type="number"
                          min={10}
                          max={48}
                          value={editFontSize}
                          onChange={(e) => {
                            if (editSaveError) setEditSaveError('')
                            setEditFontSize(normalizeFontSize(e.target.value, 16))
                          }}
                          style={{ width: 58, height: 24, border: '1px solid #bbb', borderRadius: 4, padding: '0 6px', fontSize: 12 }}
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => requestDeleteNote(itemKey)}
                    style={{
                      marginRight: 4,
                      padding: '2px 6px',
                      fontSize: 11,
                      borderRadius: 4,
                      border: 'none',
                      background: '#d32f2f',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => void duplicateItem(itemKey)}
                      style={{
                        padding: '2px 6px',
                        fontSize: 11,
                        borderRadius: 4,
                        border: 'none',
                        background: '#6d4c41',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStyleEditor((prev) => !prev)}
                      style={{
                        padding: '2px 6px',
                        fontSize: 11,
                        borderRadius: 4,
                        border: 'none',
                        background: showStyleEditor ? '#222' : '#666',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      Style
                    </button>
                    <button
                      type="button"
                      onClick={() => commitItemEdits(item)}
                      disabled={isSavingEdit}
                      style={{
                        padding: '2px 6px',
                        fontSize: 11,
                        borderRadius: 4,
                        border: 'none',
                        background: '#4285F4',
                        color: '#fff',
                        cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                        opacity: isSavingEdit ? 0.7 : 1
                      }}
                    >
                      {isSavingEdit ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={closeItemEditor}
                      style={{
                        padding: '2px 6px',
                        fontSize: 11,
                        borderRadius: 4,
                        border: 'none',
                        background: '#eee',
                        color: '#333',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {editSaveError && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#d32f2f', textAlign: 'right' }}>
                    {editSaveError}
                  </div>
                )}
              </form>
            ) : (
              <>
                {isMobileLayout && canCurrentUserEditDeskItems && !isDecoration && (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDragStart(e, item)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Move item"
                    title="Hold and drag to move"
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      border: 'none',
                      borderRadius: 999,
                      background: 'rgba(33,33,33,0.75)',
                      color: '#fff',
                      padding: '3px 8px',
                      fontSize: 10,
                      lineHeight: 1,
                      cursor: 'grab',
                      zIndex: 2
                    }}
                  >
                    Move
                  </button>
                )}
                <div
                  onClick={() => {
                    if (!canCurrentUserEditDeskItems) return
                    setIsSavingEdit(false)
                    setEditSaveError('')
                    setEditingId(itemKey)
                    setShowStyleEditor(false)
                    setEditColor(getItemColor(item))
                    setEditTextColor(getItemTextColor(item))
                    setEditFontSize(getItemFontSize(item))
                    setEditFontFamily(getItemFontFamily(item))
                    if (isChecklist) {
                      const existingTitle = item.title || 'Checklist'
                      setEditValue(existingTitle.trim() === 'Checklist' ? '' : existingTitle)
                      setChecklistEditItems((item.items || []).map((entry) => ({
                        text: entry.text || '',
                        is_checked: Boolean(entry.is_checked),
                        due_at: normalizeChecklistReminderValue(entry.due_at)
                      })))
                      setNewChecklistItemText('')
                    } else {
                      const existingContent = item.content || ''
                      setEditValue(existingContent.trim() === 'New note' ? '' : existingContent)
                      setChecklistEditItems([])
                      setNewChecklistItemText('')
                    }
                  }}
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    cursor: canCurrentUserEditDeskItems ? (isDecoration ? 'grab' : 'pointer') : 'default',
                    minHeight: isDecoration ? 40 : contentMinHeight,
                    display: 'flex',
                    flexDirection: 'column',
                    color: getItemTextColor(item),
                    fontSize: getItemFontSize(item),
                    fontFamily: getItemFontFamily(item)
                  }}
                >
                {isChecklist ? (
                  <>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{item.title || 'Checklist'}</div>
                      {(item.items || []).length === 0 ? (
                        <div style={{ opacity: 0.7 }}>No checklist items</div>
                      ) : (
                        (item.items || []).map((checklistItem, index) => {
                          const reminderMeta = getChecklistReminderMeta(checklistItem)
                          return (
                            <label
                              key={`${item.id}-${checklistItem.id || index}`}
                              onPointerDown={(e) => e.stopPropagation()}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(checklistItem.is_checked)}
                                onChange={() => toggleChecklistItem(itemKey, index)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span style={{ textDecoration: checklistItem.is_checked ? 'line-through' : 'none' }}>{checklistItem.text}</span>
                              {reminderMeta && (
                                <span
                                  style={{
                                    marginLeft: 'auto',
                                    fontSize: 10,
                                    lineHeight: 1.2,
                                    padding: '2px 6px',
                                    borderRadius: 999,
                                    background: reminderMeta.background,
                                    color: reminderMeta.color,
                                    border: `1px solid ${reminderMeta.color}`,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {reminderMeta.label}
                                </span>
                              )}
                            </label>
                          )
                        })
                      )}
                    </div>
                    {shouldShowCreatorLabel && (
                      <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 10, color: 'inherit', textAlign: 'right' }}>
                        Added by {creatorLabel}
                      </div>
                    )}
                  </>
                ) : isDecoration ? (
                  <>
                    <div style={{ fontSize: 40, lineHeight: 1, textAlign: 'center' }}>{decorationOption?.emoji || '📌'}</div>
                    <div style={{ marginTop: 4, fontSize: 11, color: '#333', fontWeight: 600, textAlign: 'center' }}>
                      {decorationOption?.label || 'Decoration'}
                    </div>
                  </>
                ) : (
                  <>
                    <div>{item.content}</div>
                    {shouldShowCreatorLabel && (
                      <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 10, color: 'inherit', textAlign: 'right' }}>
                        Added by {creatorLabel}
                      </div>
                    )}
                  </>
                )}
                </div>
              </>
            )}
          </div>
        )
      })}

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
      </div>
    )
  }