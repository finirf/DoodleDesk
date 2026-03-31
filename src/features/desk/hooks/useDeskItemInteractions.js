import { useCallback, useEffect, useRef, useState } from 'react'

const REMOTE_GROUP_DOWNGRADE_GUARD_MS = 15000

export default function useDeskItemInteractions({
  selectedDeskId,
  canCurrentUserEditDeskItems,
  editingId,
  notes,
  notesRef,
  setNotes,
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
  persistItemGroup,
  flushDeferredRemoteNotes,
  clearDeferredRemoteNotes
}) {
  const [draggedId, setDraggedId] = useState(null)
  const [rotatingId, setRotatingId] = useState(null)
  const [resizingId, setResizingId] = useState(null)
  const [resizeOverlay, setResizeOverlay] = useState(null)
  const [groupedItemGroupMap, setGroupedItemGroupMap] = useState({})

  const groupedItemKeys = Object.keys(groupedItemGroupMap)
  const pendingGroupStorageKey = selectedDeskId ? `doodledesk.pendingGroupMap.${selectedDeskId}` : null
  const groupedItemSizes = groupedItemKeys.reduce((accumulator, itemKey) => {
    const groupId = groupedItemGroupMap[itemKey]
    if (!groupId) return accumulator
    accumulator[itemKey] = groupedItemKeys.filter((key) => groupedItemGroupMap[key] === groupId).length
    return accumulator
  }, {})

  const draggedIdRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const dragPointerIdRef = useRef(null)
  const dragLastPositionRef = useRef(null)
  const dragGroupKeysRef = useRef([])
  const dragGroupStartPositionsRef = useRef({})
  const dragLastGroupPositionsRef = useRef({})
  const groupedItemGroupMapRef = useRef({})
  const persistedGroupedItemMapRef = useRef({})
  const hasPendingGroupPersistenceRef = useRef(false)
  const groupPersistenceRetryTimeoutRef = useRef(null)
  const lastLocalGroupMutationAtRef = useRef(0)
  const ctrlGroupSessionIdRef = useRef(null)
  const isCtrlPressedRef = useRef(false)
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

  const persistPendingGroupMap = useCallback((nextMap) => {
    if (!pendingGroupStorageKey || typeof window === 'undefined') return

    try {
      const hasEntries = nextMap && Object.keys(nextMap).length > 0
      if (!hasEntries) {
        window.localStorage.removeItem(pendingGroupStorageKey)
        return
      }

      window.localStorage.setItem(
        pendingGroupStorageKey,
        JSON.stringify({
          updatedAt: Date.now(),
          map: nextMap
        })
      )
    } catch {
      // Ignore localStorage errors in private/blocked environments.
    }
  }, [pendingGroupStorageKey])

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

  function isGroupableItem(item) {
    return !isDecorationItem(item)
  }

  function createGroupId() {
    return `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  const setGroupedMap = useCallback((nextMap, source = 'local') => {
    if (source !== 'remote') {
      lastLocalGroupMutationAtRef.current = Date.now()
    }

    groupedItemGroupMapRef.current = nextMap
    setGroupedItemGroupMap(nextMap)
    setNotes((prev) => {
      let hasAnyChange = false
      const nextItems = prev.map((item) => {
        if (isDecorationItem(item)) return item
        const itemKey = getItemKey(item)
        const nextGroupId = nextMap[itemKey] || null
        const currentGroupId = typeof item?.group_id === 'string' && item.group_id.trim()
          ? item.group_id.trim()
          : null

        if (currentGroupId === nextGroupId) return item
        hasAnyChange = true
        return {
          ...item,
          group_id: nextGroupId
        }
      })

      return hasAnyChange ? nextItems : prev
    })
  }, [getItemKey, isDecorationItem, setNotes])

  function pruneSingletonGroups(inputMap, preserveGroupId = null) {
    const groupCounts = {}
    Object.values(inputMap).forEach((groupId) => {
      if (!groupId) return
      groupCounts[groupId] = (groupCounts[groupId] || 0) + 1
    })

    const nextMap = {}
    Object.entries(inputMap).forEach(([itemKey, groupId]) => {
      if (!groupId) return
      if (groupCounts[groupId] > 1 || groupId === preserveGroupId) {
        nextMap[itemKey] = groupId
      }
    })

    return nextMap
  }

  function sanitizeGroupedMap() {
    const validKeys = new Set(notesRef.current.map((entry) => getItemKey(entry)))
    const currentMap = groupedItemGroupMapRef.current
    const nextMap = {}

    Object.entries(currentMap).forEach(([itemKey, groupId]) => {
      if (validKeys.has(itemKey)) {
        nextMap[itemKey] = groupId
      }
    })

    const preserveGroupId = isCtrlPressedRef.current ? ctrlGroupSessionIdRef.current : null
    const normalizedMap = pruneSingletonGroups(nextMap, preserveGroupId)

    if (
      Object.keys(normalizedMap).length !== Object.keys(currentMap).length
      || Object.keys(normalizedMap).some((key) => normalizedMap[key] !== currentMap[key])
    ) {
      setGroupedMap(normalizedMap)
    }

    return normalizedMap
  }

  useEffect(() => {
    if (!pendingGroupStorageKey || typeof window === 'undefined') return

    try {
      const rawValue = window.localStorage.getItem(pendingGroupStorageKey)
      if (!rawValue) return

      const parsed = JSON.parse(rawValue)
      const storedMap = parsed?.map && typeof parsed.map === 'object' ? parsed.map : {}
      const currentMap = groupedItemGroupMapRef.current
      const mergedMap = { ...currentMap, ...storedMap }
      const normalizedMergedMap = pruneSingletonGroups(mergedMap)
      const hasDiff =
        Object.keys(normalizedMergedMap).length !== Object.keys(currentMap).length
        || Object.keys(normalizedMergedMap).some((key) => normalizedMergedMap[key] !== currentMap[key])

      if (!hasDiff) {
        return
      }

      hasPendingGroupPersistenceRef.current = true
      setGroupedMap(normalizedMergedMap)
    } catch {
      window.localStorage.removeItem(pendingGroupStorageKey)
    }
  }, [pendingGroupStorageKey, setGroupedMap])

  useEffect(() => {
    let rafId = null
    const hasGroupIdField = notes.some((item) => {
      if (isDecorationItem(item)) return false
      return Object.prototype.hasOwnProperty.call(item, 'group_id')
    })

    if (!hasGroupIdField) {
      return () => {}
    }

    if (hasPendingGroupPersistenceRef.current) {
      return () => {}
    }

    const hasRecentLocalGroupMutation = Date.now() - lastLocalGroupMutationAtRef.current < REMOTE_GROUP_DOWNGRADE_GUARD_MS
    if (hasRecentLocalGroupMutation) {
      return () => {}
    }

    const hydratedMap = {}
    notes.forEach((item) => {
      if (isDecorationItem(item)) return
      const groupId = typeof item?.group_id === 'string' ? item.group_id.trim() : ''
      if (!groupId) return
      hydratedMap[getItemKey(item)] = groupId
    })

    const normalizedHydratedMap = pruneSingletonGroups(hydratedMap)
    const currentMap = groupedItemGroupMapRef.current
    const hasRemoteDowngrade = Object.keys(currentMap).some((key) => {
      const currentGroupId = currentMap[key]
      if (!currentGroupId) return false
      return normalizedHydratedMap[key] !== currentGroupId
    })
    if (hasRemoteDowngrade) {
      return () => {}
    }

    const hasDiff = Object.keys(normalizedHydratedMap).length !== Object.keys(currentMap).length
      || Object.keys(normalizedHydratedMap).some((key) => normalizedHydratedMap[key] !== currentMap[key])

    if (hasDiff) {
      rafId = window.requestAnimationFrame(() => {
        setGroupedMap(normalizedHydratedMap, 'remote')
      })
    }

    persistedGroupedItemMapRef.current = normalizedHydratedMap
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [notes, getItemKey, isDecorationItem, setGroupedMap])

  useEffect(() => {
    if (typeof persistItemGroup !== 'function') return

    const currentMap = groupedItemGroupMapRef.current
    const previousPersistedMap = persistedGroupedItemMapRef.current
    const candidateKeys = new Set([...Object.keys(previousPersistedMap), ...Object.keys(currentMap)])
    const changedKeys = [...candidateKeys].filter((itemKey) => previousPersistedMap[itemKey] !== currentMap[itemKey])

    if (!changedKeys.length) {
      hasPendingGroupPersistenceRef.current = false
      persistPendingGroupMap({})
      return
    }

    hasPendingGroupPersistenceRef.current = true

    void Promise.all(
      changedKeys.map(async (itemKey) => ({
        itemKey,
        result: await persistItemGroup(itemKey, currentMap[itemKey] || null)
      }))
    ).then((results) => {
      const nextPersistedMap = { ...persistedGroupedItemMapRef.current }
      let hasTransientFailure = false

      results.forEach(({ itemKey, result }) => {
        if (result === true || result === 'unsupported') {
          const nextGroupId = currentMap[itemKey] || null
          if (nextGroupId) {
            nextPersistedMap[itemKey] = nextGroupId
          } else {
            delete nextPersistedMap[itemKey]
          }
          return
        }

        hasTransientFailure = true
      })

      persistedGroupedItemMapRef.current = nextPersistedMap

      if (hasTransientFailure) {
        persistPendingGroupMap(currentMap)

        if (groupPersistenceRetryTimeoutRef.current) {
          clearTimeout(groupPersistenceRetryTimeoutRef.current)
        }

        groupPersistenceRetryTimeoutRef.current = setTimeout(() => {
          groupPersistenceRetryTimeoutRef.current = null
          setGroupedMap({ ...groupedItemGroupMapRef.current })
        }, 1500)
        return
      }

      const latestMap = groupedItemGroupMapRef.current
      const pendingKeys = new Set([...Object.keys(nextPersistedMap), ...Object.keys(latestMap)])
      hasPendingGroupPersistenceRef.current = [...pendingKeys].some(
        (itemKey) => nextPersistedMap[itemKey] !== latestMap[itemKey]
      )

      if (!hasPendingGroupPersistenceRef.current) {
        persistPendingGroupMap({})
      }
    })
  }, [groupedItemGroupMap, persistItemGroup, setGroupedMap, persistPendingGroupMap])

  useEffect(() => {
    return () => {
      if (groupPersistenceRetryTimeoutRef.current) {
        clearTimeout(groupPersistenceRetryTimeoutRef.current)
      }
    }
  }, [])

  const finalizeGroupingSession = useCallback(() => {
    const normalizedMap = pruneSingletonGroups(groupedItemGroupMapRef.current)
    if (
      Object.keys(normalizedMap).length !== Object.keys(groupedItemGroupMapRef.current).length
      || Object.keys(normalizedMap).some((key) => normalizedMap[key] !== groupedItemGroupMapRef.current[key])
    ) {
      setGroupedMap(normalizedMap)
    }
    ctrlGroupSessionIdRef.current = null
  }, [setGroupedMap])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Control') {
        isCtrlPressedRef.current = true
      }
    }

    const handleKeyUp = (event) => {
      if (event.key === 'Control') {
        isCtrlPressedRef.current = false
        const normalizedMap = pruneSingletonGroups(groupedItemGroupMapRef.current)
        if (
          Object.keys(normalizedMap).length !== Object.keys(groupedItemGroupMapRef.current).length
          || Object.keys(normalizedMap).some((key) => normalizedMap[key] !== groupedItemGroupMapRef.current[key])
        ) {
          setGroupedMap(normalizedMap)
        }
        ctrlGroupSessionIdRef.current = null
      }
    }

    const handleWindowBlur = () => {
      isCtrlPressedRef.current = false
      const normalizedMap = pruneSingletonGroups(groupedItemGroupMapRef.current)
      if (
        Object.keys(normalizedMap).length !== Object.keys(groupedItemGroupMapRef.current).length
        || Object.keys(normalizedMap).some((key) => normalizedMap[key] !== groupedItemGroupMapRef.current[key])
      ) {
        setGroupedMap(normalizedMap)
      }
      ctrlGroupSessionIdRef.current = null
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [setGroupedMap])

  function handleGroupSelectionClick(event, item) {
    if (!canCurrentUserEditDeskItems) return false
    if (editingId) return false
    if (!isGroupableItem(item)) return false

    const itemKey = getItemKey(item)

    const currentMap = sanitizeGroupedMap()

    if (event.ctrlKey) {
      const existingGroupId = currentMap[itemKey]
      const sessionGroupId = ctrlGroupSessionIdRef.current

      if (existingGroupId) {
        if (!sessionGroupId) {
          ctrlGroupSessionIdRef.current = existingGroupId
          return true
        }

        if (sessionGroupId === existingGroupId) {
          return true
        }

        const nextMap = { ...currentMap }
        Object.keys(nextMap).forEach((key) => {
          if (nextMap[key] === existingGroupId) {
            nextMap[key] = sessionGroupId
          }
        })

        setGroupedMap(nextMap)
        return true
      }

      let nextSessionGroupId = sessionGroupId
      if (!nextSessionGroupId) {
        nextSessionGroupId = createGroupId()
        ctrlGroupSessionIdRef.current = nextSessionGroupId
      }

      setGroupedMap({
        ...currentMap,
        [itemKey]: nextSessionGroupId
      })
      return true
    }

    if (event.altKey) {
      const existingGroupId = currentMap[itemKey]
      if (!existingGroupId) return true

      const nextMap = { ...currentMap }
      delete nextMap[itemKey]
      setGroupedMap(pruneSingletonGroups(nextMap))

      if (!Object.values(nextMap).includes(existingGroupId) && ctrlGroupSessionIdRef.current === existingGroupId) {
        ctrlGroupSessionIdRef.current = null
      }
      return true
    }

    return false
  }

  function toggleItemGrouping(item) {
    if (!canCurrentUserEditDeskItems) return false
    if (editingId) return false
    if (!isGroupableItem(item)) return false

    const itemKey = getItemKey(item)
    const currentMap = sanitizeGroupedMap()
    const existingGroupId = currentMap[itemKey]

    if (existingGroupId) {
      const nextMap = { ...currentMap }
      delete nextMap[itemKey]
      setGroupedMap(nextMap)

      if (!Object.values(nextMap).includes(existingGroupId) && ctrlGroupSessionIdRef.current === existingGroupId) {
        ctrlGroupSessionIdRef.current = null
      }
      return true
    }

    let sessionGroupId = ctrlGroupSessionIdRef.current
    if (!sessionGroupId) {
      sessionGroupId = createGroupId()
      ctrlGroupSessionIdRef.current = sessionGroupId
    }

    setGroupedMap({
      ...pruneSingletonGroups(currentMap, sessionGroupId),
      [itemKey]: sessionGroupId
    })
    return true
  }

  function groupItemsByKeys(itemKeys) {
    if (!canCurrentUserEditDeskItems) return false
    if (editingId) return false
    if (!Array.isArray(itemKeys) || itemKeys.length < 2) return false

    const currentMap = sanitizeGroupedMap()
    const validGroupableKeys = new Set(
      notesRef.current
        .filter((item) => isGroupableItem(item))
        .map((item) => getItemKey(item))
    )

    const selectedKeys = [...new Set(itemKeys.filter((key) => validGroupableKeys.has(key)))]
    if (selectedKeys.length < 2) return false

    let targetGroupId = selectedKeys
      .map((key) => currentMap[key])
      .find((groupId) => Boolean(groupId))

    if (!targetGroupId) {
      targetGroupId = createGroupId()
    }

    const nextMap = { ...currentMap }

    selectedKeys.forEach((key) => {
      const existingGroupId = nextMap[key]
      if (existingGroupId && existingGroupId !== targetGroupId) {
        Object.keys(nextMap).forEach((mapKey) => {
          if (nextMap[mapKey] === existingGroupId) {
            nextMap[mapKey] = targetGroupId
          }
        })
      }
      nextMap[key] = targetGroupId
    })

    setGroupedMap(pruneSingletonGroups(nextMap, targetGroupId))
    ctrlGroupSessionIdRef.current = targetGroupId
    return true
  }

  function buildGroupDragResult(pageX, pageY, activeDraggedId) {
    const startPositions = dragGroupStartPositionsRef.current
    const activeStart = startPositions[activeDraggedId]
    if (!activeStart) return null

    const groupEntries = dragGroupKeysRef.current
      .map((key) => {
        const item = notesRef.current.find((entry) => getItemKey(entry) === key)
        if (!item) return null
        const start = startPositions[key]
        if (!start) return null
        return { key, item, start }
      })
      .filter(Boolean)

    if (!groupEntries.length) return null

    const minStartX = Math.min(...groupEntries.map((entry) => entry.start.x))
    const minStartY = Math.min(...groupEntries.map((entry) => entry.start.y))

    const rawNextX = pageX - dragOffsetRef.current.x
    const rawNextY = pageY - dragOffsetRef.current.y
    let deltaX = rawNextX - activeStart.x
    let deltaY = rawNextY - activeStart.y

    deltaX = Math.max(deltaX, -minStartX)
    deltaY = Math.max(deltaY, -minStartY)

    let activeNextX = activeStart.x + deltaX
    let activeNextY = activeStart.y + deltaY

    if (snapToGrid) {
      activeNextX = Math.max(0, Math.round(activeNextX / gridSize) * gridSize)
      activeNextY = Math.max(0, Math.round(activeNextY / gridSize) * gridSize)
      deltaX = activeNextX - activeStart.x
      deltaY = activeNextY - activeStart.y
      deltaX = Math.max(deltaX, -minStartX)
      deltaY = Math.max(deltaY, -minStartY)
    }

    const positions = {}
    let maxRight = 0
    let maxBottom = 0

    groupEntries.forEach((entry) => {
      const nextX = entry.start.x + deltaX
      const nextY = entry.start.y + deltaY
      positions[entry.key] = { x: nextX, y: nextY }

      const rightEdge = nextX + getItemWidth(entry.item)
      const bottomEdge = nextY + getItemHeight(entry.item)
      if (rightEdge > maxRight) maxRight = rightEdge
      if (bottomEdge > maxBottom) maxBottom = bottomEdge
    })

    return {
      positions,
      requiredWidth: Math.ceil(maxRight + growThreshold),
      requiredHeight: maxBottom + growThreshold
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
    if (typeof clearDeferredRemoteNotes === 'function') {
      clearDeferredRemoteNotes()
    }
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
    const currentMap = sanitizeGroupedMap()
    const itemGroupId = currentMap[itemKey]
    const dragGroupKeys = itemGroupId
      ? Object.keys(currentMap).filter((key) => currentMap[key] === itemGroupId)
      : [itemKey]

    const groupStartPositions = {}
    dragGroupKeys.forEach((key) => {
      const targetItem = notesRef.current.find((entry) => getItemKey(entry) === key)
      if (!targetItem) return
      groupStartPositions[key] = {
        x: Number(targetItem.x) || 0,
        y: Number(targetItem.y) || 0
      }
    })

    dragGroupKeysRef.current = Object.keys(groupStartPositions)
    dragGroupStartPositionsRef.current = groupStartPositions

    isDraggingRef.current = true
    setDraggedId(itemKey)
    draggedIdRef.current = itemKey
    dragPointerIdRef.current = typeof e.pointerId === 'number' ? e.pointerId : null
    dragLastPositionRef.current = { x: item.x, y: item.y }
    dragLastGroupPositionsRef.current = { ...groupStartPositions }

    dragOffsetRef.current = { x: pageX - item.x, y: pageY - item.y }

    window.addEventListener('pointermove', handleDragMove)
    window.addEventListener('pointerup', handleDragEnd)
    window.addEventListener('pointercancel', handleDragEnd)
  }

  function handleDragMove(e) {
    if (dragPointerIdRef.current !== null && e.pointerId !== dragPointerIdRef.current) return

    if (e.cancelable) {
      e.preventDefault()
    }

    const activeDraggedId = draggedIdRef.current
    if (!activeDraggedId) {
      dragLastPositionRef.current = null
      return
    }

    const { pageX, pageY } = getEventPosition(e)

    const dragResult = buildGroupDragResult(pageX, pageY, activeDraggedId)
    if (!dragResult) {
      dragLastPositionRef.current = null
      dragLastGroupPositionsRef.current = {}
      return
    }

    const activePosition = dragResult.positions[activeDraggedId]
    if (!activePosition) {
      dragLastPositionRef.current = null
      dragLastGroupPositionsRef.current = {}
      return
    }

    setCanvasWidth((prev) => {
      if (dragResult.requiredWidth <= prev) return prev
      return dragResult.requiredWidth
    })

    setCanvasHeight((prev) => {
      if (dragResult.requiredHeight <= prev) return prev
      const requiredHeight = dragResult.requiredHeight
      const requiredSections = Math.ceil(requiredHeight / sectionHeight)
      return Math.max(prev, requiredSections * sectionHeight)
    })

    dragLastPositionRef.current = { x: activePosition.x, y: activePosition.y }
    dragLastGroupPositionsRef.current = dragResult.positions

    setNotes((prev) =>
      prev.map((item) =>
        dragResult.positions[getItemKey(item)]
          ? { ...item, x: dragResult.positions[getItemKey(item)].x, y: dragResult.positions[getItemKey(item)].y }
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
      dragLastGroupPositionsRef.current = {}
      dragGroupKeysRef.current = []
      dragGroupStartPositionsRef.current = {}
      return
    }

    let finalPositions = dragLastGroupPositionsRef.current

    if (!Object.keys(finalPositions).length && e) {
      const { pageX, pageY } = getEventPosition(e)
      const dragResult = buildGroupDragResult(pageX, pageY, activeDraggedId)
      if (dragResult) {
        finalPositions = dragResult.positions
        setCanvasWidth((prev) => Math.max(prev, dragResult.requiredWidth))
        setCanvasHeight((prev) => {
          if (dragResult.requiredHeight <= prev) return prev
          const requiredSections = Math.ceil(dragResult.requiredHeight / sectionHeight)
          return Math.max(prev, requiredSections * sectionHeight)
        })
      }
    }

    const dragGroupKeys = dragGroupKeysRef.current
    if (!Object.keys(finalPositions).length) {
      finalPositions = {}
      dragGroupKeys.forEach((key) => {
        const item = notesRef.current.find((entry) => getItemKey(entry) === key)
        if (!item) return
        finalPositions[key] = { x: Number(item.x) || 0, y: Number(item.y) || 0 }
      })
    }

    setNotes((prev) =>
      prev.map((item) => {
        const key = getItemKey(item)
        const nextPosition = finalPositions[key]
        if (!nextPosition) return item
        return { ...item, x: nextPosition.x, y: nextPosition.y }
      })
    )

    await Promise.all(
      Object.entries(finalPositions).map(([itemKey, position]) =>
        persistItemPosition(itemKey, position.x, position.y)
      )
    )

    dragLastPositionRef.current = null
    dragLastGroupPositionsRef.current = {}
    dragGroupKeysRef.current = []
    dragGroupStartPositionsRef.current = {}
    if (typeof clearDeferredRemoteNotes === 'function') {
      clearDeferredRemoteNotes()
    } else {
      flushDeferredRemoteNotes()
    }
  }

  return {
    draggedId,
    rotatingId,
    resizingId,
    resizeOverlay,
    groupedItemGroupMap,
    groupedItemKeys,
    groupedItemSizes,
    finalizeGroupingSession,
    groupItemsByKeys,
    hasActivePointerInteraction,
    handleGroupSelectionClick,
    toggleItemGrouping,
    handleDragStart,
    handleResizeMouseDown,
    handleRotateMouseDown
  }
}
