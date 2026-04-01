import DeskTutorialModal from './DeskTutorialModal'

export default function DeskModals({
  pendingDeleteId,
  confirmDeleteNote,
  setPendingDeleteId,
  confirmDialog,
  confirmDialogLoading,
  confirmDialogAction,
  closeConfirmDialog,
  deleteAccountDialog,
  submitDeleteAccountDialog,
  deleteAccountError,
  setDeleteAccountError,
  setDeleteAccountDialog,
  deleteAccountDeleting,
  deleteAccountConfirmationMatches,
  closeDeleteAccountDialog,
  deskNameDialog,
  submitDeskNameDialog,
  deskNameError,
  setDeskNameError,
  setDeskNameDialog,
  friends,
  getProfileDisplayParts,
  toggleInvitedFriend,
  closeDeskNameDialog,
  deskNameSaving,
  deskMembersDialogOpen,
  deskMembersMessage,
  deskMembersError,
  deskMembersLoading,
  deskMembers,
  deskMemberRequests,
  deskMemberRequestsLoading,
  deskMemberRequestsError,
  deskMemberActionLoadingId,
  removeDeskMember,
  addDeskMember,
  sendFriendRequestToDeskMember,
  currentUserId,
  friendIds,
  outgoingFriendRequestUserIds,
  incomingFriendRequestUserIds,
  requestDeskMemberAdd,
  respondDeskMemberRequest,
  updateDeskMemberRole,
  isCurrentDeskOwner,
  closeDeskMembersDialog,
  resizeOverlay,
  ResizeIconComponent: _ResizeIconComponent,
  modalOverlayStyle,
  modalCardStyle,
  modalTitleStyle,
  modalActionsStyle,
  modalSecondaryButtonStyle,
  modalPrimaryButtonStyle,
  modalDangerButtonStyle,
  shelfRenameDialog,
  setShelfRenameDialog,
  submitShelfRenameDialog,
  closeShelfRenameDialog,
  shelfActionError,
  setShelfActionError,
  tutorialDialogOpen,
  closeTutorialDialog
}) {
  const sortedDeskMembers = [...deskMembers].sort((left, right) => {
    const getPriority = (member) => {
      if (member.is_owner) return 0
      if (member.user_id === currentUserId) return 1
      if (friendIds.includes(member.user_id)) return 2
      return 3
    }

    const priorityDifference = getPriority(left) - getPriority(right)
    if (priorityDifference !== 0) return priorityDifference

    const leftName = (left.preferred_name || left.email || '').trim().toLowerCase()
    const rightName = (right.preferred_name || right.email || '').trim().toLowerCase()
    return leftName.localeCompare(rightName)
  })

  const deskMemberUserIds = new Set(deskMembers.map((member) => member.user_id).filter(Boolean))
  const sortedInvitableFriends = friends
    .filter((friend) => friend.id !== currentUserId)
    .sort((left, right) => {
      const leftAlreadyAdded = deskMemberUserIds.has(left.id)
      const rightAlreadyAdded = deskMemberUserIds.has(right.id)
      if (leftAlreadyAdded && !rightAlreadyAdded) return -1
      if (!leftAlreadyAdded && rightAlreadyAdded) return 1

      const leftName = (left.preferred_name || left.email || '').trim().toLowerCase()
      const rightName = (right.preferred_name || right.email || '').trim().toLowerCase()
      return leftName.localeCompare(rightName)
    })

  const resizeOverlayIcon = _ResizeIconComponent({ size: 14, color: '#fff' })
  const modalBodyTextStyle = { marginBottom: 10, fontSize: 13, color: 'var(--ui-ink-muted)' }
  const modalHintTextStyle = { marginBottom: 8, fontSize: 12, color: 'var(--ui-ink-soft)' }
  const modalInputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--ui-border-strong)',
    background: 'var(--ui-surface)',
    color: 'var(--ui-ink)',
    marginBottom: 12,
    fontSize: 14
  }
  const panelContainerStyle = {
    border: '1px solid var(--ui-border)',
    borderRadius: 8,
    padding: 8,
    maxHeight: 140,
    overflowY: 'auto',
    background: 'var(--ui-surface-soft)'
  }
  const neutralInfoTextStyle = { fontSize: 12, color: 'var(--ui-ink-soft)' }
  const subtleLabelTextStyle = { fontSize: 12, color: 'var(--ui-ink-muted)', marginBottom: 6 }
  const errorMessageStyle = { color: 'var(--ui-danger)', fontSize: 12, marginBottom: 8 }
  const successMessageStyle = { color: 'var(--ui-success)', fontSize: 12, marginBottom: 8 }
  const actionSelectStyle = {
    border: '1px solid var(--ui-border-strong)',
    borderRadius: 8,
    padding: '3px 6px',
    fontSize: 12,
    background: 'var(--ui-surface)',
    color: 'var(--ui-ink-muted)'
  }
  const modalPrimaryActionStyle = {
    border: '1px solid var(--ui-primary-strong)',
    borderRadius: 8,
    padding: '4px 8px',
    background: 'var(--ui-primary)',
    color: '#fff',
    fontSize: 12,
    whiteSpace: 'nowrap'
  }
  const modalNeutralActionStyle = {
    border: '1px solid var(--ui-border)',
    borderRadius: 8,
    padding: '4px 8px',
    background: 'var(--ui-surface-soft)',
    color: 'var(--ui-ink-muted)',
    fontSize: 12,
    whiteSpace: 'nowrap'
  }

  return (
    <>
      {pendingDeleteId && (
        <div
          style={{
            ...modalOverlayStyle,
            zIndex: 1000
          }}
          role="alertdialog"
          aria-labelledby="delete-note-title"
          aria-describedby="delete-note-description"
        >
          <div
            style={{
              ...modalCardStyle,
              width: 280,
              textAlign: 'center'
            }}
          >
            <div id="delete-note-title" style={{ marginBottom: 12, color: 'var(--ui-ink)', fontWeight: 500 }}>Delete this note?</div>
            <div id="delete-note-description" style={{ fontSize: 12, color: 'var(--ui-ink-soft)', marginBottom: 16 }}>This action cannot be undone.</div>
            <button
              type="button"
              onClick={confirmDeleteNote}
              style={{
                ...modalDangerButtonStyle,
                marginRight: 8,
              }}
              aria-label="Confirm delete note"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              style={modalSecondaryButtonStyle}
              aria-label="Cancel delete note"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div
          style={{
            ...modalOverlayStyle,
            zIndex: 1100
          }}
          role="alertdialog"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
        >
          <div
            style={{
              ...modalCardStyle,
              width: 320,
              textAlign: 'center'
            }}
          >
            <div id="confirm-dialog-title" style={{ ...modalTitleStyle, marginBottom: 12 }}>{confirmDialog.title || 'Confirm Action'}</div>
            <div id="confirm-dialog-message" style={{ ...modalBodyTextStyle, marginBottom: 14 }}>{confirmDialog.message}</div>
            <button
              type="button"
              onClick={confirmDialogAction}
              disabled={confirmDialogLoading}
              style={{
                ...(confirmDialog.tone === 'danger' ? modalDangerButtonStyle : modalPrimaryButtonStyle),
                marginRight: 8,
                cursor: confirmDialogLoading ? 'not-allowed' : 'pointer',
                opacity: confirmDialogLoading ? 0.7 : 1
              }}
              aria-label={confirmDialog.confirmLabel}
              aria-busy={confirmDialogLoading}
            >
              {confirmDialogLoading ? 'Working...' : confirmDialog.confirmLabel}
            </button>
            <button
              type="button"
              onClick={closeConfirmDialog}
              disabled={confirmDialogLoading}
              style={{
                ...modalSecondaryButtonStyle,
                cursor: confirmDialogLoading ? 'not-allowed' : 'pointer',
                opacity: confirmDialogLoading ? 0.7 : 1
              }}
              aria-label="Cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteAccountDialog.isOpen && (
        <div
          style={{
            ...modalOverlayStyle,
            zIndex: 1120
          }}
          role="alertdialog"
          aria-labelledby="delete-account-title"
          aria-describedby="delete-account-description"
        >
          <form
            onSubmit={submitDeleteAccountDialog}
            style={{
              ...modalCardStyle,
              width: 360
            }}
          >
            <div id="delete-account-title" style={modalTitleStyle}>Delete Account</div>
            <div id="delete-account-description" style={modalBodyTextStyle}>
              This permanently deletes your DoodleDesk profile data, desks, shelves, and friend data. This action cannot be undone.
            </div>
            <div style={modalHintTextStyle}>Type DELETE to confirm.</div>
            <input
              value={deleteAccountDialog.confirmationText}
              onChange={(e) => {
                if (deleteAccountError) setDeleteAccountError('')
                setDeleteAccountDialog((prev) => ({ ...prev, confirmationText: e.target.value }))
              }}
              autoFocus
              placeholder="DELETE"
              style={modalInputStyle}
              aria-label="Type DELETE to confirm account deletion"
            />

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={closeDeleteAccountDialog}
                disabled={deleteAccountDeleting}
                style={{
                  ...modalSecondaryButtonStyle,
                  marginRight: 8,
                  cursor: deleteAccountDeleting ? 'not-allowed' : 'pointer',
                  opacity: deleteAccountDeleting ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleteAccountDeleting || !deleteAccountConfirmationMatches}
                style={{
                  ...modalDangerButtonStyle,
                  cursor: deleteAccountDeleting || !deleteAccountConfirmationMatches ? 'not-allowed' : 'pointer',
                  opacity: deleteAccountDeleting || !deleteAccountConfirmationMatches ? 0.7 : 1
                }}
              >
                {deleteAccountDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deskNameDialog.isOpen && (
        <div
          style={{
            ...modalOverlayStyle,
            zIndex: 1200
          }}
          role="dialog"
          aria-labelledby="desk-name-dialog-title"
        >
          <form
            onSubmit={submitDeskNameDialog}
            style={{
              ...modalCardStyle,
              width: 320,
            }}
          >
            <div id="desk-name-dialog-title" style={modalTitleStyle}>
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
              style={modalInputStyle}
              aria-label="Desk name"
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
                    style={panelContainerStyle}
                  >
                    <div style={subtleLabelTextStyle}>Invite friends:</div>
                    {friends.length === 0 ? (
                      <div style={neutralInfoTextStyle}>No friends available to invite yet.</div>
                    ) : (
                      friends.map((friend) => {
                        const checked = (deskNameDialog.invitedFriendIds || []).includes(friend.id)
                        const friendDisplay = getProfileDisplayParts(friend)
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
                            <span>{friendDisplay.primary}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {deskNameError && (
              <div style={{ ...errorMessageStyle, marginBottom: 10 }}>
                {deskNameError}
              </div>
            )}

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={closeDeskNameDialog}
                disabled={deskNameSaving}
                style={{
                  ...modalSecondaryButtonStyle,
                  marginRight: 8,
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
                  ...modalPrimaryButtonStyle,
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

      {shelfRenameDialog.isOpen && (
        <div
          style={{
            ...modalOverlayStyle,
            zIndex: 1210
          }}
          role="dialog"
          aria-labelledby="shelf-rename-dialog-title"
        >
          <form
            onSubmit={submitShelfRenameDialog}
            style={{
              ...modalCardStyle,
              width: 320,
            }}
          >
            <div id="shelf-rename-dialog-title" style={modalTitleStyle}>
              Rename Shelf
            </div>

            <input
              value={shelfRenameDialog.value}
              onChange={(e) => {
                if (shelfActionError) setShelfActionError('')
                setShelfRenameDialog((prev) => ({ ...prev, value: e.target.value }))
              }}
              autoFocus
              placeholder="Shelf name"
              style={modalInputStyle}
              aria-label="Shelf name"
            />

            {shelfActionError && (
              <div style={{ ...errorMessageStyle, marginBottom: 10 }}>
                {shelfActionError}
              </div>
            )}

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={closeShelfRenameDialog}
                style={{
                  ...modalSecondaryButtonStyle,
                  marginRight: 8
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={modalPrimaryButtonStyle}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {deskMembersDialogOpen && (
        <div
          style={{
            ...modalOverlayStyle,
            zIndex: 1250
          }}
        >
          <div
            style={{
              ...modalCardStyle,
              width: 360,
              maxHeight: '75vh',
              overflowY: 'auto'
            }}
          >
            <div style={modalTitleStyle}>Manage Desk Members</div>

            {deskMembersMessage && (
              <div style={successMessageStyle}>{deskMembersMessage}</div>
            )}
            {deskMembersError && (
              <div style={errorMessageStyle}>{deskMembersError}</div>
            )}
            {deskMemberRequestsError && (
              <div style={errorMessageStyle}>{deskMemberRequestsError}</div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div style={subtleLabelTextStyle}>Current members</div>
              {deskMembersLoading ? (
                <div style={neutralInfoTextStyle}>Loading members...</div>
              ) : deskMembers.length === 0 ? (
                <div style={neutralInfoTextStyle}>No members yet</div>
              ) : (
                sortedDeskMembers.map((member) => {
                  const isRemoving = deskMemberActionLoadingId === `remove:${member.user_id}`
                  const isRoleUpdating = deskMemberActionLoadingId === `role:${member.user_id}`
                  const isOwnerRow = Boolean(member.is_owner)
                  const isSelf = member.user_id === currentUserId
                  const isFriend = friendIds.includes(member.user_id)
                  const hasOutgoingFriendRequest = outgoingFriendRequestUserIds.includes(member.user_id)
                  const hasIncomingFriendRequest = incomingFriendRequestUserIds.includes(member.user_id)
                  const isFriendRequesting = deskMemberActionLoadingId === `friend-request:${member.user_id}`
                  const memberDisplay = getProfileDisplayParts(member)
                  return (
                    <div
                      key={member.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 6
                      }}
                    >
                      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {memberDisplay.primary}
                        {isOwnerRow && (
                          <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)' }}>Desk owner</div>
                        )}
                        {!isOwnerRow && (
                          <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)' }}>
                            {member.role === 'viewer' ? 'Viewer (read-only)' : 'Editor'}
                          </div>
                        )}
                        {memberDisplay.secondary && (
                          <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)' }}>{memberDisplay.secondary}</div>
                        )}
                      </span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {isCurrentDeskOwner && !isOwnerRow && (
                          <select
                            value={member.role === 'viewer' ? 'viewer' : 'editor'}
                            onChange={(e) => updateDeskMemberRole(member.user_id, e.target.value)}
                            disabled={isRoleUpdating}
                            style={{
                              ...actionSelectStyle,
                              cursor: isRoleUpdating ? 'not-allowed' : 'pointer',
                              opacity: isRoleUpdating ? 0.7 : 1
                            }}
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        )}

                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => sendFriendRequestToDeskMember(member.user_id, member.email)}
                            disabled={isFriend || hasOutgoingFriendRequest || hasIncomingFriendRequest || isFriendRequesting}
                            style={{
                              ...(isFriend || hasOutgoingFriendRequest || hasIncomingFriendRequest ? modalNeutralActionStyle : modalPrimaryActionStyle),
                              cursor: isFriend || hasOutgoingFriendRequest || hasIncomingFriendRequest || isFriendRequesting ? 'not-allowed' : 'pointer',
                              opacity: isFriendRequesting ? 0.7 : 1
                            }}
                          >
                            {isFriend
                              ? 'Friend'
                              : hasOutgoingFriendRequest
                                ? 'Requested'
                                : hasIncomingFriendRequest
                                  ? 'Respond'
                                  : isFriendRequesting
                                    ? 'Sending...'
                                    : 'Add Friend'}
                          </button>
                        )}

                        {isCurrentDeskOwner && !isOwnerRow && (
                          <button
                            type="button"
                            onClick={() => removeDeskMember(member.user_id)}
                            disabled={isRemoving}
                            style={{
                              ...modalNeutralActionStyle,
                              cursor: isRemoving ? 'not-allowed' : 'pointer',
                              opacity: isRemoving ? 0.7 : 1
                            }}
                          >
                            {isRemoving ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {isCurrentDeskOwner && (
              <div style={{ marginBottom: 12 }}>
                <div style={subtleLabelTextStyle}>Pending member requests</div>
                {deskMemberRequestsLoading ? (
                  <div style={neutralInfoTextStyle}>Loading requests...</div>
                ) : deskMemberRequests.length === 0 ? (
                  <div style={neutralInfoTextStyle}>No pending requests</div>
                ) : (
                  deskMemberRequests.map((request) => {
                    const requester = {
                      email: request.requester_email,
                      preferred_name: request.requester_preferred_name
                    }
                    const targetFriend = {
                      email: request.target_friend_email,
                      preferred_name: request.target_friend_preferred_name
                    }
                    const requesterDisplay = getProfileDisplayParts(requester)
                    const targetDisplay = getProfileDisplayParts(targetFriend)
                    const isApproving = deskMemberActionLoadingId === `approved:${request.id}`
                    const isDeclining = deskMemberActionLoadingId === `declined:${request.id}`

                    return (
                      <div key={request.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--ui-border)' }}>
                        <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--ui-ink-muted)' }}>
                          {requesterDisplay.primary} requested adding {targetDisplay.primary}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => respondDeskMemberRequest(request, 'approved')}
                            disabled={isApproving || isDeclining}
                            style={{
                              ...modalPrimaryActionStyle,
                              cursor: isApproving || isDeclining ? 'not-allowed' : 'pointer',
                              opacity: isApproving || isDeclining ? 0.7 : 1
                            }}
                          >
                            {isApproving ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => respondDeskMemberRequest(request, 'declined')}
                            disabled={isApproving || isDeclining}
                            style={{
                              ...modalNeutralActionStyle,
                              cursor: isApproving || isDeclining ? 'not-allowed' : 'pointer',
                              opacity: isApproving || isDeclining ? 0.7 : 1
                            }}
                          >
                            {isDeclining ? 'Declining...' : 'Decline'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div style={subtleLabelTextStyle}>
                {isCurrentDeskOwner ? 'Add friends' : 'Request to add your friends'}
              </div>
              {sortedInvitableFriends.length === 0 ? (
                <div style={neutralInfoTextStyle}>No friends available</div>
              ) : (
                sortedInvitableFriends.map((friend) => {
                  const alreadyMember = deskMembers.some((member) => member.user_id === friend.id)
                  const hasPendingRequest = deskMemberRequests.some((request) => request.target_friend_id === friend.id && request.status === 'pending')
                  const isAdding = deskMemberActionLoadingId === `add:${friend.id}` || deskMemberActionLoadingId === `request:${friend.id}`
                  const friendDisplay = getProfileDisplayParts(friend)
                  return (
                    <div
                      key={friend.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 6
                      }}
                    >
                      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {friendDisplay.primary}
                        {friendDisplay.secondary && (
                          <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)' }}>{friendDisplay.secondary}</div>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => (isCurrentDeskOwner ? addDeskMember(friend.id) : requestDeskMemberAdd(friend.id))}
                        disabled={alreadyMember || hasPendingRequest || isAdding}
                        style={{
                          ...(alreadyMember || hasPendingRequest ? modalNeutralActionStyle : modalPrimaryActionStyle),
                          cursor: alreadyMember || hasPendingRequest || isAdding ? 'not-allowed' : 'pointer',
                          opacity: isAdding ? 0.7 : 1
                        }}
                      >
                        {alreadyMember
                          ? 'Added'
                          : hasPendingRequest
                            ? 'Requested'
                            : isAdding
                              ? (isCurrentDeskOwner ? 'Adding...' : 'Requesting...')
                              : (isCurrentDeskOwner ? 'Add' : 'Request')}
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={closeDeskMembersDialog}
                style={modalSecondaryButtonStyle}
              >
                Close
              </button>
            </div>
          </div>
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
          {resizeOverlayIcon}
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

      <DeskTutorialModal
        isOpen={tutorialDialogOpen}
        onClose={closeTutorialDialog}
      />
    </>
  )
}
