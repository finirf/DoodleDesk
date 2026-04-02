import { forwardRef, useRef, useState } from 'react'

/**
 * DeskCanvasContainer
 *
 * Wrapper component that provides the positioned canvas container with responsive
 * styling, responsive padding, and background styling. Manages all canvas-level
 * visual layout concerns. Handles two-finger canvas panning and allows single-finger
 * note dragging to pass through to child components.
 */
export default forwardRef(function DeskCanvasContainer({
  canvasWidth,
  canvasHeight,
  isMobileLayout,
  isTouchInteractionMode,
  backgroundColor,
  backgroundImage,
  backgroundSize,
  backgroundPosition,
  backgroundRepeat,
  children
}, ref) {
  // Pan state: accumulated offset from two-finger pan gestures
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  
  const twoFingerPanStateRef = useRef({
    isActive: false,
    lastCenterX: 0,
    lastCenterY: 0,
    accumulatedX: 0,
    accumulatedY: 0
  })

  const PAN_SENSITIVITY = 2.2 // Multiplier for responsive panning

  function getTouchCenter(touches) {
    const firstTouch = touches[0]
    const secondTouch = touches[1]
    return {
      x: (firstTouch.clientX + secondTouch.clientX) / 2,
      y: (firstTouch.clientY + secondTouch.clientY) / 2
    }
  }

  function handleTouchStart(event) {
    if (!isTouchInteractionMode) return
    
    // Only handle 2-finger touches for panning
    if (event.touches.length !== 2) {
      return
    }

    setIsPanning(true)
    const center = getTouchCenter(event.touches)
    twoFingerPanStateRef.current = {
      isActive: true,
      lastCenterX: center.x,
      lastCenterY: center.y,
      accumulatedX: panOffset.x,
      accumulatedY: panOffset.y
    }
    
    if (event.cancelable) {
      event.preventDefault()
    }
  }

  function handleTouchMove(event) {
    if (!isTouchInteractionMode) return
    
    // Only pan on 2-finger touches
    if (event.touches.length !== 2) {
      twoFingerPanStateRef.current.isActive = false
      setIsPanning(false)
      return
    }

    if (!twoFingerPanStateRef.current.isActive) {
      return
    }

    const center = getTouchCenter(event.touches)
    
    const deltaX = (center.x - twoFingerPanStateRef.current.lastCenterX) * PAN_SENSITIVITY
    const deltaY = (center.y - twoFingerPanStateRef.current.lastCenterY) * PAN_SENSITIVITY

    if (event.cancelable) {
      event.preventDefault()
    }

    // Update pan offset with sensitivity multiplier
    const newPanOffset = {
      x: twoFingerPanStateRef.current.accumulatedX + deltaX,
      y: twoFingerPanStateRef.current.accumulatedY + deltaY
    }
    
    setPanOffset(newPanOffset)
    
    twoFingerPanStateRef.current.lastCenterX = center.x
    twoFingerPanStateRef.current.lastCenterY = center.y
  }

  function handleTouchEnd(event) {
    if (!isTouchInteractionMode) return
    
    if (event.touches.length === 2) {
      // Still have 2 fingers, update base position
      const center = getTouchCenter(event.touches)
      twoFingerPanStateRef.current = {
        isActive: true,
        lastCenterX: center.x,
        lastCenterY: center.y,
        accumulatedX: panOffset.x,
        accumulatedY: panOffset.y
      }
      return
    }

    twoFingerPanStateRef.current.isActive = false
    setIsPanning(false)
  }

  const shouldApplyPanTransform = Boolean(
    isTouchInteractionMode
    && (isPanning || panOffset.x !== 0 || panOffset.y !== 0)
  )

  return (
    <div
      ref={ref}
      data-desk-canvas="true"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        boxSizing: 'border-box',
        overflowX: 'auto',
        overflowY: 'auto',
        paddingTop: isMobileLayout ? 104 : 20,
        paddingRight: isMobileLayout ? 12 : 20,
        paddingBottom: isMobileLayout ? 92 : 20,
        paddingLeft: isMobileLayout ? 12 : 20,
        backgroundColor,
        backgroundImage,
        backgroundSize,
        backgroundPosition,
        backgroundRepeat,
        // Apply pan transform for smooth two-finger scrolling
        transform: shouldApplyPanTransform ? `translate(${panOffset.x}px, ${panOffset.y}px)` : 'none',
        transition: shouldApplyPanTransform && !isPanning ? 'transform 0.1s ease-out' : 'none',
        // Allow default touch scrolling (single finger); two-finger pan handled by our code
        touchAction: 'manipulation'
      }}
    >
      <div style={{ minWidth: canvasWidth, minHeight: canvasHeight }}>
        {children}
      </div>
    </div>
  )
})
