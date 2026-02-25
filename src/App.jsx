import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import LoginScreen from './LoginScreen'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSession() {
      try {
        // 1️⃣ Check if coming back from OAuth redirect
        const { data: redirectData, error: redirectError } = await supabase.auth.getSessionFromUrl()
        if (redirectError) console.error('Redirect session error:', redirectError)
        if (redirectData?.session) {
          setSession(redirectData.session)
          console.log('Session from redirect:', redirectData.session)
          if (window.location.hash) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } else {
          // 2️⃣ Fallback: get session from storage
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error) console.error('Get session error:', error)
          setSession(session)
          console.log('Initial session:', session)
        }
      } catch (err) {
        console.error('Error loading session:', err)
      } finally {
        setLoading(false)
      }

      // Listen for auth changes
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        console.log('Auth state changed:', session)
      })
      return () => listener.subscription.unsubscribe()
    }

    loadSession()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 40, minHeight: '100vh', textAlign: 'center' }}>
        <h2>DoodleDesk</h2>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session || !session.user) {
    return <LoginScreen />
  }

  return <Desk user={session.user} />
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
  const [deskMembersError, setDeskMembersError] = useState('')
  const [deskMembersMessage, setDeskMembersMessage] = useState('')
  const [deskMemberActionLoadingId, setDeskMemberActionLoadingId] = useState(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editSaveError, setEditSaveError] = useState('')
  const [backgroundMode, setBackgroundMode] = useState('desk1')
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState('')
  const [customBackgroundInput, setCustomBackgroundInput] = useState('')
  const [backgroundMenuError, setBackgroundMenuError] = useState('')
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
  const [preferredNameInput, setPreferredNameInput] = useState('')
  const [preferredNameSaving, setPreferredNameSaving] = useState(false)
  const [preferredNameError, setPreferredNameError] = useState('')
  const [preferredNameMessage, setPreferredNameMessage] = useState('')
  const [draggedId, setDraggedId] = useState(null)
  const [activeDecorationHandleId, setActiveDecorationHandleId] = useState(null)
  const [rotatingId, setRotatingId] = useState(null)
  const [resizingId, setResizingId] = useState(null)
  const [resizeOverlay, setResizeOverlay] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [sectionHeight, setSectionHeight] = useState(() => window.innerHeight || 800)
  const [canvasHeight, setCanvasHeight] = useState(() => {
    const initialHeight = window.innerHeight || 800
    return initialHeight * 2
  })
  const draggedIdRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const notesRef = useRef([])
  const rotatingNoteIdRef = useRef(null)
  const rotationOffsetRef = useRef(0)
  const rotationCenterRef = useRef({ x: 0, y: 0 })
  const resizeStartRef = useRef({
    itemKey: null,
    startPageX: 0,
    startPageY: 0,
    startWidth: 200,
    startHeight: 120
  })
  const newNoteMenuRef = useRef(null)
  const deskMenuRef = useRef(null)
  const profileMenuRef = useRef(null)

  const growThreshold = 180
  const FONT_OPTIONS = [
    { label: 'System', value: 'inherit' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' }
  ]
  const DECORATION_OPTIONS = [
    { key: 'mug', label: 'Mug', emoji: '☕' },
    { key: 'pen', label: 'Pen', emoji: '🖊️' },
    { key: 'pencil', label: 'Pencil', emoji: '✏️' },
    { key: 'plant', label: 'Plant', emoji: '🪴' }
  ]

  const sectionCount = Math.max(2, Math.ceil(canvasHeight / sectionHeight))
  const lastDeskStorageKey = `doodledesk:lastDesk:${user.id}`
  const safeCustomBackgroundUrl = customBackgroundUrl.replace(/"/g, '\\"')
  const backgroundLayers = Array.from({ length: sectionCount }, (_, index) => {
    if (backgroundMode === 'desk1') return "url('/brownDesk.png')"
    if (backgroundMode === 'desk2') return "url('/grayDesk.png')"
    if (backgroundMode === 'desk3') return "url('/leavesDesk.jpg')"
    if (backgroundMode === 'desk4') return "url('/flowersDesk.png')"
    if (backgroundMode === 'custom' && safeCustomBackgroundUrl) return `url("${safeCustomBackgroundUrl}")`
    return "url('/brownDesk.png')"
  })
  const backgroundImage = backgroundLayers.join(', ')
  const backgroundSize = Array.from({ length: sectionCount }, () => `100% ${sectionHeight}px`).join(', ')
  const backgroundPosition = Array.from({ length: sectionCount }, (_, index) =>
    index === 0 ? 'top center' : `center ${index * sectionHeight}px`
  ).join(', ')
  const backgroundRepeat = Array.from({ length: sectionCount }, () => 'no-repeat').join(', ')
  const hasModalOpen = Boolean(
    pendingDeleteId ||
    deskNameDialog.isOpen ||
    deskMembersDialogOpen ||
    confirmDialog.isOpen
  )
  const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
  const modalCardStyle = {
    background: '#fff',
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    color: '#222'
  }
  const modalTitleStyle = { marginBottom: 10, fontWeight: 600 }
  const modalActionsStyle = { textAlign: 'right' }
  const modalSecondaryButtonStyle = {
    padding: '6px 12px',
    borderRadius: 4,
    border: 'none',
    background: '#eee',
    color: '#333',
    cursor: 'pointer'
  }
  const modalPrimaryButtonStyle = {
    padding: '6px 12px',
    borderRadius: 4,
    border: 'none',
    background: '#4285F4',
    color: '#fff',
    cursor: 'pointer'
  }
  const modalDangerButtonStyle = {
    padding: '6px 12px',
    borderRadius: 4,
    border: 'none',
    background: '#d32f2f',
    color: '#fff',
    cursor: 'pointer'
  }

  function getItemKey(item) {
    return `${item.item_type}:${item.id}`
  }

  function isChecklistItem(item) {
    return item.item_type === 'checklist'
  }

  function isDecorationItem(item) {
    return item.item_type === 'decoration'
  }

  function getDecorationOption(kind) {
    return DECORATION_OPTIONS.find((option) => option.key === kind) || { key: 'custom', label: 'Decoration', emoji: '📌' }
  }

  function getDefaultItemColor(itemType) {
    if (itemType === 'decoration') return 'transparent'
    return itemType === 'checklist' ? '#ffffff' : '#fff59d'
  }

  function getItemColor(item) {
    const fallback = getDefaultItemColor(item?.item_type)
    const color = typeof item?.color === 'string' ? item.color.trim() : ''
    return color || fallback
  }

  function getItemTextColor(item) {
    const value = typeof item?.text_color === 'string' ? item.text_color.trim() : ''
    return value || '#222222'
  }

  function isMissingColumnError(error, columnName) {
    const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
    return message.includes(columnName) && (
      message.includes('column')
      || message.includes('schema cache')
      || message.includes('does not exist')
      || message.includes('not found')
    )
  }

  function normalizeFontSize(value, fallback = 16) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    const rounded = Math.round(parsed)
    return Math.min(48, Math.max(10, rounded))
  }

  function getItemFontSize(item) {
    return normalizeFontSize(item?.font_size, 16)
  }

  function getItemFontFamily(item) {
    const value = typeof item?.font_family === 'string' ? item.font_family.trim() : ''
    return value || 'inherit'
  }

  function getItemWidth(item) {
    const value = Number(item?.width)
    if (Number.isFinite(value) && value > 0) return value
    if (isDecorationItem(item)) return 88
    return 200
  }

  function getAutoDecorationHeight() {
    return 88
  }

  function getAutoChecklistHeight(item) {
    const itemCount = Array.isArray(item?.items) ? item.items.length : 0
    return clampDimension(74 + itemCount * 26, 96, 260)
  }

  function getAutoNoteHeight(item) {
    const content = typeof item?.content === 'string' ? item.content : ''
    const newlineCount = content.length > 0 ? content.split('\n').length : 1
    const wrappedLineCount = Math.max(1, Math.ceil(content.length / 70))
    const estimatedLines = Math.max(newlineCount, wrappedLineCount)
    return clampDimension(68 + estimatedLines * 22, 88, 220)
  }

  function getItemHeight(item) {
    const value = Number(item?.height)
    if (Number.isFinite(value) && value > 0) {
      if (isChecklistItem(item) && value === 160) {
        return getAutoChecklistHeight(item)
      }
      if (isDecorationItem(item)) {
        return value
      }
      if (!isChecklistItem(item) && value === 120) {
        return getAutoNoteHeight(item)
      }
      return value
    }

    if (isChecklistItem(item)) return getAutoChecklistHeight(item)
    if (isDecorationItem(item)) return getAutoDecorationHeight()
    return getAutoNoteHeight(item)
  }

  function getItemTableName(item) {
    if (isChecklistItem(item)) return 'checklists'
    if (isDecorationItem(item)) return 'decorations'
    return 'notes'
  }

  function getItemCreatorLabel(item) {
    const creatorPreferredName = typeof item?.created_by_name === 'string' ? item.created_by_name.trim() : ''
    if (creatorPreferredName) return creatorPreferredName
    const creatorEmail = typeof item?.created_by_email === 'string' ? item.created_by_email.trim() : ''
    if (creatorEmail) return creatorEmail
    if (item?.user_id && item.user_id === user.id) return 'You'
    return 'A collaborator'
  }

  function clampDimension(value, min, max) {
    return Math.min(max, Math.max(min, value))
  }

  function addChecklistEditItem() {
    const text = newChecklistItemText.trim()
    if (!text) return

    setChecklistEditItems((prev) => [...prev, { text, is_checked: false }])
    setNewChecklistItemText('')
  }

  useEffect(() => {
    fetchDesks()
  }, [user.id])

  useEffect(() => {
    fetchFriends()
  }, [user.id])

  useEffect(() => {
    fetchUserStats()
  }, [user.id])

  useEffect(() => {
    if (!selectedDeskId) {
      setNotes([])
      return
    }

    fetchDeskItems(selectedDeskId)
  }, [selectedDeskId])

  useEffect(() => {
    if (!selectedDeskId) return
    localStorage.setItem(lastDeskStorageKey, String(selectedDeskId))
  }, [lastDeskStorageKey, selectedDeskId])

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    if (!activeDecorationHandleId) return

    function handleDecorationOutsideClick(e) {
      const clickedItemElement = e.target.closest?.('[data-item-key]')
      const clickedItemKey = clickedItemElement?.dataset?.itemKey || null

      if (clickedItemKey === activeDecorationHandleId) return
      setActiveDecorationHandleId(null)
    }

    window.addEventListener('mousedown', handleDecorationOutsideClick)
    return () => window.removeEventListener('mousedown', handleDecorationOutsideClick)
  }, [activeDecorationHandleId])

  useEffect(() => {
    function handleResize() {
      const nextSectionHeight = window.innerHeight || 800
      setSectionHeight(nextSectionHeight)
      setCanvasHeight((prev) => Math.max(prev, nextSectionHeight * 2))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!hasModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (confirmDialog.isOpen && !confirmDialogLoading) {
          closeConfirmDialog()
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
  }, [hasModalOpen, confirmDialog.isOpen, confirmDialogLoading, pendingDeleteId])

  useEffect(() => {
    if (!showNewNoteMenu && !showDeskMenu && !showProfileMenu) return

    function handleClickOutside(e) {
      if (showNewNoteMenu && !newNoteMenuRef.current?.contains(e.target)) {
        setShowNewNoteMenu(false)
      }
      if (showDeskMenu && !deskMenuRef.current?.contains(e.target)) {
        setShowDeskMenu(false)
      }
      if (showProfileMenu && !profileMenuRef.current?.contains(e.target)) {
        setShowProfileMenu(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [showNewNoteMenu, showDeskMenu, showProfileMenu])

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

  function normalizeHttpUrl(value) {
    const raw = typeof value === 'string' ? value.trim() : ''
    if (!raw) return ''

    try {
      const parsed = new URL(raw)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
      return parsed.toString()
    } catch {
      return ''
    }
  }

  function getDeskCustomBackgroundUrl(desk) {
    const candidates = [desk?.custom_background_url, desk?.background_url, desk?.background]
    for (const candidate of candidates) {
      const normalized = normalizeHttpUrl(candidate)
      if (normalized) return normalized
    }
    return ''
  }

  function getDeskNameValue(desk) {
    return desk?.name || desk?.desk_name || 'Untitled desk'
  }

  function isDeskCollaborative(desk) {
    return Boolean(desk?.is_collaborative)
  }

  async function fetchDesks() {
    const { data: ownedDesks, error: ownedError } = await supabase
      .from('desks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (ownedError) {
      console.error('Failed to fetch owned desks:', ownedError)
      return
    }

    let sharedDesks = []

    const { data: membershipRows, error: membershipError } = await supabase
      .from('desk_members')
      .select('desk_id')
      .eq('user_id', user.id)

    if (membershipError) {
      console.error('Failed to fetch shared desk memberships:', membershipError)
    } else {
      const ownedDeskIds = new Set((ownedDesks || []).map((desk) => desk.id))
      const sharedDeskIds = (membershipRows || [])
        .map((row) => row.desk_id)
        .filter((deskId) => deskId && !ownedDeskIds.has(deskId))

      if (sharedDeskIds.length > 0) {
        const { data: loadedSharedDesks, error: sharedDesksError } = await supabase
          .from('desks')
          .select('*')
          .in('id', sharedDeskIds)
          .order('created_at', { ascending: true })

        if (sharedDesksError) {
          console.error('Failed to fetch shared desks:', sharedDesksError)
        } else {
          sharedDesks = loadedSharedDesks || []
        }
      }
    }

    const mergedDeskMap = new Map()
    ;[...(ownedDesks || []), ...sharedDesks].forEach((desk) => {
      if (desk?.id) mergedDeskMap.set(desk.id, desk)
    })

    const loadedDesks = Array.from(mergedDeskMap.values()).sort((a, b) => {
      const left = a?.created_at ? new Date(a.created_at).getTime() : 0
      const right = b?.created_at ? new Date(b.created_at).getTime() : 0
      return left - right
    })

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

    let createdDesk = null
    let createError = null

    const { data: withFlagData, error: withFlagError } = await supabase
      .from('desks')
      .insert([{ user_id: user.id, name: trimmedName, background: 'desk1', is_collaborative: isCollaborative }])
      .select()

    if (withFlagError) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('desks')
        .insert([{ user_id: user.id, name: trimmedName, background: 'desk1' }])
        .select()

      createError = fallbackError
      createdDesk = fallbackData?.[0]
      if (createdDesk && isCollaborative) {
        createdDesk = { ...createdDesk, is_collaborative: true }
      }
    } else {
      createdDesk = withFlagData?.[0]
    }

    if (createError || !createdDesk) {
      console.error('Failed to create desk:', createError)
      return { ok: false, errorMessage: createError?.message || 'Failed to create desk.' }
    }

    if (isCollaborative) {
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
          await supabase.from('desk_members').delete().eq('desk_id', createdDesk.id)
          await supabase.from('desks').delete().eq('id', createdDesk.id).eq('user_id', user.id)
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
      return
    }

    setDeskMembersLoading(true)
    setDeskMembersError('')

    try {
      const { data: membershipRows, error: membershipError } = await supabase
        .from('desk_members')
        .select('id, user_id, created_at')
        .eq('desk_id', deskId)
        .order('created_at', { ascending: true })

      if (membershipError) throw membershipError

      const memberRows = membershipRows || []
      if (memberRows.length === 0) {
        setDeskMembers([])
        return
      }

      const memberIds = memberRows.map((row) => row.user_id)
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
      setDeskMembers(
        memberRows.map((row) => ({
          membership_id: row.id,
          user_id: row.user_id,
          email: profileById.get(row.user_id)?.email || 'Unknown user',
          preferred_name: profileById.get(row.user_id)?.preferred_name || ''
        }))
      )
    } catch (error) {
      console.error('Failed to fetch desk members:', error)
      setDeskMembersError(error?.message || 'Could not load desk members.')
      setDeskMembers([])
    } finally {
      setDeskMembersLoading(false)
    }
  }

  async function openDeskMembersDialog() {
    const desk = desks.find((entry) => entry.id === selectedDeskId)
    if (!desk || desk.user_id !== user.id) return

    setDeskMembersDialogOpen(true)
    setDeskMembersMessage('')
    setDeskMembersError('')
    setDeskMemberActionLoadingId(null)
    await fetchDeskMembers(desk.id)
  }

  function closeDeskMembersDialog() {
    setDeskMembersDialogOpen(false)
    setDeskMembersError('')
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
    await fetchDeskMembers(selectedDeskId)
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
    await fetchDeskMembers(selectedDeskId)
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

    const normalizedUrl = normalizeHttpUrl(urlInput)
    if (!normalizedUrl) {
      setBackgroundMenuError('Please paste a valid http(s) image URL.')
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
      setBackgroundMenuError(updateError?.message || 'Could not set custom image.')
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
      setNotes([])
      return
    }

    const [
      { data: notesData, error: notesError },
      { data: checklistsData, error: checklistsError },
      { data: decorationsData, error: decorationsError }
    ] = await Promise.all([
      supabase.from('notes').select('*').eq('desk_id', deskId),
      supabase.from('checklists').select('*').eq('desk_id', deskId),
      supabase.from('decorations').select('*').eq('desk_id', deskId)
    ])

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
    setNotes(combined)

    const maxNoteBottom = combined.reduce((maxY, item) => {
      const itemBottom = (Number(item.y) || 0) + getItemHeight(item)
      return Math.max(maxY, itemBottom)
    }, 0)
    const requiredHeight = maxNoteBottom + growThreshold
    const requiredSections = Math.max(2, Math.ceil(requiredHeight / sectionHeight))
    setCanvasHeight((prev) => Math.max(prev, requiredSections * sectionHeight))
  }

  async function addStickyNote() {
    if (!selectedDeskId) return

    let data = null
    let error = null

    const withUserResult = await supabase
      .from('notes')
      .insert([{ desk_id: selectedDeskId, user_id: user.id, content: 'New note', color: '#fff59d', font_family: 'inherit', x: 100, y: 100, rotation: 0, width: 200, height: 120 }])
      .select()

    data = withUserResult.data
    error = withUserResult.error

    if (error) {
      const fallbackResult = await supabase
        .from('notes')
        .insert([{ desk_id: selectedDeskId, content: 'New note', color: '#fff59d', font_family: 'inherit', x: 100, y: 100, rotation: 0, width: 200, height: 120 }])
        .select()

      data = fallbackResult.data
      error = fallbackResult.error
    }

    const createdNote = data?.[0]

    if (createdNote) {
      setNotes((prev) => [...prev, { ...createdNote, item_type: 'note' }])
      await fetchDeskItems(selectedDeskId)
    } else {
      console.error('Failed to create note:', error)
      setEditSaveError(error?.message || 'Failed to create note.')
    }

    setShowNewNoteMenu(false)
  }

  async function addChecklistNote() {
    if (!selectedDeskId) return

    let data = null
    let error = null

    const withUserResult = await supabase
      .from('checklists')
      .insert([{ desk_id: selectedDeskId, user_id: user.id, title: 'Checklist', color: '#ffffff', font_family: 'inherit', x: 100, y: 100, rotation: 0, width: 220, height: 160 }])
      .select()

    data = withUserResult.data
    error = withUserResult.error

    if (error) {
      const fallbackResult = await supabase
        .from('checklists')
        .insert([{ desk_id: selectedDeskId, title: 'Checklist', color: '#ffffff', font_family: 'inherit', x: 100, y: 100, rotation: 0, width: 220, height: 160 }])
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

    setShowNewNoteMenu(false)
  }

  async function addDecoration(kind) {
    if (!selectedDeskId) return

    const option = getDecorationOption(kind)
    const { data, error } = await supabase
      .from('decorations')
      .insert([{ desk_id: selectedDeskId, kind: option.key, x: 110, y: 110, rotation: 0, width: 88, height: 88 }])
      .select()

    const createdDecoration = data?.[0]

    if (createdDecoration) {
      setNotes((prev) => [...prev, { ...createdDecoration, item_type: 'decoration' }])
      await fetchDeskItems(selectedDeskId)
    } else {
      console.error('Failed to create decoration:', error)
      setEditSaveError(error?.message || 'Failed to create decoration.')
    }

    setShowNewNoteMenu(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
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

  function formatDate(dateLike) {
    if (!dateLike) return 'Unknown'
    const date = new Date(dateLike)
    if (Number.isNaN(date.getTime())) return 'Unknown'
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function getProfileDisplayParts(profileLike) {
    const preferredName = typeof profileLike?.preferred_name === 'string' ? profileLike.preferred_name.trim() : ''
    const email = typeof profileLike?.email === 'string' ? profileLike.email.trim() : ''

    if (preferredName && email && preferredName.toLowerCase() !== email.toLowerCase()) {
      return { primary: preferredName, secondary: email }
    }

    return {
      primary: preferredName || email || 'Unknown user',
      secondary: ''
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
      await ensureCurrentUserProfile()

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

      const otherUserId = targetProfile.id

      const { data: existingRows, error: existingError } = await supabase
        .from('friend_requests')
        .select('id, status, sender_id, receiver_id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .limit(1)

      if (existingError) {
        throw existingError
      }

      const existingRow = existingRows?.[0]
      if (existingRow) {
        if (existingRow.status === 'accepted') {
          setFriendError('You are already friends with this user.')
          return
        }

        if (existingRow.status === 'pending') {
          if (existingRow.receiver_id === user.id) {
            setFriendError('This user already sent you a request. Accept it below.')
          } else {
            setFriendError('Friend request already sent.')
          }
          return
        }
      }

      const { error: insertError } = await supabase
        .from('friend_requests')
        .insert([{ sender_id: user.id, receiver_id: otherUserId, status: 'pending' }])

      if (insertError) {
        throw insertError
      }

      setFriendMessage(`Friend request sent to ${targetEmail}.`)
      setFriendEmailInput('')
      await fetchFriends()
    } catch (error) {
      console.error('Failed to send friend request:', error)
      setFriendError(error?.message || 'Could not send friend request.')
    } finally {
      setFriendSubmitting(false)
    }
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

    const storedRotation = toStoredRotation(rotationValue)
    const table = getItemTableName(item)
    const { error } = await supabase
      .from(table)
      .update({ rotation: storedRotation, desk_id: selectedDeskId })
      .eq('id', item.id)
      .eq('desk_id', selectedDeskId)

    if (error) {
      console.error('Failed to save item rotation:', error)
      return null
    }

    return storedRotation
  }

  async function persistItemPosition(itemKey, x, y) {
    const item = notesRef.current.find((row) => getItemKey(row) === itemKey)
    if (!item) return

    const table = getItemTableName(item)
    await supabase
      .from(table)
      .update({ x, y, desk_id: selectedDeskId })
      .eq('id', item.id)
      .eq('desk_id', selectedDeskId)
  }

  async function persistItemSize(itemKey, width, height) {
    const item = notesRef.current.find((row) => getItemKey(row) === itemKey)
    if (!item) return

    const table = getItemTableName(item)
    const { error } = await supabase
      .from(table)
      .update({ width, height, desk_id: selectedDeskId })
      .eq('id', item.id)
      .eq('desk_id', selectedDeskId)

    if (error) {
      console.error('Failed to save item size:', error)
    }
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

  function handleResizeMouseDown(e, item) {
    e.preventDefault()
    e.stopPropagation()

    const itemKey = getItemKey(item)
    const startWidth = getItemWidth(item)
    const startHeight = getItemHeight(item)

    resizeStartRef.current = {
      itemKey,
      startPageX: e.pageX,
      startPageY: e.pageY,
      startWidth,
      startHeight
    }

    setResizingId(itemKey)
    setResizeOverlay({
      x: e.clientX,
      y: e.clientY,
      scale: 1,
      ratioLocked: false,
      width: startWidth,
      height: startHeight
    })

    window.addEventListener('mousemove', handleResizeMouseMove)
    window.addEventListener('mouseup', handleResizeMouseUp)
  }

  function handleResizeMouseMove(e) {
    const activeItemKey = resizeStartRef.current.itemKey
    if (!activeItemKey) return

    const activeItem = notesRef.current.find((item) => getItemKey(item) === activeItemKey)
    if (!activeItem) return

    const deltaX = e.pageX - resizeStartRef.current.startPageX
    const deltaY = e.pageY - resizeStartRef.current.startPageY
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

    setResizeOverlay({
      x: e.clientX,
      y: e.clientY,
      scale,
      ratioLocked: isRatioLocked,
      width: nextWidth,
      height: nextHeight
    })
  }

  async function handleResizeMouseUp() {
    const activeItemKey = resizeStartRef.current.itemKey

    window.removeEventListener('mousemove', handleResizeMouseMove)
    window.removeEventListener('mouseup', handleResizeMouseUp)

    setResizingId(null)
    setResizeOverlay(null)

    if (!activeItemKey) return

    const resizedItem = notesRef.current.find((item) => getItemKey(item) === activeItemKey)
    if (!resizedItem) {
      resizeStartRef.current.itemKey = null
      return
    }

    await persistItemSize(activeItemKey, getItemWidth(resizedItem), getItemHeight(resizedItem))
    resizeStartRef.current.itemKey = null
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
        sort_order: index
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
      const { data: inserted, error: insertItemsError } = await supabase
        .from('checklist_items')
        .insert(nextItems.map((entry) => ({ ...entry, checklist_id: item.id })))
        .select()

      if (insertItemsError) {
        console.error('Failed saving checklist items:', insertItemsError)
        return { ok: false, errorMessage: insertItemsError?.message || 'Failed saving checklist items.' }
      }

      insertedItems = inserted || []
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
    if (isSavingEdit) return

    setIsSavingEdit(true)
    setEditSaveError('')

    let saveResult = { ok: false }
    try {
      saveResult = await saveItemEdits(item)
    } catch (error) {
      console.error('Unexpected save error:', error)
      setEditSaveError('Save failed. Please try again.')
      return
    } finally {
      setIsSavingEdit(false)
    }

    if (!saveResult.ok) {
      setEditSaveError(saveResult.errorMessage || 'Save failed. Please check your connection and try again.')
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
  }

  async function toggleChecklistItem(itemKey, itemIndex) {
    const checklist = notesRef.current.find((row) => getItemKey(row) === itemKey)
    if (!checklist || !isChecklistItem(checklist)) return

    const targetItem = checklist.items?.[itemIndex]
    if (!targetItem) return

    const nextChecked = !targetItem.is_checked

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
      await fetchDeskItems(selectedDeskId)
    }
  }

  function getPointerAngleFromCenter(pageX, pageY) {
    return (Math.atan2(pageY - rotationCenterRef.current.y, pageX - rotationCenterRef.current.x) * 180) / Math.PI
  }

  function handleRotateMouseDown(e, item) {
    e.preventDefault()
    e.stopPropagation()

    const noteElement = e.currentTarget.closest('[data-note-id]')
    if (!noteElement) return

    const rect = noteElement.getBoundingClientRect()
    const centerX = rect.left + window.scrollX + rect.width / 2
    const centerY = rect.top + window.scrollY + rect.height / 2
    rotationCenterRef.current = { x: centerX, y: centerY }

    const currentRotation = Number(item.rotation) || 0
    const pointerAngle = getPointerAngleFromCenter(e.pageX, e.pageY)
    rotationOffsetRef.current = currentRotation - pointerAngle
    const itemKey = getItemKey(item)
    rotatingNoteIdRef.current = itemKey
    setRotatingId(itemKey)

    window.addEventListener('mousemove', handleRotateMouseMove)
    window.addEventListener('mouseup', handleRotateMouseUp)
  }

  function handleRotateMouseMove(e) {
    const activeRotatingId = rotatingNoteIdRef.current
    if (!activeRotatingId) return

    const pointerAngle = getPointerAngleFromCenter(e.pageX, e.pageY)
    const nextRotation = normalizeRotation(pointerAngle + rotationOffsetRef.current)

    setNotes((prev) =>
      prev.map((item) =>
        getItemKey(item) === activeRotatingId ? { ...item, rotation: nextRotation } : item
      )
    )
  }

  async function handleRotateMouseUp(e) {
    const activeRotatingId = rotatingNoteIdRef.current

    rotatingNoteIdRef.current = null
    setRotatingId(null)
    window.removeEventListener('mousemove', handleRotateMouseMove)
    window.removeEventListener('mouseup', handleRotateMouseUp)

    if (!activeRotatingId) return

    let nextRotation = null

    if (e) {
      const pointerAngle = getPointerAngleFromCenter(e.pageX, e.pageY)
      nextRotation = normalizeRotation(pointerAngle + rotationOffsetRef.current)

      setNotes((prev) =>
        prev.map((item) =>
          getItemKey(item) === activeRotatingId ? { ...item, rotation: nextRotation } : item
        )
      )
    } else {
      const itemToPersist = notesRef.current.find((item) => getItemKey(item) === activeRotatingId)
      if (!itemToPersist) return
      nextRotation = Number(itemToPersist.rotation) || 0
    }

    const savedRotation = await persistRotation(activeRotatingId, nextRotation)
    if (savedRotation !== null) {
      setNotes((prev) =>
        prev.map((item) =>
          getItemKey(item) === activeRotatingId ? { ...item, rotation: savedRotation } : item
        )
      )
    }
  }

  function requestDeleteNote(itemKey) {
    setPendingDeleteId(itemKey)
  }

  async function confirmDeleteNote() {
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
    if (editingId) return

    const itemKey = getItemKey(item)
    setDraggedId(itemKey)
    draggedIdRef.current = itemKey

    const offset = { x: e.pageX - item.x, y: e.pageY - item.y }
    setDragOffset(offset)
    dragOffsetRef.current = offset

    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', handleDragEnd)
  }

  function handleDragMove(e) {
    const activeDraggedId = draggedIdRef.current
    if (!activeDraggedId) return

    const activeItem = notesRef.current.find((item) => getItemKey(item) === activeDraggedId)
    const activeItemWidth = getItemWidth(activeItem)
    const activeItemHeight = getItemHeight(activeItem)

    const nextX = e.pageX - dragOffsetRef.current.x
    const nextY = e.pageY - dragOffsetRef.current.y

    setCanvasHeight((prev) => {
      if (nextY + activeItemHeight + growThreshold <= prev) return prev
      const requiredHeight = nextY + activeItemHeight + growThreshold
      const requiredSections = Math.ceil(requiredHeight / sectionHeight)
      return Math.max(prev, requiredSections * sectionHeight)
    })

    const maxX = Math.max(0, window.innerWidth - activeItemWidth)
    const boundedX = Math.min(Math.max(0, nextX), maxX)
    const boundedY = Math.max(0, nextY)

    setNotes((prev) =>
      prev.map((item) =>
        getItemKey(item) === activeDraggedId
          ? { ...item, x: boundedX, y: boundedY }
          : item
      )
    )
  }

  async function handleDragEnd(e) {
    const activeDraggedId = draggedIdRef.current

    setDraggedId(null)
    draggedIdRef.current = null
    window.removeEventListener('mousemove', handleDragMove)
    window.removeEventListener('mouseup', handleDragEnd)

    if (!activeDraggedId) return

    let nextPosition = null

    if (e) {
      const nextX = e.pageX - dragOffsetRef.current.x
      const nextY = e.pageY - dragOffsetRef.current.y
      const activeItem = notesRef.current.find((item) => getItemKey(item) === activeDraggedId)
      const maxX = Math.max(0, window.innerWidth - getItemWidth(activeItem))
      nextPosition = {
        x: Math.min(Math.max(0, nextX), maxX),
        y: Math.max(0, nextY)
      }

      setNotes((prev) =>
        prev.map((item) =>
          getItemKey(item) === activeDraggedId ? { ...item, x: nextPosition.x, y: nextPosition.y } : item
        )
      )
    } else {
      const itemToPersist = notesRef.current.find((item) => getItemKey(item) === activeDraggedId)
      if (!itemToPersist) return
      nextPosition = { x: itemToPersist.x, y: itemToPersist.y }
    }

    await persistItemPosition(activeDraggedId, nextPosition.x, nextPosition.y)
  }

  function FourWayResizeIcon({ size = 14, color = 'currentColor' }) {
    const iconSize = Math.max(12, size)
    const arrowSize = Math.max(8, Math.round(iconSize * 0.64))

    return (
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          width: iconSize,
          height: iconSize,
          display: 'inline-block',
          color,
          lineHeight: 1,
          flexShrink: 0
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: -1,
            transform: 'translateX(-50%)',
            fontSize: arrowSize
          }}
        >
          ↑
        </span>
        <span
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -1,
            transform: 'translateX(-50%)',
            fontSize: arrowSize
          }}
        >
          ↓
        </span>
        <span
          style={{
            position: 'absolute',
            left: -1,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: arrowSize
          }}
        >
          ←
        </span>
        <span
          style={{
            position: 'absolute',
            right: -1,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: arrowSize
          }}
        >
          →
        </span>
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: Math.max(5, Math.round(iconSize * 0.36))
          }}
        >
          •
        </span>
      </span>
    )
  }

  const currentDesk = desks.find((desk) => desk.id === selectedDeskId) || null
  const isCurrentDeskOwner = Boolean(currentDesk && currentDesk.user_id === user.id)
  const pendingFriendRequestCount = incomingFriendRequests.length
  const totalItemsCount = notes.length
  const joinDate = formatDate(user.created_at)

  return (
    <div
      style={{
        position: 'relative',
        minHeight: canvasHeight,
        padding: 20,
        backgroundImage,
        backgroundSize,
        backgroundPosition,
        backgroundRepeat
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start'
        }}
      >
        <div ref={deskMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDeskMenu((prev) => !prev)}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            {currentDesk ? getDeskNameValue(currentDesk) : 'Select Desk'} ▼
          </button>

          {showDeskMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: 6,
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                color: '#222',
                zIndex: 220,
                minWidth: 200,
                padding: 6
              }}
            >
              <div style={{ maxHeight: 180, overflowY: 'auto', borderBottom: '1px solid #eee', marginBottom: 6 }}>
                {desks.length === 0 ? (
                  <div style={{ padding: '8px 10px', fontSize: 13, opacity: 0.75 }}>No desks yet</div>
                ) : (
                  desks.map((desk) => (
                    <button
                      key={desk.id}
                      type="button"
                      onClick={() => handleSelectDesk(desk)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
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
                        {desk.user_id !== user.id
                          ? 'Shared'
                          : isDeskCollaborative(desk)
                            ? 'Sharing'
                            : 'Private'}
                      </span>
                    </button>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={openCreateDeskDialog}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  border: 'none',
                  borderRadius: 4,
                  background: '#fff',
                  color: '#222',
                  cursor: 'pointer'
                }}
              >
                + New Desk
              </button>

              {currentDesk && isCurrentDeskOwner && (
                <button
                  type="button"
                  onClick={openRenameDeskDialog}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    border: 'none',
                    borderRadius: 4,
                    background: '#fff',
                    color: '#222',
                    cursor: 'pointer'
                  }}
                >
                  Rename Desk
                </button>
              )}

              {currentDesk && isCurrentDeskOwner && (
                <button
                  type="button"
                  onClick={deleteCurrentDesk}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    border: 'none',
                    borderRadius: 4,
                    background: '#fff',
                    color: '#d32f2f',
                    cursor: 'pointer'
                  }}
                >
                  Delete Desk
                </button>
              )}

              {currentDesk && !isCurrentDeskOwner && (
                <button
                  type="button"
                  onClick={leaveCurrentDesk}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    border: 'none',
                    borderRadius: 4,
                    background: '#fff',
                    color: '#d32f2f',
                    cursor: 'pointer'
                  }}
                >
                  Leave Desk
                </button>
              )}

              {currentDesk && isCurrentDeskOwner && (
                <button
                  type="button"
                  onClick={openDeskMembersDialog}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    border: 'none',
                    borderRadius: 4,
                    background: '#fff',
                    color: '#222',
                    cursor: 'pointer'
                  }}
                >
                  Manage Members
                </button>
              )}

              {currentDesk && isCurrentDeskOwner && (
                <div style={{ padding: '7px 10px', fontSize: 12, opacity: 0.8 }}>Change Background</div>
              )}
              {currentDesk && isCurrentDeskOwner && (
                <div style={{ display: 'flex', gap: 4, padding: '0 8px 6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk1')}
                  disabled={!currentDesk || !isCurrentDeskOwner}
                  style={{
                    flex: 1,
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
                    flex: 1,
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
                    flex: 1,
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
                    flex: 1,
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
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Custom Image URL</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={customBackgroundInput}
                      onChange={(e) => {
                        setBackgroundMenuError('')
                        setCustomBackgroundInput(e.target.value)
                      }}
                      placeholder="https://..."
                      style={{
                        flex: 1,
                        minWidth: 0,
                        borderRadius: 4,
                        border: '1px solid #ccc',
                        padding: '5px 7px',
                        fontSize: 12
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setCurrentDeskCustomBackground(customBackgroundInput)}
                      style={{
                        border: 'none',
                        borderRadius: 4,
                        background: '#4285F4',
                        color: '#fff',
                        padding: '5px 8px',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Apply
                    </button>
                  </div>
                  {backgroundMenuError && (
                    <div style={{ marginTop: 4, color: '#d32f2f', fontSize: 11 }}>{backgroundMenuError}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div ref={profileMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              const nextOpen = !showProfileMenu
              setShowProfileMenu(nextOpen)
              setFriendError('')
              setFriendMessage('')
              if (nextOpen) {
                fetchCurrentUserProfile()
              }
            }}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            Profile{pendingFriendRequestCount > 0 ? ` (${pendingFriendRequestCount})` : ''} ▼
          </button>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: 6,
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                color: '#222',
                zIndex: 230,
                width: 340,
                padding: 10,
                maxHeight: 500,
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => setProfileTab('profile')}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderRadius: 4,
                    padding: '7px 8px',
                    background: profileTab === 'profile' ? '#4285F4' : '#eee',
                    color: profileTab === 'profile' ? '#fff' : '#333',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab('friends')}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderRadius: 4,
                    padding: '7px 8px',
                    background: profileTab === 'friends' ? '#4285F4' : '#eee',
                    color: profileTab === 'friends' ? '#fff' : '#333',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Friends{pendingFriendRequestCount > 0 ? ` (${pendingFriendRequestCount})` : ''}
                </button>
              </div>

              {profileTab === 'profile' ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>{user.email || 'Unknown user'}</div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: '#333' }}>Preferred name</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        value={preferredNameInput}
                        onChange={(e) => {
                          if (preferredNameError) setPreferredNameError('')
                          if (preferredNameMessage) setPreferredNameMessage('')
                          setPreferredNameInput(e.target.value)
                        }}
                        placeholder="How you want your name shown"
                        style={{
                          flex: 1,
                          padding: '7px 8px',
                          borderRadius: 4,
                          border: '1px solid #ccc',
                          fontSize: 13
                        }}
                      />
                      <button
                        type="button"
                        onClick={savePreferredName}
                        disabled={preferredNameSaving}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 4,
                          border: 'none',
                          background: '#4285F4',
                          color: '#fff',
                          cursor: preferredNameSaving ? 'not-allowed' : 'pointer',
                          opacity: preferredNameSaving ? 0.75 : 1,
                          fontSize: 12,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {preferredNameSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    {preferredNameMessage && (
                      <div style={{ marginTop: 5, color: '#2e7d32', fontSize: 12 }}>{preferredNameMessage}</div>
                    )}
                    {preferredNameError && (
                      <div style={{ marginTop: 5, color: '#d32f2f', fontSize: 12 }}>{preferredNameError}</div>
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

                  <button
                    type="button"
                    onClick={fetchUserStats}
                    disabled={profileStatsLoading}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 4,
                      border: '1px solid #ccc',
                      background: '#fff',
                      color: '#222',
                      cursor: profileStatsLoading ? 'not-allowed' : 'pointer',
                      fontSize: 12
                    }}
                  >
                    {profileStatsLoading ? 'Refreshing...' : 'Refresh stats'}
                  </button>
                </div>
              ) : (
                <div>
                  <form onSubmit={handleSendFriendRequest} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <input
                      value={friendEmailInput}
                      onChange={(e) => setFriendEmailInput(e.target.value)}
                      placeholder="friend@email.com"
                      style={{
                        flex: 1,
                        padding: '7px 8px',
                        borderRadius: 4,
                        border: '1px solid #ccc',
                        fontSize: 13
                      }}
                    />
                    <button
                      type="submit"
                      disabled={friendSubmitting}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 4,
                        border: 'none',
                        background: '#4285F4',
                        color: '#fff',
                        cursor: friendSubmitting ? 'not-allowed' : 'pointer',
                        opacity: friendSubmitting ? 0.75 : 1,
                        fontSize: 13
                      }}
                    >
                      {friendSubmitting ? 'Sending...' : 'Add'}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={fetchFriends}
                    disabled={friendsLoading}
                    style={{
                      marginBottom: 10,
                      padding: '5px 8px',
                      borderRadius: 4,
                      border: '1px solid #ccc',
                      background: '#fff',
                      color: '#222',
                      cursor: friendsLoading ? 'not-allowed' : 'pointer',
                      fontSize: 12
                    }}
                  >
                    {friendsLoading ? 'Refreshing...' : 'Refresh'}
                  </button>

                  {friendMessage && (
                    <div style={{ marginBottom: 8, color: 'green', fontSize: 12 }}>
                      {friendMessage}
                    </div>
                  )}
                  {friendError && (
                    <div style={{ marginBottom: 8, color: '#d32f2f', fontSize: 12 }}>
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
                        <div key={request.id} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #f1f1f1' }}>
                          <div style={{ fontSize: 13, marginBottom: 4 }}>
                            {requestDisplay.primary}
                            {requestDisplay.secondary && (
                              <div style={{ fontSize: 11, color: '#666' }}>{requestDisplay.secondary}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => respondToFriendRequest(request.id, 'accepted')}
                              style={{
                                border: 'none',
                                borderRadius: 4,
                                padding: '4px 8px',
                                background: '#2e7d32',
                                color: '#fff',
                                fontSize: 12,
                                cursor: 'pointer'
                              }}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => respondToFriendRequest(request.id, 'declined')}
                              style={{
                                border: 'none',
                                borderRadius: 4,
                                padding: '4px 8px',
                                background: '#d32f2f',
                                color: '#fff',
                                fontSize: 12,
                                cursor: 'pointer'
                              }}
                            >
                              Decline
                            </button>
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
                              <div style={{ fontSize: 11, color: '#666' }}>{friendDisplay.secondary}</div>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFriend(friend.id)}
                            disabled={friendActionLoadingId === friend.id}
                            style={{
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 8px',
                              background: '#eee',
                              color: '#333',
                              fontSize: 12,
                              cursor: friendActionLoadingId === friend.id ? 'not-allowed' : 'pointer',
                              opacity: friendActionLoadingId === friend.id ? 0.7 : 1,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {friendActionLoadingId === friend.id ? 'Removing...' : 'Remove'}
                          </button>
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
                              <div style={{ fontSize: 11, color: '#666' }}>{requestDisplay.secondary}</div>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => cancelOutgoingFriendRequest(request.id)}
                            style={{
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 8px',
                              background: '#eee',
                              color: '#333',
                              fontSize: 12,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 10 }}>
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 2px',
                    color: '#555',
                    fontSize: 13,
                    textDecoration: 'underline',
                    marginBottom: 4
                  }}
                >
                  Privacy Policy
                </a>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 2px',
                    border: 'none',
                    background: 'transparent',
                    color: '#d32f2f',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div ref={newNoteMenuRef} style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
        <button
          onClick={() => setShowNewNoteMenu((prev) => !prev)}
          disabled={!selectedDeskId}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            cursor: selectedDeskId ? 'pointer' : 'not-allowed',
            opacity: selectedDeskId ? 1 : 0.6
          }}
        >
          New Note ▼
        </button>

        {showNewNoteMenu && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 6,
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 6,
              boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              color: '#222',
              zIndex: 200
            }}
          >
            <button
              type="button"
              onClick={addStickyNote}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                border: 'none',
                background: '#fff',
                color: '#222',
                cursor: 'pointer'
              }}
            >
              Sticky Note
            </button>
            <button
              type="button"
              onClick={addChecklistNote}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                border: 'none',
                background: '#fff',
                color: '#222',
                cursor: 'pointer'
              }}
            >
              Checklist
            </button>

            <div style={{ borderTop: '1px solid #eee', marginTop: 2, paddingTop: 2 }}>
              <div style={{ padding: '6px 12px', fontSize: 12, color: '#666' }}>Decorations</div>
              {DECORATION_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => addDecoration(option.key)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    border: 'none',
                    background: '#fff',
                    color: '#222',
                    cursor: 'pointer'
                  }}
                >
                  {option.emoji} {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!selectedDeskId && (
        <div style={{ color: '#222', background: 'rgba(255,255,255,0.75)', display: 'inline-block', padding: '6px 10px', borderRadius: 6 }}>
          Create a desk from the top-right menu to get started.
        </div>
      )}

      {notes.map((item, index) => {
        const itemKey = getItemKey(item)
        const isChecklist = isChecklistItem(item)
        const isDecoration = isDecorationItem(item)
        const decorationOption = isDecoration ? getDecorationOption(item.kind) : null
        const shouldShowCreatorLabel = Boolean(currentDesk && isDeskCollaborative(currentDesk) && !isDecoration)
        const creatorLabel = shouldShowCreatorLabel ? getItemCreatorLabel(item) : ''
        const baseZIndex = index + 1

        return (
          <div
            key={itemKey}
            data-note-id={item.id}
            data-item-key={itemKey}
            onMouseDown={editingId ? undefined : (e) => handleDragStart(e, item)}
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
              width: getItemWidth(item),
              minHeight: getItemHeight(item),
              borderRadius: 0,
              boxShadow: isDecoration ? 'none' : '3px 3px 10px rgba(0,0,0,0.3)',
              mixBlendMode: 'normal',
              opacity: 1,
              fontFamily: editingId === itemKey ? editFontFamily : getItemFontFamily(item),
              cursor: draggedId === itemKey ? 'grabbing' : 'grab',
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
                      onMouseDown={(e) => {
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
                      onMouseDown={(e) => {
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
                      onMouseDown={(e) => {
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
                      onMouseDown={(e) => handleRotateMouseDown(e, item)}
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
                      onMouseDown={(e) => handleResizeMouseDown(e, item)}
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
                    onMouseDown={(e) => handleRotateMouseDown(e, item)}
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
                    onMouseDown={(e) => handleResizeMouseDown(e, item)}
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
                        onMouseDown={(e) => {
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
                        onMouseDown={(e) => {
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
                          style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}
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
                    onMouseDown={(e) => e.stopPropagation()}
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
                      onClick={() => {
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
                      }}
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
              <div
                onClick={() => {
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
                      is_checked: Boolean(entry.is_checked)
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
                  cursor: isDecoration ? 'grab' : 'pointer',
                  minHeight: 40,
                  height: '100%',
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
                        (item.items || []).map((checklistItem, index) => (
                          <label
                            key={`${item.id}-${checklistItem.id || index}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(checklistItem.is_checked)}
                              onChange={() => toggleChecklistItem(itemKey, index)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span style={{ textDecoration: checklistItem.is_checked ? 'line-through' : 'none' }}>{checklistItem.text}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {shouldShowCreatorLabel && (
                      <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 10, color: '#444', textAlign: 'right' }}>
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
                      <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 10, color: '#444', textAlign: 'right' }}>
                        Added by {creatorLabel}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      {pendingDeleteId && (
        <div
          style={{
            ...modalOverlayStyle,
            zIndex: 1000
          }}
        >
          <div
            style={{
              ...modalCardStyle,
              width: 280,
              textAlign: 'center'
            }}
          >
            <div style={{ marginBottom: 12, color: '#222' }}>Delete this note?</div>
            <button
              type="button"
              onClick={confirmDeleteNote}
              style={{
                ...modalDangerButtonStyle,
                marginRight: 8,
              }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              style={modalSecondaryButtonStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div
          style={{
            ...modalOverlayStyle,
            zIndex: 1100
          }}
        >
          <div
            style={{
              ...modalCardStyle,
              width: 320,
              textAlign: 'center'
            }}
          >
            <div style={{ ...modalTitleStyle, marginBottom: 12 }}>{confirmDialog.title || 'Confirm Action'}</div>
            <div style={{ marginBottom: 14, fontSize: 13, color: '#333' }}>{confirmDialog.message}</div>
            <button
              type="button"
              onClick={confirmDialogAction}
              disabled={confirmDialogLoading}
              style={{
                ...(confirmDialog.tone === 'danger' ? modalDangerButtonStyle : modalPrimaryButtonStyle),
                marginRight: 8,
                cursor: confirmDialogLoading ? 'not-allowed' : 'pointer',
                opacity: confirmDialogLoading ? 0.7 : 1
              }}
            >
              {confirmDialogLoading ? 'Working...' : confirmDialog.confirmLabel}
            </button>
            <button
              type="button"
              onClick={closeConfirmDialog}
              disabled={confirmDialogLoading}
              style={{
                ...modalSecondaryButtonStyle,
                cursor: confirmDialogLoading ? 'not-allowed' : 'pointer',
                opacity: confirmDialogLoading ? 0.7 : 1
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deskNameDialog.isOpen && (
        <div
          style={{
            ...modalOverlayStyle,
            zIndex: 1200
          }}
        >
          <form
            onSubmit={submitDeskNameDialog}
            style={{
              ...modalCardStyle,
              width: 320,
            }}
          >
            <div style={modalTitleStyle}>
              {deskNameDialog.mode === 'create' ? 'Create New Desk' : 'Rename Desk'}
            </div>

            <input
              value={deskNameDialog.value}
              onChange={(e) => {
                const nextValue = e.target.value
                if (deskNameError) setDeskNameError('')
                setDeskNameDialog((prev) => ({ ...prev, value: nextValue }))
              }}
              autoFocus
              placeholder="Desk name"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #ccc',
                marginBottom: 12,
                fontSize: 14
              }}
            />

            {deskNameDialog.mode === 'create' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(deskNameDialog.isCollaborative)}
                    onChange={(e) => {
                      const checked = e.target.checked
                      if (deskNameError) setDeskNameError('')
                      setDeskNameDialog((prev) => ({
                        ...prev,
                        isCollaborative: checked,
                        invitedFriendIds: checked ? prev.invitedFriendIds : []
                      }))
                    }}
                  />
                  Collaborative desk
                </label>

                {deskNameDialog.isCollaborative && (
                  <div
                    style={{
                      border: '1px solid #e3e3e3',
                      borderRadius: 6,
                      padding: 8,
                      maxHeight: 140,
                      overflowY: 'auto',
                      background: '#fafafa'
                    }}
                  >
                    <div style={{ fontSize: 12, marginBottom: 6, color: '#555' }}>Invite friends:</div>
                    {friends.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#777' }}>No friends available to invite yet.</div>
                    ) : (
                      friends.map((friend) => {
                        const checked = (deskNameDialog.invitedFriendIds || []).includes(friend.id)
                        const friendDisplay = getProfileDisplayParts(friend)
                        return (
                          <label
                            key={friend.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleInvitedFriend(friend.id)}
                            />
                            <span>{friendDisplay.primary}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {deskNameError && (
              <div style={{ color: '#d32f2f', fontSize: 12, marginBottom: 10 }}>
                {deskNameError}
              </div>
            )}

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={closeDeskNameDialog}
                disabled={deskNameSaving}
                style={{
                  ...modalSecondaryButtonStyle,
                  marginRight: 8,
                  cursor: deskNameSaving ? 'not-allowed' : 'pointer',
                  opacity: deskNameSaving ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deskNameSaving}
                style={{
                  ...modalPrimaryButtonStyle,
                  cursor: deskNameSaving ? 'not-allowed' : 'pointer',
                  opacity: deskNameSaving ? 0.7 : 1
                }}
              >
                {deskNameSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deskMembersDialogOpen && (
        <div
          style={{
            ...modalOverlayStyle,
            zIndex: 1250
          }}
        >
          <div
            style={{
              ...modalCardStyle,
              width: 360,
              maxHeight: '75vh',
              overflowY: 'auto'
            }}
          >
            <div style={modalTitleStyle}>Manage Desk Members</div>

            {deskMembersMessage && (
              <div style={{ color: 'green', fontSize: 12, marginBottom: 8 }}>{deskMembersMessage}</div>
            )}
            {deskMembersError && (
              <div style={{ color: '#d32f2f', fontSize: 12, marginBottom: 8 }}>{deskMembersError}</div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Current members</div>
              {deskMembersLoading ? (
                <div style={{ fontSize: 12, color: '#777' }}>Loading members...</div>
              ) : deskMembers.length === 0 ? (
                <div style={{ fontSize: 12, color: '#777' }}>No members yet</div>
              ) : (
                deskMembers.map((member) => {
                  const isRemoving = deskMemberActionLoadingId === `remove:${member.user_id}`
                  const memberDisplay = getProfileDisplayParts(member)
                  return (
                    <div
                      key={member.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 6
                      }}
                    >
                      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {memberDisplay.primary}
                        {memberDisplay.secondary && (
                          <div style={{ fontSize: 11, color: '#666' }}>{memberDisplay.secondary}</div>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDeskMember(member.user_id)}
                        disabled={isRemoving}
                        style={{
                          border: 'none',
                          borderRadius: 4,
                          padding: '4px 8px',
                          background: '#eee',
                          color: '#333',
                          fontSize: 12,
                          cursor: isRemoving ? 'not-allowed' : 'pointer',
                          opacity: isRemoving ? 0.7 : 1,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isRemoving ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Add friends</div>
              {friends.length === 0 ? (
                <div style={{ fontSize: 12, color: '#777' }}>No friends available</div>
              ) : (
                friends.map((friend) => {
                  const alreadyMember = deskMembers.some((member) => member.user_id === friend.id)
                  const isAdding = deskMemberActionLoadingId === `add:${friend.id}`
                  const friendDisplay = getProfileDisplayParts(friend)
                  return (
                    <div
                      key={friend.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 6
                      }}
                    >
                      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {friendDisplay.primary}
                        {friendDisplay.secondary && (
                          <div style={{ fontSize: 11, color: '#666' }}>{friendDisplay.secondary}</div>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => addDeskMember(friend.id)}
                        disabled={alreadyMember || isAdding}
                        style={{
                          border: 'none',
                          borderRadius: 4,
                          padding: '4px 8px',
                          background: alreadyMember ? '#eee' : '#4285F4',
                          color: alreadyMember ? '#777' : '#fff',
                          fontSize: 12,
                          cursor: alreadyMember || isAdding ? 'not-allowed' : 'pointer',
                          opacity: isAdding ? 0.7 : 1,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {alreadyMember ? 'Added' : isAdding ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={closeDeskMembersDialog}
                style={modalSecondaryButtonStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {resizeOverlay && (
        <div
          style={{
            position: 'fixed',
            left: resizeOverlay.x + 14,
            top: resizeOverlay.y + 14,
            background: 'rgba(20, 20, 20, 0.9)',
            color: '#fff',
            borderRadius: 8,
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 1500,
            pointerEvents: 'none',
            minWidth: 170
          }}
        >
          <FourWayResizeIcon size={14} color="#fff" />
          <input
            type="range"
            min={50}
            max={250}
            value={Math.round(resizeOverlay.scale * 100)}
            readOnly
            style={{ width: 90 }}
          />
          <span style={{ fontSize: 11 }}>
            {resizeOverlay.width}×{resizeOverlay.height}
            {resizeOverlay.ratioLocked ? ' • lock' : ''}
          </span>
        </div>
      )}
    </div>
  )
}