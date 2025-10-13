import React, { 
  useEffect, 
  useRef, 
  useState, 
  useCallback, 
  Suspense, 
  lazy,
  useMemo 
} from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "react-query";

import "./App.css";
import { ThemeProvider } from "./ThemeContext";
import { gsap } from "gsap";

// Performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Lazy load components for optimal performance
const NewsFeed = lazy(() => import("./components/NewsFeed"));
const SportsSchedule = lazy(() => import("./components/SportsSchedule"));
const MarketUpdates = lazy(() => import("./components/MarketUpdates"));
const WeatherWidget = lazy(() => import("./components/WeatherWidget"));
const ThemeToggle = lazy(() => import("./components/ThemeToggle"));
const CompareCoverage = lazy(() => import("./components/CompareCoverage"));
const SidebarWithFilters = lazy(() => import("./components/SidebarWithFilters"));

// Create QueryClient for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Enhanced Loading component with animations
const LoadingSpinner = React.memo(() => (
  <div className="loading-container" aria-live="polite" role="status">
    <div className="loading-spinner">
      <div className="spinner-ring"></div>
      <div className="spinner-ring"></div>
      <div className="spinner-ring"></div>
    </div>
    <p className="loading-text">Loading The Narrative...</p>
  </div>
));

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="error-boundary" role="alert">
    <div className="error-content">
      <h2>Something went wrong</h2>
      <p>{error?.message || "An unexpected error occurred"}</p>
      <button 
        onClick={resetErrorBoundary}
        className="error-retry-btn"
        aria-label="Try again"
      >
        Try Again
      </button>
    </div>
  </div>
);

// Performance monitoring hook
const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Web Vitals monitoring
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);

    // Custom performance metrics
    const navigationStart = performance.timing.navigationStart;
    const domContentLoaded = performance.timing.domContentLoadedEventEnd - navigationStart;
    const windowLoaded = performance.timing.loadEventEnd - navigationStart;

    console.log(`Performance: DOM loaded in ${domContentLoaded}ms, Window loaded in ${windowLoaded}ms`);

    // Report to analytics (would integrate with actual analytics service)
    if (window.gtag) {
      window.gtag('event', 'page_load_time', {
        value: windowLoaded,
        custom_parameter: 'twosides_app'
      });
    }
  }, []);
};

