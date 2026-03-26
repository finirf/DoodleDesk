import useDeskUiDerivedValues from './useDeskUiDerivedValues'
import useDeskShelfTreeRenderers from './useDeskShelfTreeRenderers'
import useDeskCommandPalette from './useDeskCommandPalette'

/**
 * Orchestrates UI rendering logic: computed display values, shelf tree layout, and command palette.
 * 
 * This hook produces all UI-specific derived values and rendering helpers. It does not manage state
 * or handle actions—it only computes display logic from state and produces render functions for complex
 * UI subtrees (shelf hierarchy, command palette).
 * 
 * **Output domains:**
 * - Layout metrics (isMobileLayout, topOverlayTop, topMenuTop, newNoteDesktopTop, mobileNoteMaxWidth)
 * - User display info (isCurrentUserViewer, pendingFriendRequestCount, totalItemsCount, joinDate, autoSaveLabel, autoSaveBadgeStyle)
 * - Styling helpers (menuInputStyle, menuCompactInputStyle, menuPrimaryActionStyle, menuSubtleActionStyle, etc.)
 * - Shelf tree rendering (renderDeskShelfTree, renderShelfOrganizerPanel)
 * - Command palette (showCommandPalette, commandPaletteQuery, commandPaletteActiveIndex, commandPaletteFilteredActions, etc.)
 * 
 * @param {Object} config
 * @param {Object} config.derivedValues - Desk state and computed values (desks, currentDesk, userId, notes, etc.)
 * @param {Object} config.shelfTreeRenderers - Shelf hierarchy rendering config (builtInShelves, handleSelectDesk, etc.)
 * @param {Object} config.commandPalette - Command palette config (hasModalOpen, canCurrentUserEditDeskItems, etc.)
 * @returns {Object} UI rendering object with computed values, helpers, and render functions
 */
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
