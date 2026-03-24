import { useCallback, useRef, useState } from 'react'

export default function useDeskItemInteractions({
  canCurrentUserEditDeskItems,
  editingId,
  notesRef,
  setNotes,
  canvasWidth,
  sectionHeight,
  growThreshold,
  gridSize,
  snapToGrid,
  setCanvasWidth,
  setCanvasHeight,
  getItemKey,
  getItemWidth,
  getItemHeight,
  isDecorationItem,
  clampDimension,
  normalizeRotation,
  persistItemPosition,
  persistItemSize,
  persistRotation,
  flushDeferredRemoteNotes
}) {
  const [draggedId, setDraggedId] = useState(null)
  const [rotatingId, setRotatingId] = useState(null)
  const [resizingId, setResizingId] = useState(null)
  const [resizeOverlay, setResizeOverlay] = useState(null)

  const draggedIdRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const dragPointerIdRef = useRef(null)
  const dragLastPositionRef = useRef(null)
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef(false)
  const isRotatingRef = useRef(false)
  const resizeLastDimensionsRef = useRef(null)
  const rotateLastValueRef = useRef(null)
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

  const hasActivePointerInteraction = useCallback(() => {
    return Boolean(isDraggingRef.current || isResizingRef.current || isRotatingRef.current)
  }, [])

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

    dragOffsetRef.current = { x: pageX - item.x, y: pageY - item.y }

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

  return {
    draggedId,
    rotatingId,
    resizingId,
    resizeOverlay,
    hasActivePointerInteraction,
    handleDragStart,
    handleResizeMouseDown,
    handleRotateMouseDown
  }
}
