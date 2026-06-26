import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--dash-panel, #222)', color: 'var(--dash-text, #fff)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: 'var(--orange-500, #ff9800)' }}>⚠️ Something went wrong.</h2>
          <p style={{ maxWidth: '400px', opacity: 0.8 }}>
            A component crashed. Mission Control is highly complex, and an unexpected error occurred.
          </p>
          <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', maxWidth: '80%', overflowX: 'auto', fontSize: '0.85rem' }}>
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--pine-600, #2e7d32)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
