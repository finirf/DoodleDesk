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
  menuPanelZIndex
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
        position: 'relative',
        display: 'inline-block',
        marginBottom: 20,
        zIndex: menuLayerZIndex
      }

  return (
    <div ref={menuRef} style={rootStyle}>
      <button
        onClick={onToggle}
        disabled={!isDeskSelected}
        style={{
          padding: isMobileLayout ? '10px 14px' : '8px 16px',
          fontSize: isMobileLayout ? 13 : 14,
          borderRadius: isMobileLayout ? 999 : 8,
          cursor: isDeskSelected ? 'pointer' : 'not-allowed',
          opacity: isDeskSelected ? 1 : 0.6,
          boxShadow: isMobileLayout ? '0 6px 14px rgba(0,0,0,0.22)' : 'none'
        }}
      >
        {isMobileLayout ? '+ New' : 'New Note ▼'}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: isMobileLayout ? 'auto' : '100%',
            bottom: isMobileLayout ? 'calc(100% + 8px)' : 'auto',
            left: isMobileLayout ? 'auto' : 0,
            right: isMobileLayout ? 0 : 'auto',
            marginTop: isMobileLayout ? 0 : 6,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 6,
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            color: '#222',
            zIndex: menuPanelZIndex,
            width: isMobileLayout ? 220 : 'auto',
            maxHeight: isMobileLayout ? 280 : 'none',
            overflowY: isMobileLayout ? 'auto' : 'hidden'
          }}
        >
          <button
            type="button"
            onClick={onAddStickyNote}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              border: 'none',
              background: '#fff',
              color: '#222',
              cursor: 'pointer'
            }}
          >
            Sticky Note
          </button>
          <button
            type="button"
            onClick={onAddChecklist}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              border: 'none',
              background: '#fff',
              color: '#222',
              cursor: 'pointer'
            }}
          >
            Checklist
          </button>

          <div style={{ borderTop: '1px solid #eee', marginTop: 2, paddingTop: 2 }}>
            <div style={{ padding: '6px 12px', fontSize: 12, color: '#666' }}>Decorations</div>
            {decorationOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onAddDecoration(option.key)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  border: 'none',
                  background: '#fff',
                  color: '#222',
                  cursor: 'pointer'
                }}
              >
                {option.emoji} {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}