import React, { useEffect, useRef, useState, useCallback, Suspense, lazy, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import './App.css';
import { ThemeProvider } from './ThemeContext';
import gsap from 'gsap';

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
    <div className="error-boundary" role="alert">
      <div className="error-content">
        <h2>Something went wrong</h2>
        <pre>{error.message}</pre>
        <button onClick={resetErrorBoundary} className="retry-button">
          Try again
        </button>
      </div>
    </div>
  );
}

// Enhanced Loading Component
const EnhancedLoadingSpinner = ({ message = "Loading..." }) => (
  <div className="enhanced-loading-container">
    <div className="loading-spinner">
      <div className="spinner-ring"><div></div><div></div><div></div><div></div></div>
    </div>
    <p className="loading-message">{message}</p>
  </div>
);

// Web Vitals Tracking
function sendToAnalytics(metric) {
  // Send to your analytics service
  if (window.gtag) {
    window.gtag('event', 'web-vitals', {
      event_category: 'Web Vitals',
      event_label: metric.name,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
  
  // Send to backend analytics endpoint
  if (process.env.REACT_APP_WEB_VITALS_ENDPOINT) {
    fetch(process.env.REACT_APP_WEB_VITALS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    }).catch(err => console.warn('Failed to send web vitals:', err));
  }
}

function App() {
  // Enhanced state management
  const [activeFilters, setActiveFilters] = useState({
    category: 'all',
    bias: 'all',
    source: 'all',
    dateRange: 'all',
    relevantOnly: false
  });
  const [viewMode, setViewMode] = useState('articles'); // articles | stories | comparison
  const [sortBy, setSortBy] = useState('publishedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [performanceMetrics, setPerformanceMetrics] = useState({});

  // Refs for animations and performance tracking
  const appRef = useRef(null);
  const loadTimeRef = useRef(Date.now());

  // Enhanced filter management with validation
  const updateFilters = useCallback((newFilters) => {
    setActiveFilters(prevFilters => {
      const updatedFilters = { ...prevFilters, ...newFilters };
      
      // Validate filter combinations
      if (updatedFilters.bias !== 'all' && updatedFilters.category === 'sports') {
        updatedFilters.bias = 'all'; // Sports articles typically don't have political bias
      }
      
      // Log filter changes for analytics
      if (window.gtag) {
        window.gtag('event', 'filter_change', {
          event_category: 'User Interaction',
          event_label: Object.keys(newFilters)[0],
          value: Object.values(newFilters)[0],
        });
      }
      
      return updatedFilters;
    });
  }, []);

  // Enhanced search functionality
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    
    // Analytics tracking
    if (window.gtag && query.trim()) {
      window.gtag('event', 'search', {
        search_term: query.trim(),
      });
    }
  }, []);

  // Enhanced sorting with validation
  const handleSort = useCallback((field, order = 'desc') => {
    const validSortFields = ['publishedAt', 'biasScore', 'biasConfidence', 'title'];
    const validOrders = ['asc', 'desc'];
    
    if (validSortFields.includes(field) && validOrders.includes(order)) {
      setSortBy(field);
      setSortOrder(order);
      
      // Analytics tracking
      if (window.gtag) {
        window.gtag('event', 'sort_change', {
          sort_field: field,
          sort_order: order,
        });
      }
    }
  }, []);

  // Enhanced view mode switching
  const handleViewModeChange = useCallback((mode) => {
    const validModes = ['articles', 'stories', 'comparison'];
    if (validModes.includes(mode)) {
      setViewMode(mode);
      
      // Close sidebar on mobile when changing views
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
      
      // Analytics tracking
      if (window.gtag) {
        window.gtag('event', 'view_mode_change', {
          event_category: 'User Interaction',
          event_label: mode,
        });
      }
    }
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Refetch data when coming back online
      queryClient.invalidateQueries();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enhanced GSAP animations with performance optimization
  useEffect(() => {
    if (!appRef.current) return;

    // Initial app entrance animation
    const ctx = gsap.context(() => {
      gsap.fromTo('.app-header', 
        { opacity: 0, y: -30 }, 
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      );
      gsap.fromTo('.sidebar-container', 
        { opacity: 0, x: -50 }, 
        { opacity: 1, x: 0, duration: 0.6, delay: 0.2, ease: "power2.out" }
      );
      gsap.fromTo('.main-content', 
        { opacity: 0, scale: 0.95 }, 
        { opacity: 1, scale: 1, duration: 0.8, delay: 0.4, ease: "power2.out" }
      );
      
      // Animate theme toggle button
      gsap.fromTo('.theme-toggle-container', 
        { scale: 0, rotation: -180 }, 
        { scale: 1, rotation: 0, duration: 0.6, delay: 0.6, ease: "back.out(1.7)" }
      );
    }, appRef);

    return () => ctx.revert(); // Cleanup
  }, []);

  // Performance monitoring with Web Vitals
  useEffect(() => {
    // Track app load time
    const loadTime = Date.now() - loadTimeRef.current;
    setPerformanceMetrics(prev => ({ ...prev, loadTime }));

    // Web Vitals measurements
    getCLS(sendToAnalytics);
    getFID(sendToAnalytics);
    getFCP(sendToAnalytics);
    getLCP(sendToAnalytics);
    getTTFB(sendToAnalytics);

    // Custom performance metrics
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          setPerformanceMetrics(prev => ({ ...prev, [entry.name]: entry.duration }));
        }
      }
    });
    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Ctrl/Cmd + K for search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        // Focus search input (implement this in your search component)
        const searchInput = document.querySelector('input[type="search"]');
        if (searchInput) searchInput.focus();
      }
      
      // Escape to close sidebar
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Enhanced responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false); // Close sidebar on desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Memoized computed values for performance
  const hasActiveFilters = useMemo(() => {
    return Object.values(activeFilters).some(value => 
      value !== 'all' && value !== false && value !== ''
    );
  }, [activeFilters]);

  const shouldShowComparison = useMemo(() => {
    return viewMode === 'comparison' && selectedArticle;
  }, [viewMode, selectedArticle]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('App Error Boundary:', error, errorInfo);
        // Send error to analytics
        if (window.gtag) {
          window.gtag('event', 'exception', {
            description: error.message,
            fatal: false,
          });
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <HelmetProvider>
            <Router>
              <div className="App" ref={appRef}>
                <Helmet>
                  <title>TheNarrative - Unbiased News Analysis</title>
                  <meta name="description" content="Get comprehensive news coverage with AI-powered bias detection and multiple perspectives on every story." />
                  <meta name="keywords" content="news, bias detection, political analysis, unbiased news, news comparison" />
                  <meta property="og:title" content="TheNarrative - Unbiased News Analysis" />
                  <meta property="og:description" content="Comprehensive news coverage with AI-powered bias detection" />
                  <meta property="og:type" content="website" />
                  <link rel="canonical" href={window.location.href} />
                </Helmet>

                {/* Online/Offline Indicator */}
                {!isOnline && (
                  <div className="offline-banner" role="banner">
                    <span>You're currently offline. Some features may not work.</span>
                  </div>
                )}

                {/* Enhanced App Header */}
                <header className="app-header" role="banner">
                  <div className="header-content">
                    <div className="header-left">
                      <button 
                        className="sidebar-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label="Toggle sidebar"
                        aria-expanded={sidebarOpen}
                      >
                        <span className="hamburger">
                          <span></span>
                          <span></span>
                          <span></span>
                        </span>
                      </button>
                      <h1 className="app-title">TheNarrative</h1>
                      {hasActiveFilters && (
                        <span className="active-filters-indicator" title="Filters applied">
                          <span></span>
                        </span>
                      )}
                    </div>

                    <div className="header-center">
                      <nav className="view-mode-selector" role="tablist">
                        <button 
                          className={`view-button ${viewMode === 'articles' ? 'active' : ''}`}
                          onClick={() => handleViewModeChange('articles')}
                          role="tab"
                          aria-selected={viewMode === 'articles'}
                          aria-label="Articles view"
                        >
                          Articles
                        </button>
                        <button 
                          className={`view-button ${viewMode === 'stories' ? 'active' : ''}`}
                          onClick={() => handleViewModeChange('stories')}
                          role="tab"
                          aria-selected={viewMode === 'stories'}
                          aria-label="Stories view"
                        >
                          Stories
                        </button>
                        <button 
                          className={`view-button ${viewMode === 'comparison' ? 'active' : ''}`}
                          onClick={() => handleViewModeChange('comparison')}
                          role="tab"
                          aria-selected={viewMode === 'comparison'}
                          aria-label="Comparison view"
                          disabled={!selectedArticle}
                        >
                          Compare
                        </button>
                      </nav>
                    </div>

                    <div className="header-right">
                      <div className="header-widgets">
                        <Suspense fallback={<div className="widget-loading"><div></div></div>}>
                          <WeatherWidget />
                        </Suspense>
                        <Suspense fallback={<div className="widget-loading"><div></div></div>}>
                          <MarketUpdates />
                        </Suspense>
                      </div>
                      <div className="theme-toggle-container">
                        <Suspense fallback={<div className="toggle-loading"><div></div></div>}>
                          <ThemeToggle />
                        </Suspense>
                      </div>
                    </div>
                  </div>
                </header>

                {/* Enhanced Main Content Area */}
                <main className="main-container" role="main">
                  <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
                    
                    {/* Enhanced Sidebar - FIXED: Removed redundant role="complementary" */}
                    <aside 
                      className={`sidebar-container ${sidebarOpen ? 'open' : ''}`}
                      aria-label="Filters and navigation"
                    >
                      <Suspense fallback={<EnhancedLoadingSpinner message="Loading filters..." />}>
                        <SidebarWithFilters 
                          activeFilters={activeFilters}
                          onFiltersChange={updateFilters}
                          onSearch={handleSearch}
                          searchQuery={searchQuery}
                          onSort={handleSort}
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                          viewMode={viewMode}
                          onClose={() => setSidebarOpen(false)}
                          performanceMetrics={performanceMetrics}
                        />
                      </Suspense>
                    </aside>

                    {/* Enhanced Main Content */}
                    <div className="main-content" role="tabpanel">
                      <Routes>
                        <Route path="/" element={
                          <Suspense fallback={<EnhancedLoadingSpinner message="Loading news feed..." />}>
                            {shouldShowComparison ? (
                              <CompareCoverage 
                                article={selectedArticle}
                                onClose={() => {
                                  setSelectedArticle(null);
                                  setViewMode('articles');
                                }}
                              />
                            ) : (
                              <NewsFeed 
                                activeFilters={activeFilters}
                                viewMode={viewMode}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                searchQuery={searchQuery}
                                onArticleSelect={setSelectedArticle}
                                selectedArticle={selectedArticle}
                                isOnline={isOnline}
                              />
                            )}
                          </Suspense>
                        } />
                        
                        <Route path="/sports" element={
                          <Suspense fallback={<EnhancedLoadingSpinner message="Loading sports..." />}>
                            <SportsSchedule />
                          </Suspense>
                        } />
                        
                        <Route path="/markets" element={
                          <Suspense fallback={<EnhancedLoadingSpinner message="Loading markets..." />}>
                            <MarketUpdates />
                          </Suspense>
                        } />
                        
                        {/* Catch-all route */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </div>
                  </div>
                </main>

                {/* Enhanced Footer with Performance Info */}
                {process.env.NODE_ENV === 'development' && (
                  <footer className="debug-footer">
                    <div className="debug-info">
                      <span>Load: {performanceMetrics.loadTime}ms</span>
                      <span>Filters: {Object.keys(activeFilters).length}</span>
                      <span>Mode: {viewMode}</span>
                      <span>{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </footer>
                )}

                {/* Sidebar Overlay for Mobile */}
                {sidebarOpen && (
                  <div 
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSidebarOpen(false);
                      }
                    }}
                  />
                )}
              </div>
            </Router>
          </HelmetProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
