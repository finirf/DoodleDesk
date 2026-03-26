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