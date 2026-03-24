import { DeskTopControlButton } from './DeskUiPrimitives'

export default function DeskTopControls({
  isMobileLayout,
  topOverlayTop,
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
        top: isMobileLayout ? topOverlayTop : 'auto',
        bottom: isMobileLayout ? 'auto' : 20,
        left: isMobileLayout ? 12 : 20,
        display: 'flex',
        gap: 8,
        zIndex: menuLayerZIndex
      }}
    >
      <DeskTopControlButton
        type="button"
        onClick={onUndo}
        isMobileLayout={isMobileLayout}
        disabled={!canUndo || hasModalOpen || !canCurrentUserEditDeskItems}
        title="Undo (Ctrl/Cmd+Z)"
      >
        {historySyncing ? 'Syncing...' : 'Undo'}
      </DeskTopControlButton>
      <DeskTopControlButton
        type="button"
        onClick={onRedo}
        isMobileLayout={isMobileLayout}
        disabled={!canRedo || hasModalOpen || !canCurrentUserEditDeskItems}
        title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)"
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