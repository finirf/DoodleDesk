export default function DeskTopMenuShell({
  isMobileLayout,
  topMenuTop,
  menuLayerZIndex,
  children
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: topMenuTop,
        right: isMobileLayout ? 12 : 20,
        left: isMobileLayout ? 12 : 'auto',
        display: 'flex',
        flexDirection: isMobileLayout ? 'column' : 'row',
        gap: 8,
        alignItems: 'stretch',
        zIndex: menuLayerZIndex
      }}
    >
      {children}
    </div>
  )
}