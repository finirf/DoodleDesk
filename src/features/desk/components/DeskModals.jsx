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
  isCurrentDeskOwner,
  closeDeskMembersDialog,
  resizeOverlay,
  ResizeIconComponent,
  modalOverlayStyle,
  modalCardStyle,
  modalTitleStyle,
  modalActionsStyle,
  modalSecondaryButtonStyle,
  modalPrimaryButtonStyle,
  modalDangerButtonStyle
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

  return (
    <>
      {pendingDeleteId && (
        <div
          style={{
            ...modalOverlayStyle,
            zIndex: 1000
          }}
        >
          <div
            style={{
              ...modalCardStyle,
              width: 280,
              textAlign: 'center'
            }}
          >
            <div style={{ marginBottom: 12, color: '#222' }}>Delete this note?</div>
            <button
              type="button"
              onClick={confirmDeleteNote}
              style={{
                ...modalDangerButtonStyle,
                marginRight: 8,
              }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              style={modalSecondaryButtonStyle}
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
        >
          <div
            style={{
              ...modalCardStyle,
              width: 320,
              textAlign: 'center'
            }}
          >
            <div style={{ ...modalTitleStyle, marginBottom: 12 }}>{confirmDialog.title || 'Confirm Action'}</div>
            <div style={{ marginBottom: 14, fontSize: 13, color: '#333' }}>{confirmDialog.message}</div>
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
        >
          <form
            onSubmit={submitDeleteAccountDialog}
            style={{
              ...modalCardStyle,
              width: 360
            }}
          >
            <div style={modalTitleStyle}>Delete Account</div>
            <div style={{ marginBottom: 10, fontSize: 13, color: '#333' }}>
              This permanently deletes your DoodleDesk profile data, desks, shelves, and friend data. This action cannot be undone.
            </div>
            <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>Type DELETE to confirm.</div>
            <input
              value={deleteAccountDialog.confirmationText}
              onChange={(e) => {
                if (deleteAccountError) setDeleteAccountError('')
                setDeleteAccountDialog((prev) => ({ ...prev, confirmationText: e.target.value }))
              }}
              autoFocus
              placeholder="DELETE"
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
        >
          <form
            onSubmit={submitDeskNameDialog}
            style={{
              ...modalCardStyle,
              width: 320,
            }}
          >
            <div style={modalTitleStyle}>
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
                    style={{
                      border: '1px solid #e3e3e3',
                      borderRadius: 6,
                      padding: 8,
                      maxHeight: 140,
                      overflowY: 'auto',
                      background: '#fafafa'
                    }}
                  >
                    <div style={{ fontSize: 12, marginBottom: 6, color: '#555' }}>Invite friends:</div>
                    {friends.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#777' }}>No friends available to invite yet.</div>
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
              <div style={{ color: '#d32f2f', fontSize: 12, marginBottom: 10 }}>
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
              <div style={{ color: 'green', fontSize: 12, marginBottom: 8 }}>{deskMembersMessage}</div>
            )}
            {deskMembersError && (
              <div style={{ color: '#d32f2f', fontSize: 12, marginBottom: 8 }}>{deskMembersError}</div>
            )}
            {deskMemberRequestsError && (
              <div style={{ color: '#d32f2f', fontSize: 12, marginBottom: 8 }}>{deskMemberRequestsError}</div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Current members</div>
              {deskMembersLoading ? (
                <div style={{ fontSize: 12, color: '#777' }}>Loading members...</div>
              ) : deskMembers.length === 0 ? (
                <div style={{ fontSize: 12, color: '#777' }}>No members yet</div>
              ) : (
                sortedDeskMembers.map((member) => {
                  const isRemoving = deskMemberActionLoadingId === `remove:${member.user_id}`
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
                          <div style={{ fontSize: 11, color: '#666' }}>Desk owner</div>
                        )}
                        {memberDisplay.secondary && (
                          <div style={{ fontSize: 11, color: '#666' }}>{memberDisplay.secondary}</div>
                        )}
                      </span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => sendFriendRequestToDeskMember(member.user_id, member.email)}
                            disabled={isFriend || hasOutgoingFriendRequest || hasIncomingFriendRequest || isFriendRequesting}
                            style={{
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 8px',
                              background: isFriend || hasOutgoingFriendRequest || hasIncomingFriendRequest ? '#eee' : '#4285F4',
                              color: isFriend || hasOutgoingFriendRequest || hasIncomingFriendRequest ? '#777' : '#fff',
                              fontSize: 12,
                              cursor: isFriend || hasOutgoingFriendRequest || hasIncomingFriendRequest || isFriendRequesting ? 'not-allowed' : 'pointer',
                              opacity: isFriendRequesting ? 0.7 : 1,
                              whiteSpace: 'nowrap'
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
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 8px',
                              background: '#eee',
                              color: '#333',
                              fontSize: 12,
                              cursor: isRemoving ? 'not-allowed' : 'pointer',
                              opacity: isRemoving ? 0.7 : 1,
                              whiteSpace: 'nowrap'
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
                <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Pending member requests</div>
                {deskMemberRequestsLoading ? (
                  <div style={{ fontSize: 12, color: '#777' }}>Loading requests...</div>
                ) : deskMemberRequests.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#777' }}>No pending requests</div>
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
                      <div key={request.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: 12, marginBottom: 6, color: '#333' }}>
                          {requesterDisplay.primary} requested adding {targetDisplay.primary}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => respondDeskMemberRequest(request, 'approved')}
                            disabled={isApproving || isDeclining}
                            style={{
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 8px',
                              background: '#4285F4',
                              color: '#fff',
                              fontSize: 12,
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
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 8px',
                              background: '#eee',
                              color: '#333',
                              fontSize: 12,
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
              <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                {isCurrentDeskOwner ? 'Add friends' : 'Request to add your friends'}
              </div>
              {sortedInvitableFriends.length === 0 ? (
                <div style={{ fontSize: 12, color: '#777' }}>No friends available</div>
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
                          <div style={{ fontSize: 11, color: '#666' }}>{friendDisplay.secondary}</div>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => (isCurrentDeskOwner ? addDeskMember(friend.id) : requestDeskMemberAdd(friend.id))}
                        disabled={alreadyMember || hasPendingRequest || isAdding}
                        style={{
                          border: 'none',
                          borderRadius: 4,
                          padding: '4px 8px',
                          background: alreadyMember || hasPendingRequest ? '#eee' : '#4285F4',
                          color: alreadyMember || hasPendingRequest ? '#777' : '#fff',
                          fontSize: 12,
                          cursor: alreadyMember || hasPendingRequest || isAdding ? 'not-allowed' : 'pointer',
                          opacity: isAdding ? 0.7 : 1,
                          whiteSpace: 'nowrap'
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
          <ResizeIconComponent size={14} color="#fff" />
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
    </>
  )
}
