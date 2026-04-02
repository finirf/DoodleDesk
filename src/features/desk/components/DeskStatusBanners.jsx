export default function DeskStatusBanners({
  selectedDeskId,
  isCurrentUserViewer,
  isMobileLayout,
  menuLayerZIndex
}) {
  return (
    <>
      {!selectedDeskId && (
        <div
          style={{
            position: 'fixed',
            top: isMobileLayout ? 68 : 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: menuLayerZIndex + 2,
            color: 'var(--ui-ink)',
            background: 'var(--ui-glass)',
            border: '1px solid var(--ui-border-strong)',
            boxShadow: 'var(--ui-shadow-floating)',
            backdropFilter: 'blur(10px)',
            animation: 'deskPanelIn var(--motion-base) cubic-bezier(0.18, 0.85, 0.27, 1)',
            display: 'inline-block',
            padding: isMobileLayout ? '8px 10px' : '9px 12px',
            borderRadius: 10,
            fontSize: isMobileLayout ? 12 : 13,
            fontWeight: 600,
            maxWidth: isMobileLayout ? 'calc(100vw - 24px)' : 'min(560px, calc(100vw - 40px))',
            textAlign: 'center'
          }}
        >
          Create a desk from the top-right menu to get started.
        </div>
      )}

      {isCurrentUserViewer && (
        <div
          style={{
            color: '#6a4f00',
            background: 'rgba(255, 248, 225, 0.95)',
            display: 'inline-block',
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #f2d18f',
            marginTop: 8,
            boxShadow: '0 6px 16px rgba(106, 79, 0, 0.12)',
            animation: 'deskPanelIn var(--motion-base) cubic-bezier(0.18, 0.85, 0.27, 1)'
          }}
        >
          Viewer mode: you can view this desk, but only Managers, Editors, and Owner can make changes.
        </div>
      )}
    </>
  )
}