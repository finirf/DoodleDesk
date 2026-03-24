import { DeskMenuItemButton } from '../components/DeskUiPrimitives'

export default function useDeskShelfTreeRenderers({
  builtInShelves,
  handleSelectDesk,
  selectedDeskId,
  getDeskNameValue,
  getDeskGroupLabel,
  desksByShelfId,
  getChildDeskShelves,
  expandedDeskShelves,
  toggleDeskShelfExpanded,
  showShelfHierarchyTools,
  setShowShelfHierarchyTools,
  newShelfNameInput,
  setNewShelfNameInput,
  setShelfActionError,
  menuCompactInputStyle,
  menuPrimaryActionStyle,
  createDeskShelf,
  newShelfParentId,
  setNewShelfParentId,
  menuSelectStyle,
  customShelfOptions,
  currentDesk,
  getDeskAssignedCustomShelfId,
  setSelectedDeskCustomShelf,
  shelfActionError,
  renameDeskShelf,
  deleteDeskShelf
}) {
  function renderDeskRow(desk, depth = 0) {
    return (
      <button
        key={desk.id}
        type="button"
        onClick={() => handleSelectDesk(desk)}
        style={{
          width: '100%',
          padding: '8px 10px',
          paddingLeft: 10 + depth * 14,
          border: 'none',
          borderRadius: 4,
          marginBottom: 2,
          background: desk.id === selectedDeskId ? '#eef4ff' : '#fff',
          color: '#222',
          cursor: 'pointer',
          fontWeight: desk.id === selectedDeskId ? 600 : 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getDeskNameValue(desk)}
        </span>
        <span
          style={{
            fontSize: 11,
            color: '#666',
            fontWeight: 500,
            flexShrink: 0,
            textAlign: 'right'
          }}
        >
          {getDeskGroupLabel(desk)}
        </span>
      </button>
    )
  }

  function renderCustomShelfTree(shelf, depth = 1) {
    const shelfDesks = desksByShelfId[shelf.id] || []
    const childShelves = getChildDeskShelves(shelf.id)
    const isExpanded = expandedDeskShelves[shelf.id] ?? true

    return (
      <div key={shelf.id}>
        <div
          style={{
            display: 'flex',
            gap: 4,
            alignItems: 'stretch',
            marginBottom: 2
          }}
        >
          <button
            type="button"
            onClick={() => toggleDeskShelfExpanded(shelf.id)}
            style={{
              flex: 1,
              textAlign: 'left',
              padding: '6px 10px',
              paddingLeft: 10 + depth * 14,
              border: 'none',
              borderRadius: 4,
              background: '#f8f9fb',
              color: '#333',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {isExpanded ? '▼' : '▶'} {shelf.name}
          </button>
          {showShelfHierarchyTools && (
            <>
              <button
                type="button"
                onClick={() => renameDeskShelf(shelf.id)}
                aria-label={`Rename shelf ${shelf.name}`}
                title="Rename shelf"
                style={{
                  border: 'none',
                  borderRadius: 4,
                  background: '#e8f0fe',
                  color: '#1a73e8',
                  cursor: 'pointer',
                  padding: '0 7px',
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => deleteDeskShelf(shelf.id)}
                aria-label={`Delete shelf ${shelf.name}`}
                title="Delete shelf"
                style={{
                  border: 'none',
                  borderRadius: 4,
                  background: '#fdecea',
                  color: '#d93025',
                  cursor: 'pointer',
                  padding: '0 7px',
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                ×
              </button>
            </>
          )}
        </div>
        {isExpanded && (
          <>
            {shelfDesks.map((desk) => renderDeskRow(desk, depth + 1))}
            {childShelves.map((childShelf) => renderCustomShelfTree(childShelf, depth + 1))}
          </>
        )}
      </div>
    )
  }

  function renderDeskShelfTree() {
    return (
      <>
        {builtInShelves.map((shelfDef) => {
          const isExpanded = expandedDeskShelves[shelfDef.id] ?? true
          const shelfDesks = desksByShelfId[shelfDef.id] || []

          return (
            <div key={shelfDef.id}>
              <DeskMenuItemButton
                type="button"
                onClick={() => toggleDeskShelfExpanded(shelfDef.id)}
                strong
                style={{
                  background: 'var(--ui-surface-soft)',
                  color: 'var(--ui-ink-muted)',
                  fontSize: 12,
                  padding: '6px 10px',
                  marginBottom: 2
                }}
              >
                {isExpanded ? '▼' : '▶'} {shelfDef.label}
              </DeskMenuItemButton>
              {isExpanded && shelfDesks.map((desk) => renderDeskRow(desk, 1))}
            </div>
          )
        })}

        <div>
          <DeskMenuItemButton
            type="button"
            onClick={() => toggleDeskShelfExpanded('__custom_root')}
            strong
            style={{
              background: 'var(--ui-surface-soft)',
              color: 'var(--ui-ink-muted)',
              fontSize: 12,
              padding: '6px 10px',
              marginBottom: 2
            }}
          >
            {(expandedDeskShelves.__custom_root ?? true) ? '▼' : '▶'} Custom Shelves
          </DeskMenuItemButton>
          {(expandedDeskShelves.__custom_root ?? true) && (
            getChildDeskShelves(null).map((shelf) => renderCustomShelfTree(shelf, 1))
          )}
        </div>
      </>
    )
  }

  function renderShelfOrganizerPanel() {
    return (
      <>
        <DeskMenuItemButton
          type="button"
          onClick={() => setShowShelfHierarchyTools((prev) => !prev)}
          strong
          style={{
            padding: '7px 10px',
            border: '1px solid var(--ui-border)',
            background: 'var(--ui-surface)',
            color: 'var(--ui-ink-muted)',
            fontSize: 12,
            letterSpacing: 0.2,
            marginBottom: 2
          }}
        >
          Shelf Organizer
        </DeskMenuItemButton>

        {showShelfHierarchyTools && (
          <>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6, marginBottom: 4 }}>Shelf Hierarchy</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={newShelfNameInput}
                onChange={(e) => {
                  setShelfActionError('')
                  setNewShelfNameInput(e.target.value)
                }}
                placeholder="New shelf name"
                style={menuCompactInputStyle}
              />
              <DeskMenuItemButton
                type="button"
                onClick={createDeskShelf}
                fullWidth={false}
                style={menuPrimaryActionStyle}
              >
                Add
              </DeskMenuItemButton>
            </div>

            <div style={{ marginTop: 6 }}>
              <select
                value={newShelfParentId}
                onChange={(e) => {
                  setShelfActionError('')
                  setNewShelfParentId(e.target.value)
                }}
                style={menuSelectStyle}
              >
                <option value="">Top-level custom shelf</option>
                {customShelfOptions.map((shelfOption) => (
                  <option key={shelfOption.id} value={shelfOption.id}>
                    {'· '.repeat(shelfOption.depth)}{shelfOption.name}
                  </option>
                ))}
              </select>
            </div>

            {currentDesk && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--ui-ink-soft)', marginBottom: 4 }}>Move current desk</div>
                <select
                  value={getDeskAssignedCustomShelfId(currentDesk.id)}
                  onChange={(e) => setSelectedDeskCustomShelf(e.target.value)}
                  style={menuSelectStyle}
                >
                  <option value="">Auto ({getDeskGroupLabel(currentDesk)})</option>
                  {customShelfOptions.map((shelfOption) => (
                    <option key={shelfOption.id} value={shelfOption.id}>
                      {'· '.repeat(shelfOption.depth)}{shelfOption.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {shelfActionError && (
              <div style={{ marginTop: 4, color: 'var(--ui-danger)', fontSize: 11 }}>{shelfActionError}</div>
            )}
          </>
        )}
      </>
    )
  }

  return {
    renderDeskRow,
    renderCustomShelfTree,
    renderDeskShelfTree,
    renderShelfOrganizerPanel
  }
}
