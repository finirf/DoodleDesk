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
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editSaveError, setEditSaveError] = useState('')
  const [backgroundMode, setBackgroundMode] = useState('desk1')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [friends, setFriends] = useState([])
  const [incomingFriendRequests, setIncomingFriendRequests] = useState([])
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState([])
  const [friendEmailInput, setFriendEmailInput] = useState('')
  const [friendMessage, setFriendMessage] = useState('')
  const [friendError, setFriendError] = useState('')
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendSubmitting, setFriendSubmitting] = useState(false)
  const [profileStats, setProfileStats] = useState({ desks_created: 0, desks_deleted: 0 })
  const [profileStatsLoading, setProfileStatsLoading] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
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

  const sectionCount = Math.max(2, Math.ceil(canvasHeight / sectionHeight))
  const backgroundLayers = Array.from({ length: sectionCount }, (_, index) => {
    if (backgroundMode === 'desk1') return "url('/brownDesk.png')"
    if (backgroundMode === 'desk2') return "url('/grayDesk.png')"
    if (backgroundMode === 'desk3') return "url('/leavesDesk.jpg')"
    if (backgroundMode === 'desk4') return "url('/flowersDesk.jpg')"
    return "url('/brownDesk.png')"
  })
  const backgroundImage = backgroundLayers.join(', ')
  const backgroundSize = Array.from({ length: sectionCount }, () => `100% ${sectionHeight}px`).join(', ')
  const backgroundPosition = Array.from({ length: sectionCount }, (_, index) =>
    index === 0 ? 'top center' : `center ${index * sectionHeight}px`
  ).join(', ')
  const backgroundRepeat = Array.from({ length: sectionCount }, () => 'no-repeat').join(', ')

  function getItemKey(item) {
    return `${item.item_type}:${item.id}`
  }

  function isChecklistItem(item) {
    return item.item_type === 'checklist'
  }

  function getDefaultItemColor(itemType) {
    return itemType === 'checklist' ? '#ffffff' : '#fff59d'
  }

  function getItemColor(item) {
    const fallback = getDefaultItemColor(item?.item_type)
    const color = typeof item?.color === 'string' ? item.color.trim() : ''
    return color || fallback
  }

  function getItemFontFamily(item) {
    const value = typeof item?.font_family === 'string' ? item.font_family.trim() : ''
    return value || 'inherit'
  }

  function getItemWidth(item) {
    const value = Number(item?.width)
    return Number.isFinite(value) && value > 0 ? value : 200
  }

  function getItemHeight(item) {
    const value = Number(item?.height)
    return Number.isFinite(value) && value > 0 ? value : 120
  }

  function clampScale(value) {
    return Math.min(2.5, Math.max(0.5, value))
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
    notesRef.current = notes
  }, [notes])

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
    if (!pendingDeleteId) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setPendingDeleteId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [pendingDeleteId])

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
    const nextMode = desk?.background_mode || desk?.background
    if (nextMode === 'desk1' || nextMode === 'desk2' || nextMode === 'desk3' || nextMode === 'desk4') {
      return nextMode
    }
    return 'desk1'
  }

  function getDeskNameValue(desk) {
    return desk?.name || desk?.desk_name || 'Untitled desk'
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
      const nextDesk = loadedDesks.find((desk) => desk.id === prev) || loadedDesks[0]
      setBackgroundMode(getDeskBackgroundValue(nextDesk))
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

    const { data, error } = await supabase
      .from('desks')
      .insert([{ user_id: user.id, name: trimmedName, background: 'desk1' }])
      .select()

    if (error || !data?.[0]) {
      console.error('Failed to create desk:', error)
      return { ok: false, errorMessage: error?.message || 'Failed to create desk.' }
    }

    const createdDesk = data[0]

    if (isCollaborative) {
      const { error: ownerMemberInsertError } = await supabase
        .from('desk_members')
        .upsert([{ desk_id: createdDesk.id, user_id: user.id, role: 'owner' }], { onConflict: 'desk_id,user_id' })

      if (ownerMemberInsertError) {
        console.error('Failed to add desk owner membership:', ownerMemberInsertError)
        await supabase.from('desks').delete().eq('id', createdDesk.id).eq('user_id', user.id)
        return { ok: false, errorMessage: ownerMemberInsertError?.message || 'Failed to create collaborative desk.' }
      }

      if (invitedFriendIds.length > 0) {
        const invitedRows = invitedFriendIds.map((friendId) => ({
          desk_id: createdDesk.id,
          user_id: friendId,
          role: 'editor'
        }))

        const { error: invitedMemberInsertError } = await supabase
          .from('desk_members')
          .upsert(invitedRows, { onConflict: 'desk_id,user_id' })

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
    setShowDeskMenu(false)
    await incrementUserStat('desks_created', 1)
    return { ok: true }
  }

  async function deleteCurrentDesk() {
    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk) return

    const shouldDelete = window.confirm(`Delete "${getDeskNameValue(currentDesk)}"? This cannot be undone.`)
    if (!shouldDelete) return

    const { error } = await supabase
      .from('desks')
      .delete()
      .eq('id', currentDesk.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete desk:', error)
      return
    }

    const remainingDesks = desks.filter((desk) => desk.id !== currentDesk.id)
    setDesks(remainingDesks)

    if (remainingDesks.length === 0) {
      setSelectedDeskId(null)
      setBackgroundMode('desk1')
      setNotes([])
    } else {
      const nextDesk = remainingDesks[0]
      setSelectedDeskId(nextDesk.id)
      setBackgroundMode(getDeskBackgroundValue(nextDesk))
    }

    setShowDeskMenu(false)
    await incrementUserStat('desks_deleted', 1)
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

    let updateError = null

    const { error: backgroundModeError } = await supabase
      .from('desks')
      .update({ background_mode: mode })
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
      return
    }

    setBackgroundMode(mode)
    setDesks((prev) =>
      prev.map((desk) =>
        desk.id === selectedDeskId ? { ...desk, background_mode: mode, background: mode } : desk
      )
    )
    setShowDeskMenu(false)
  }

  function handleSelectDesk(desk) {
    if (!desk || desk.id === selectedDeskId) {
      setShowDeskMenu(false)
      return
    }

    setSelectedDeskId(desk.id)
    setBackgroundMode(getDeskBackgroundValue(desk))
    setEditingId(null)
    setEditValue('')
    setChecklistEditItems([])
    setNewChecklistItemText('')
    setPendingDeleteId(null)
    setShowDeskMenu(false)
  }

  async function fetchDeskItems(deskId) {
    if (!deskId) {
      setNotes([])
      return
    }

    const [{ data: notesData, error: notesError }, { data: checklistsData, error: checklistsError }] = await Promise.all([
      supabase.from('notes').select('*').eq('desk_id', deskId),
      supabase.from('checklists').select('*').eq('desk_id', deskId)
    ])

    if (notesError) {
      console.error('Failed to fetch notes:', notesError)
    }
    if (checklistsError) {
      console.error('Failed to fetch checklists:', checklistsError)
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

    const combined = [...mappedNotes, ...mappedChecklists]
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

    const { data, error } = await supabase
      .from('notes')
      .insert([{ desk_id: selectedDeskId, content: 'New note', color: '#fff59d', font_family: 'inherit', x: 100, y: 100, rotation: 0, width: 200, height: 120 }])
      .select()

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

    const { data, error } = await supabase
      .from('checklists')
      .insert([{ desk_id: selectedDeskId, title: 'Checklist', color: '#ffffff', font_family: 'inherit', x: 100, y: 100, rotation: 0, width: 220, height: 160 }])
      .select()

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
          .select('id, email')
          .in('id', profileIdList)

        if (profilesError) {
          throw profilesError
        }

        profileEmailById = new Map((profilesData || []).map((profile) => [profile.id, profile.email || 'Unknown user']))
      }

      setIncomingFriendRequests(
        incomingRows.map((row) => ({
          ...row,
          email: profileEmailById.get(row.sender_id) || 'Unknown user'
        }))
      )

      setOutgoingFriendRequests(
        outgoingRows.map((row) => ({
          ...row,
          email: profileEmailById.get(row.receiver_id) || 'Unknown user'
        }))
      )

      setFriends(
        acceptedRows.map((row) => {
          const friendId = row.sender_id === user.id ? row.receiver_id : row.sender_id
          return {
            id: friendId,
            email: profileEmailById.get(friendId) || 'Unknown user'
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
    const table = isChecklistItem(item) ? 'checklists' : 'notes'
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

    const table = isChecklistItem(item) ? 'checklists' : 'notes'
    await supabase
      .from(table)
      .update({ x, y, desk_id: selectedDeskId })
      .eq('id', item.id)
      .eq('desk_id', selectedDeskId)
  }

  async function persistItemSize(itemKey, width, height) {
    const item = notesRef.current.find((row) => getItemKey(row) === itemKey)
    if (!item) return

    const table = isChecklistItem(item) ? 'checklists' : 'notes'
    const { error } = await supabase
      .from(table)
      .update({ width, height, desk_id: selectedDeskId })
      .eq('id', item.id)
      .eq('desk_id', selectedDeskId)

    if (error) {
      console.error('Failed to save item size:', error)
    }
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

    const deltaX = e.pageX - resizeStartRef.current.startPageX
    const deltaY = e.pageY - resizeStartRef.current.startPageY
    const isRatioLocked = e.shiftKey

    let nextWidth = 0
    let nextHeight = 0
    let scale = 1

    if (isRatioLocked) {
      const normalizedDelta = (deltaX + deltaY) / 220
      scale = clampScale(1 + normalizedDelta)
      nextWidth = Math.round(resizeStartRef.current.startWidth * scale)
      nextHeight = Math.round(resizeStartRef.current.startHeight * scale)
    } else {
      nextWidth = Math.round(resizeStartRef.current.startWidth + deltaX)
      nextHeight = Math.round(resizeStartRef.current.startHeight + deltaY)
      nextWidth = clampDimension(nextWidth, 120, 700)
      nextHeight = clampDimension(nextHeight, 100, 700)

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
    const nextFontFamily = (editFontFamily || 'inherit').trim() || 'inherit'
    const itemKey = getItemKey(item)

    if (!isChecklistItem(item)) {
      const { error: saveError } = await supabase
        .from('notes')
        .update({ content: editValue, rotation: nextRotation, color: nextColor, font_family: nextFontFamily, desk_id: selectedDeskId })
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)

      if (saveError) {
        console.error('Failed to save note:', saveError)
        return { ok: false, errorMessage: saveError?.message || 'Failed to save note.' }
      }

      setNotes((prev) =>
        prev.map((row) =>
          getItemKey(row) === itemKey ? { ...row, content: editValue, rotation: nextRotation, color: nextColor, font_family: nextFontFamily } : row
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

    const { error: checklistSaveError } = await supabase
      .from('checklists')
      .update({ title: editValue.trim() || 'Checklist', rotation: nextRotation, color: nextColor, font_family: nextFontFamily, desk_id: selectedDeskId })
      .eq('id', item.id)
      .eq('desk_id', selectedDeskId)

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
    rotatingNoteIdRef.current = getItemKey(item)

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

  const currentDesk = desks.find((desk) => desk.id === selectedDeskId) || null
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
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        border: 'none',
                        borderRadius: 4,
                        marginBottom: 2,
                        background: desk.id === selectedDeskId ? '#eef4ff' : '#fff',
                        color: '#222',
                        cursor: 'pointer',
                        fontWeight: desk.id === selectedDeskId ? 600 : 400
                      }}
                    >
                      {getDeskNameValue(desk)}
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

              <button
                type="button"
                onClick={openRenameDeskDialog}
                disabled={!currentDesk}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  border: 'none',
                  borderRadius: 4,
                  background: '#fff',
                  color: currentDesk ? '#222' : '#999',
                  cursor: currentDesk ? 'pointer' : 'not-allowed'
                }}
              >
                Rename Desk
              </button>

              <button
                type="button"
                onClick={deleteCurrentDesk}
                disabled={!currentDesk}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  border: 'none',
                  borderRadius: 4,
                  background: '#fff',
                  color: currentDesk ? '#d32f2f' : '#999',
                  cursor: currentDesk ? 'pointer' : 'not-allowed'
                }}
              >
                Delete Desk
              </button>

              <div style={{ padding: '7px 10px', fontSize: 12, opacity: 0.8 }}>Change Background</div>
              <div style={{ display: 'flex', gap: 4, padding: '0 8px 6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk1')}
                  disabled={!currentDesk}
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
                    cursor: currentDesk ? 'pointer' : 'not-allowed'
                  }}
                >
                  Brown Desk
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk2')}
                  disabled={!currentDesk}
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
                    cursor: currentDesk ? 'pointer' : 'not-allowed'
                  }}
                >
                  Gray Desk
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk3')}
                  disabled={!currentDesk}
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
                    cursor: currentDesk ? 'pointer' : 'not-allowed'
                  }}
                >
                  Leaves Desk
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk4')}
                  disabled={!currentDesk}
                  style={{
                    flex: 1,
                    padding: '6px 6px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: backgroundMode === 'desk4' ? '2px solid #4285F4' : '1px solid #ddd',
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url('/flowersDesk.jpg')",
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat',
                    color: '#111',
                    fontWeight: 600,
                    textShadow: '0 1px 1px rgba(255,255,255,0.8)',
                    cursor: currentDesk ? 'pointer' : 'not-allowed'
                  }}
                >
                  Flowers Desk
                </button>
              </div>
            </div>
          )}
        </div>

        <div ref={profileMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu((prev) => !prev)
              setFriendError('')
              setFriendMessage('')
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
                      incomingFriendRequests.map((request) => (
                        <div key={request.id} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #f1f1f1' }}>
                          <div style={{ fontSize: 13, marginBottom: 4 }}>{request.email}</div>
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
                      ))
                    )}
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Friends</div>
                    {friends.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.75 }}>No friends yet</div>
                    ) : (
                      friends.map((friend) => (
                        <div key={friend.id} style={{ fontSize: 13, marginBottom: 4 }}>
                          {friend.email}
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Sent Requests</div>
                    {outgoingFriendRequests.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.75 }}>No pending sent requests</div>
                    ) : (
                      outgoingFriendRequests.map((request) => (
                        <div key={request.id} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{request.email}</span>
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
                      ))
                    )}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 10 }}>
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
          </div>
        )}
      </div>

      {!selectedDeskId && (
        <div style={{ color: '#222', background: 'rgba(255,255,255,0.75)', display: 'inline-block', padding: '6px 10px', borderRadius: 6 }}>
          Create a desk from the top-right menu to get started.
        </div>
      )}

      {notes.map((item) => {
        const itemKey = getItemKey(item)
        const isChecklist = isChecklistItem(item)

        return (
          <div
            key={itemKey}
            data-note-id={item.id}
            onMouseDown={editingId ? undefined : (e) => handleDragStart(e, item)}
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              transform: `rotate(${item.rotation || 0}deg)`,
              background: editingId === itemKey ? editColor : getItemColor(item),
              padding: 20,
              width: getItemWidth(item),
              minHeight: getItemHeight(item),
              boxShadow: '3px 3px 10px rgba(0,0,0,0.3)',
              fontFamily: editingId === itemKey ? editFontFamily : getItemFontFamily(item),
              cursor: editingId ? 'text' : draggedId === itemKey ? 'grabbing' : 'grab',
              zIndex: draggedId === itemKey ? 100 : 1
            }}
          >
            {editingId === itemKey ? (
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
                      background: '#777',
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
                    ↔
                  </button>
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
                        fontSize: 14,
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
                              fontSize: 13,
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
                            fontSize: 13,
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
                      fontSize: 16,
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
                      gap: 8,
                      alignItems: 'center'
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#222' }}>
                      Color
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
                  setEditFontFamily(getItemFontFamily(item))
                  if (isChecklist) {
                    setEditValue(item.title || 'Checklist')
                    setChecklistEditItems((item.items || []).map((entry) => ({
                      text: entry.text || '',
                      is_checked: Boolean(entry.is_checked)
                    })))
                    setNewChecklistItemText('')
                  } else {
                    setEditValue(item.content || '')
                    setChecklistEditItems([])
                    setNewChecklistItemText('')
                  }
                }}
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  cursor: 'pointer',
                  minHeight: 40,
                  color: '#222',
                  fontFamily: getItemFontFamily(item)
                }}
              >
                {isChecklist ? (
                  <>
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
                  </>
                ) : (
                  item.content
                )}
              </div>
            )}
          </div>
        )
      })}

      {pendingDeleteId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              width: 280,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              textAlign: 'center'
            }}
          >
            <div style={{ marginBottom: 12, color: '#222' }}>Delete this note?</div>
            <button
              type="button"
              onClick={confirmDeleteNote}
              style={{
                marginRight: 8,
                padding: '6px 12px',
                borderRadius: 4,
                border: 'none',
                background: '#d32f2f',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              style={{
                padding: '6px 12px',
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
      )}

      {deskNameDialog.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200
          }}
        >
          <form
            onSubmit={submitDeskNameDialog}
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              width: 320,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              color: '#222'
            }}
          >
            <div style={{ marginBottom: 10, fontWeight: 600 }}>
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
                            <span>{friend.email}</span>
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

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={closeDeskNameDialog}
                disabled={deskNameSaving}
                style={{
                  marginRight: 8,
                  padding: '6px 12px',
                  borderRadius: 4,
                  border: 'none',
                  background: '#eee',
                  color: '#333',
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
                  padding: '6px 12px',
                  borderRadius: 4,
                  border: 'none',
                  background: '#4285F4',
                  color: '#fff',
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
          <span style={{ fontSize: 14 }}>↔</span>
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

      <Footer />
    </div>
  )
}

// ------------------- Footer -------------------
function Footer() {
  return (
    <footer
      style={{
        position: 'fixed',
        bottom: 10,
        width: '100%',
        textAlign: 'center',
        fontSize: 14,
        color: '#555'
      }}
    >
      <a href="/privacy.html" style={{ color: '#555', textDecoration: 'underline' }}>
        Privacy Policy
      </a>
    </footer>
  )
}