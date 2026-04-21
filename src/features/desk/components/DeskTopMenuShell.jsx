export default function DeskTopMenuShell({
  isMobileLayout,
  topMenuTop,
  menuLayerZIndex,
  children
}) {
  return (
    <div
      style={{
        position: isMobileLayout ? 'absolute' : 'fixed',
        top: topMenuTop,
        right: isMobileLayout ? 12 : 20,
        left: 'auto',
        display: 'flex',
        flexDirection: 'row',
        gap: isMobileLayout ? 6 : 8,
        alignItems: 'center',
        flexWrap: 'nowrap',
        zIndex: 1100
      }}
    >
      {children}
    </div>
  )
}