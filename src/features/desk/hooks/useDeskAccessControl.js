import { useMemo } from 'react'

/**
 * useDeskAccessControl
 *
 * Derives desk access control flags based on current user role, desk ownership,
 * and membership permissions. Centralizes authorization logic.
 */
export default function useDeskAccessControl({
  desks,
  selectedDeskId,
  userId,
  selectedDeskMemberRole,
  selectedDeskMemberRoleLoading
}) {
  return useMemo(() => {
    const currentDesk = desks.find((desk) => desk.id === selectedDeskId) || null
    const isCurrentDeskOwner = Boolean(currentDesk && currentDesk.user_id === userId)
    const canCurrentUserEditDeskItems = Boolean(
      currentDesk
      && (
        currentDesk.user_id === userId
        || (!selectedDeskMemberRoleLoading && selectedDeskMemberRole === 'editor')
      )
    )

    return {
      currentDesk,
      isCurrentDeskOwner,
      canCurrentUserEditDeskItems
    }
  }, [desks, selectedDeskId, userId, selectedDeskMemberRole, selectedDeskMemberRoleLoading])
}
