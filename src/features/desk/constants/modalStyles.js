export const modalStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    color: '#222'
  },
  title: { marginBottom: 10, fontWeight: 600 },
  actions: { textAlign: 'right' },
  secondaryButton: {
    padding: '6px 12px',
    borderRadius: 4,
    border: 'none',
    background: '#eee',
    color: '#333',
    cursor: 'pointer'
  },
  primaryButton: {
    padding: '6px 12px',
    borderRadius: 4,
    border: 'none',
    background: '#4285F4',
    color: '#fff',
    cursor: 'pointer'
  },
  dangerButton: {
    padding: '6px 12px',
    borderRadius: 4,
    border: 'none',
    background: '#d32f2f',
    color: '#fff',
    cursor: 'pointer'
  }
}