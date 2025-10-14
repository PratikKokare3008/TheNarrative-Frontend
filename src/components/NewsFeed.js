import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect, Suspense, lazy } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery } from 'react-query';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Skeleton } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import axios from 'axios';
import moment from 'moment';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Lazy load components for performance
const NewsSummaryCard = lazy(() => import('./NewsSummaryCard'));
const CompareCoverage = lazy(() => import('./CompareCoverage'));

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// ENHANCED CONSTANTS - Using BOTH Render (news) AND Cloud Run (bias analysis)
const API_URL = process.env.REACT_APP_API_URL || 'https://thenarrative-backend.onrender.com';
const BIAS_API_URL = 'https://narrative-ml-cloudrun-53060812465.asia-south2.run.app'; // NEW: Your working bias API
const PYTHON_API_URL = process.env.REACT_APP_PYTHON_API_URL || 'https://thenarrative-python.onrender.com';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT) || 15000;
const ARTICLES_PER_PAGE = 20;
const STORIES_PER_PAGE = 10;
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_DURATION = parseInt(process.env.REACT_APP_CACHE_DURATION) || 300000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ENHANCED PERFORMANCE MONITORING
const usePerformanceMonitoring = (componentName) => {
  const mountTime = useRef(Date.now());
  const [performanceMetrics, setPerformanceMetrics] = useState({});

  useLayoutEffect(() => {
    const renderTime = Date.now() - mountTime.current;
    const totalTime = Date.now() - mountTime.current;
    
    setPerformanceMetrics({
      renderTime,
      totalTime,
      component: componentName,
      timestamp: Date.now()
    });

    if (window.gtag) {
      window.gtag('event', 'component_performance', {
        'component': componentName,
        'render_time': renderTime,
        'total_time': totalTime,
        'custom_parameter': 'performance_monitoring'
      });
    }

    if (renderTime > 100) {
      console.warn(`Slow render detected in ${componentName}: ${renderTime}ms`);
    }
    if (renderTime > 300) {
      console.error(`Critical render time in ${componentName}: ${renderTime}ms`);
    }
  }, [componentName]);

  return performanceMetrics;
};

