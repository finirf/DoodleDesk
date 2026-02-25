export default function FourWayResizeIcon({ size = 14, color = 'currentColor' }) {
  const iconSize = Math.max(12, size)
  const arrowSize = Math.max(8, Math.round(iconSize * 0.64))

  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        width: iconSize,
        height: iconSize,
        display: 'inline-block',
        color,
        lineHeight: 1,
        flexShrink: 0
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: -1,
          transform: 'translateX(-50%)',
          fontSize: arrowSize
        }}
      >
        ↑
      </span>
      <span
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -1,
          transform: 'translateX(-50%)',
          fontSize: arrowSize
        }}
      >
        ↓
      </span>
      <span
        style={{
          position: 'absolute',
          left: -1,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: arrowSize
        }}
      >
        ←
      </span>
      <span
        style={{
          position: 'absolute',
          right: -1,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: arrowSize
        }}
      >
        →
      </span>
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: Math.max(5, Math.round(iconSize * 0.36))
        }}
      >
        •
      </span>
    </span>
  )
}