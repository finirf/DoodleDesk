export const modalStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(8, 14, 26, 0.38)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    background: 'var(--ui-glass)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--ui-border)',
    borderRadius: 14,
    padding: 16,
    boxShadow: 'var(--ui-shadow-floating)',
    color: 'var(--ui-ink)'
  },
  title: { marginBottom: 10, fontWeight: 600 },
  actions: { textAlign: 'right' },
  secondaryButton: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid var(--ui-border)',
    background: 'var(--ui-surface-soft)',
    color: 'var(--ui-ink-muted)',
    cursor: 'pointer'
  },
  primaryButton: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid var(--ui-primary-strong)',
    background: 'var(--ui-primary)',
    color: '#fff',
    cursor: 'pointer'
  },
  dangerButton: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid var(--ui-danger)',
    background: 'var(--ui-danger)',
    color: '#fff',
    cursor: 'pointer'
  }
}