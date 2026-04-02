import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getDecorationOption,
  getItemColor,
  getItemFontFamily,
  getItemFontSize,
  getItemFontStyle,
  getItemFontWeight,
  getItemHeight,
  getItemKey,
  getItemTextColor,
  getItemWidth,
  isHeaderNoteItem,
  isChecklistItem,
  isDecorationItem
} from '../utils/itemUtils'
import FourWayResizeIcon from './FourWayResizeIcon'

const MOBILE_DRAG_HOLD_MS = 170
const MOBILE_DRAG_CANCEL_DISTANCE_PX = 10
const GROUP_COLOR_PALETTE = ['#f4b400', '#7e57c2', '#26a69a', '#ff7043', '#7cb342', '#039be5', '#ec407a', '#fdd835']
const HEADER_NOTE_HEADER_HEIGHT = 26

function normalizeHex(hex) {
  const value = typeof hex === 'string' ? hex.trim().toLowerCase() : ''
  if (!value) return ''
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
  }
  return ''
}

function hexToHsl(hex) {
  const normalized = normalizeHex(hex)
  if (!normalized) return null

  const r = Number.parseInt(normalized.slice(1, 3), 16) / 255
  const g = Number.parseInt(normalized.slice(3, 5), 16) / 255
  const b = Number.parseInt(normalized.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  const l = (max + min) / 2
  let s = 0

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))

    if (max === r) {
      h = 60 * (((g - b) / delta) % 6)
    } else if (max === g) {
      h = 60 * (((b - r) / delta) + 2)
    } else {
      h = 60 * (((r - g) / delta) + 4)
    }
  }

  if (h < 0) h += 360
  return { h, s: s * 100, l: l * 100 }
}

function hslToHex(h, s, l) {
  const normalizedHue = ((h % 360) + 360) % 360
  const sat = Math.max(0, Math.min(100, s)) / 100
  const light = Math.max(0, Math.min(100, l)) / 100

  const chroma = (1 - Math.abs(2 * light - 1)) * sat
  const segment = normalizedHue / 60
  const x = chroma * (1 - Math.abs((segment % 2) - 1))

  let rPrime = 0
  let gPrime = 0
  let bPrime = 0

  if (segment >= 0 && segment < 1) {
    rPrime = chroma
    gPrime = x
  } else if (segment < 2) {
    rPrime = x
    gPrime = chroma
  } else if (segment < 3) {
    gPrime = chroma
    bPrime = x
  } else if (segment < 4) {
    gPrime = x
    bPrime = chroma
  } else if (segment < 5) {
    rPrime = x
    bPrime = chroma
  } else {
    rPrime = chroma
    bPrime = x
  }

  const match = light - chroma / 2
  const toHex = (value) => {
    const channel = Math.round((value + match) * 255)
    return channel.toString(16).padStart(2, '0')
  }

  return `#${toHex(rPrime)}${toHex(gPrime)}${toHex(bPrime)}`
}

function darkenAndSaturate(hex) {
  const hsl = hexToHsl(hex)
  if (!hsl) return '#169fc3'

  const nextSaturation = Math.min(100, hsl.s + 17)
  const nextLightness = Math.max(0, hsl.l - 33)
  return hslToHex(hsl.h, nextSaturation, nextLightness)
}

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function makeFallbackGroupColor(index) {
  const hue = (index * 137.508) % 360
  return `hsl(${Math.round(hue)} 78% 52%)`
}

