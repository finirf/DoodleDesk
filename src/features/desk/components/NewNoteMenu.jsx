import {
  DeskMenuItemButton,
  DeskMenuPanel,
  DeskMenuTriggerButton
} from './DeskUiPrimitives'

export default function NewNoteMenu({
  menuRef,
  isOpen,
  isMobileLayout,
  onToggle,
  isDeskSelected,
  onAddStickyNote,
  onAddChecklist,
  decorationOptions,
  onAddDecoration,
  menuLayerZIndex,
  menuPanelZIndex,
  desktopTop = 68,
  desktopLeft = 20
}) {
  const rootStyle = isMobileLayout
    ? {
        position: 'fixed',
        right: 12,
        bottom: 12,
        display: 'inline-block',
        zIndex: menuLayerZIndex
      }
    : {
        position: 'fixed',
        top: desktopTop,
        left: desktopLeft,
        right: 'auto',
        display: 'inline-block',
        zIndex: menuLayerZIndex
      }

  return (
    <div ref={menuRef} style={rootStyle}>
      <DeskMenuTriggerButton
        onClick={onToggle}
        type="button"
        isMobileLayout={isMobileLayout}
        disabled={!isDeskSelected}
        style={{
          borderRadius: isMobileLayout ? 999 : 8,
          boxShadow: isMobileLayout ? '0 6px 14px rgba(0,0,0,0.22)' : 'none'
        }}
      >
        {isMobileLayout ? '+ New' : 'New Note ▼'}
      </DeskMenuTriggerButton>

      {isOpen && (
        <DeskMenuPanel
          isMobileLayout={isMobileLayout}
          menuPanelZIndex={menuPanelZIndex}
          minWidth={220}
          width={isMobileLayout ? 220 : 'auto'}
          style={{
            top: isMobileLayout ? 'auto' : '100%',
            bottom: isMobileLayout ? 'calc(100% + 8px)' : 'auto',
            left: isMobileLayout ? 'auto' : 0,
            right: isMobileLayout ? 0 : 'auto',
            marginTop: isMobileLayout ? 0 : 6,
            overflow: 'hidden',
            maxHeight: isMobileLayout ? 280 : 'none',
            overflowY: isMobileLayout ? 'auto' : 'hidden'
          }}
        >
          <DeskMenuItemButton
            type="button"
            onClick={onAddStickyNote}
            style={{ padding: '8px 12px' }}
          >
            Sticky Note
          </DeskMenuItemButton>
          <DeskMenuItemButton
            type="button"
            onClick={onAddChecklist}
            style={{ padding: '8px 12px' }}
          >
            Checklist
          </DeskMenuItemButton>

          <div style={{ borderTop: '1px solid var(--ui-border)', marginTop: 2, paddingTop: 2 }}>
            <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--ui-ink-soft)' }}>Decorations</div>
            {decorationOptions.map((option) => (
              <DeskMenuItemButton
                key={option.key}
                type="button"
                onClick={() => onAddDecoration(option.key)}
                style={{ padding: '8px 12px' }}
              >
                {option.emoji} {option.label}
              </DeskMenuItemButton>
            ))}
          </div>
        </DeskMenuPanel>
      )}
    </div>
  )
}