import {
  DeskMenuItemButton,
  DeskMenuPanel,
  DeskMenuTriggerButton
} from './DeskUiPrimitives'

export default function DeskMoreMenu({
  moreMenuRef,
  isMobileLayout,
  menuLayerZIndex,
  menuPanelZIndex,
  showMoreMenu,
  setShowMoreMenu,
  setShowDeskMenu,
  setShowProfileMenu,
  setShowNewNoteMenu,
  currentDesk,
  isCurrentDeskOwner,
  canCurrentUserEditDeskItems,
  setCurrentDeskBackground,
  backgroundMode,
  customBackgroundInput,
  setCustomBackgroundInput,
  menuCompactInputStyle,
  setCurrentDeskCustomBackground,
  menuPrimaryActionStyle,
  exportCurrentDesk,
  importDeskInputRef,
  handleImportDeskFileSelection,
  snapToGrid,
  setSnapToGrid
}) {
  return (
    <div ref={moreMenuRef} style={{ position: 'relative', width: isMobileLayout ? '100%' : 'auto', zIndex: menuLayerZIndex }}>
      <DeskMenuTriggerButton
        type="button"
        onClick={() => {
          const nextOpen = !showMoreMenu
          setShowMoreMenu(nextOpen)
          if (nextOpen) {
            setShowDeskMenu(false)
            setShowProfileMenu(false)
            setShowNewNoteMenu(false)
          }
        }}
        isMobileLayout={isMobileLayout}
      >
        More ▼
      </DeskMenuTriggerButton>

      {showMoreMenu && (
        <DeskMenuPanel
          isMobileLayout={isMobileLayout}
          menuPanelZIndex={menuPanelZIndex}
        >
          {/* Advanced Options Section */}
          {currentDesk && canCurrentUserEditDeskItems && (
            <>
              <div style={{ padding: '7px 10px', fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                Options
              </div>
              <DeskMenuItemButton
                type="button"
                onClick={() => setSnapToGrid((prev) => !prev)}
                active={snapToGrid}
                style={{
                  fontWeight: snapToGrid ? 700 : 500
                }}
              >
                Snap To Grid: {snapToGrid ? 'On' : 'Off'}
              </DeskMenuItemButton>
              <div style={{ height: 1, backgroundColor: 'var(--ui-border)', margin: '6px 0' }} />
            </>
          )}

          {/* Background Customization Section */}
          {currentDesk && isCurrentDeskOwner && (
            <>
              <div style={{ padding: '7px 10px', fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                Background
              </div>
              <div style={{ display: 'flex', flexWrap: isMobileLayout ? 'wrap' : 'nowrap', gap: 4, padding: '0 8px 6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk1')}
                  disabled={!currentDesk || !isCurrentDeskOwner}
                  style={{
                    flex: isMobileLayout ? '1 1 calc(50% - 2px)' : 1,
                    padding: '6px 6px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: backgroundMode === 'desk1' ? '2px solid #4285F4' : '1px solid #ddd',
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url('/brownDesk.png')",
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat',
                    color: '#111',
                    fontWeight: 600,
                    textShadow: '0 1px 1px rgba(255,255,255,0.8)',
                    cursor: currentDesk && isCurrentDeskOwner ? 'pointer' : 'not-allowed'
                  }}
                >
                  Brown Desk
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk2')}
                  disabled={!currentDesk || !isCurrentDeskOwner}
                  style={{
                    flex: isMobileLayout ? '1 1 calc(50% - 2px)' : 1,
                    padding: '6px 6px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: backgroundMode === 'desk2' ? '2px solid #4285F4' : '1px solid #ddd',
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url('/grayDesk.png')",
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat',
                    color: '#111',
                    fontWeight: 600,
                    textShadow: '0 1px 1px rgba(255,255,255,0.8)',
                    cursor: currentDesk && isCurrentDeskOwner ? 'pointer' : 'not-allowed'
                  }}
                >
                  Gray Desk
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk3')}
                  disabled={!currentDesk || !isCurrentDeskOwner}
                  style={{
                    flex: isMobileLayout ? '1 1 calc(50% - 2px)' : 1,
                    padding: '6px 6px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: backgroundMode === 'desk3' ? '2px solid #4285F4' : '1px solid #ddd',
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url('/leavesDesk.jpg')",
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat',
                    color: '#111',
                    fontWeight: 600,
                    textShadow: '0 1px 1px rgba(255,255,255,0.8)',
                    cursor: currentDesk && isCurrentDeskOwner ? 'pointer' : 'not-allowed'
                  }}
                >
                  Leaves Desk
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDeskBackground('desk4')}
                  disabled={!currentDesk || !isCurrentDeskOwner}
                  style={{
                    flex: isMobileLayout ? '1 1 calc(50% - 2px)' : 1,
                    padding: '6px 6px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: backgroundMode === 'desk4' ? '2px solid #4285F4' : '1px solid #ddd',
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url('/flowersDesk.png')",
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat',
                    color: '#111',
                    fontWeight: 600,
                    textShadow: '0 1px 1px rgba(255,255,255,0.8)',
                    cursor: currentDesk && isCurrentDeskOwner ? 'pointer' : 'not-allowed'
                  }}
                >
                  Flowers Desk
                </button>
              </div>
              <div style={{ padding: '6px 12px 8px', fontSize: 12 }}>
                <div style={{ fontSize: 11, marginBottom: 3, color: 'var(--ui-ink-soft)' }}>Custom Image URL or Hex Color</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="url"
                    placeholder="https://example.com/bg.jpg or #1f2937"
                    value={customBackgroundInput}
                    onChange={(e) => setCustomBackgroundInput(e.target.value)}
                    style={menuCompactInputStyle}
                  />
                  <DeskMenuItemButton
                    type="button"
                    onClick={setCurrentDeskCustomBackground}
                    fullWidth={false}
                    style={{ ...menuPrimaryActionStyle, whiteSpace: 'nowrap' }}
                  >
                    Apply
                  </DeskMenuItemButton>
                </div>
              </div>
              <div style={{ height: 1, backgroundColor: 'var(--ui-border)', margin: '6px 0' }} />
            </>
          )}

          {/* Import/Export Section */}
          {currentDesk && (
            <>
              <div style={{ padding: '7px 10px', fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                Desk File
              </div>
              <DeskMenuItemButton
                type="button"
                onClick={exportCurrentDesk}
              >
                Export (.json)
              </DeskMenuItemButton>
              {canCurrentUserEditDeskItems && (
                <>
                  <DeskMenuItemButton
                    type="button"
                    onClick={() => importDeskInputRef.current?.click()}
                  >
                    Import (.json)
                  </DeskMenuItemButton>
                  <input
                    ref={importDeskInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportDeskFileSelection}
                    style={{ display: 'none' }}
                  />
                </>
              )}
            </>
          )}
        </DeskMenuPanel>
      )}
    </div>
  )
}