export default function DeskCanvasItems({
  notes,
  currentDesk,
  showCreatorLabels,
  userId,
  isDeskCollaborative,
  getItemCreatorLabel,
  mobileNoteMaxWidth,
  isMobileLayout,
  editingId,
  editColor,
  editTextColor,
  editFontFamily,
  editFontWeight,
  editFontStyle,
  draggedId,
  groupedItemGroupMap,
  groupedItemKeys,
  finalizeGroupingSession,
  groupItemsByKeys,
  activeDecorationHandleId,
  setActiveDecorationHandleId,
  rotatingId,
  resizingId,
  handleGroupSelectionClick,
  handleDragStart,
  handleRotateMouseDown,
  handleResizeMouseDown,
  requestDeleteNote,
  moveItemLayer,
  duplicateItem,
  commitItemEdits,
  canCurrentUserEditDeskItems,
  setIsSavingEdit,
  setEditSaveError,
  setEditingId,
  setShowStyleEditor,
  setEditColor,
  setEditTextColor,
  setEditFontSize,
  setEditFontWeight,
  setEditFontStyle,
  setEditFontFamily,
  setEditValue,
  setChecklistEditItems,
  setNewChecklistItemText,
  normalizeChecklistReminderValue,
  checklistEditItems,
  newChecklistItemText,
  addChecklistEditItem,
  toReminderInputValue,
  normalizeFontSize,
  fontOptions,
  showStyleEditor,
  editValue,
  editFontSize,
  isSavingEdit,
  closeItemEditor,
  editSaveError,
  toggleChecklistItem,
  getChecklistReminderMeta
}) {
  const mobileDragTimerRef = useRef(null)
  const mobileDragPointerRef = useRef(null)
  const mobilePointerMoveHandlerRef = useRef(null)
  const mobileDragClearHandlerRef = useRef(null)
  const suppressEditClickRef = useRef(false)
  const suppressEditClickTimerRef = useRef(null)
  const prevDraggedIdRef = useRef(draggedId)
  const [isShiftHeld, setIsShiftHeld] = useState(false)
  const [isCtrlHeld, setIsCtrlHeld] = useState(false)
  const [mobileContextMenuItemKey, setMobileContextMenuItemKey] = useState(null)
  const [mobileContextMenuPos, setMobileContextMenuPos] =useState(null)
  const [groupSelectionMode, setGroupSelectionMode] = useState(false)
  const [selectedGroupItemKeys, setSelectedGroupItemKeys] = useState(new Set())
  const [desktopGroupSelectionItems, setDesktopGroupSelectionItems] = useState(new Set())
  const wasDesktopGroupModeRef = useRef(false)
  const wasDesktopUngroupModeRef = useRef(false)

  const isGroupingModifierPressed = useCallback((event) => Boolean(event?.ctrlKey || event?.metaKey), [])

  const groupColorMap = useMemo(() => {
    const uniqueGroupIds = [...new Set(Object.values(groupedItemGroupMap || {}).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
    const nextMap = {}
    const usedPaletteIndexes = new Set()

    uniqueGroupIds.forEach((groupId, idx) => {
      const preferredIndex = hashString(groupId) % GROUP_COLOR_PALETTE.length
      let selectedIndex = preferredIndex

      if (usedPaletteIndexes.has(selectedIndex)) {
        let foundAvailablePaletteColor = false
        for (let offset = 1; offset < GROUP_COLOR_PALETTE.length; offset += 1) {
          const candidateIndex = (preferredIndex + offset) % GROUP_COLOR_PALETTE.length
          if (!usedPaletteIndexes.has(candidateIndex)) {
            selectedIndex = candidateIndex
            foundAvailablePaletteColor = true
            break
          }
        }

        if (!foundAvailablePaletteColor) {
          nextMap[groupId] = makeFallbackGroupColor(idx + hashString(groupId))
          return
        }
      }

      usedPaletteIndexes.add(selectedIndex)
      nextMap[groupId] = GROUP_COLOR_PALETTE[selectedIndex]
    })
    return nextMap
  }, [groupedItemGroupMap])

  const temporarilySuppressEditClick = useCallback(() => {
    suppressEditClickRef.current = true
    if (suppressEditClickTimerRef.current) {
      window.clearTimeout(suppressEditClickTimerRef.current)
    }
    suppressEditClickTimerRef.current = window.setTimeout(() => {
      suppressEditClickRef.current = false
      suppressEditClickTimerRef.current = null
    }, 280)
  }, [])

  // Suppress click-to-edit when drag ends to prevent opening editor after a drag
  useEffect(() => {
    if (prevDraggedIdRef.current !== null && draggedId === null) {
      if (!isMobileLayout) {
      temporarilySuppressEditClick()
      }
    }
    prevDraggedIdRef.current = draggedId
  }, [draggedId, temporarilySuppressEditClick])

  const clearPendingMobileDrag = useCallback(() => {
    if (mobileDragTimerRef.current) {
      window.clearTimeout(mobileDragTimerRef.current)
      mobileDragTimerRef.current = null
    }

    const pointerMoveHandler = mobilePointerMoveHandlerRef.current
    const clearHandler = mobileDragClearHandlerRef.current
    if (pointerMoveHandler) {
      window.removeEventListener('pointermove', pointerMoveHandler)
    }
    if (clearHandler) {
      window.removeEventListener('pointerup', clearHandler)
      window.removeEventListener('pointercancel', clearHandler)
    }

    mobileDragPointerRef.current = null
  }, [])

  const toggleGroupItemSelection = useCallback((itemKey) => {
    setSelectedGroupItemKeys((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey)
      } else {
        newSet.add(itemKey)
      }
      return newSet
    })
  }, [])

  const applyDesktopGroupSelection = useCallback(() => {
    if (desktopGroupSelectionItems.size > 1) {
      groupItemsByKeys?.([...desktopGroupSelectionItems])
    }

    setDesktopGroupSelectionItems(new Set())
  }, [desktopGroupSelectionItems, groupItemsByKeys])

  const handleGroupSelectionConfirm = useCallback(() => {
    if (selectedGroupItemKeys.size > 1) {
      groupItemsByKeys?.([...selectedGroupItemKeys])
    }
    
    // Exit group selection mode
    setGroupSelectionMode(false)
    setSelectedGroupItemKeys(new Set())
  }, [selectedGroupItemKeys, groupItemsByKeys])

  const ungroupMobileItemGroup = useCallback((itemKey) => {
    const groupId = groupedItemGroupMap?.[itemKey]
    if (!groupId) return

    const groupedKeys = Object.keys(groupedItemGroupMap).filter((key) => groupedItemGroupMap[key] === groupId)
    groupedKeys.forEach((groupedKey) => {
      const groupedItem = notes.find((entry) => getItemKey(entry) === groupedKey)
      if (!groupedItem) return
      handleGroupSelectionClick?.({ altKey: true, ctrlKey: false }, groupedItem)
    })
  }, [groupedItemGroupMap, handleGroupSelectionClick, notes])

  const handleMobilePointerMove = useCallback((e) => {
    const pending = mobileDragPointerRef.current
    if (!pending) return
    if (pending.pointerId !== null && e.pointerId !== pending.pointerId) return
    if (pending.hasStartedDrag) return

    // Cancel drag if multi-touch detected (allow canvas panning)
    const touchCount = e.touches?.length ?? 1
    if (touchCount > 1) {
      clearPendingMobileDrag()
      return
    }

    const deltaX = Math.abs(e.clientX - pending.startClientX)
    const deltaY = Math.abs(e.clientY - pending.startClientY)

    if (pending.longPressActivated) {
      if (deltaX > MOBILE_DRAG_CANCEL_DISTANCE_PX || deltaY > MOBILE_DRAG_CANCEL_DISTANCE_PX) {
        pending.hasStartedDrag = true
        temporarilySuppressEditClick()
        handleDragStart(e, pending.item)
        clearPendingMobileDrag()
      }
      return
    }

    if (deltaX > MOBILE_DRAG_CANCEL_DISTANCE_PX || deltaY > MOBILE_DRAG_CANCEL_DISTANCE_PX) {
      pending.hasStartedDrag = true
      temporarilySuppressEditClick()
      handleDragStart(e, pending.item)
      clearPendingMobileDrag()
    }
  }, [clearPendingMobileDrag, handleDragStart, temporarilySuppressEditClick])

    const handleDesktopNoteClick = useCallback((itemKey, item, isChecklist, skipSuppressionCheck = false) => {
      if (!canCurrentUserEditDeskItems) return
      if (!skipSuppressionCheck && suppressEditClickRef.current) {
        suppressEditClickRef.current = false
        return
      }
    setIsSavingEdit(false)
    setEditSaveError('')
    setEditingId(itemKey)
    setShowStyleEditor(false)
    setEditColor(getItemColor(item))
    setEditTextColor(getItemTextColor(item))
    setEditFontSize(getItemFontSize(item))
    setEditFontFamily(getItemFontFamily(item))
    setEditFontWeight(getItemFontWeight(item))
    setEditFontStyle(getItemFontStyle(item))
    if (isChecklist) {
      const existingTitle = item.title || 'Checklist'
      setEditValue(existingTitle.trim() === 'Checklist' ? '' : existingTitle)
      setChecklistEditItems((item.items || []).map((entry) => ({
        id: entry.id ?? null,
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
  }, [
    canCurrentUserEditDeskItems,
    setIsSavingEdit,
    setEditSaveError,
    setEditingId,
    setShowStyleEditor,
    setEditColor,
    setEditTextColor,
    setEditFontSize,
    setEditFontWeight,
    setEditFontStyle,
    setEditFontFamily,
    setEditValue,
    setChecklistEditItems,
    setNewChecklistItemText,
    normalizeChecklistReminderValue
  ])

  const handleMobilePointerUp = useCallback((e) => {
    const pending = mobileDragPointerRef.current
    if (!pending) {
      clearPendingMobileDrag()
      return
    }
    if (pending.pointerId !== null && e.pointerId !== pending.pointerId) return

    // Cancel if multi-touch is present
    const touchCount = e.touches?.length ?? 0
    if (touchCount > 0) {
      clearPendingMobileDrag()
      return
    }

    const deltaX = Math.abs(e.clientX - pending.startClientX)
    const deltaY = Math.abs(e.clientY - pending.startClientY)
    const didMovePastThreshold = deltaX > MOBILE_DRAG_CANCEL_DISTANCE_PX || deltaY > MOBILE_DRAG_CANCEL_DISTANCE_PX

    if (pending.longPressActivated && !pending.hasStartedDrag && !didMovePastThreshold) {
      // Long-press: Show context menu
      temporarilySuppressEditClick()
      const itemKey = getItemKey(pending.item)
      setMobileContextMenuItemKey(itemKey)
      setMobileContextMenuPos({
        x: e.clientX,
        y: e.clientY
      })
    } else if (!pending.hasStartedDrag && !pending.longPressActivated && !didMovePastThreshold) {
      // Single tap: Open editor
      temporarilySuppressEditClick()
      const itemKey = getItemKey(pending.item)
      const item = pending.item
      // Use a deferred callback to open the editor after state clears
      window.requestAnimationFrame(() => {
        if (!canCurrentUserEditDeskItems) return

        setIsSavingEdit(false)
        setEditSaveError('')
        setEditingId(itemKey)
        setShowStyleEditor(false)
        setEditColor(getItemColor(item))
        setEditTextColor(getItemTextColor(item))
        setEditFontSize(getItemFontSize(item))
        setEditFontFamily(getItemFontFamily(item))
        setEditFontWeight(isChecklistItem(item) ? 'normal' : getItemFontWeight(item))
        setEditFontStyle(isChecklistItem(item) ? 'normal' : getItemFontStyle(item))
        if (isChecklistItem(item)) {
          const existingTitle = item.title || 'Checklist'
          setEditValue(existingTitle.trim() === 'Checklist' ? '' : existingTitle)
          setChecklistEditItems((item.items || []).map((entry) => ({
            id: entry.id ?? null,
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
      })
    }

    clearPendingMobileDrag()
  }, [
    clearPendingMobileDrag,
    canCurrentUserEditDeskItems,
    setIsSavingEdit,
    setEditSaveError,
    setEditingId,
    setShowStyleEditor,
    setEditColor,
    setEditTextColor,
    setEditFontSize,
    setEditFontFamily,
    setEditFontWeight,
    setEditFontStyle,
    setEditValue,
    setChecklistEditItems,
    setNewChecklistItemText,
    normalizeChecklistReminderValue,
    temporarilySuppressEditClick
  ])

  function startMobileDragHold(e, item) {
    if (!isMobileLayout || editingId) return
    if (!canCurrentUserEditDeskItems) return
    if (typeof e.button === 'number' && e.button !== 0) return
    if (typeof e.isPrimary === 'boolean' && !e.isPrimary) return

    // Only start drag hold for single-touch; multi-touch allows canvas panning
    const touchCount = e.touches?.length ?? 1
    if (touchCount !== 1) return

    if (e.cancelable) {
      e.preventDefault()
    }

    clearPendingMobileDrag()

    const pointerId = typeof e.pointerId === 'number' ? e.pointerId : null
    mobileDragPointerRef.current = {
      pointerId,
      item,
      startClientX: e.clientX,
      startClientY: e.clientY,
      hasStartedDrag: false,
      longPressActivated: false
    }

    window.addEventListener('pointermove', handleMobilePointerMove)
    window.addEventListener('pointerup', handleMobilePointerUp)
    window.addEventListener('pointercancel', handleMobilePointerUp)

    mobileDragTimerRef.current = window.setTimeout(() => {
      const pending = mobileDragPointerRef.current
      if (!pending) return
      pending.longPressActivated = true
    }, MOBILE_DRAG_HOLD_MS)
  }

  useEffect(() => {
    const handleModifierKeyChange = (event) => {
      if (event.type === 'keyup' && (event.key === 'Control' || event.key === 'Meta')) {
        applyDesktopGroupSelection()
      }
      setIsShiftHeld(Boolean(event.shiftKey))
      setIsCtrlHeld(isGroupingModifierPressed(event))
    }

    const handlePointerModifierSync = (event) => {
      // Some desktop flows can miss keyup after click interactions.
      // If neither Control nor Command is pressed on pointerup, finalize and close grouping mode.
      if (!isGroupingModifierPressed(event)) {
        applyDesktopGroupSelection()
        setIsCtrlHeld(false)
      } else {
        setIsCtrlHeld(true)
      }
      setIsShiftHeld(Boolean(event.shiftKey))
    }

    const resetModifiers = () => {
      setIsShiftHeld(false)
      setIsCtrlHeld(false)
    }

    window.addEventListener('keydown', handleModifierKeyChange, true)
    window.addEventListener('keyup', handleModifierKeyChange, true)
    window.addEventListener('blur', resetModifiers)
    window.addEventListener('pointerup', handlePointerModifierSync)
    window.addEventListener('pointercancel', handlePointerModifierSync)

    return () => {
      window.removeEventListener('keydown', handleModifierKeyChange, true)
      window.removeEventListener('keyup', handleModifierKeyChange, true)
      window.removeEventListener('blur', resetModifiers)
      window.removeEventListener('pointerup', handlePointerModifierSync)
      window.removeEventListener('pointercancel', handlePointerModifierSync)
    }
  }, [applyDesktopGroupSelection, isGroupingModifierPressed])

  useEffect(() => {
    const isDesktopGroupMode = !isMobileLayout && isCtrlHeld && !isShiftHeld
    const isDesktopUngroupMode = !isMobileLayout && isCtrlHeld && isShiftHeld

    if (wasDesktopGroupModeRef.current && !isDesktopGroupMode) {
      finalizeGroupingSession?.()
    }

    if (wasDesktopUngroupModeRef.current && !isDesktopUngroupMode) {
      finalizeGroupingSession?.()
    }

    wasDesktopGroupModeRef.current = isDesktopGroupMode
    wasDesktopUngroupModeRef.current = isDesktopUngroupMode
  }, [isMobileLayout, isCtrlHeld, isShiftHeld, finalizeGroupingSession])

  useEffect(() => {
    mobilePointerMoveHandlerRef.current = handleMobilePointerMove
    mobileDragClearHandlerRef.current = handleMobilePointerUp
  }, [handleMobilePointerMove, handleMobilePointerUp])

  useEffect(() => {
    return () => {
      if (mobileDragTimerRef.current) {
        window.clearTimeout(mobileDragTimerRef.current)
        mobileDragTimerRef.current = null
      }
      if (suppressEditClickTimerRef.current) {
        window.clearTimeout(suppressEditClickTimerRef.current)
        suppressEditClickTimerRef.current = null
      }
      const pointerMoveHandler = mobilePointerMoveHandlerRef.current
      const clearHandler = mobileDragClearHandlerRef.current
      if (pointerMoveHandler) {
        window.removeEventListener('pointermove', pointerMoveHandler)
      }
      if (clearHandler) {
        window.removeEventListener('pointerup', clearHandler)
        window.removeEventListener('pointercancel', clearHandler)
      }
      mobileDragPointerRef.current = null
      suppressEditClickRef.current = false
    }
  }, [handleMobilePointerMove, handleMobilePointerUp])

  return (
    <>
      {/* Mobile Context Menu Backdrop */}
      {isMobileLayout && mobileContextMenuItemKey && mobileContextMenuPos && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 4999,
            pointerEvents: 'auto'
          }}
          onClick={() => {
            setMobileContextMenuItemKey(null)
            setMobileContextMenuPos(null)
          }}
        />
      )}

      {/* Mobile Context Menu */}
      {isMobileLayout && mobileContextMenuItemKey && mobileContextMenuPos && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(mobileContextMenuPos.x, window.innerWidth - 160),
            top: Math.min(mobileContextMenuPos.y, window.innerHeight - 200),
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            zIndex: 5000,
            pointerEvents: 'auto',
            overflow: 'hidden',
            minWidth: 140
          }}
        >
          {notes.find((n) => getItemKey(n) === mobileContextMenuItemKey) && (
            <>
              <button
                onClick={() => {
                  const item = notes.find((n) => getItemKey(n) === mobileContextMenuItemKey)
                  if (item && canCurrentUserEditDeskItems && !suppressEditClickRef.current) {
                    setIsSavingEdit(false)
                    setEditSaveError('')
                    setEditingId(mobileContextMenuItemKey)
                    setShowStyleEditor(false)
                    setEditColor(getItemColor(item))
                    setEditTextColor(getItemTextColor(item))
                    setEditFontSize(getItemFontSize(item))
                    setEditFontFamily(getItemFontFamily(item))
                    if (isChecklistItem(item)) {
                      const existingTitle = item.title || 'Checklist'
                      setEditValue(existingTitle.trim() === 'Checklist' ? '' : existingTitle)
                      setChecklistEditItems((item.items || []).map((entry) => ({
                        id: entry.id ?? null,
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
                  }
                  setMobileContextMenuItemKey(null)
                  setMobileContextMenuPos(null)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: '#fff',
                  color: '#222',
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee'
                }}
              >
                Edit
              </button>
              <button
                onClick={() => {
                  const isCurrentlyGrouped = groupedItemKeys.includes(mobileContextMenuItemKey)
                  
                  if (isCurrentlyGrouped) {
                    // Ungroup all items in the tapped item's group.
                    ungroupMobileItemGroup(mobileContextMenuItemKey)
                    setMobileContextMenuItemKey(null)
                    setMobileContextMenuPos(null)
                  } else {
                    // Enter group selection mode with this item pre-selected
                    setGroupSelectionMode(true)
                    setSelectedGroupItemKeys(new Set([mobileContextMenuItemKey]))
                    setMobileContextMenuItemKey(null)
                    setMobileContextMenuPos(null)
                  }
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: '#fff',
                  color: '#222',
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee'
                }}
              >
                {groupedItemGroupMap?.[mobileContextMenuItemKey] ? 'Ungroup' : 'Group'}
              </button>
              <button
                onClick={() => {
                  moveItemLayer(mobileContextMenuItemKey, 'front')
                  setMobileContextMenuItemKey(null)
                  setMobileContextMenuPos(null)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: '#fff',
                  color: '#222',
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee'
                }}
              >
                Bring to front
              </button>
              <button
                onClick={() => {
                  moveItemLayer(mobileContextMenuItemKey, 'back')
                  setMobileContextMenuItemKey(null)
                  setMobileContextMenuPos(null)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: '#fff',
                  color: '#222',
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee'
                }}
              >
                Send to back
              </button>
              <button
                onClick={() => {
                  void duplicateItem(mobileContextMenuItemKey)
                  setMobileContextMenuItemKey(null)
                  setMobileContextMenuPos(null)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: '#fff',
                  color: '#222',
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee'
                }}
              >
                Duplicate
              </button>
              <button
                onClick={() => {
                  requestDeleteNote(mobileContextMenuItemKey)
                  setMobileContextMenuItemKey(null)
                  setMobileContextMenuPos(null)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: '#fff',
                  color: '#d32f2f',
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Group Selection Mode Overlay */}
      {isMobileLayout && groupSelectionMode && (
        <>
          {/* Grayed-out background overlay - Lower z-index so notes appear on top */}
          <div
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 100,
              pointerEvents: 'auto'
            }}
            onClick={() => {
              // Clicking on the grayed area confirms grouping
              handleGroupSelectionConfirm()
            }}
          />

          {/* Group selection toolbar */}
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#fff',
              borderTop: '1px solid #ddd',
              padding: '12px',
              zIndex: 5000,
              pointerEvents: 'auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <button
              onClick={() => {
                setGroupSelectionMode(false)
                setSelectedGroupItemKeys(new Set())
              }}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #ddd',
                background: '#fff',
                color: '#222',
                fontSize: 13,
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <div
              style={{
                fontSize: 13,
                color: '#666',
                minWidth: 60,
                textAlign: 'center'
              }}
            >
              {selectedGroupItemKeys.size} selected
            </div>
            <button
              onClick={() => {
                handleGroupSelectionConfirm()
              }}
              disabled={selectedGroupItemKeys.size === 0}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: 'none',
                background: selectedGroupItemKeys.size === 0 ? '#ccc' : '#4285f4',
                color: '#fff',
                fontSize: 13,
                borderRadius: 4,
                cursor: selectedGroupItemKeys.size === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Group
            </button>
          </div>
        </>
      )}

      {/* Desktop Group Selection Mode Overlay - Lower z-index so notes appear on top */}
      {!isMobileLayout && isCtrlHeld && !isShiftHeld && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            pointerEvents: 'auto'
          }}
          onClick={() => {
            // Pressing Escape or clicking overlay exits group selection without grouping
            setDesktopGroupSelectionItems(new Set())
          }}
        />
      )}

      {/* Desktop Ungroup Mode Overlay - Show grouped items while dimming ungrouped non-decoration items */}
      {!isMobileLayout && isShiftHeld && isCtrlHeld && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            pointerEvents: 'none'
          }}
        />
      )}

      {notes.map((item, index) => {
        const itemKey = getItemKey(item)
        const isChecklist = isChecklistItem(item)
        const isDecoration = isDecorationItem(item)
        const decorationOption = isDecoration ? getDecorationOption(item.kind) : null
        const decorationImage = decorationOption?.image || null
        const shouldShowCreatorLabel = Boolean(currentDesk && isDeskCollaborative(currentDesk) && showCreatorLabels && !isDecoration)
        const creatorLabel = shouldShowCreatorLabel ? getItemCreatorLabel(item, userId) : ''
        const itemWidth = getItemWidth(item)
        const renderedItemWidth = isMobileLayout && !isDecoration
          ? Math.min(itemWidth, mobileNoteMaxWidth)
          : itemWidth
        const itemHeight = getItemHeight(item)
        const contentMinHeight = Math.max(40, itemHeight - 40)
        const baseZIndex = index + 1
        const groupId = groupedItemGroupMap?.[itemKey] || null
        const isGrouped = Boolean(groupId)
        const groupColor = groupId ? groupColorMap[groupId] : null
        const shouldShowGroupOutline = isGrouped && !isMobileLayout && isCtrlHeld
        const noteBackgroundColor = editingId === itemKey ? editColor : getItemColor(item)
        const noteTextColor = editingId === itemKey ? editTextColor : getItemTextColor(item)
        const noteFontWeight = editingId === itemKey ? editFontWeight : getItemFontWeight(item)
        const noteFontStyle = editingId === itemKey ? editFontStyle : getItemFontStyle(item)
        const isHeaderNote = isHeaderNoteItem(item)
        const noteTextureImage = null
        const headerBandColor = isHeaderNote ? darkenAndSaturate(noteBackgroundColor) : null
        const isTextBoxNote = !isDecoration && !isChecklist && String(noteBackgroundColor || '').trim().toLowerCase() === 'transparent'
        const groupOutlineShadow = shouldShowGroupOutline
          ? `0 0 0 2px ${groupColor || '#4285f4'}, 3px 3px 10px rgba(0,0,0,0.3)`
          : '3px 3px 10px rgba(0,0,0,0.3)'
        const isSelectionActive = (groupSelectionMode && selectedGroupItemKeys.has(itemKey))
          || (!isMobileLayout && isCtrlHeld && !isShiftHeld && desktopGroupSelectionItems.has(itemKey))
        const textBoxOutlineShadow = isSelectionActive
          ? '0 0 0 3px rgba(76, 175, 80, 0.95)'
          : (shouldShowGroupOutline ? `0 0 0 2px ${groupColor || '#4285f4'}` : 'none')

        return (
          <div
        key={itemKey}
        data-note-id={item.id}
        data-item-key={itemKey}
        onClickCapture={(e) => {
          // Desktop ungroup mode: only allow interaction with grouped items
          if (!isMobileLayout && isShiftHeld && isCtrlHeld && !isGrouped) {
            e.preventDefault()
            e.stopPropagation()
            return
          }

          if (handleGroupSelectionClick?.(e, item)) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        onPointerDown={
          editingId
            ? undefined
            : (e) => {
              // During mobile group selection mode, toggle selection on tap
              if (groupSelectionMode) {
                if (e.cancelable) {
                  e.preventDefault()
                }
                e.stopPropagation()
                toggleGroupItemSelection(itemKey)
                return
              }
              
              // Desktop group selection mode (Ctrl held): toggle item selection
              if (!isMobileLayout && isCtrlHeld && !isShiftHeld) {
                setDesktopGroupSelectionItems((prev) => {
                  const newSet = new Set(prev)
                  if (newSet.has(itemKey)) {
                    newSet.delete(itemKey)
                  } else {
                    newSet.add(itemKey)
                  }
                  return newSet
                })
                e.preventDefault()
                e.stopPropagation()
                return
              }
              
              // Desktop ungroup mode (Shift+Ctrl): block clicks on ungrouped items
              if (!isMobileLayout && isShiftHeld && isCtrlHeld && !isGrouped) {
                e.preventDefault()
                e.stopPropagation()
                return
              }

              // Desktop ungroup mode (Shift+Ctrl): release grouped notes immediately.
              if (!isMobileLayout && isShiftHeld && isCtrlHeld && isGrouped) {
                if (handleGroupSelectionClick?.({ altKey: true, ctrlKey: false }, item)) {
                  e.preventDefault()
                  e.stopPropagation()
                }
                return
              }
              
              if (isGroupingModifierPressed(e) || e.altKey) return
              if (isMobileLayout) {
                startMobileDragHold(e, item)
                return
              }
              handleDragStart(e, item)
            }
        }
        onClick={
          isDecoration
            ? (e) => {
              if (isGroupingModifierPressed(e) || e.altKey) return
              // Allow decorations to be selected during group selection mode
              if (groupSelectionMode) {
                toggleGroupItemSelection(itemKey)
                return
              }
              setActiveDecorationHandleId((prev) => (prev === itemKey ? null : itemKey))
            }
            : undefined
        }
        style={{
          position: 'absolute',
          left: item.x,
          top: item.y,
          transform: `rotate(${item.rotation || 0}deg)`,
          backgroundColor: isDecoration ? 'transparent' : (isTextBoxNote ? 'transparent' : noteBackgroundColor),
          backgroundImage: 'none',
          backgroundSize: 'auto',
          backgroundPosition: 'initial',
          backgroundRepeat: noteTextureImage ? 'no-repeat' : 'repeat',
          color: isDecoration ? undefined : noteTextColor,
          padding: isDecoration
            ? 0
            : (isTextBoxNote
                ? 0
                : (isHeaderNote ? `${HEADER_NOTE_HEADER_HEIGHT + 16}px 20px 20px` : 20)),
          width: renderedItemWidth,
          minHeight: itemHeight,
          borderRadius: 0,
          boxShadow: isDecoration
            ? (shouldShowGroupOutline ? `0 0 0 2px ${groupColor || '#4285f4'}` : 'none')
            : (isTextBoxNote
                ? textBoxOutlineShadow
              : (groupSelectionMode && selectedGroupItemKeys.has(itemKey)
                ? '0 0 0 3px rgba(76, 175, 80, 0.95), 3px 3px 10px rgba(0,0,0,0.3)'
                : (!isMobileLayout && isCtrlHeld && !isShiftHeld && desktopGroupSelectionItems.has(itemKey)
                  ? '0 0 0 3px rgba(76, 175, 80, 0.95), 3px 3px 10px rgba(0,0,0,0.3)'
                  : groupOutlineShadow))),
          border: 'none',
          filter: 'none',
          mixBlendMode: 'normal',
          opacity: (!isMobileLayout && isShiftHeld && isCtrlHeld && !isGrouped && !isDecoration) ? 0.3 : 1,
          fontFamily: editingId === itemKey ? editFontFamily : getItemFontFamily(item),
          fontWeight: isDecoration ? undefined : noteFontWeight,
          fontStyle: isDecoration ? undefined : noteFontStyle,
          fontSynthesis: isDecoration
            ? undefined
            : (noteFontStyle === 'italic' ? 'style' : 'none'),
          touchAction: editingId === itemKey
            ? 'auto'
            : 'none',
          WebkitTouchCallout: editingId === itemKey ? 'default' : 'none',
          userSelect: editingId === itemKey ? 'text' : 'none',
          WebkitUserSelect: editingId === itemKey ? 'text' : 'none',
          cursor: draggedId === itemKey
            ? 'grabbing'
            : (isMobileLayout ? 'default' : 'grab'),
          zIndex: ((draggedId === itemKey) || (draggedId && isGrouped && groupedItemGroupMap?.[draggedId] === groupId))
            ? 3000
            : (editingId === itemKey || (isDecoration && activeDecorationHandleId === itemKey)
              ? 2500
              : (isDecoration
                ? ((isCtrlHeld || groupSelectionMode) ? (baseZIndex + 200) : baseZIndex)
                : (baseZIndex + 200)))
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
            {decorationImage ? (
              <img
                src={decorationImage}
                alt={decorationOption?.label || 'Decoration'}
                draggable="false"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  filter: 'saturate(1.05) contrast(1.03)'
                }}
              />
            ) : (
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
            )}
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
            style={{
              position: 'relative',
              zIndex: 1,
              margin: 0,
              padding: 0,
              borderRadius: 0,
              background: 'transparent'
            }}
          >
            {isHeaderNote && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: -20,
                  right: -20,
                  top: -(HEADER_NOTE_HEADER_HEIGHT + 16),
                  height: HEADER_NOTE_HEADER_HEIGHT,
                  background: headerBandColor,
                  pointerEvents: 'none'
                }}
              />
            )}
            <div
              style={{
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'center',
                position: 'static',
                top: 'auto',
                left: 'auto',
                right: 'auto',
                zIndex: 2
              }}
            >
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
                  fontWeight: editFontWeight,
                  fontStyle: editFontStyle,
                  fontSynthesis: editFontStyle === 'italic' ? 'style' : 'none',
                  lineHeight: 1.15,
                  boxSizing: 'border-box',
                  display: 'block'
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
                      {fontOptions.map((option) => (
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

                  {!isDecoration && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (editSaveError) setEditSaveError('')
                          setEditFontWeight((prev) => (prev === 'bold' ? 'normal' : 'bold'))
                        }}
                        style={{
                          padding: '2px 6px',
                          fontSize: 12,
                          borderRadius: 4,
                          border: '1px solid #bbb',
                          background: editFontWeight === 'bold' ? '#222' : '#fff',
                          color: editFontWeight === 'bold' ? '#fff' : '#222',
                          cursor: 'pointer',
                          fontWeight: 700,
                          minWidth: 28,
                          height: 24
                        }}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editSaveError) setEditSaveError('')
                          setEditFontStyle((prev) => (prev === 'italic' ? 'normal' : 'italic'))
                        }}
                        style={{
                          padding: '2px 6px',
                          fontSize: 12,
                          borderRadius: 4,
                          border: '1px solid #bbb',
                          background: editFontStyle === 'italic' ? '#222' : '#fff',
                          color: editFontStyle === 'italic' ? '#fff' : '#222',
                          cursor: 'pointer',
                          fontStyle: 'italic',
                          fontWeight: 700,
                          minWidth: 28,
                          height: 24
                        }}
                      >
                        I
                      </button>
                    </>
                  )}
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
            {isHeaderNote && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  height: HEADER_NOTE_HEADER_HEIGHT,
                  background: headerBandColor,
                  pointerEvents: 'none',
                  zIndex: 0
                }}
              />
            )}
            <div
              onClick={(e) => {
                // For text boxes, only allow editing on double-click
                if (isTextBoxNote) return
                if (groupSelectionMode) return
                if (!isMobileLayout && (isCtrlHeld || isGroupingModifierPressed(e) || e.altKey)) return
                handleDesktopNoteClick(itemKey, item, isChecklist)
              }}
              onDoubleClick={(e) => {
                // For text boxes, allow editing on double-click
                if (!isTextBoxNote) return
                if (groupSelectionMode) return
                if (!isMobileLayout && (isCtrlHeld || isGroupingModifierPressed(e) || e.altKey)) return
                 handleDesktopNoteClick(itemKey, item, isChecklist, true)
              }}
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                cursor: canCurrentUserEditDeskItems ? (isDecoration ? 'grab' : (isTextBoxNote ? 'text' : 'pointer')) : 'default',
                minHeight: isDecoration ? 40 : contentMinHeight,
                display: 'flex',
                flexDirection: 'column',
                color: getItemTextColor(item),
                fontSize: getItemFontSize(item),
                fontFamily: getItemFontFamily(item),
                position: 'relative',
                zIndex: 1,
                margin: 0,
                padding: 0,
                borderRadius: 0,
                background: 'transparent',
                userSelect: isMobileLayout ? 'none' : 'auto',
                WebkitUserSelect: isMobileLayout ? 'none' : 'auto'
              }}
            >
              {isChecklist ? (
                <>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{item.title || 'Checklist'}</div>
                    {(item.items || []).length === 0 ? (
                      <div style={{ opacity: 0.7 }}>No checklist items</div>
                    ) : (
                      (item.items || []).map((checklistItem, checklistIndex) => {
                        const reminderMeta = getChecklistReminderMeta(checklistItem)
                        return (
                          <label
                            key={`${item.id}-${checklistItem.id || checklistIndex}`}
                            onPointerDown={(e) => e.stopPropagation()}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(checklistItem.is_checked)}
                              onChange={() => toggleChecklistItem(itemKey, checklistIndex)}
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
                      {creatorLabel}
                    </div>
                  )}
                </>
              ) : isDecoration ? (
                <>
                  <div style={{ fontSize: 40, lineHeight: 1, textAlign: 'center' }}>{decorationOption?.emoji || '📌'}</div>
                </>
              ) : (
                <>
                  <div>{item.content}</div>
                  {shouldShowCreatorLabel && (
                    <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 10, color: 'inherit', textAlign: 'right' }}>
                      {creatorLabel}
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
    </>
  )
}