import { useState } from 'react'
import {
  DeskMenuItemButton,
  DeskMenuPanel,
  DeskMenuTriggerButton
} from './DeskUiPrimitives'

export default function NewNoteMenu({
  menuRef,
  isOpen,
  isMobileLayout,
  onToggle,
  isDeskSelected,
  onAddStickyNote,
  onAddTextBox,
  onAddChecklist,
  decorationOptions,
  onAddDecoration,
  menuLayerZIndex,
  menuPanelZIndex,
  desktopTop = 68,
  desktopLeft = 20
}) {
  const [openSections, setOpenSections] = useState({
    create: true,
    quickPicks: false,
    paperSet: false,
    deskAccents: false
  })

  const rootStyle = isMobileLayout
    ? {
        position: 'fixed',
        right: 12,
        bottom: 12,
        display: 'inline-block',
        zIndex: menuLayerZIndex
      }
    : {
        position: 'fixed',
        top: desktopTop,
        left: desktopLeft,
        right: 'auto',
        display: 'inline-block',
        zIndex: menuLayerZIndex
      }

  function runAndClose(action) {
    action()
    onToggle()
  }

  const quickDecorationOptions = decorationOptions.filter((option) => !option.image)
  const paperDecorationOptions = decorationOptions.filter((option) => option.image && /(sticky note|envelope)/i.test(option.label))
  const deskDecorationOptions = decorationOptions.filter((option) => option.image && !/(sticky note|envelope)/i.test(option.label))

  function renderDropdownSection(sectionKey, label, options, renderer, { bordered = false } = {}) {
    if (!options.length) return null

    return (
      <details
        open={Boolean(openSections[sectionKey])}
        onToggle={(event) => {
          const nextOpen = event.currentTarget.open
          setOpenSections((prev) => ({ ...prev, [sectionKey]: nextOpen }))
        }}
        style={{
          borderTop: bordered ? '1px solid var(--ui-border)' : 'none'
        }}
      >
        <summary
          style={{
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--ui-ink-soft)',
            cursor: 'pointer',
            userSelect: 'none',
            fontWeight: 600
          }}
        >
          {label}
        </summary>
        <div style={{ paddingBottom: 4 }}>
          {options.map((option) => renderer(option))}
        </div>
      </details>
    )
  }

  function renderDecorationButton(option) {
    return (
      <button
        key={option.key}
        type="button"
        onClick={() => runAndClose(() => onAddDecoration(option.key))}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 12px',
          textAlign: 'left',
          borderRadius: 8,
          border: '1px solid transparent',
          background: 'transparent',
          color: 'var(--ui-ink)',
          cursor: 'pointer'
        }}
      >
        <span style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {option.image ? <img src={option.image} alt="" draggable="false" style={{ width: 24, height: 24, objectFit: 'contain' }} /> : option.emoji}
        </span>
        <span>{option.label}</span>
      </button>
    )
  }

  return (
    <div ref={menuRef} style={rootStyle}>
      <DeskMenuTriggerButton
        onClick={onToggle}
        type="button"
        isMobileLayout={isMobileLayout}
        disabled={!isDeskSelected}
        style={{
          borderRadius: isMobileLayout ? 999 : 8,
          boxShadow: isMobileLayout ? '0 6px 14px rgba(0,0,0,0.22)' : 'none'
        }}
      >
        {isMobileLayout ? '+ Item' : 'New Item ▼'}
      </DeskMenuTriggerButton>

      {isOpen && (
        <DeskMenuPanel
          isMobileLayout={isMobileLayout}
          menuPanelZIndex={menuPanelZIndex}
          minWidth={280}
          width={isMobileLayout ? 280 : 'auto'}
          style={{
            top: isMobileLayout ? 'auto' : '100%',
            bottom: isMobileLayout ? 'calc(100% + 8px)' : 'auto',
            left: isMobileLayout ? 'auto' : 0,
            right: isMobileLayout ? 0 : 'auto',
            marginTop: isMobileLayout ? 0 : 6,
            overflow: 'hidden',
            maxHeight: isMobileLayout ? 320 : 400,
            overflowY: 'auto'
          }}
        >
          {renderDropdownSection(
            'create',
            'Create',
            [
              { key: 'classic', label: 'Classic Sticky Note', action: () => onAddStickyNote() },
              { key: 'header', label: 'Header Note', action: () => onAddStickyNote('header-note') },
              { key: 'textbox', label: 'Text Box', action: () => onAddTextBox() },
              { key: 'checklist', label: 'Checklist', action: () => onAddChecklist() }
            ],
            (option) => (
              <DeskMenuItemButton
                key={option.key}
                type="button"
                onClick={() => runAndClose(option.action)}
                style={{ padding: '8px 12px' }}
              >
                {option.label}
              </DeskMenuItemButton>
            ),
            {}
          )}

          {renderDropdownSection('quickPicks', 'Quick Picks', quickDecorationOptions, renderDecorationButton, { bordered: true })}
          {renderDropdownSection('paperSet', 'Paper Set', paperDecorationOptions, renderDecorationButton, { bordered: true })}
          {renderDropdownSection('deskAccents', 'Desk Accents', deskDecorationOptions, renderDecorationButton, { bordered: true })}
        </DeskMenuPanel>
      )}
    </div>
  )
}
