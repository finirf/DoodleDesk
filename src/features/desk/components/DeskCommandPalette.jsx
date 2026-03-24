export default function DeskCommandPalette({
  isOpen,
  onClose,
  menuLayerZIndex,
  isMobileLayout,
  inputRef,
  query,
  onQueryChange,
  actions,
  activeIndex,
  onActiveIndexChange,
  onExecuteAction
}) {
  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: menuLayerZIndex + 30,
        background: 'rgba(8, 14, 26, 0.42)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: isMobileLayout ? '12px' : '64px 20px 20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 100%)',
          borderRadius: 16,
          border: '1px solid var(--ui-border)',
          background: 'var(--ui-glass)',
          boxShadow: 'var(--ui-shadow-floating)',
          backdropFilter: 'blur(14px)',
          overflow: 'hidden',
          animation: 'deskPanelIn var(--motion-base) cubic-bezier(0.18, 0.85, 0.27, 1)'
        }}
      >
        <div style={{ padding: isMobileLayout ? 10 : 12, borderBottom: '1px solid var(--ui-border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ui-ink)', marginBottom: 8 }}>
            Command Palette
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Type a command or desk name..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: 10,
              border: '1px solid var(--ui-border-strong)',
              background: 'var(--ui-surface)',
              color: 'var(--ui-ink)',
              fontSize: 14,
              padding: '10px 12px'
            }}
          />
          <div style={{ marginTop: 7, fontSize: 11, color: 'var(--ui-ink-soft)' }}>
            Enter to run, Up/Down to navigate, Esc to close, Ctrl/Cmd+K to toggle.
          </div>
        </div>

        <div style={{ maxHeight: isMobileLayout ? 300 : 360, overflowY: 'auto', padding: 8 }}>
          {actions.length === 0 ? (
            <div
              style={{
                padding: '12px 10px',
                borderRadius: 10,
                background: 'var(--ui-surface-soft)',
                color: 'var(--ui-ink-soft)',
                fontSize: 13
              }}
            >
              No commands found. Try "desk", "note", "profile", or a desk name.
            </div>
          ) : (
            actions.map((action, index) => {
              const isActive = index === activeIndex
              return (
                <button
                  key={action.id}
                  type="button"
                  onMouseEnter={() => onActiveIndexChange(index)}
                  onClick={() => onExecuteAction(action)}
                  disabled={action.disabled}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 10,
                    border: isActive ? '1px solid var(--ui-primary)' : '1px solid transparent',
                    background: isActive ? 'var(--ui-primary-soft)' : 'transparent',
                    color: action.disabled ? 'var(--ui-ink-soft)' : 'var(--ui-ink)',
                    opacity: action.disabled ? 0.65 : 1,
                    padding: '9px 10px',
                    marginBottom: 4,
                    cursor: action.disabled ? 'not-allowed' : 'pointer',
                    transition: 'background var(--motion-fast) ease, border-color var(--motion-fast) ease'
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{action.label}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: 'var(--ui-ink-soft)' }}>{action.description}</div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}