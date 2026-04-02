const tutorialSteps = [
  {
    title: 'Add something fast',
    body: 'Open New Item to create a sticky note, checklist, or decoration on the current desk.'
  },
  {
    title: 'Organize the workspace',
    body: 'Use the Desk menu to switch desks, create a new desk, manage members, and rearrange shelves.'
  },
  {
    title: 'Use More for controls',
    body: 'The More dropdown holds snap-to-grid, background changes, import/export, and this tutorial.'
  },
  {
    title: 'Work faster with shortcuts',
    body: 'Try Cmd/Ctrl+K for the command palette and Cmd/Ctrl+Z for undo and redo.'
  }
]

export default function DeskTutorialModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        background: 'rgba(12, 14, 20, 0.58)',
        backdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: 16
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
    >
      <div
        style={{
          width: 'min(680px, 100%)',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: 20,
          border: '1px solid var(--ui-border-strong)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,247,251,0.98))',
          color: 'var(--ui-ink)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)',
          padding: 24
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ui-primary-strong)', marginBottom: 8 }}>
              Welcome to DoodleDesk
            </div>
            <h2 id="tutorial-modal-title" style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>
              Quick start for new users
            </h2>
            <p style={{ margin: '10px 0 0', color: 'var(--ui-ink-muted)', fontSize: 14, lineHeight: 1.5 }}>
              This short guide shows the three places you'll use most often: New Item, Desk, and More.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close tutorial"
            style={{
              border: '1px solid var(--ui-border)',
              background: 'var(--ui-surface-soft)',
              color: 'var(--ui-ink-muted)',
              borderRadius: 999,
              width: 36,
              height: 36,
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: 18,
              lineHeight: 1
            }}
          >
            X
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 20 }}>
          {tutorialSteps.map((step, index) => (
            <div
              key={step.title}
              style={{
                borderRadius: 16,
                border: '1px solid var(--ui-border)',
                background: 'rgba(255, 255, 255, 0.75)',
                padding: 16,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--ui-primary-soft)', color: 'var(--ui-primary-strong)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                  {index + 1}
                </div>
                <h3 style={{ margin: 0, fontSize: 16 }}>{step.title}</h3>
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--ui-ink-muted)' }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--ui-border)',
              background: 'var(--ui-surface-soft)',
              color: 'var(--ui-ink-muted)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
