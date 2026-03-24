import { useEffect, useMemo, useRef, useState } from 'react'

export default function useDeskCommandPalette({
  hasModalOpen,
  selectedDeskId,
  canCurrentUserEditDeskItems,
  snapToGrid,
  setSnapToGrid,
  forceSaveInProgress,
  historySyncing,
  canUndo,
  canRedo,
  sortedDesks,
  getDeskNameValue,
  handleSelectDesk,
  fetchCurrentUserProfile,
  fetchDeskActivity,
  addStickyNote,
  addChecklistNote,
  addDecoration,
  decorationOptions,
  forceSaveAndClearHistory,
  undoNotesChange,
  redoNotesChange,
  setShowDeskMenu,
  setShowProfileMenu,
  setShowNewNoteMenu
}) {
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('')
  const [commandPaletteActiveIndex, setCommandPaletteActiveIndex] = useState(0)
  const commandPaletteInputRef = useRef(null)

  const closeCommandPalette = () => {
    setShowCommandPalette(false)
    setCommandPaletteQuery('')
    setCommandPaletteActiveIndex(0)
  }

  const executeCommandPaletteAction = (action) => {
    if (!action || action.disabled) return
    closeCommandPalette()
    action.run()
  }

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
        label: `Add ${decorationOptions[0]?.label || 'Decoration'}`,
        description: 'Place a decoration on the selected desk.',
        keywords: 'add decoration style',
        disabled: !canEditCurrentDesk,
        run: () => {
          void addDecoration(decorationOptions[0]?.key || 'mug')
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
  }, [
    addChecklistNote,
    addDecoration,
    addStickyNote,
    canCurrentUserEditDeskItems,
    canRedo,
    canUndo,
    decorationOptions,
    fetchCurrentUserProfile,
    fetchDeskActivity,
    forceSaveAndClearHistory,
    forceSaveInProgress,
    getDeskNameValue,
    handleSelectDesk,
    hasModalOpen,
    historySyncing,
    redoNotesChange,
    selectedDeskId,
    setShowDeskMenu,
    setShowNewNoteMenu,
    setShowProfileMenu,
    setSnapToGrid,
    snapToGrid,
    sortedDesks,
    undoNotesChange
  ])

  const commandPaletteFilteredActions = useMemo(() => {
    const normalizedQuery = commandPaletteQuery.trim().toLowerCase()
    if (!normalizedQuery) return commandPaletteActions

    return commandPaletteActions.filter((action) => {
      const haystack = `${action.label} ${action.description} ${action.keywords || ''}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [commandPaletteActions, commandPaletteQuery])

  const effectiveActiveIndex = commandPaletteFilteredActions.length === 0
    ? 0
    : Math.min(commandPaletteActiveIndex, commandPaletteFilteredActions.length - 1)

  const updateCommandPaletteQuery = (nextQuery) => {
    setCommandPaletteQuery(nextQuery)
    setCommandPaletteActiveIndex(0)
  }

  useEffect(() => {
    function handleCommandPaletteShortcut(e) {
      const isShortcutPressed = e.ctrlKey || e.metaKey
      if (!isShortcutPressed) return

      const normalizedKey = (e.key || '').toLowerCase()
      if (normalizedKey !== 'k') return

      e.preventDefault()
      if (showCommandPalette) {
        closeCommandPalette()
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
  }, [hasModalOpen, showCommandPalette, setShowDeskMenu, setShowNewNoteMenu, setShowProfileMenu])

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

  useEffect(() => {
    if (!showCommandPalette) return

    function handleCommandPaletteKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeCommandPalette()
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
        const selectedAction = commandPaletteFilteredActions[effectiveActiveIndex]
        if (!selectedAction || selectedAction.disabled) return
        closeCommandPalette()
        selectedAction.run()
      }
    }

    window.addEventListener('keydown', handleCommandPaletteKeyDown)
    return () => window.removeEventListener('keydown', handleCommandPaletteKeyDown)
  }, [commandPaletteFilteredActions, effectiveActiveIndex, showCommandPalette])

  return {
    showCommandPalette,
    commandPaletteQuery,
    commandPaletteActiveIndex: effectiveActiveIndex,
    commandPaletteInputRef,
    commandPaletteFilteredActions,
    setCommandPaletteQuery: updateCommandPaletteQuery,
    setCommandPaletteActiveIndex,
    closeCommandPalette,
    executeCommandPaletteAction
  }
}