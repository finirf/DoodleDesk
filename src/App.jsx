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
  const [checklistEditItems, setChecklistEditItems] = useState([])
  const [newChecklistItemText, setNewChecklistItemText] = useState('')
  const [showNewNoteMenu, setShowNewNoteMenu] = useState(false)
  const [showDeskMenu, setShowDeskMenu] = useState(false)
  const [deskNameDialog, setDeskNameDialog] = useState({ isOpen: false, mode: 'create', value: '' })
  const [deskNameError, setDeskNameError] = useState('')
  const [deskNameSaving, setDeskNameSaving] = useState(false)
  const [backgroundMode, setBackgroundMode] = useState('desk1')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
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

  const growThreshold = 180

  const sectionCount = Math.max(2, Math.ceil(canvasHeight / sectionHeight))
  const backgroundLayers = Array.from({ length: sectionCount }, (_, index) => {
    if (backgroundMode === 'desk1') return "url('/brownDesk.png')"
    if (backgroundMode === 'desk2') return "url('/grayDesk.png')"
    if (backgroundMode === 'desk3') return "url('/leavesDesk.jpg')"
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
    if (!showNewNoteMenu && !showDeskMenu) return

    function handleClickOutside(e) {
      if (showNewNoteMenu && !newNoteMenuRef.current?.contains(e.target)) {
        setShowNewNoteMenu(false)
      }
      if (showDeskMenu && !deskMenuRef.current?.contains(e.target)) {
        setShowDeskMenu(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [showNewNoteMenu, showDeskMenu])

  function getDeskBackgroundValue(desk) {
    const nextMode = desk?.background_mode || desk?.background
    if (nextMode === 'desk1' || nextMode === 'desk2' || nextMode === 'desk3') {
      return nextMode
    }
    return 'desk1'
  }

  function getDeskNameValue(desk) {
    return desk?.name || desk?.desk_name || 'Untitled desk'
  }

  async function fetchDesks() {
    const { data, error } = await supabase
      .from('desks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch desks:', error)
      return
    }

    const loadedDesks = data || []
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

  async function createDesk(nextDeskName) {
    const trimmedName = (nextDeskName || '').trim()
    if (!trimmedName) {
      return { ok: false, errorMessage: 'Please enter a desk name.' }
    }

    const { data, error } = await supabase
      .from('desks')
      .insert([{ user_id: user.id, name: trimmedName, background: 'desk1' }])
      .select()

    if (error || !data?.[0]) {
      console.error('Failed to create desk:', error)
      return { ok: false, errorMessage: error?.message || 'Failed to create desk.' }
    }

    const createdDesk = data[0]
    setDesks((prev) => [...prev, createdDesk])
    setSelectedDeskId(createdDesk.id)
    setBackgroundMode(getDeskBackgroundValue(createdDesk))
    setShowDeskMenu(false)
    return { ok: true }
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
    setDeskNameDialog({ isOpen: true, mode: 'create', value: `Desk ${desks.length + 1}` })
    setShowDeskMenu(false)
  }

  function openRenameDeskDialog() {
    const currentDesk = desks.find((desk) => desk.id === selectedDeskId)
    if (!currentDesk) return

    setDeskNameError('')
    setDeskNameDialog({ isOpen: true, mode: 'rename', value: getDeskNameValue(currentDesk) || 'Desk' })
    setShowDeskMenu(false)
  }

  function closeDeskNameDialog() {
    setDeskNameError('')
    setDeskNameSaving(false)
    setDeskNameDialog({ isOpen: false, mode: 'create', value: '' })
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
      ? await createDesk(nextName)
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
      .insert([{ desk_id: selectedDeskId, content: 'New note', x: 100, y: 100, rotation: 0, width: 200, height: 120 }])
      .select()

    if (!error && data?.[0]) {
      setNotes((prev) => [...prev, { ...data[0], item_type: 'note' }])
    }

    setShowNewNoteMenu(false)
  }

  async function addChecklistNote() {
    if (!selectedDeskId) return

    const { data: checklistData, error: checklistError } = await supabase
      .from('checklists')
      .insert([{ desk_id: selectedDeskId, title: 'Checklist', x: 100, y: 100, rotation: 0, width: 220, height: 160 }])
      .select()

    if (checklistError || !checklistData?.[0]) {
      console.error('Failed to create checklist:', checklistError)
      setShowNewNoteMenu(false)
      return
    }

    const createdChecklist = checklistData[0]
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

    setShowNewNoteMenu(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
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

    if (!isChecklistItem(item)) {
      const { error } = await supabase
        .from('notes')
        .update({ content: editValue, rotation: nextRotation, desk_id: selectedDeskId })
        .eq('id', item.id)
        .eq('desk_id', selectedDeskId)

      if (error) {
        console.error('Failed to save note:', error)
        return
      }

      setNotes((prev) =>
        prev.map((row) =>
          getItemKey(row) === getItemKey(item) ? { ...row, content: editValue, rotation: nextRotation } : row
        )
      )
      return
    }

    const nextItems = checklistEditItems
      .map((entry, index) => ({
        text: (entry.text || '').trim(),
        is_checked: Boolean(entry.is_checked),
        sort_order: index
      }))
      .filter((entry) => entry.text.length > 0)

    const { error: checklistError } = await supabase
      .from('checklists')
      .update({ title: editValue.trim() || 'Checklist', rotation: nextRotation, desk_id: selectedDeskId })
      .eq('id', item.id)
      .eq('desk_id', selectedDeskId)

    if (checklistError) {
      console.error('Failed to save checklist:', checklistError)
      return
    }

    const { error: deleteItemsError } = await supabase
      .from('checklist_items')
      .delete()
      .eq('checklist_id', item.id)

    if (deleteItemsError) {
      console.error('Failed clearing checklist items:', deleteItemsError)
      return
    }

    let insertedItems = []
    if (nextItems.length > 0) {
      const { data: inserted, error: insertItemsError } = await supabase
        .from('checklist_items')
        .insert(nextItems.map((entry) => ({ ...entry, checklist_id: item.id })))
        .select()

      if (insertItemsError) {
        console.error('Failed saving checklist items:', insertItemsError)
        return
      }

      insertedItems = inserted || []
    }

    setNotes((prev) =>
      prev.map((row) =>
        getItemKey(row) === getItemKey(item)
          ? {
              ...row,
              title: editValue.trim() || 'Checklist',
              rotation: nextRotation,
              items: insertedItems
            }
          : row
      )
    )
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
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
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
              background: isChecklist ? '#fff' : '#fffa91',
              padding: 20,
              width: getItemWidth(item),
              minHeight: getItemHeight(item),
              boxShadow: '3px 3px 10px rgba(0,0,0,0.3)',
              cursor: editingId ? 'text' : draggedId === itemKey ? 'grabbing' : 'grab',
              zIndex: draggedId === itemKey ? 100 : 1
            }}
          >
            {editingId === itemKey ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  await saveItemEdits(item)

                  setEditingId(null)
                  setEditValue('')
                  setChecklistEditItems([])
                  setNewChecklistItemText('')
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
                      onChange={(e) => setEditValue(e.target.value)}
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
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      ))}

                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={newChecklistItemText}
                          onChange={(e) => setNewChecklistItemText(e.target.value)}
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
                    onChange={(e) => setEditValue(e.target.value)}
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
                      boxSizing: 'border-box'
                    }}
                  />
                )}

                <div style={{ marginTop: 8, textAlign: 'right' }}>
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
                  <button
                    type="submit"
                    style={{
                      marginRight: 4,
                      padding: '2px 6px',
                      fontSize: 11,
                      borderRadius: 4,
                      border: 'none',
                      background: '#4285F4',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setEditValue('')
                      setChecklistEditItems([])
                      setNewChecklistItemText('')
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
              </form>
            ) : (
              <div
                onClick={() => {
                  setEditingId(itemKey)
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
                  color: '#222'
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