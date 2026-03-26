function getTopControlButtonStyle({ isMobileLayout, disabled }) {
  return {
    padding: isMobileLayout ? '8px 12px' : '7px 12px',
    fontSize: 12,
    borderRadius: 8,
    border: '1px solid var(--ui-border-strong)',
    background: 'var(--ui-glass)',
    backdropFilter: 'blur(8px)',
    color: 'var(--ui-ink)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    pointerEvents: 'auto',
    transition: 'transform var(--motion-fast) ease, box-shadow var(--motion-base) ease, opacity var(--motion-fast) ease'
  }
}

function getMenuTriggerStyle({ isMobileLayout, disabled }) {
  return {
    width: isMobileLayout ? '100%' : 'auto',
    padding: isMobileLayout ? '10px 12px' : '8px 16px',
    fontSize: isMobileLayout ? 13 : 14,
    borderRadius: 8,
    border: '1px solid var(--ui-border-strong)',
    background: 'var(--ui-glass)',
    backdropFilter: 'blur(8px)',
    color: 'var(--ui-ink)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'transform var(--motion-fast) ease, box-shadow var(--motion-base) ease, opacity var(--motion-fast) ease'
  }
}

function getMenuPanelStyle({ isMobileLayout, menuPanelZIndex, minWidth, width }) {
  return {
    position: isMobileLayout ? 'fixed' : 'absolute',
    top: isMobileLayout ? 'auto' : '100%',
    bottom: isMobileLayout ? 12 : 'auto',
    right: isMobileLayout ? 12 : 0,
    left: isMobileLayout ? 12 : 'auto',
    marginTop: isMobileLayout ? 0 : 6,
    background: 'var(--ui-glass)',
    border: '1px solid var(--ui-border)',
    borderRadius: 12,
    boxShadow: 'var(--ui-shadow-floating)',
    backdropFilter: 'blur(12px)',
    color: 'var(--ui-ink)',
    zIndex: menuPanelZIndex,
    minWidth: isMobileLayout ? 0 : minWidth,
    width: isMobileLayout ? 'calc(100% - 24px)' : width,
    maxHeight: isMobileLayout ? 'calc(100vh - 100px)' : 'auto',
    overflowY: isMobileLayout ? 'auto' : 'visible',
    padding: 6,
    animation: 'deskPanelIn var(--motion-base) cubic-bezier(0.18, 0.85, 0.27, 1)'
  }
}

function getMenuItemStyle({ danger, active, strong, fullWidth }) {
  return {
    display: fullWidth ? 'block' : 'inline-block',
    width: fullWidth ? '100%' : 'auto',
    textAlign: 'left',
    padding: '7px 10px',
    border: active ? '1px solid var(--ui-primary)' : '1px solid transparent',
    borderRadius: 8,
    background: active ? 'var(--ui-primary-soft)' : 'transparent',
    color: danger ? 'var(--ui-danger)' : (active ? 'var(--ui-primary-strong)' : 'var(--ui-ink)'),
    cursor: 'pointer',
    fontWeight: strong || active ? 600 : 500,
    transition: 'background var(--motion-fast) ease, border-color var(--motion-fast) ease, color var(--motion-fast) ease, transform var(--motion-fast) ease'
  }
}

export function DeskTopControlButton({
  isMobileLayout,
  disabled,
  style,
  children,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...getTopControlButtonStyle({ isMobileLayout, disabled }),
        ...style
      }}
    >
      {children}
    </button>
  )
}

export function DeskMenuTriggerButton({
  isMobileLayout,
  disabled,
  style,
  children,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...getMenuTriggerStyle({ isMobileLayout, disabled }),
        ...style
      }}
    >
      {children}
    </button>
  )
}

export function DeskMenuPanel({
  isMobileLayout,
  menuPanelZIndex,
  minWidth = 200,
  width = 'auto',
  style,
  children
}) {
  return (
    <div
      style={{
        ...getMenuPanelStyle({ isMobileLayout, menuPanelZIndex, minWidth, width }),
        ...style
      }}
    >
      {children}
    </div>
  )
}

export function DeskMenuItemButton({
  danger = false,
  active = false,
  strong = false,
  fullWidth = true,
  style,
  children,
  ...props
}) {
  return (
    <button
      {...props}
      style={{
        ...getMenuItemStyle({ danger, active, strong, fullWidth }),
        ...style
      }}
    >
      {children}
    </button>
  )
}
