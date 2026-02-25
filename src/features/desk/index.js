export { default as DeskModals } from './components/DeskModals'
export { default as FourWayResizeIcon } from './components/FourWayResizeIcon'
export { default as NewNoteMenu } from './components/NewNoteMenu'
export { default as useDeskViewport } from './hooks/useDeskViewport'
export { default as useMenuCloseOnOutsideClick } from './hooks/useMenuCloseOnOutsideClick'
export { BUILT_IN_SHELVES, DECORATION_OPTIONS, FONT_OPTIONS } from './constants/deskConstants'
export { modalStyles } from './constants/modalStyles'
export { loadMergedDesksForUser } from './data/deskQueries'
export { getDeskBackgroundStyles } from './utils/backgroundUtils'
export {
  formatDate,
  getDeskNameValue,
  getProfileDisplayParts,
  getViewportMetrics,
  isDeskCollaborative,
  normalizeCustomBackgroundValue,
  normalizeHexColor,
  normalizeHttpUrl
} from './utils/deskHelpers'
export {
  clampDimension,
  getDecorationOption,
  getDefaultItemColor,
  getItemColor,
  getItemCreatorLabel,
  getItemFontFamily,
  getItemFontSize,
  getItemHeight,
  getItemKey,
  getItemTableName,
  getItemTextColor,
  getItemWidth,
  isChecklistItem,
  isDecorationItem,
  isMissingColumnError,
  isMissingShelfStorageTableError,
  normalizeFontSize
} from './utils/itemUtils'