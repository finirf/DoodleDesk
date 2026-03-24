import { useCallback } from 'react'

export default function useDeskShelfHierarchyActions({
  deskShelves,
  deskShelfAssignments,
  selectedDeskId,
  userId,
  newShelfNameInput,
  newShelfParentId,
  isDeskCollaborative,
  openConfirmDialog,
  setDeskShelves,
  setDeskShelfAssignments,
  setExpandedDeskShelves,
  setNewShelfNameInput,
  setNewShelfParentId,
  setShelfActionError
}) {
  const getDeskGroupLabel = useCallback((desk) => {
    if (!desk) return 'Private'
    if (desk.user_id !== userId) return 'Shared'
    return isDeskCollaborative(desk) ? 'Sharing' : 'Private'
  }, [isDeskCollaborative, userId])

  const getDeskDefaultShelfId = useCallback((desk) => {
    if (!desk) return '__private'
    if (desk.user_id !== userId) return '__shared'
    return isDeskCollaborative(desk) ? '__sharing' : '__private'
  }, [isDeskCollaborative, userId])

  const getDeskAssignedCustomShelfId = useCallback((deskId) => {
    const assignment = deskShelfAssignments[String(deskId)]
    if (!assignment) return ''
    return deskShelves.some((shelf) => shelf.id === assignment) ? assignment : ''
  }, [deskShelfAssignments, deskShelves])

  const getDeskEffectiveShelfId = useCallback((desk) => {
    const customAssignment = getDeskAssignedCustomShelfId(desk.id)
    if (customAssignment) return customAssignment
    return getDeskDefaultShelfId(desk)
  }, [getDeskAssignedCustomShelfId, getDeskDefaultShelfId])

  const getChildDeskShelves = useCallback((parentId) => {
    const normalizedParent = parentId || null
    return deskShelves
      .filter((shelf) => (shelf.parent_id || null) === normalizedParent)
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [deskShelves])

  const getCustomShelfOptions = useCallback((parentId = '', depth = 0) => {
    const collectOptions = (nextParentId, nextDepth) => {
      const children = getChildDeskShelves(nextParentId)
      return children.flatMap((shelf) => [
        { id: shelf.id, name: shelf.name, depth: nextDepth },
        ...collectOptions(shelf.id, nextDepth + 1)
      ])
    }

    return collectOptions(parentId, depth)
  }, [getChildDeskShelves])

  const toggleDeskShelfExpanded = useCallback((shelfId) => {
    setExpandedDeskShelves((prev) => ({ ...prev, [shelfId]: !prev[shelfId] }))
  }, [setExpandedDeskShelves])

  const createDeskShelf = useCallback(() => {
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
  }, [
    deskShelves,
    newShelfNameInput,
    newShelfParentId,
    setDeskShelves,
    setExpandedDeskShelves,
    setNewShelfNameInput,
    setNewShelfParentId,
    setShelfActionError
  ])

  const setSelectedDeskCustomShelf = useCallback((shelfId) => {
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
  }, [selectedDeskId, setDeskShelfAssignments, setShelfActionError])

  const renameDeskShelf = useCallback((shelfId) => {
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
  }, [deskShelves, setDeskShelves, setShelfActionError])

  const deleteDeskShelf = useCallback((shelfId) => {
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
  }, [
    deskShelves,
    deskShelfAssignments,
    openConfirmDialog,
    setDeskShelves,
    setDeskShelfAssignments,
    setExpandedDeskShelves,
    setShelfActionError
  ])

  return {
    getDeskGroupLabel,
    getDeskAssignedCustomShelfId,
    getDeskEffectiveShelfId,
    getChildDeskShelves,
    getCustomShelfOptions,
    toggleDeskShelfExpanded,
    createDeskShelf,
    setSelectedDeskCustomShelf,
    renameDeskShelf,
    deleteDeskShelf
  }
}