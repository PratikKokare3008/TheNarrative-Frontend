import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Enhanced web vitals reporting
function sendToAnalytics({ name, delta, value, id }) {
  // Send to Google Analytics
  if (window.gtag) {
    window.gtag('event', name, {
      event_category: 'Web Vitals',
      event_label: id,
      value: Math.round(name === 'CLS' ? delta * 1000 : delta),
      non_interaction: true,
    });
  }

  // Send to backend analytics
  if (process.env.REACT_APP_WEB_VITALS_ENDPOINT) {
    fetch(process.env.REACT_APP_WEB_VITALS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        value,
        delta,
        id,
        timestamp: Date.now(),
        url: window.location.href
      }),
    }).catch(err => console.warn('Failed to send web vitals:', err));
  }
}

// Enhanced error boundary for the entire app
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Root Error Boundary caught an error:', error, errorInfo);
    
    // Report to analytics
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: true,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h1 style={{ color: '#dc2626', marginBottom: '16px' }}>
            🚨 Something went wrong
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px', maxWidth: '500px' }}>
            TheNarrative encountered an unexpected error. Please refresh the page or contact support if the problem persists.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              🔄 Refresh Page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              🔄 Try Again
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '24px', textAlign: 'left', fontSize: '14px' }}>
              <summary>Error Details (Development)</summary>
              <pre style={{ 
                backgroundColor: '#f8fafc', 
                padding: '12px', 
                borderRadius: '4px',
                overflow: 'auto',
                maxWidth: '100%'
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('root'));

// Enhanced rendering with error boundary
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);

// Enhanced web vitals reporting
reportWebVitals(sendToAnalytics);

// Additional performance measurements
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// Service Worker Registration
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              if (window.confirm('New version available! Refresh to update?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Performance monitoring
if (typeof window !== 'undefined') {
  window.performance.mark('react-start');
  window.addEventListener('load', () => {
    window.performance.mark('app-loaded');
    window.performance.measure('app-load-time', 'app-start', 'app-loaded');
  });
}
