import { forwardRef, useRef } from 'react'

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
  const twoFingerPanStateRef = useRef({
    isActive: false,
    lastCenterX: 0,
    lastCenterY: 0
  })

  function getTouchCenter(touches) {
    const firstTouch = touches[0]
    const secondTouch = touches[1]
    return {
      x: (firstTouch.clientX + secondTouch.clientX) / 2,
      y: (firstTouch.clientY + secondTouch.clientY) / 2
    }
  }

  function handleTouchStart(event) {
    if (!isMobileLayout) return
    if (event.touches.length !== 2) {
      twoFingerPanStateRef.current.isActive = false
      return
    }

    const center = getTouchCenter(event.touches)
    twoFingerPanStateRef.current = {
      isActive: true,
      lastCenterX: center.x,
      lastCenterY: center.y
    }
  }

  function handleTouchMove(event) {
    if (!isMobileLayout) return
    if (event.touches.length !== 2) {
      twoFingerPanStateRef.current.isActive = false
      return
    }

    const center = getTouchCenter(event.touches)

    if (!twoFingerPanStateRef.current.isActive) {
      twoFingerPanStateRef.current = {
        isActive: true,
        lastCenterX: center.x,
        lastCenterY: center.y
      }
      return
    }

    const deltaX = center.x - twoFingerPanStateRef.current.lastCenterX
    const deltaY = center.y - twoFingerPanStateRef.current.lastCenterY

    if (event.cancelable) {
      event.preventDefault()
    }

    window.scrollBy(-deltaX, -deltaY)

    twoFingerPanStateRef.current.lastCenterX = center.x
    twoFingerPanStateRef.current.lastCenterY = center.y
  }

  function handleTouchEnd(event) {
    if (!isMobileLayout) return
    if (event.touches.length === 2) {
      const center = getTouchCenter(event.touches)
      twoFingerPanStateRef.current = {
        isActive: true,
        lastCenterX: center.x,
        lastCenterY: center.y
      }
      return
    }

    twoFingerPanStateRef.current.isActive = false
  }

  return (
    <div
      ref={ref}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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
        backgroundRepeat,
        touchAction: isMobileLayout ? 'none' : 'auto'
      }}
    >
      {children}
    </div>
  )
})
