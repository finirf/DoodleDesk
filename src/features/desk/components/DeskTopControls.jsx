import { DeskTopControlButton } from './DeskUiPrimitives'

export default function DeskTopControls({
  isMobileLayout,
  topOverlayTop,
  desktopTop,
  desktopLeft,
  menuLayerZIndex,
  canUndo,
  canRedo,
  hasModalOpen,
  canCurrentUserEditDeskItems,
  historySyncing,
  onUndo,
  onRedo,
  onForceSave,
  selectedDeskId,
  forceSaveInProgress,
  autoSaveLabel,
  autoSaveBadgeStyle
}) {
  const isForceSaveDisabled =
    !selectedDeskId ||
    hasModalOpen ||
    forceSaveInProgress ||
    historySyncing ||
    !canCurrentUserEditDeskItems

  return (
    <div
      style={{
        position: isMobileLayout ? 'absolute' : 'fixed',
        top: isMobileLayout ? topOverlayTop : desktopTop,
        bottom: 'auto',
        left: isMobileLayout ? 12 : desktopLeft,
        display: 'flex',
        gap: 8,
        zIndex: menuLayerZIndex
      }}
      role="toolbar"
      aria-label="Desk history and save controls"
    >
      <DeskTopControlButton
        type="button"
        onClick={onUndo}
        isMobileLayout={isMobileLayout}
        disabled={!canUndo || hasModalOpen || !canCurrentUserEditDeskItems}
        title="Undo (Ctrl/Cmd+Z)"
        aria-label="Undo last action"
        aria-disabled={!canUndo || hasModalOpen || !canCurrentUserEditDeskItems}
      >
        {historySyncing ? 'Syncing...' : 'Undo'}
      </DeskTopControlButton>
      <DeskTopControlButton
        type="button"
        onClick={onRedo}
        isMobileLayout={isMobileLayout}
        disabled={!canRedo || hasModalOpen || !canCurrentUserEditDeskItems}
        title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)"
        aria-label="Redo last undone action"
        aria-disabled={!canRedo || hasModalOpen || !canCurrentUserEditDeskItems}
      >
        Redo
      </DeskTopControlButton>
      <DeskTopControlButton
        type="button"
        onClick={onForceSave}
        isMobileLayout={isMobileLayout}
        disabled={isForceSaveDisabled}
        title="Force-save current desk content and clear undo/redo history"
        aria-live="polite"
        aria-label={forceSaveInProgress ? 'Saving desk' : 'Save desk and clear history'}
        aria-disabled={isForceSaveDisabled}
        style={{
          ...autoSaveBadgeStyle,
          padding: isMobileLayout ? '8px 10px' : autoSaveBadgeStyle.padding,
          opacity: isForceSaveDisabled ? 0.6 : 1
        }}
      >
        {forceSaveInProgress ? 'Saving...' : autoSaveLabel}
      </DeskTopControlButton>
    </div>
  )
}