import { useEffect, useState } from 'react'

export default function useDeskViewport({ getViewportMetrics }) {
  const initialViewportMetrics = getViewportMetrics()

  const [viewportWidth, setViewportWidth] = useState(() => initialViewportMetrics.width)
  const [sectionHeight, setSectionHeight] = useState(() => initialViewportMetrics.height)
  const [canvasWidth, setCanvasWidth] = useState(() => initialViewportMetrics.width)
  const [canvasHeight, setCanvasHeight] = useState(() => {
    return initialViewportMetrics.height
  })

  useEffect(() => {
    function handleResize() {
      const nextViewportMetrics = getViewportMetrics()
      const nextSectionHeight = nextViewportMetrics.height
      const nextViewportWidth = nextViewportMetrics.width
      setViewportWidth(nextViewportWidth)
      setSectionHeight(nextSectionHeight)
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
    canvasWidth,
    canvasHeight,
    setCanvasWidth,
    setCanvasHeight
  }
}
