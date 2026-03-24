import { Component } from 'react'

class DeskErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Desk render error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc' }}>
          <div style={{ maxWidth: 520, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)', padding: 20 }}>
            <h2 style={{ marginTop: 0, marginBottom: 8, color: '#0f172a' }}>Something went wrong</h2>
            <p style={{ marginTop: 0, marginBottom: 14, color: '#334155', lineHeight: 1.5 }}>
              We hit a runtime issue while loading your desk. Please reload the app.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '10px 14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default DeskErrorBoundary
