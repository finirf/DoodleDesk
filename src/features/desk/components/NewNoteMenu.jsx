export default function NewNoteMenu({
  menuRef,
  isOpen,
  onToggle,
  isDeskSelected,
  onAddStickyNote,
  onAddChecklist,
  decorationOptions,
  onAddDecoration,
  menuLayerZIndex,
  menuPanelZIndex
}) {
  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block', marginBottom: 20, zIndex: menuLayerZIndex }}>
      <button
        onClick={onToggle}
        disabled={!isDeskSelected}
        style={{
          padding: '8px 16px',
          fontSize: 14,
          cursor: isDeskSelected ? 'pointer' : 'not-allowed',
          opacity: isDeskSelected ? 1 : 0.6
        }}
      >
        New Note ▼
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 6,
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            color: '#222',
            zIndex: menuPanelZIndex
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