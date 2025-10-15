import React, { useEffect, useRef, useState, useCallback, Suspense, lazy, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import './App.css';
import { ThemeProvider } from './ThemeContext';
import { gsap } from 'gsap';

// Performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Lazy load components for optimal performance
const NewsFeed = lazy(() => import('./components/NewsFeed'));
const SportsSchedule = lazy(() => import('./components/SportsSchedule'));
const MarketUpdates = lazy(() => import('./components/MarketUpdates'));
const WeatherWidget = lazy(() => import('./components/WeatherWidget'));
const ThemeToggle = lazy(() => import('./components/ThemeToggle'));
const CompareCoverage = lazy(() => import('./components/CompareCoverage'));
const SidebarWithFilters = lazy(() => import('./components/SidebarWithFilters'));

// Create QueryClient for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (error?.response?.status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

// Enhanced Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="error-fallback">
      <div className="error-content">
        <h2>⚠️ Something went wrong</h2>
        <p className="error-message">{error.message}</p>
        <div className="error-actions">
          <button onClick={resetErrorBoundary} className="retry-btn">
            🔄 Try again
          </button>
          <button onClick={() => window.location.reload()} className="refresh-btn">
            🔃 Refresh Page
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="error-details">
            <summary>Error Details</summary>
            <pre>{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

// Enhanced Loading Component
function AppLoading({ message = "Loading TheNarrative..." }) {
  return (
    <div className="app-loading">
      <div className="loading-container">
        <div className="loading-logo">
          <div className="logo-text">TheNarrative</div>
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
        </div>
        <p className="loading-message">{message}</p>
        <div className="loading-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  // State Management
  const [activeView, setActiveView] = useState('news');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    bias: 'all',
    source: 'all',
    dateRange: 'all',
    relevantOnly: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('publishedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showComparison, setShowComparison] = useState(false);

  // Refs
  const appRef = useRef(null);
  const navRef = useRef(null);
  const contentRef = useRef(null);

  // Online/Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enhanced GSAP Animations
  useEffect(() => {
    if (!appRef.current) return;

    const ctx = gsap.context(() => {
      // Initial app animation
      gsap.fromTo(appRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out" }
      );

      // Navigation animation
      if (navRef.current) {
        gsap.fromTo('.nav-item',
          { opacity: 0, y: -20 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, delay: 0.2, ease: "power1.out" }
        );
      }

      // Content area animation
      if (contentRef.current) {
        gsap.fromTo(contentRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.6, delay: 0.3, ease: "power2.out" }
        );
      }
    }, appRef);

    return () => ctx.revert();
  }, []);

  // View change animation
  useEffect(() => {
    if (!contentRef.current) return;

    gsap.fromTo(contentRef.current,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.3, ease: "power1.out" }
    );
  }, [activeView]);

  // Event Handlers
  const handleViewChange = useCallback((view) => {
    setActiveView(view);
    setSelectedArticle(null);
    setShowComparison(false);
    
    // Analytics
    if (window.gtag) {
      window.gtag('event', 'view_change', {
        event_category: 'Navigation',
        event_label: view
      });
    }
  }, []);

  const handleArticleSelect = useCallback((article) => {
    setSelectedArticle(article);
    if (article) {
      setShowComparison(true);
    }
  }, []);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
    
    // Analytics
    if (window.gtag) {
      window.gtag('event', 'filters_change', {
        event_category: 'User Interaction',
        active_filters: Object.keys(newFilters).filter(key => 
          newFilters[key] !== 'all' && newFilters[key] !== false
        ).length
      });
    }
  }, []);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    
    // Analytics
    if (query && window.gtag) {
      window.gtag('event', 'search', {
        event_category: 'User Interaction',
        search_term: query
      });
    }
  }, []);

  const handleSort = useCallback((field, order) => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // View Components Mapping
  const viewComponents = useMemo(() => ({
    news: NewsFeed,
    sports: SportsSchedule,
    markets: MarketUpdates,
    weather: WeatherWidget
  }), []);

  const ActiveComponent = viewComponents[activeView] || NewsFeed;

  // Memoized Navigation Items
  const navigationItems = useMemo(() => [
    { id: 'news', label: '📰 News', component: 'NewsFeed' },
    { id: 'sports', label: '🏈 Sports', component: 'SportsSchedule' },
    { id: 'markets', label: '📈 Markets', component: 'MarketUpdates' },
    { id: 'weather', label: '🌤️ Weather', component: 'WeatherWidget' }
  ], []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Router>
            <div ref={appRef} className="App">
              <Helmet>
                <title>{`TheNarrative - ${navigationItems.find(item => item.id === activeView)?.label || 'News'}`}</title>
                <meta name="description" content="Advanced news bias detection platform with comprehensive political analysis" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="canonical" href={`https://thenarrative.vercel.app/${activeView}`} />
              </Helmet>

              {/* Global Loading State */}
              <Suspense fallback={<AppLoading />}>
                {/* Online/Offline Indicator */}
                {!isOnline && (
                  <div className="offline-banner">
                    📡 You're offline. Some features may not be available.
                  </div>
                )}

                {/* Header Navigation */}
                <header ref={navRef} className="app-header">
                  <div className="header-content">
                    <div className="logo-section">
                      <h1 className="app-title">TheNarrative</h1>
                      <span className="app-tagline">Unbiased News Analysis</span>
                    </div>

                    <nav className="main-navigation">
                      {navigationItems.map(item => (
                        <button
                          key={item.id}
                          className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                          onClick={() => handleViewChange(item.id)}
                          aria-current={activeView === item.id ? 'page' : undefined}
                        >
                          {item.label}
                        </button>
                      ))}
                    </nav>

                    <div className="header-actions">
                      <Suspense fallback={<div className="theme-toggle-loading">🌓</div>}>
                        <ThemeToggle />
                      </Suspense>
                      
                      <button
                        className={`sidebar-toggle ${isSidebarOpen ? 'active' : ''}`}
                        onClick={toggleSidebar}
                        aria-label="Toggle filters sidebar"
                      >
                        ⚙️ Filters
                      </button>
                    </div>
                  </div>
                </header>

                {/* Main Content Area */}
                <main className="app-main">
                  <div className="main-content">
                    {/* Sidebar */}
                    {isSidebarOpen && (
                      <Suspense fallback={<div className="sidebar-loading">Loading filters...</div>}>
                        <SidebarWithFilters
                          activeFilters={filters}
                          onFiltersChange={handleFiltersChange}
                          onSearch={handleSearch}
                          searchQuery={searchQuery}
                          onSort={handleSort}
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                          viewMode={activeView}
                          onClose={() => setIsSidebarOpen(false)}
                        />
                      </Suspense>
                    )}

                    {/* Primary Content */}
                    <div ref={contentRef} className={`content-area ${isSidebarOpen ? 'with-sidebar' : ''}`}>
                      <ErrorBoundary
                        FallbackComponent={ErrorFallback}
                        onReset={() => window.location.reload()}
                        resetKeys={[activeView]}
                      >
                        <Suspense 
                          fallback={
                            <AppLoading 
                              message={`Loading ${navigationItems.find(item => item.id === activeView)?.label}...`} 
                            />
                          }
                        >
                          <ActiveComponent
                            activeFilters={filters}
                            viewMode={activeView === 'news' ? 'articles' : activeView}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            searchQuery={searchQuery}
                            onArticleSelect={handleArticleSelect}
                            selectedArticle={selectedArticle}
                            isOnline={isOnline}
                            onViewModeChange={handleViewChange}
                          />
                        </Suspense>
                      </ErrorBoundary>
                    </div>
                  </div>

                  {/* Comparison Overlay */}
                  {showComparison && selectedArticle && (
                    <Suspense fallback={<AppLoading message="Loading comparison..." />}>
                      <CompareCoverage
                        article={selectedArticle}
                        onClose={() => {
                          setShowComparison(false);
                          setSelectedArticle(null);
                        }}
                        enhanced={true}
                      />
                    </Suspense>
                  )}
                </main>

                {/* Footer */}
                <footer className="app-footer">
                  <div className="footer-content">
                    <div className="footer-info">
                      <p>&copy; 2024 TheNarrative. Advanced news bias detection platform.</p>
                      <div className="footer-links">
                        <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
                        <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a>
                        <a href="/about" target="_blank" rel="noopener noreferrer">About</a>
                        <a href="https://github.com/PratikKokare3008/TheNarrative-Frontend" target="_blank" rel="noopener noreferrer">GitHub</a>
                      </div>
                    </div>
                    <div className="footer-stats">
                      <span className="connection-status">
                        {isOnline ? '🌐 Online' : '📡 Offline'}
                      </span>
                    </div>
                  </div>
                </footer>
              </Suspense>
            </div>

            {/* Routes for deep linking */}
            <Routes>
              <Route path="/" element={<Navigate to="/news" replace />} />
              <Route path="/news" element={<div />} />
              <Route path="/sports" element={<div />} />
              <Route path="/markets" element={<div />} />
              <Route path="/weather" element={<div />} />
              <Route path="*" element={<Navigate to="/news" replace />} />
            </Routes>
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
