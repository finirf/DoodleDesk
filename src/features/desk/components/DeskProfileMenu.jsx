import {
  DeskMenuItemButton,
  DeskMenuPanel,
  DeskMenuTriggerButton
} from './DeskUiPrimitives'

export default function DeskProfileMenu({
  profileMenuRef,
  isMobileLayout,
  menuLayerZIndex,
  menuPanelZIndex,
  showProfileMenu,
  setShowProfileMenu,
  setFriendError,
  setFriendMessage,
  setShowDeskMenu,
  setShowNewNoteMenu,
  setShowMoreMenu,
  fetchCurrentUserProfile,
  selectedDeskId,
  fetchDeskActivity,
  pendingFriendRequestCount,
  setProfileTab,
  profileTab,
  preferredNameInput,
  updatePreferredNameInput,
  menuInputStyle,
  savePreferredName,
  preferredNameSaving,
  menuPrimaryActionStyle,
  preferredNameMessage,
  preferredNameError,
  userEmail,
  joinDate,
  desks,
  totalItemsCount,
  profileStatsLoading,
  profileStats,
  fetchUserStats,
  menuSubtleActionStyle,
  menuSectionDividerStyle,
  deleteAccountError,
  handleDeleteAccount,
  friendEmailInput,
  setFriendEmailInput,
  handleSendFriendRequest,
  friendSubmitting,
  friendsLoading,
  fetchFriends,
  friendMessage,
  friendError,
  incomingFriendRequests,
  getProfileDisplayParts,
  respondToFriendRequest,
  menuSuccessActionStyle,
  menuDangerActionStyle,
  friends,
  friendActionLoadingId,
  removeFriend,
  menuNeutralActionStyle,
  outgoingFriendRequests,
  cancelOutgoingFriendRequest,
  activityLoading,
  activityError,
  activityFeed,
  getActivityActionLabel,
  formatDate,
  handleLogout
}) {
  return (
    <div ref={profileMenuRef} style={{ position: 'relative', width: 'auto', flexShrink: 0, zIndex: menuLayerZIndex }}>
      <DeskMenuTriggerButton
        type="button"
        onClick={() => {
          const nextOpen = !showProfileMenu
          setShowProfileMenu(nextOpen)
          setFriendError('')
          setFriendMessage('')
          if (nextOpen) {
            setShowDeskMenu(false)
            setShowNewNoteMenu(false)
            setShowMoreMenu(false)
            fetchCurrentUserProfile()
            if (selectedDeskId) {
              fetchDeskActivity(selectedDeskId)
            }
          }
        }}
        isMobileLayout={isMobileLayout}
        style={isMobileLayout ? { width: 'auto', padding: '8px 10px', whiteSpace: 'nowrap' } : undefined}
      >
        Profile{pendingFriendRequestCount > 0 ? ` (${pendingFriendRequestCount})` : ''} ▼
      </DeskMenuTriggerButton>

      {showProfileMenu && (
        <DeskMenuPanel
          isMobileLayout={isMobileLayout}
          menuPanelZIndex={menuPanelZIndex}
          minWidth={340}
          width={isMobileLayout ? '100%' : 340}
          style={{
            padding: 10,
            maxHeight: isMobileLayout ? 420 : 500,
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <DeskMenuItemButton
              type="button"
              onClick={() => setProfileTab('profile')}
              active={profileTab === 'profile'}
              style={{
                flex: 1,
                padding: '7px 8px',
                fontSize: 13
              }}
            >
              Profile
            </DeskMenuItemButton>
            <DeskMenuItemButton
              type="button"
              onClick={() => setProfileTab('friends')}
              active={profileTab === 'friends'}
              style={{
                flex: 1,
                padding: '7px 8px',
                fontSize: 13
              }}
            >
              Friends{pendingFriendRequestCount > 0 ? ` (${pendingFriendRequestCount})` : ''}
            </DeskMenuItemButton>
            <DeskMenuItemButton
              type="button"
              onClick={() => {
                setProfileTab('activity')
                if (selectedDeskId) {
                  void fetchDeskActivity(selectedDeskId)
                }
              }}
              active={profileTab === 'activity'}
              style={{
                flex: 1,
                padding: '7px 8px',
                fontSize: 13
              }}
            >
              Activity
            </DeskMenuItemButton>
          </div>

          {profileTab === 'profile' ? (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>{userEmail || 'Unknown user'}</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, marginBottom: 4, color: 'var(--ui-ink-muted)' }}>Preferred name</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={preferredNameInput}
                    onChange={(e) => updatePreferredNameInput(e.target.value)}
                    placeholder="How you want your name shown"
                    style={menuInputStyle}
                  />
                  <DeskMenuItemButton
                    type="button"
                    onClick={savePreferredName}
                    disabled={preferredNameSaving}
                    fullWidth={false}
                    style={{
                      ...menuPrimaryActionStyle,
                      opacity: preferredNameSaving ? 0.75 : 1,
                      cursor: preferredNameSaving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {preferredNameSaving ? 'Saving...' : 'Save'}
                  </DeskMenuItemButton>
                </div>
                {preferredNameMessage && (
                  <div style={{ marginTop: 5, color: 'var(--ui-success)', fontSize: 12 }}>{preferredNameMessage}</div>
                )}
                {preferredNameError && (
                  <div style={{ marginTop: 5, color: 'var(--ui-danger)', fontSize: 12 }}>{preferredNameError}</div>
                )}
              </div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>Join date: {joinDate}</div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>Desks currently active: {desks.length}</div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>Items on current desk: {totalItemsCount}</div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                Desks created: {profileStatsLoading ? '...' : profileStats.desks_created}
              </div>
              <div style={{ fontSize: 13, marginBottom: 10 }}>
                Desks deleted: {profileStatsLoading ? '...' : profileStats.desks_deleted}
              </div>

              <DeskMenuItemButton
                type="button"
                onClick={fetchUserStats}
                disabled={profileStatsLoading}
                fullWidth={false}
                style={{
                  ...menuSubtleActionStyle,
                  cursor: profileStatsLoading ? 'not-allowed' : 'pointer',
                  opacity: profileStatsLoading ? 0.7 : 1
                }}
              >
                {profileStatsLoading ? 'Refreshing...' : 'Refresh stats'}
              </DeskMenuItemButton>

              <div style={menuSectionDividerStyle}>
                {deleteAccountError && (
                  <div style={{ marginBottom: 6, color: 'var(--ui-danger)', fontSize: 12, textAlign: 'right' }}>{deleteAccountError}</div>
                )}
                <DeskMenuItemButton
                  type="button"
                  onClick={handleDeleteAccount}
                  danger
                  style={{ display: 'inline-block', width: 'auto' }}
                >
                  Delete account
                </DeskMenuItemButton>
              </div>
            </div>
          ) : profileTab === 'friends' ? (
            <div>
              <form onSubmit={handleSendFriendRequest} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input
                  value={friendEmailInput}
                  onChange={(e) => setFriendEmailInput(e.target.value)}
                  placeholder="friend@email.com"
                  style={menuInputStyle}
                />
                <DeskMenuItemButton
                  type="submit"
                  disabled={friendSubmitting}
                  fullWidth={false}
                  style={{
                    ...menuPrimaryActionStyle,
                    cursor: friendSubmitting ? 'not-allowed' : 'pointer',
                    opacity: friendSubmitting ? 0.75 : 1
                  }}
                >
                  {friendSubmitting ? 'Sending...' : 'Add'}
                </DeskMenuItemButton>
              </form>

              <DeskMenuItemButton
                type="button"
                onClick={fetchFriends}
                disabled={friendsLoading}
                fullWidth={false}
                style={{
                  marginBottom: 10,
                  ...menuSubtleActionStyle,
                  cursor: friendsLoading ? 'not-allowed' : 'pointer',
                  opacity: friendsLoading ? 0.7 : 1
                }}
              >
                {friendsLoading ? 'Refreshing...' : 'Refresh'}
              </DeskMenuItemButton>

              {friendMessage && (
                <div style={{ marginBottom: 8, color: 'var(--ui-success)', fontSize: 12 }}>
                  {friendMessage}
                </div>
              )}
              {friendError && (
                <div style={{ marginBottom: 8, color: 'var(--ui-danger)', fontSize: 12 }}>
                  {friendError}
                </div>
              )}

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Incoming Requests</div>
                {incomingFriendRequests.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.75 }}>No incoming requests</div>
                ) : (
                  incomingFriendRequests.map((request) => {
                    const requestDisplay = getProfileDisplayParts(request)
                    return (
                      <div key={request.id} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--ui-border)' }}>
                        <div style={{ fontSize: 13, marginBottom: 4 }}>
                          {requestDisplay.primary}
                          {requestDisplay.secondary && (
                            <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)' }}>{requestDisplay.secondary}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <DeskMenuItemButton
                            type="button"
                            onClick={() => respondToFriendRequest(request.id, 'accepted')}
                            fullWidth={false}
                            style={menuSuccessActionStyle}
                          >
                            Accept
                          </DeskMenuItemButton>
                          <DeskMenuItemButton
                            type="button"
                            onClick={() => respondToFriendRequest(request.id, 'declined')}
                            fullWidth={false}
                            style={menuDangerActionStyle}
                          >
                            Decline
                          </DeskMenuItemButton>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Friends</div>
                {friends.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.75 }}>No friends yet</div>
                ) : (
                  friends.map((friend) => {
                    const friendDisplay = getProfileDisplayParts(friend)
                    return (
                      <div
                        key={friend.id}
                        style={{
                          marginBottom: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {friendDisplay.primary}
                          {friendDisplay.secondary && (
                            <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)' }}>{friendDisplay.secondary}</div>
                          )}
                        </span>
                        <DeskMenuItemButton
                          type="button"
                          onClick={() => removeFriend(friend.id)}
                          disabled={friendActionLoadingId === friend.id}
                          fullWidth={false}
                          style={{
                            ...menuNeutralActionStyle,
                            cursor: friendActionLoadingId === friend.id ? 'not-allowed' : 'pointer',
                            opacity: friendActionLoadingId === friend.id ? 0.7 : 1,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {friendActionLoadingId === friend.id ? 'Removing...' : 'Remove'}
                        </DeskMenuItemButton>
                      </div>
                    )
                  })
                )}
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Sent Requests</div>
                {outgoingFriendRequests.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.75 }}>No pending sent requests</div>
                ) : (
                  outgoingFriendRequests.map((request) => {
                    const requestDisplay = getProfileDisplayParts(request)
                    return (
                      <div key={request.id} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {requestDisplay.primary}
                          {requestDisplay.secondary && (
                            <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)' }}>{requestDisplay.secondary}</div>
                          )}
                        </span>
                        <DeskMenuItemButton
                          type="button"
                          onClick={() => cancelOutgoingFriendRequest(request.id)}
                          fullWidth={false}
                          style={{ ...menuNeutralActionStyle, whiteSpace: 'nowrap' }}
                        >
                          Cancel
                        </DeskMenuItemButton>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <div>
              {!selectedDeskId ? (
                <div style={{ fontSize: 12, opacity: 0.8 }}>Select a desk to view activity.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Recent activity</div>
                    <DeskMenuItemButton
                      type="button"
                      onClick={() => fetchDeskActivity(selectedDeskId)}
                      disabled={activityLoading}
                      fullWidth={false}
                      style={{
                        ...menuSubtleActionStyle,
                        cursor: activityLoading ? 'not-allowed' : 'pointer',
                        opacity: activityLoading ? 0.7 : 1
                      }}
                    >
                      {activityLoading ? 'Refreshing...' : 'Refresh'}
                    </DeskMenuItemButton>
                  </div>

                  {activityError && (
                    <div style={{ marginBottom: 8, color: 'var(--ui-danger)', fontSize: 12 }}>
                      {activityError}
                    </div>
                  )}

                  {activityFeed.length === 0 ? (
                    <div style={{ fontSize: 12, opacity: 0.75 }}>No desk activity yet.</div>
                  ) : (
                    <div>
                      {activityFeed.map((entry) => (
                        <div key={entry.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--ui-border)' }}>
                          <div style={{ fontSize: 13, color: 'var(--ui-ink)' }}>{getActivityActionLabel(entry)}</div>
                          <div style={{ marginTop: 2, fontSize: 11, color: 'var(--ui-ink-soft)' }}>{formatDate(entry.created_at)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div style={menuSectionDividerStyle}>
            <a
              href="/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '7px 2px',
                color: 'var(--ui-ink-soft)',
                fontSize: 13,
                textDecoration: 'underline',
                marginBottom: 4
              }}
            >
              Privacy Policy
            </a>
            <DeskMenuItemButton
              type="button"
              onClick={handleLogout}
              danger
              style={{ padding: '7px 2px', background: 'transparent', borderColor: 'transparent' }}
            >
              Logout
            </DeskMenuItemButton>
          </div>
        </DeskMenuPanel>
      )}
    </div>
  )
}