// ENHANCED LOADING STATES
const LoadingState = ({ type = 'articles', message, count = 6 }) => (
  <div className="loading-state" role="status" aria-live="polite">
    <div className="loading-animation">
      <div className="pulse-rings">
        <div className="pulse-ring"></div>
        <div className="pulse-ring"></div>
        <div className="pulse-ring"></div>
      </div>
    </div>
    <div className="loading-content">
      <p className="loading-text">
        {message || `Loading ${type === 'articles' ? 'latest news articles' : 'story groups'}...`}
      </p>
      <p className="loading-subtext">Analyzing bias and political perspectives</p>
    </div>
    <div className="loading-progress">
      <div className="progress-bar">
        <div className="progress-fill"></div>
      </div>
    </div>
    <div className="loading-skeleton">
      {[...Array(count)].map((_, index) => (
        <div key={index} className="skeleton-card">
          <div className="skeleton-header">
            <Skeleton circle width={40} height={40} />
            <div className="skeleton-meta">
              <Skeleton width="60%" height={20} />
              <Skeleton width="40%" height={16} />
            </div>
          </div>
          <Skeleton height={200} className="skeleton-content" />
          <div className="skeleton-footer">
            <Skeleton width="30%" height={32} />
            <Skeleton width="30%" height={32} />
            <Skeleton width="25%" height={32} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ENHANCED ERROR HANDLING
const ErrorState = ({ error, onRetry, type = 'articles', onReport }) => {
  const [isReporting, setIsReporting] = useState(false);
  const errorRef = useRef(null);

  useEffect(() => {
    if (errorRef.current) {
      gsap.fromTo(errorRef.current, 
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power2.out" }
      );
    }
  }, []);

  const getErrorMessage = (error) => {
    if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
      return {
        title: 'Connection Timeout',
        message: 'The request is taking longer than expected. Please check your internet connection.',
        suggestion: 'Try again with a stable internet connection',
        type: 'timeout',
        severity: 'warning'
      };
    } else if (error.message?.includes('429') || error.response?.status === 429) {
      return {
        title: 'Rate Limit Exceeded',
        message: 'Too many requests. Please wait a moment before trying again.',
        suggestion: 'Wait a few seconds and try again',
        type: 'rate_limit',
        severity: 'warning'
      };
    } else if (error.message?.includes('500') || error.response?.status === 500) {
      return {
        title: 'Server Error',
        message: 'Our servers are experiencing issues. Please try again later.',
        suggestion: 'Check our status page or try again in a few minutes',
        type: 'server',
        severity: 'error'
      };
    } else if (error.response?.status === 404) {
      return {
        title: 'Service Not Found',
        message: 'The news service is temporarily unavailable.',
        suggestion: 'Please contact support if this persists',
        type: 'not_found',
        severity: 'error'
      };
    } else if (!navigator.onLine) {
      return {
        title: 'No Internet Connection',
        message: 'Please check your internet connection and try again.',
        suggestion: 'Make sure you are connected to the internet',
        type: 'offline',
        severity: 'warning'
      };
    } else {
      return {
        title: 'Unable to Load News',
        message: error.message || 'An unexpected error occurred while loading news.',
        suggestion: 'Please try refreshing the page or contact support',
        type: 'unknown',
        severity: 'error'
      };
    }
  };

  const handleReport = async () => {
    if (!onReport || isReporting) return;
    
    setIsReporting(true);
    try {
      await onReport(error);
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    } finally {
      setIsReporting(false);
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div ref={errorRef} className={`error-state ${errorInfo.severity}`} role="alert" aria-live="assertive">
      <div className="error-content">
        <div className="error-icon">
          {errorInfo.severity === 'error' ? '⚠️' : '⚡'}
        </div>
        <div className="error-details">
          <h2 className="error-title">{errorInfo.title}</h2>
          <p className="error-message">{errorInfo.message}</p>
          <p className="error-suggestion">{errorInfo.suggestion}</p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="error-debug">
              <summary>Debug Info</summary>
              <pre>{JSON.stringify({
                message: error.message,
                status: error.response?.status,
                code: error.code,
                type: errorInfo.type
              }, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>
      
      <div className="error-actions">
        <button onClick={onRetry} className="error-btn retry-btn primary" aria-label="Retry loading">
          Try Again
        </button>
        <button onClick={() => window.location.reload()} className="error-btn refresh-btn secondary" aria-label="Refresh page">
          Refresh Page
        </button>
        {onReport && (
          <button 
            onClick={handleReport} 
            disabled={isReporting}
            className="error-btn report-btn tertiary" 
            aria-label="Report this error"
          >
            {isReporting ? '⏳' : '📧'} Report Issue
          </button>
        )}
      </div>
      
      <div className="error-suggestions">
        <h4>What you can try:</h4>
        <ul>
          <li>Check your internet connection</li>
          <li>Refresh the page</li>
          <li>Try again in a few minutes</li>
          <li>Clear your browser cache</li>
        </ul>
      </div>
    </div>
  );
};

// ENHANCED BIAS INDICATOR
const EnhancedBiasIndicator = ({ bias, confidence, score, compact = false }) => {
  const indicatorRef = useRef(null);

  const getBiasColor = (bias) => {
    switch (bias?.toLowerCase()) {
      case 'left': return '#2563eb';
      case 'right': return '#dc2626';
      case 'center': return '#059669';
      default: return '#6b7280';
    }
  };

  const getBiasLabel = (bias) => {
    switch (bias?.toLowerCase()) {
      case 'left': return 'Left';
      case 'right': return 'Right';
      case 'center': return 'Center';
      default: return 'Unknown';
    }
  };

  const getBiasEmoji = (bias) => {
    switch (bias?.toLowerCase()) {
      case 'left': return '⬅️';
      case 'right': return '➡️';
      case 'center': return '⚖️';
      default: return '❓';
    }
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence > 0.8) return 'high';
    if (confidence > 0.6) return 'medium';
    return 'low';
  };

  useEffect(() => {
    if (indicatorRef.current && !compact) {
      gsap.fromTo(indicatorRef.current,
        { scale: 0, rotation: -180 },
        { scale: 1, rotation: 0, duration: 0.8, delay: Math.random() * 0.3, ease: "back.out(1.7)" }
      );
    }
  }, [compact]);

  if (compact) {
    return (
      <span 
        className="bias-indicator-compact" 
        style={{ color: getBiasColor(bias) }}
        title={`${getBiasLabel(bias)} bias - ${Math.round(confidence * 100)}% confidence`}
      >
        {getBiasEmoji(bias)}
      </span>
    );
  }

  return (
    <div 
      ref={indicatorRef} 
      className={`enhanced-bias-indicator ${getConfidenceLevel(confidence)}`}
      title={`Bias: ${getBiasLabel(bias)}, Confidence: ${Math.round(confidence * 100)}%`}
    >
      <div className="bias-visual">
        <div 
          className="bias-circle" 
          style={{
            backgroundColor: getBiasColor(bias),
            transform: `scale(${0.8 + (confidence * 0.4)})`,
            boxShadow: `0 0 ${confidence * 20}px ${getBiasColor(bias)}40`
          }}
        >
          {getBiasEmoji(bias)}
        </div>
        {score !== undefined && (
          <div className="bias-score-visual">
            <div 
              className="score-bar" 
              style={{
                width: `${Math.abs(score - 50) * 2}%`,
                backgroundColor: getBiasColor(bias),
                marginLeft: score < 50 ? 'auto' : '0'
              }}
            />
            <span className="score-text">{score}</span>
          </div>
        )}
      </div>
      <div className="bias-details">
        <span className="bias-label">{getBiasLabel(bias)}</span>
        <div className="confidence-info">
          <span className="confidence-value">{Math.round(confidence * 100)}%</span>
          <div className="confidence-bar">
            <div 
              className="confidence-fill" 
              style={{ 
                width: `${confidence * 100}%`, 
                backgroundColor: getBiasColor(bias) 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// MAIN NEWSFEED COMPONENT
const NewsFeed = ({
  activeFilters = {},
  viewMode = 'articles',
  sortBy = 'publishedAt',
  sortOrder = 'desc',
  searchQuery = '',
  onArticleSelect,
  selectedArticle,
  isOnline = true,
  onViewModeChange
}) => {
  // Performance and State Management
  const performanceMetrics = usePerformanceMonitoring('NewsFeed');
  
  // Enhanced State Management
  const [localSelectedArticle, setLocalSelectedArticle] = useState(selectedArticle);
  const [showComparison, setShowComparison] = useState(false);
  const [viewStats, setViewStats] = useState({});
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [retryAttempts, setRetryAttempts] = useState({});
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [offlineMode, setOfflineMode] = useState(!isOnline);

  // Animation and UI Refs
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const queryClient = useQueryClient();
  const articlesGridRef = useRef(null);

  // Responsive and Accessibility
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // ENHANCED API SERVICE - Using BOTH backends
  const newsAPI = useMemo(() => ({
    fetchArticles: async (pageParam = 1) => {
      const cacheKey = `articles-${JSON.stringify(activeFilters)}-${searchQuery}-${sortBy}-${sortOrder}-${pageParam}`;
      
      // Check cache first
      const cachedData = queryClient.getQueryData(['articles-cached', cacheKey]);
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
        return cachedData.data;
      }
      
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));

      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: ARTICLES_PER_PAGE.toString(),
        enhanced: 'true',
        includeStats: 'true',
        includeMetrics: 'true',
        cacheControl: 'no-cache',
        ...Object.fromEntries(
          Object.entries(activeFilters).filter(([key, value]) => 
            value !== 'all' && value !== '' && value !== null && value !== false
          )
        )
      });

      if (searchQuery && searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);
      if (offlineMode) params.append('offline', 'true');

      const requestId = `newsfeed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();

      try {
        console.log(`Fetching from ${API_URL}/api/news?${params}`);
        
        // Use Render backend for fetching news articles
        const response = await axios.get(`${API_URL}/api/news?${params}`, {
          timeout: API_TIMEOUT,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': offlineMode ? 'max-age=3600' : 'no-cache',
            'X-Request-ID': requestId,
            'X-Client-Version': '2.0.0',
            'X-Performance-Mode': animationEnabled ? 'full' : 'reduced',
            'X-Mobile-Client': isMobile ? 'true' : 'false'
          }
        });

        const responseTime = Date.now() - startTime;
        console.log(`Fetched ${response.data.articles?.length || 0} articles in ${responseTime}ms`);

        // Validate response structure
        if (!response.data || !Array.isArray(response.data.articles)) {
          console.error('Invalid API response structure', response.data);
          throw new Error('Invalid API response structure - expected articles array');
        }

        // Enhance articles with bias analysis from Cloud Run API
        const articlesWithBias = await Promise.all(
          response.data.articles.map(async (article) => {
            try {
              // Use your Cloud Run API for bias analysis
              const biasResponse = await axios.post(`${BIAS_API_URL}/analyze`, {
                text: article.content || article.description || article.title || 'No content available'
              }, {
                timeout: 5000, // Shorter timeout for bias analysis
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                }
              });

              return {
                ...article,
                articleBias: biasResponse.data.bias_type || 'center',
                biasConfidence: biasResponse.data.confidence || 0.85,
                biasScore: biasResponse.data.bias_score ? Math.round(biasResponse.data.bias_score * 100) : 50,
                biasReasoning: biasResponse.data.explanation || 'AI-powered bias analysis'
              };
            } catch (biasError) {
              console.warn(`Bias analysis failed for article ${article.id}:`, biasError.message);
              // Fallback bias analysis
              return {
                ...article,
                articleBias: 'center',
                biasConfidence: 0.5,
                biasScore: 50,
                biasReasoning: 'Bias analysis unavailable'
              };
            }
          })
        );

        const enhancedResponse = {
          ...response.data,
          articles: articlesWithBias
        };

        // Cache the response
        const dataWithTimestamp = {
          data: enhancedResponse,
          timestamp: Date.now(),
          requestId,
          responseTime
        };
        queryClient.setQueryData(['articles-cached', cacheKey], dataWithTimestamp);

        // Track successful fetch analytics
        if (window.gtag) {
          window.gtag('event', 'news_fetch_success', {
            event_category: 'API',
            page: pageParam,
            articles_count: enhancedResponse.articles.length,
            filters_active: Object.keys(activeFilters).filter(k => activeFilters[k] !== 'all').length,
            response_time: responseTime,
            cache_status: 'miss'
          });
        }

        return {
          ...enhancedResponse,
          performance: {
            requestId,
            responseTime,
            cacheHit: false,
            timestamp: Date.now()
          }
        };

      } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error(`News fetch error (${responseTime}ms):`, error);

        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new Error('Request timeout - please check your connection and try again');
        } else if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 60;
          throw new Error(`Too many requests - please wait ${retryAfter} seconds before trying again`);
        } else if (error.response?.status === 500) {
          throw new Error('Server error - our news service is temporarily unavailable');
        } else if (error.response?.status === 404) {
          throw new Error('News service not found - please contact support if this persists');
        } else if (error.response?.status === 403) {
          throw new Error('Access denied - please check your permissions');
        } else if (!navigator.onLine) {
          throw new Error('No internet connection - please check your network and try again');
        } else {
          const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch articles';
          throw new Error(`Unable to load news: ${errorMessage}`);
        }
      }
    },

    fetchStories: async (pageParam = 1) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: STORIES_PER_PAGE.toString(),
        enhanced: 'true',
        includeMetrics: 'true',
        minArticles: 2,
        ...Object.fromEntries(
          Object.entries(activeFilters).filter(([key, value]) => 
            value !== 'all' && value !== '' && value !== false
          )
        )
      });

      const requestId = `stories-${Date.now()}`;
      const startTime = Date.now();

      try {
        console.log(`Fetching stories from ${API_URL}/api/news/stories?${params}`);
        const response = await axios.get(`${API_URL}/api/news/stories?${params}`, {
          timeout: API_TIMEOUT,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'max-age=300',
            'X-Request-ID': requestId
          }
        });

        const responseTime = Date.now() - startTime;
        console.log(`Fetched ${response.data.storyGroups?.length || 0} story groups in ${responseTime}ms`);

        return response.data;
      } catch (error) {
        console.error('Stories fetch error:', error);
        throw error;
      }
    },

    fetchStats: async () => {
      try {
        const response = await axios.get(`${API_URL}/api/news/stats`, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'max-age=120'
          }
        });

        return response.data;
      } catch (error) {
        console.error('Stats fetch error:', error);
        throw error;
      }
    },

    // Enhanced bias analysis using your Cloud Run API
    fetchBiasAnalysis: async (articleId, articleContent, articleSource) => {
      try {
        // Use your NEW working Cloud Run API for bias analysis
        const response = await axios.post(`${BIAS_API_URL}/analyze`, {
          text: articleContent
        }, {
          timeout: API_TIMEOUT / 2,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        console.log(`Bias analysis successful for article ${articleId}`);
        
        // Transform the response to match your frontend format
        return {
          bias: response.data.bias_type || 'center',
          confidence: response.data.confidence || 0.85,
          score: response.data.bias_score ? Math.round(response.data.bias_score * 100) : 50,
          explanation: response.data.explanation || 'AI-powered bias analysis'
        };
      } catch (error) {
        console.error(`Bias analysis failed for article ${articleId}:`, error.message);
        throw new Error('Bias analysis temporarily unavailable');
      }
    },

    // Report error to backend
    reportError: async (error) => {
      try {
        await axios.post(`${API_URL}/api/analytics/error`, {
          error: {
            message: error.message,
            stack: error.stack,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        }, {
          timeout: 5000
        });
      } catch (reportError) {
        console.warn('Failed to report error:', reportError);
      }
    }
  }), [activeFilters, searchQuery, sortBy, sortOrder, offlineMode, animationEnabled, isMobile, queryClient]);

  // ENHANCED INFINITE QUERY FOR ARTICLES
  const {
    data: articlesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isArticlesLoading,
    error: articlesError,
    refetch: refetchArticles,
    isRefetching
  } = useInfiniteQuery(
    ['articles', activeFilters, searchQuery, sortBy, sortOrder, offlineMode],
    ({ pageParam = 1 }) => newsAPI.fetchArticles(pageParam),
    {
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage?.pagination) return undefined;
        const pagination = lastPage.pagination;
        return pagination.hasMore ? pagination.currentPage + 1 : undefined;
      },
      cacheTime: CACHE_TIME,
      staleTime: STALE_TIME,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          return false;
        }
        
        if (failureCount < MAX_RETRIES) {
          setTimeout(() => {}, RETRY_DELAY * Math.pow(2, failureCount));
          return true;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(RETRY_DELAY * Math.pow(2, attemptIndex), 30000),
      onError: (error) => {
        console.error('Articles query error:', error);
        
        if (window.gtag) {
          window.gtag('event', 'news_fetch_error', {
            event_category: 'API Error',
            error_message: error.message,
            filters: JSON.stringify(activeFilters)
          });
        }
      },
      onSuccess: (data) => {
        console.log(`Articles query successful: ${data.pages.length} pages loaded`);
      }
    }
  );

  // RESPONSIVE AND ACCESSIBILITY HANDLERS
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    const handleReducedMotion = (e) => {
      setPrefersReducedMotion(e.matches);
      setAnimationEnabled(!e.matches);
    };

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    window.addEventListener('resize', handleResize);
    mediaQuery.addListener(handleReducedMotion);

    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeListener(handleReducedMotion);
    };
  }, []);

  // ONLINE/OFFLINE DETECTION
  useEffect(() => {
    setOfflineMode(!isOnline);
    
    if (isOnline && offlineMode) {
      queryClient.invalidateQueries(['articles']);
      queryClient.invalidateQueries(['stories']);
      queryClient.invalidateQueries(['news-stats']);
    }
  }, [isOnline, offlineMode, queryClient]);

  // COMBINE ARTICLES FROM ALL PAGES
  const allArticles = useMemo(() => {
    if (!articlesData?.pages) return [];
    return articlesData.pages.flatMap(page => page.articles || []);
  }, [articlesData]);

  // ENHANCED EVENT HANDLERS
  const handleArticleClick = useCallback((article) => {
    setLocalSelectedArticle(article);
    setLastInteraction(Date.now());
    
    if (onArticleSelect) {
      onArticleSelect(article);
    }

    if (window.gtag) {
      window.gtag('event', 'article_click', {
        event_category: 'Content Interaction',
        article_id: article.id,
        article_bias: article.articleBias,
        article_confidence: Math.round(article.biasConfidence * 100),
        source: article.source?.name,
        category: article.category,
        interaction_time: Date.now() - lastInteraction
      });
    }
  }, [onArticleSelect, lastInteraction]);

  const handleRetry = useCallback(async () => {
    const retryKey = `${viewMode}-${Date.now()}`;
    const currentAttempts = retryAttempts[retryKey] || 0;
    
    if (currentAttempts >= MAX_RETRIES) {
      console.error('Max retry attempts reached');
      return;
    }

    setRetryAttempts(prev => ({ ...prev, [retryKey]: currentAttempts + 1 }));
    console.log(`Retrying failed request (attempt ${currentAttempts + 1}/${MAX_RETRIES})...`);

    const delay = RETRY_DELAY * Math.pow(2, currentAttempts);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await refetchArticles();
      
      setRetryAttempts(prev => {
        const newAttempts = { ...prev };
        delete newAttempts[retryKey];
        return newAttempts;
      });
      
      console.log('Retry successful');
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    }
  }, [viewMode, refetchArticles, retryAttempts]);

  const handleErrorReport = useCallback(async (error) => {
    try {
      await newsAPI.reportError(error);
      console.log('Error reported successfully');
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }, [newsAPI]);

  // COMPUTED VALUES AND LOADING STATES
  const isLoading = isArticlesLoading && !isRefetching;
  const error = articlesError;
  const hasData = allArticles.length > 0;
  const isInitialLoading = isLoading && !hasData;

  // DEBUG INFORMATION (Development Mode)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('NewsFeed Debug Info:', {
        API_URL,
        BIAS_API_URL,
        viewMode,
        isLoading,
        error: error?.message,
        hasData,
        articlesCount: allArticles.length,
        activeFilters,
        searchQuery,
        sortBy,
        sortOrder,
        isOnline,
        offlineMode,
        cacheStats,
        performanceMetrics
      });
    }
  }, [isLoading, error, hasData, allArticles.length, activeFilters, searchQuery, sortBy, sortOrder, isOnline, offlineMode, cacheStats, performanceMetrics, viewMode]);

  // RENDER: INITIAL LOADING STATE
  if (isInitialLoading) {
    return (
      <div className="newsfeed-container" ref={containerRef}>
        <LoadingState 
          type={viewMode} 
          message={searchQuery ? `Searching for "${searchQuery}"...` : undefined}
          count={isMobile ? 3 : 6}
        />
      </div>
    );
  }

  // RENDER: ERROR STATE
  if (error && !hasData) {
    return (
      <div className="newsfeed-container" ref={containerRef}>
        <ErrorState 
          error={error} 
          onRetry={handleRetry} 
          onReport={handleErrorReport}
          type={viewMode}
        />
      </div>
    );
  }

  // RENDER: ARTICLES VIEW
  return (
    <div className="newsfeed-container articles-view" ref={containerRef}>
      {/* Search Results Info */}
      {searchQuery && (
        <div className="search-results-info">
          <h3>🔍 Search Results for "{searchQuery}"</h3>
          <p>Found {allArticles.length} article{allArticles.length !== 1 ? 's' : ''}</p>
          {allArticles.length === 0 && (
            <div className="no-results">
              <p>No articles found matching your search.</p>
              <div className="search-suggestions">
                <h4>Try:</h4>
                <ul>
                  <li>Different keywords</li>
                  <li>Removing some filters</li>
                  <li>Checking spelling</li>
                  <li>Using broader terms</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Infinite Scroll Articles List */}
      <div ref={articlesGridRef}>
        <InfiniteScroll
          dataLength={allArticles.length}
          next={fetchNextPage}
          hasMore={hasNextPage}
          loader={
            <div className="infinite-scroll-loading">
              <div className="loading-spinner-inline">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
              </div>
              <span className="loading-text">Loading more articles...</span>
            </div>
          }
          endMessage={
            <div className="infinite-scroll-end">
              <div className="end-icon">📚</div>
              <p className="end-title">You've reached the end!</p>
              <p className="end-subtitle">All articles have been loaded.</p>
              <div className="end-stats">
                <span>Great job staying informed! 🌟</span>
              </div>
            </div>
          }
          scrollThreshold={isMobile ? 0.8 : 0.9}
          style={{ overflow: 'visible' }}
        >
          <div className={`articles-grid ${isMobile ? 'mobile' : 'desktop'}`}>
            {allArticles.map((article, index) => (
              <Suspense 
                key={`${article.id}-${index}`} 
                fallback={
                  <div className="article-loading">
                    <Skeleton height={isMobile ? 250 : 300} />
                  </div>
                }
              >
                <div 
                  className="news-card" 
                  data-article-id={article.id}
                  onClick={() => handleArticleClick(article)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleArticleClick(article);
                    }
                  }}
                >
                  <NewsSummaryCard
                    article={article}
                    onCompare={() => {}}
                    showComparison={false}
                    viewStats={viewStats[article.id]}
                    enhanced={true}
                    isBookmarked={false}
                    className={`article-${index}`}
                  />
                </div>
              </Suspense>
            ))}
          </div>
        </InfiniteScroll>
      </div>

      {/* Performance Info (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="dev-performance-info">
          <details>
            <summary>🔧 Performance Info</summary>
            <pre>{JSON.stringify({
              renderTime: performanceMetrics.renderTime,
              articlesLoaded: allArticles.length,
              cacheStats,
              retryAttempts: Object.keys(retryAttempts).length,
              animationsEnabled: animationEnabled,
              offlineMode,
              isMobile
            }, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

NewsFeed.displayName = 'NewsFeed';

export default NewsFeed;
