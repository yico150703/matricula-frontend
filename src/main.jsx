import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '2rem' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', maxWidth: '540px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>⚠️</span>
            <h2 style={{ color: '#0f172a', margin: '0.75rem 0' }}>Se presentó un problema al cargar</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {this.state.error?.message || 'Ha ocurrido un error inesperado en la interfaz.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                className="btn-primary"
                onClick={() => {
                  localStorage.removeItem('matricula_token')
                  window.location.href = '/login'
                }}
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Limpiar sesión y reiniciar
              </button>
              <button
                className="btn-secondary"
                onClick={() => window.location.reload()}
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
