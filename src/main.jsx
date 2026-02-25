import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

try {
  if (window.top !== window.self) {
    window.top.location = window.self.location
  }
} catch {
  window.location.href = window.location.href
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
