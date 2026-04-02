// Produces layered background styles for desk sections, including custom image or solid color mode.
export function getDeskBackgroundStyles({
  backgroundMode,
  customBackgroundUrl
}) {
  const customBackgroundIsHex = /^#(?:[\da-fA-F]{3}|[\da-fA-F]{6}|[\da-fA-F]{8})$/.test(customBackgroundUrl)
  const safeCustomBackgroundUrl = customBackgroundUrl.replace(/"/g, '\\"')
  const isCustomImageBackground = backgroundMode === 'custom' && safeCustomBackgroundUrl && !customBackgroundIsHex
  const isDeskTextureBackground = backgroundMode === 'desk1'
    || backgroundMode === 'desk2'
    || backgroundMode === 'desk3'
    || backgroundMode === 'desk4'

  if (isCustomImageBackground || isDeskTextureBackground) {
    const textureUrl = isCustomImageBackground
      ? safeCustomBackgroundUrl
      : backgroundMode === 'desk2'
        ? '/images/Desks/grayDesk.png'
        : backgroundMode === 'desk3'
          ? '/images/Desks/leavesDesk.jpg'
          : backgroundMode === 'desk4'
            ? '/images/Desks/flowersDesk.png'
            : '/images/Desks/brownDesk.png'

    return {
      backgroundImage: `url("${textureUrl}")`,
      backgroundColor: isCustomImageBackground && customBackgroundIsHex ? customBackgroundUrl : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat'
    }
  }

  return {
    backgroundImage: backgroundMode === 'custom' && customBackgroundIsHex ? 'none' : "url('/images/Desks/brownDesk.png')",
    backgroundColor: backgroundMode === 'custom' && customBackgroundIsHex ? customBackgroundUrl : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat'
  }
}
