import { useCallback, useEffect, useRef } from 'react'
import {
  getDecorationOption,
  getItemColor,
  getItemFontFamily,
  getItemFontSize,
  getItemHeight,
  getItemKey,
  getItemTextColor,
  getItemWidth,
  isChecklistItem,
  isDecorationItem
} from '../utils/itemUtils'
import FourWayResizeIcon from './FourWayResizeIcon'

const MOBILE_DRAG_HOLD_MS = 170
const MOBILE_DRAG_CANCEL_DISTANCE_PX = 10

export default function DeskCanvasItems({
  notes,
  currentDesk,
  userId,
  isDeskCollaborative,
  getItemCreatorLabel,
  mobileNoteMaxWidth,
  isMobileLayout,
  editingId,
  editColor,
  editTextColor,
  editFontFamily,
  draggedId,
  activeDecorationHandleId,
  setActiveDecorationHandleId,
  rotatingId,
  resizingId,
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

  function temporarilySuppressEditClick() {
    suppressEditClickRef.current = true
    if (suppressEditClickTimerRef.current) {
      window.clearTimeout(suppressEditClickTimerRef.current)
    }
    suppressEditClickTimerRef.current = window.setTimeout(() => {
      suppressEditClickRef.current = false
      suppressEditClickTimerRef.current = null
    }, 280)
  }

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

  const handleMobilePointerMove = useCallback((e) => {
    const pending = mobileDragPointerRef.current
    if (!pending) return
    if (pending.pointerId !== null && e.pointerId !== pending.pointerId) return
    if (pending.hasStartedDrag) return

    const deltaX = Math.abs(e.clientX - pending.startClientX)
    const deltaY = Math.abs(e.clientY - pending.startClientY)

    if (deltaX > MOBILE_DRAG_CANCEL_DISTANCE_PX || deltaY > MOBILE_DRAG_CANCEL_DISTANCE_PX) {
      clearPendingMobileDrag()
    }
  }, [clearPendingMobileDrag])

  function startMobileDragHold(e, item) {
    if (!isMobileLayout || isDecorationItem(item) || editingId) return
    if (!canCurrentUserEditDeskItems) return
    if (typeof e.button === 'number' && e.button !== 0) return
    if (typeof e.isPrimary === 'boolean' && !e.isPrimary) return

    clearPendingMobileDrag()

    const pointerId = typeof e.pointerId === 'number' ? e.pointerId : null
    mobileDragPointerRef.current = {
      pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      hasStartedDrag: false
    }

    window.addEventListener('pointermove', handleMobilePointerMove)
    window.addEventListener('pointerup', clearPendingMobileDrag)
    window.addEventListener('pointercancel', clearPendingMobileDrag)

    mobileDragTimerRef.current = window.setTimeout(() => {
      const pending = mobileDragPointerRef.current
      if (!pending) return
      pending.hasStartedDrag = true
      temporarilySuppressEditClick()
      handleDragStart(e, item)
      clearPendingMobileDrag()
    }, MOBILE_DRAG_HOLD_MS)
  }

  function openItemEditor(itemKey, item, isChecklist) {
    if (!canCurrentUserEditDeskItems) return
    if (suppressEditClickRef.current) {
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
  }

  useEffect(() => {
    mobilePointerMoveHandlerRef.current = handleMobilePointerMove
    mobileDragClearHandlerRef.current = clearPendingMobileDrag
  }, [handleMobilePointerMove, clearPendingMobileDrag])

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
  }, [clearPendingMobileDrag, handleMobilePointerMove])

  return notes.map((item, index) => {
    const itemKey = getItemKey(item)
    const isChecklist = isChecklistItem(item)
    const isDecoration = isDecorationItem(item)
    const decorationOption = isDecoration ? getDecorationOption(item.kind) : null
    const shouldShowCreatorLabel = Boolean(currentDesk && isDeskCollaborative(currentDesk) && !isDecoration)
    const creatorLabel = shouldShowCreatorLabel ? getItemCreatorLabel(item, userId) : ''
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
          editingId
            ? undefined
            : (isMobileLayout && !isDecoration)
              ? (e) => startMobileDragHold(e, item)
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
          touchAction: editingId === itemKey
            ? 'auto'
            : (isMobileLayout && !isDecoration && draggedId !== itemKey ? 'pan-y' : 'none'),
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
            <div
              onClick={() => openItemEditor(itemKey, item, isChecklist)}
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
  })
}