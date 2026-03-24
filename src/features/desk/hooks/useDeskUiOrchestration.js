import useDeskUiDerivedValues from './useDeskUiDerivedValues'
import useDeskShelfTreeRenderers from './useDeskShelfTreeRenderers'
import useDeskCommandPalette from './useDeskCommandPalette'

export default function useDeskUiOrchestration({
  derivedValues,
  shelfTreeRenderers,
  commandPalette
}) {
  const uiDerived = useDeskUiDerivedValues(derivedValues)

  const shelfTree = useDeskShelfTreeRenderers({
    ...shelfTreeRenderers,
    desksByShelfId: uiDerived.desksByShelfId,
    customShelfOptions: uiDerived.customShelfOptions,
    menuCompactInputStyle: uiDerived.menuCompactInputStyle,
    menuPrimaryActionStyle: uiDerived.menuPrimaryActionStyle,
    menuSelectStyle: uiDerived.menuSelectStyle
  })

  const palette = useDeskCommandPalette({
    ...commandPalette,
    sortedDesks: uiDerived.sortedDesks
  })

  return {
    ...uiDerived,
    ...shelfTree,
    ...palette
  }
}
