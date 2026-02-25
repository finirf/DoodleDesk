// Produces layered background styles for desk sections, including custom image or solid color mode.
export function getDeskBackgroundStyles({
  backgroundMode,
  customBackgroundUrl,
  sectionCount,
  sectionHeight
}) {
  const customBackgroundIsHex = /^#(?:[\da-fA-F]{3}|[\da-fA-F]{6}|[\da-fA-F]{8})$/.test(customBackgroundUrl)
  const safeCustomBackgroundUrl = customBackgroundUrl.replace(/"/g, '\\"')

  const backgroundLayers = Array.from({ length: sectionCount }, () => {
    if (backgroundMode === 'desk1') return "url('/brownDesk.png')"
    if (backgroundMode === 'desk2') return "url('/grayDesk.png')"
    if (backgroundMode === 'desk3') return "url('/leavesDesk.jpg')"
    if (backgroundMode === 'desk4') return "url('/flowersDesk.png')"
    if (backgroundMode === 'custom' && safeCustomBackgroundUrl && !customBackgroundIsHex) return `url("${safeCustomBackgroundUrl}")`
    return "url('/brownDesk.png')"
  })

  return {
    backgroundImage: backgroundMode === 'custom' && customBackgroundIsHex ? 'none' : backgroundLayers.join(', '),
    backgroundColor: backgroundMode === 'custom' && customBackgroundIsHex ? customBackgroundUrl : undefined,
    backgroundSize: Array.from({ length: sectionCount }, () => `100% ${sectionHeight}px`).join(', '),
    backgroundPosition: Array.from({ length: sectionCount }, (_, index) =>
      index === 0 ? 'top center' : `center ${index * sectionHeight}px`
    ).join(', '),
    backgroundRepeat: Array.from({ length: sectionCount }, () => 'no-repeat').join(', ')
  }
}
