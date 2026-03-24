import { forwardRef } from 'react'

/**
 * DeskCanvasContainer
 *
 * Wrapper component that provides the positioned canvas container with responsive
 * styling, responsive padding, and background styling. Manages all canvas-level
 * visual layout concerns.
 */
export default forwardRef(function DeskCanvasContainer({
  canvasWidth,
  canvasHeight,
  isMobileLayout,
  backgroundColor,
  backgroundImage,
  backgroundSize,
  backgroundPosition,
  backgroundRepeat,
  children
}, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: canvasWidth,
        boxSizing: 'border-box',
        minHeight: canvasHeight,
        paddingTop: isMobileLayout ? 104 : 20,
        paddingRight: isMobileLayout ? 12 : 20,
        paddingBottom: isMobileLayout ? 92 : 20,
        paddingLeft: isMobileLayout ? 12 : 20,
        backgroundColor,
        backgroundImage,
        backgroundSize,
        backgroundPosition,
        backgroundRepeat
      }}
    >
      {children}
    </div>
  )
})