// Enhanced App component with comprehensive optimizations
function App() {
  // State management
  const [currentView, setCurrentView] = useState("news");
  const [globalFilters, setGlobalFilters] = useState({
    category: 'all',
    bias: 'all',
    publication: 'all',
    sortBy: 'publishedAt',
    sortOrder: 'desc',
    dateFrom: '',
    dateTo: '',
    search: '',
    page: 1
  });
  const [selectedStory, setSelectedStory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [networkStatus, setNetworkStatus] = useState('online');

  // Refs for animations and performance
  const appRef = useRef();
  const loadTimeRef = useRef(Date.now());

  // Performance monitoring
  usePerformanceMonitoring();

  // Network status monitoring
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  // Initial app setup and animations
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Simulate initial data loading
        await new Promise(resolve => setTimeout(resolve, 1000));

        // GSAP entrance animations
        if (appRef.current) {
          gsap.fromTo(appRef.current, 
            { opacity: 0, y: 20 },
            { 
              opacity: 1, 
              y: 0, 
              duration: 0.8, 
              ease: "power2.out",
              delay: 0.2
            }
          );
        }

        setIsLoading(false);

        // Performance tracking
        const loadTime = Date.now() - loadTimeRef.current;
        console.log(`App initialized in ${loadTime}ms`);

        // Report to performance monitoring
        if (window.gtag) {
          window.gtag('event', 'app_initialization', {
            value: loadTime,
            custom_parameter: 'twosides_complete_load'
          });
        }

      } catch (err) {
        console.error('App initialization error:', err);
        setError(err);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Memoized handlers for performance
  const handleViewChange = useCallback((view) => {
    setCurrentView(view);

    // Analytics tracking
    if (window.gtag) {
      window.gtag('event', 'view_change', {
        view_name: view,
        custom_parameter: 'navigation'
      });
    }
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setGlobalFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters,
      page: 1 // Reset page when filters change
    }));
  }, []);

  const handleStorySelect = useCallback((story) => {
    setSelectedStory(story);
  }, []);

  const handleError = useCallback((error) => {
    console.error('App error:', error);
    setError(error);

    // Error reporting
    if (window.gtag) {
      window.gtag('event', 'app_error', {
        error_message: error?.message || 'Unknown error',
        error_stack: error?.stack || 'No stack trace'
      });
    }
  }, []);

  // Memoized view components for performance
  const viewComponents = useMemo(() => ({
    news: (
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
        <Suspense fallback={<LoadingSpinner />}>
          <NewsFeed 
            filters={globalFilters}
            onFilterChange={handleFilterChange}
            onError={handleError}
            onStorySelect={handleStorySelect}
          />
        </Suspense>
      </ErrorBoundary>
    ),
    sports: (
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
        <Suspense fallback={<LoadingSpinner />}>
          <SportsSchedule />
        </Suspense>
      </ErrorBoundary>
    ),
    markets: (
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
        <Suspense fallback={<LoadingSpinner />}>
          <MarketUpdates />
        </Suspense>
      </ErrorBoundary>
    ),
    weather: (
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
        <Suspense fallback={<LoadingSpinner />}>
          <WeatherWidget />
        </Suspense>
      </ErrorBoundary>
    )
  }), [globalFilters, handleFilterChange, handleError, handleStorySelect]);

  // SEO metadata based on current view
  const seoData = useMemo(() => {
    const baseTitle = "TwoSides - Unbiased News with AI Bias Detection";
    const baseDescription = "Professional news aggregation platform with advanced AI-powered bias detection. Get comprehensive perspectives on political and world news.";

    const viewMetadata = {
      news: {
        title: `${baseTitle} | Latest News`,
        description: `${baseDescription} Browse latest political news with bias analysis.`,
        keywords: "news, bias detection, political news, unbiased reporting, AI analysis"
      },
      sports: {
        title: `Sports News | ${baseTitle}`,
        description: "Latest sports news, schedules, and updates from around the world.",
        keywords: "sports news, sports schedules, athletics, games"
      },
      markets: {
        title: `Market Updates | ${baseTitle}`,
        description: "Real-time financial news and market updates with bias-free analysis.",
        keywords: "financial news, market updates, business news, economy"
      },
      weather: {
        title: `Weather | ${baseTitle}`,
        description: "Current weather conditions and forecasts.",
        keywords: "weather, forecast, conditions, temperature"
      }
    };

    return viewMetadata[currentView] || viewMetadata.news;
  }, [currentView]);

  // Loading state
  if (isLoading) {
    return (
      <HelmetProvider>
        <div className="app-loading">
          <Helmet>
            <title>Loading - TwoSides News</title>
            <meta name="description" content="Loading TwoSides news platform..." />
          </Helmet>
          <LoadingSpinner />
        </div>
      </HelmetProvider>
    );
  }

  // Error state
  if (error) {
    return (
      <HelmetProvider>
        <div className="app-error">
          <Helmet>
            <title>Error - TwoSides News</title>
            <meta name="description" content="An error occurred while loading TwoSides." />
          </Helmet>
          <ErrorFallback 
            error={error} 
            resetErrorBoundary={() => {
              setError(null);
              window.location.reload();
            }} 
          />
        </div>
      </HelmetProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider>
          <Router>
            <div className="App" ref={appRef} data-testid="main-app">
              {/* SEO and Meta Tags */}
              <Helmet>
                <title>{seoData.title}</title>
                <meta name="description" content={seoData.description} />
                <meta name="keywords" content={seoData.keywords} />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="theme-color" content="#21808D" />
                <meta property="og:title" content={seoData.title} />
                <meta property="og:description" content={seoData.description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={window.location.href} />
                <meta property="og:site_name" content="TwoSides News" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={seoData.title} />
                <meta name="twitter:description" content={seoData.description} />
                <link rel="canonical" href={window.location.href} />

                {/* Performance and PWA */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="manifest" href="/manifest.json" />

                {/* Structured Data */}
                <script type="application/ld+json">
                  {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "NewsMediaOrganization",
                    "name": "TwoSides News",
                    "description": "AI-powered news aggregation with bias detection",
                    "url": window.location.origin,
                    "logo": `${window.location.origin}/logo192.png`,
                    "sameAs": []
                  })}
                </script>
              </Helmet>

              {/* Offline Indicator */}
              {networkStatus === 'offline' && (
                <div className="offline-indicator" role="alert">
                  <span>📡</span> You're currently offline. Some features may be limited.
                </div>
              )}

              <Routes>
                {/* Main Application Route */}
                <Route path="/" element={
                  <main className="main-content" role="main">
                    {/* Enhanced Sidebar with Filters */}
                    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
                      <Suspense fallback={<div className="sidebar-loading">Loading filters...</div>}>
                        <SidebarWithFilters
                          currentView={currentView}
                          onViewChange={handleViewChange}
                          filters={globalFilters}
                          onFilterChange={handleFilterChange}
                          className="app-sidebar"
                        />
                      </Suspense>
                    </ErrorBoundary>

                    {/* Main Content Area */}
                    <section className="content-area" aria-label={`${currentView} content`}>
                      {/* Theme Toggle */}
                      <div className="theme-toggle-container">
                        <ErrorBoundary FallbackComponent={() => null}>
                          <Suspense fallback={null}>
                            <ThemeToggle />
                          </Suspense>
                        </ErrorBoundary>
                      </div>

                      {/* Dynamic View Content */}
                      {viewComponents[currentView] || viewComponents.news}

                      {/* Compare Coverage Modal */}
                      {selectedStory && (
                        <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
                          <Suspense fallback={<LoadingSpinner />}>
                            <CompareCoverage
                              story={selectedStory}
                              onClose={() => setSelectedStory(null)}
                            />
                          </Suspense>
                        </ErrorBoundary>
                      )}
                    </section>
                  </main>
                } />

                {/* Additional Routes for Deep Linking */}
                <Route path="/news" element={<Navigate to="/" replace />} />
                <Route path="/sports" element={
                  <main className="main-content">
                    <ErrorBoundary FallbackComponent={ErrorFallback}>
                      <Suspense fallback={<LoadingSpinner />}>
                        <SportsSchedule />
                      </Suspense>
                    </ErrorBoundary>
                  </main>
                } />
                <Route path="/markets" element={
                  <main className="main-content">
                    <ErrorBoundary FallbackComponent={ErrorFallback}>
                      <Suspense fallback={<LoadingSpinner />}>
                        <MarketUpdates />
                      </Suspense>
                    </ErrorBoundary>
                  </main>
                } />
                <Route path="/weather" element={
                  <main className="main-content">
                    <ErrorBoundary FallbackComponent={ErrorFallback}>
                      <Suspense fallback={<LoadingSpinner />}>
                        <WeatherWidget />
                      </Suspense>
                    </ErrorBoundary>
                  </main>
                } />

                {/* 404 Route */}
                <Route path="*" element={
                  <div className="not-found">
                    <h1>Page Not Found</h1>
                    <p>The page you're looking for doesn't exist.</p>
                    <button onClick={() => window.location.href = '/'}>
                      Go to Home
                    </button>
                  </div>
                } />
              </Routes>

              {/* Skip to Content Link for Accessibility */}
              <a href="#main-content" className="skip-link">
                Skip to main content
              </a>

              {/* Service Worker Registration */}
              <script>
                {`
                  if ('serviceWorker' in navigator) {
                    window.addEventListener('load', () => {
                      navigator.serviceWorker.register('/sw.js')
                        .then((registration) => {
                          console.log('SW registered: ', registration);
                        })
                        .catch((registrationError) => {
                          console.log('SW registration failed: ', registrationError);
                        });
                    });
                  }
                `}
              </script>
            </div>
          </Router>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
