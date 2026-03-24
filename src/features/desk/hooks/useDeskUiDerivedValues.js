import { useMemo } from 'react'

export default function useDeskUiDerivedValues({
  desks,
  getDeskNameValue,
  viewportWidth,
  currentDesk,
  userId,
  selectedDeskMemberRole,
  selectedDeskMemberRoleLoading,
  incomingFriendRequests,
  notes,
  userCreatedAt,
  formatDate,
  getDeskEffectiveShelfId,
  getCustomShelfOptions,
  historySyncing,
  isSavingEdit,
  autoSaveStatus
}) {
  const sortedDesks = useMemo(() => {
    return [...desks].sort((left, right) => getDeskNameValue(left).localeCompare(getDeskNameValue(right)))
  }, [desks, getDeskNameValue])

  const desksByShelfId = useMemo(() => {
    return sortedDesks.reduce((accumulator, desk) => {
      const shelfId = getDeskEffectiveShelfId(desk)
      if (!accumulator[shelfId]) accumulator[shelfId] = []
      accumulator[shelfId].push(desk)
      return accumulator
    }, {})
  }, [sortedDesks, getDeskEffectiveShelfId])

  const customShelfOptions = useMemo(() => getCustomShelfOptions(), [getCustomShelfOptions])

  const isMobileLayout = viewportWidth <= 820
  const isCompactMobileLayout = viewportWidth <= 560
  const isCurrentUserViewer = Boolean(
    currentDesk
    && currentDesk.user_id !== userId
    && !selectedDeskMemberRoleLoading
    && selectedDeskMemberRole === 'viewer'
  )
  const pendingFriendRequestCount = incomingFriendRequests.length
  const totalItemsCount = notes.length
  const joinDate = formatDate(userCreatedAt)
  const topOverlayTop = isMobileLayout ? 12 : 20
  const topMenuTop = isMobileLayout ? (isCompactMobileLayout ? 64 : 12) : 20
  const newNoteDesktopTop = topMenuTop
  const mobileNoteMaxWidth = Math.max(180, viewportWidth - 32)

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

  return {
    sortedDesks,
    isMobileLayout,
    isCurrentUserViewer,
    pendingFriendRequestCount,
    totalItemsCount,
    joinDate,
    desksByShelfId,
    customShelfOptions,
    topOverlayTop,
    topMenuTop,
    newNoteDesktopTop,
    mobileNoteMaxWidth,
    autoSaveLabel,
    autoSaveBadgeStyle,
    menuInputStyle,
    menuCompactInputStyle,
    menuSelectStyle,
    menuPrimaryActionStyle,
    menuSubtleActionStyle,
    menuSuccessActionStyle,
    menuDangerActionStyle,
    menuNeutralActionStyle,
    menuSectionDividerStyle
  }
}
