import { useEffect, useState } from 'react'

export default function useDeskViewport({ getViewportMetrics }) {
  const initialViewportMetrics = getViewportMetrics()

  const [viewportWidth, setViewportWidth] = useState(() => initialViewportMetrics.width)
  const [sectionHeight, setSectionHeight] = useState(() => initialViewportMetrics.height)
  const [canvasHeight, setCanvasHeight] = useState(() => {
    const initialHeight = initialViewportMetrics.height
    return initialHeight * 2
  })

  useEffect(() => {
    function handleResize() {
      const nextViewportMetrics = getViewportMetrics()
      const nextSectionHeight = nextViewportMetrics.height
      const nextViewportWidth = nextViewportMetrics.width
      setViewportWidth(nextViewportWidth)
      setSectionHeight(nextSectionHeight)
      setCanvasHeight((prev) => Math.max(prev, nextSectionHeight * 2))
    }

    window.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('scroll', handleResize)
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('scroll', handleResize)
    }
  }, [getViewportMetrics])

  return {
    viewportWidth,
    sectionHeight,
    canvasHeight,
    setCanvasHeight
  }
}