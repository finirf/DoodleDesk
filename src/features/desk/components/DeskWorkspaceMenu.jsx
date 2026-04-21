import {
  DeskMenuItemButton,
  DeskMenuPanel,
  DeskMenuTriggerButton
} from './DeskUiPrimitives'

export default function DeskWorkspaceMenu({
  deskMenuRef,
  isMobileLayout,
  menuLayerZIndex,
  menuPanelZIndex,
  showDeskMenu,
  setShowDeskMenu,
  setShowProfileMenu,
  setShowNewNoteMenu,
  setShowMoreMenu,
  currentDeskName,
  currentDesk,
  isCurrentDeskOwner,
  canShowManageMembers,
  desks,
  deskShelves,
  renderDeskShelfTree,
  renderShelfOrganizerPanel,
  openCreateDeskDialog,
  openRenameDeskDialog,
  deleteCurrentDesk,
  openDeskMembersDialog,
  leaveCurrentDesk,
  deskMenuMessage,
  deskMenuError
}) {
  return (
    <div ref={deskMenuRef} style={{ position: 'relative', width: 'auto', flexShrink: 0, zIndex: 1100 }}>
      <DeskMenuTriggerButton
        onClick={() => {
          const nextOpen = !showDeskMenu
          setShowDeskMenu(nextOpen)
          if (nextOpen) {
            setShowProfileMenu(false)
            setShowNewNoteMenu(false)
            setShowMoreMenu(false)
          }
        }}
        isMobileLayout={isMobileLayout}
        style={isMobileLayout ? { width: 'auto', padding: '8px 10px', whiteSpace: 'nowrap' } : undefined}
      >
        {currentDesk ? currentDeskName : 'Select Desk'} ▼
      </DeskMenuTriggerButton>

      {showDeskMenu && (
        <DeskMenuPanel
          isMobileLayout={isMobileLayout}
          menuPanelZIndex={menuPanelZIndex}
        >
          <div style={{ maxHeight: 180, overflowY: 'auto', borderBottom: '1px solid var(--ui-border)', marginBottom: 6 }}>
            {desks.length === 0 && deskShelves.length === 0 ? (
              <div style={{ padding: '8px 10px', fontSize: 13, opacity: 0.75 }}>No desks yet</div>
            ) : (
              renderDeskShelfTree()
            )}
            {renderShelfOrganizerPanel()}
          </div>

          <DeskMenuItemButton
            type="button"
            onClick={openCreateDeskDialog}
            strong
          >
            + New Desk
          </DeskMenuItemButton>

          {currentDesk && isCurrentDeskOwner && (
            <DeskMenuItemButton
              type="button"
              onClick={openRenameDeskDialog}
            >
              Rename Desk
            </DeskMenuItemButton>
          )}

          {currentDesk && isCurrentDeskOwner && (
            <DeskMenuItemButton
              type="button"
              onClick={deleteCurrentDesk}
              danger
            >
              Delete Desk
            </DeskMenuItemButton>
          )}

          {currentDesk && canShowManageMembers && (
            <DeskMenuItemButton
              type="button"
              onClick={openDeskMembersDialog}
            >
              Manage Members
            </DeskMenuItemButton>
          )}

          {currentDesk && !isCurrentDeskOwner && (
            <DeskMenuItemButton
              type="button"
              onClick={leaveCurrentDesk}
              danger
            >
              Leave Desk
            </DeskMenuItemButton>
          )}

          {(deskMenuMessage || deskMenuError) && (
            <div style={{ padding: '6px 10px', fontSize: 12, color: deskMenuError ? 'var(--ui-danger)' : 'var(--ui-success)' }}>
              {deskMenuError || deskMenuMessage}
            </div>
          )}
        </DeskMenuPanel>
      )}
    </div>
  )
}
