import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect, Suspense, lazy } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery } from 'react-query';
import InfiniteScroll from 'react-infinite-scroll-component';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import axios from 'axios';
import moment from 'moment';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Lazy load components for performance
const NewsSummaryCard = lazy(() => import('./NewsSummaryCard'));
const CompareCoverage = lazy(() => import('./CompareCoverage'));

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// 🔧 ENHANCED CONSTANTS - Updated for Render backend
const API_URL = process.env.REACT_APP_API_URL || 'https://thenarrative-backend.onrender.com';
const PYTHON_API_URL = process.env.REACT_APP_PYTHON_API_URL || 'https://thenarrative-python.onrender.com';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT) || 15000;
const ARTICLES_PER_PAGE = 20;
const STORIES_PER_PAGE = 10;
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_DURATION = parseInt(process.env.REACT_APP_CACHE_DURATION) || 300000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// 🎯 ENHANCED PERFORMANCE MONITORING - FIXED: Added dependency array to useLayoutEffect
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
        
        // Report to analytics if available
        if (window.gtag) {
            window.gtag('event', 'component_performance', {
                'component': componentName,
                'render_time': renderTime,
                'total_time': totalTime,
                'custom_parameter': 'performance_monitoring'
            });
        }

        // Send to backend analytics
        if (process.env.REACT_APP_WEB_VITALS_ENDPOINT) {
            fetch(process.env.REACT_APP_WEB_VITALS_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'component_performance',
                    component: componentName,
                    renderTime,
                    totalTime,
                    timestamp: Date.now()
                }),
            }).catch(() => {}); // Silent fail
        }

        // Performance optimization warnings
        if (renderTime > 100) {
            console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime}ms`);
        }

        if (renderTime > 300) {
            console.error(`🚨 Critical render time in ${componentName}: ${renderTime}ms`);
        }
    }, [componentName]); // FIXED: Added missing dependency

    return { performanceMetrics }; // FIXED: Removed unused renderStartTime
};

// 🎨 ENHANCED LOADING STATES
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
            <p className="loading-subtext">
                Analyzing bias and political perspectives
            </p>
            <div className="loading-progress">
                <div className="progress-bar">
                    <div className="progress-fill"></div>
                </div>
            </div>
        </div>
        
        {/* Skeleton cards */}
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

// 🚨 ENHANCED ERROR HANDLING
const ErrorState = ({ error, onRetry, type = 'articles', onReport }) => {
    const [isReporting, setIsReporting] = useState(false);
    const errorRef = useRef(null);

    useEffect(() => {
        if (errorRef.current) {
            gsap.fromTo(errorRef.current,
                { opacity: 0, y: 20, scale: 0.95 },
                { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' }
            );
        }
    }, []);

    const getErrorMessage = (error) => {
        if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
            return {
                title: 'Connection Timeout ⏱️',
                message: 'The request is taking longer than expected. Please check your internet connection.',
                suggestion: 'Try again with a stable internet connection',
                type: 'timeout',
                severity: 'warning'
            };
        } else if (error.message?.includes('429') || error.response?.status === 429) {
            return {
                title: 'Rate Limit Exceeded 🚦',
                message: 'Too many requests. Please wait a moment before trying again.',
                suggestion: 'Wait a few seconds and try again',
                type: 'ratelimit',
                severity: 'warning'
            };
        } else if (error.message?.includes('500') || error.response?.status >= 500) {
            return {
                title: 'Server Error 🔧',
                message: 'Our servers are experiencing issues. Please try again later.',
                suggestion: 'Check our status page or try again in a few minutes',
                type: 'server',
                severity: 'error'
            };
        } else if (error.response?.status === 404) {
            return {
                title: 'Service Not Found 🔍',
                message: 'The news service is temporarily unavailable.',
                suggestion: 'Please contact support if this persists',
                type: 'notfound',
                severity: 'error'
            };
        } else if (!navigator.onLine) {
            return {
                title: 'No Internet Connection 📡',
                message: 'Please check your internet connection and try again.',
                suggestion: 'Make sure you are connected to the internet',
                type: 'offline',
                severity: 'warning'
            };
        } else {
            return {
                title: 'Unable to Load News 📰',
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
        <div 
            ref={errorRef}
            className={`error-state ${errorInfo.severity}`} 
            role="alert"
            aria-live="assertive"
        >
            <div className="error-content">
                <div className="error-icon">
                    {errorInfo.severity === 'error' ? '🚨' : '⚠️'}
                </div>
                <div className="error-details">
                    <h2 className="error-title">{errorInfo.title}</h2>
                    <p className="error-message">{errorInfo.message}</p>
                    <p className="error-suggestion">💡 {errorInfo.suggestion}</p>
                    
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
                <button 
                    onClick={onRetry} 
                    className="error-btn retry-btn primary"
                    aria-label={`Retry loading ${type}`}
                >
                    🔄 Try Again
                </button>
                
                <button 
                    onClick={() => window.location.reload()} 
                    className="error-btn refresh-btn secondary"
                    aria-label="Refresh page"
                >
                    ♻️ Refresh Page
                </button>
                
                {onReport && (
                    <button 
                        onClick={handleReport}
                        disabled={isReporting}
                        className="error-btn report-btn tertiary"
                        aria-label="Report this error"
                    >
                        {isReporting ? '⏳' : '📢'} Report Issue
                    </button>
                )}
                
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        // Could show toast here
                    }}
                    className="error-btn share-btn tertiary"
                    aria-label="Copy page URL"
                    title="Copy URL to share with support"
                >
                    🔗 Copy URL
                </button>
            </div>
            
            <div className="error-suggestions">
                <h4>What you can try:</h4>
                <ul>
                    <li>Check your internet connection</li>
                    <li>Refresh the page</li>
                    <li>Try again in a few minutes</li>
                    <li>Clear your browser cache</li>
                    {errorInfo.type === 'timeout' && (
                        <li>Switch to a more stable internet connection</li>
                    )}
                    {errorInfo.type === 'ratelimit' && (
                        <li>Wait 30 seconds before trying again</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

// 🎭 ENHANCED BIAS INDICATOR
const EnhancedBiasIndicator = ({ 
    bias, 
    confidence, 
    score, 
    keyIndicators = [],
    compact = false,
    showDetails = false 
}) => {
    const [expanded, setExpanded] = useState(false);
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
            case 'left': return '🔵';
            case 'right': return '🔴';
            case 'center': return '🟢';
            default: return '⚪';
        }
    };

    const getConfidenceLevel = (confidence) => {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.6) return 'medium';
        return 'low';
    };

    useEffect(() => {
        if (indicatorRef.current && !compact) {
            gsap.fromTo(indicatorRef.current,
                { scale: 0, rotation: -180 },
                { 
                    scale: 1, 
                    rotation: 0, 
                    duration: 0.8,
                    delay: Math.random() * 0.3,
                    ease: "back.out(1.7)"
                }
            );
        }
    }, [compact]);

    if (compact) {
        return (
            <span 
                className="bias-indicator-compact"
                style={{ color: getBiasColor(bias) }}
                title={`${getBiasLabel(bias)} bias (${Math.round(confidence * 100)}% confidence)`}
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
                        transform: `scale(${0.8 + confidence * 0.4})`,
                        boxShadow: `0 0 ${confidence * 20}px ${getBiasColor(bias)}40`
                    }}
                    onClick={() => showDetails && setExpanded(!expanded)}
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
            
            {showDetails && expanded && keyIndicators.length > 0 && (
                <div className="bias-indicators-detail">
                    <h5>Key Indicators:</h5>
                    <ul>
                        {keyIndicators.slice(0, 5).map((indicator, index) => (
                            <li key={index}>{indicator}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// 📊 ENHANCED STATISTICS DASHBOARD
const StatisticsDashboard = ({ statsData, viewMode, onViewModeChange }) => {
    const [animatedStats, setAnimatedStats] = useState({});
    const statsRef = useRef(null);

    useEffect(() => {
        if (!statsData || !statsRef.current) return;

        // Animate statistics counters
        Object.entries(statsData.overview || {}).forEach(([key, value]) => {
            if (typeof value === 'number') {
                gsap.fromTo(
                    { value: 0 },
                    { 
                        value: value,
                        duration: 2,
                        ease: "power2.out",
                        onUpdate: function() {
                            setAnimatedStats(prev => ({
                                ...prev,
                                [key]: Math.round(this.targets()[0].value)
                            }));
                        }
                    }
                );
            }
        });

        // Animate the dashboard
        gsap.fromTo(statsRef.current.children,
            { opacity: 0, x: -20 },
            { 
                opacity: 1, 
                x: 0, 
                duration: 0.5,
                stagger: 0.1,
                ease: "power1.out"
            }
        );
    }, [statsData]);

    if (!statsData) return null;

    return (
        <div ref={statsRef} className="statistics-dashboard">
            <div className="stats-header">
                <h3>📊 News Overview</h3>
                <div className="stats-timestamp">
                    Last updated: {moment(statsData.metadata?.timestamp).fromNow()}
                </div>
            </div>
            
            <div className="stats-grid">
                <div className="stats-card total-articles">
                    <div className="stats-icon">📰</div>
                    <div className="stats-content">
                        <span className="stats-number">
                            {animatedStats.totalArticles || statsData.overview?.totalArticles || 0}
                        </span>
                        <span className="stats-label">Total Articles</span>
                    </div>
                </div>
                
                <div className="stats-card recent-articles">
                    <div className="stats-icon">🆕</div>
                    <div className="stats-content">
                        <span className="stats-number">
                            {animatedStats.recentArticles || statsData.overview?.recentArticles || 0}
                        </span>
                        <span className="stats-label">Today</span>
                    </div>
                </div>
                
                <div className="stats-card analysis-rate">
                    <div className="stats-icon">🎯</div>
                    <div className="stats-content">
                        <span className="stats-number">
                            {statsData.biasStats?.analysisRate || 0}%
                        </span>
                        <span className="stats-label">Analyzed</span>
                    </div>
                </div>
                
                <div className="stats-card confidence">
                    <div className="stats-icon">✅</div>
                    <div className="stats-content">
                        <span className="stats-number">
                            {Math.round((statsData.qualityMetrics?.averageConfidence || 0) * 100)}%
                        </span>
                        <span className="stats-label">Avg Confidence</span>
                    </div>
                </div>
            </div>
            
            {/* Bias Distribution Chart */}
            {statsData.biasStats?.distribution && (
                <div className="bias-distribution">
                    <h4>Bias Distribution</h4>
                    <div className="distribution-chart">
                        {Object.entries(statsData.biasStats.distribution).map(([bias, data]) => (
                            <div key={bias} className={`bias-segment ${bias}`}>
                                <div className="segment-bar">
                                    <div 
                                        className="segment-fill"
                                        style={{ 
                                            width: `${data.percentage || 0}%`,
                                            backgroundColor: bias === 'left' ? '#2563eb' : 
                                                          bias === 'right' ? '#dc2626' : 
                                                          bias === 'center' ? '#059669' : '#6b7280'
                                        }}
                                    />
                                </div>
                                <div className="segment-info">
                                    <span className="segment-label">{bias.charAt(0).toUpperCase() + bias.slice(1)}</span>
                                    <span className="segment-count">{data.count || 0}</span>
                                    <span className="segment-percentage">{data.percentage || 0}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* View Mode Toggle */}
            <div className="view-mode-stats">
                <h4>View Options</h4>
                <div className="view-buttons">
                    <button
                        className={`view-stat-btn ${viewMode === 'articles' ? 'active' : ''}`}
                        onClick={() => onViewModeChange('articles')}
                    >
                        📰 Articles ({statsData.overview?.totalArticles || 0})
                    </button>
                    <button
                        className={`view-stat-btn ${viewMode === 'stories' ? 'active' : ''}`}
                        onClick={() => onViewModeChange('stories')}
                    >
                        📚 Stories ({statsData.overview?.totalStories || 0})
                    </button>
                </div>
            </div>
        </div>
    );
};

// 🔄 ENHANCED INFINITE SCROLL LOADER
const InfiniteScrollLoader = ({ isLoading, hasMore, error, onRetry }) => {
    if (error) {
        return (
            <div className="infinite-scroll-error">
                <p>⚠️ Failed to load more articles</p>
                <button onClick={onRetry} className="retry-more-btn">
                    🔄 Try Again
                </button>
            </div>
        );
    }

    if (!hasMore) {
        return (
            <div className="infinite-scroll-end">
                <div className="end-icon">✨</div>
                <p className="end-title">You've reached the end!</p>
                <p className="end-subtitle">All articles have been loaded.</p>
                <div className="end-stats">
                    <span>Great job staying informed! 📰</span>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="infinite-scroll-loading">
                <div className="loading-spinner-inline">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                </div>
                <span className="loading-text">Loading more articles...</span>
                <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        );
    }

    return null;
};

// 🎯 MAIN NEWSFEED COMPONENT
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
    // 📊 Performance and State Management
    const { performanceMetrics } = usePerformanceMonitoring('NewsFeed');
    
    // 🎛️ Enhanced State Management
    const [localSelectedArticle, setLocalSelectedArticle] = useState(selectedArticle);
    const [showComparison, setShowComparison] = useState(false);
    const [viewStats, setViewStats] = useState({});
    const [lastInteraction, setLastInteraction] = useState(Date.now());
    const [retryAttempts, setRetryAttempts] = useState({});
    const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });
    const [animationEnabled, setAnimationEnabled] = useState(true);
    const [offlineMode, setOfflineMode] = useState(!isOnline);
    
    // 🎨 Animation and UI Refs
    const containerRef = useRef(null);
    const observerRef = useRef(null);
    const queryClient = useQueryClient();
    const articlesGridRef = useRef(null);
    const statsRef = useRef(null);
    
    // 📱 Responsive and Accessibility
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    // 🚀 ENHANCED API SERVICE with comprehensive error handling and caching
    const newsAPI = useMemo(() => ({
        fetchArticles: async (pageParam = 1) => {
            const cacheKey = `articles-${JSON.stringify(activeFilters)}-${searchQuery}-${sortBy}-${sortOrder}-${pageParam}`;
            
            // Check cache first
            const cachedData = queryClient.getQueryData(['articles-cached', cacheKey]);
            if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
                setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
                return cachedData.data;
            }
            
            setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));

            const params = new URLSearchParams({
                page: pageParam.toString(),
                limit: ARTICLES_PER_PAGE.toString(),
                enhanced: 'true', // Request comprehensive bias analysis
                includeStats: 'true',
                includeMetrics: 'true',
                cacheControl: 'no-cache',
                ...Object.fromEntries(
                    Object.entries(activeFilters).filter(([key, value]) => 
                        value !== 'all' && value !== '' && value !== null && value !== false
                    )
                )
            });

            // Add search query if present
            if (searchQuery && searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }

            // Add sorting parameters
            if (sortBy) params.append('sortBy', sortBy);
            if (sortOrder) params.append('sortOrder', sortOrder);

            // Add offline mode parameter
            if (offlineMode) params.append('offline', 'true');

            const requestId = `newsfeed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const startTime = Date.now();

            try {
                console.log(`🔗 Fetching from: ${API_URL}/api/news?${params}`);
                
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
                console.log(`✅ Fetched ${response.data.articles?.length || 0} articles in ${responseTime}ms`);

                // Validate response structure
                if (!response.data || !Array.isArray(response.data.articles)) {
                    console.error('Invalid API response structure:', response.data);
                    throw new Error('Invalid API response structure - expected articles array');
                }

                // Cache the response
                const dataWithTimestamp = {
                    data: response.data,
                    timestamp: Date.now(),
                    requestId,
                    responseTime
                };
                
                queryClient.setQueryData(['articles-cached', cacheKey], dataWithTimestamp);

                // Track successful fetch analytics
                if (window.gtag) {
                    window.gtag('event', 'news_fetch_success', {
                        'event_category': 'API',
                        'page': pageParam,
                        'articles_count': response.data.articles.length,
                        'filters_active': Object.keys(activeFilters).filter(k => activeFilters[k] !== 'all').length,
                        'response_time': responseTime,
                        'cache_status': 'miss'
                    });
                }

                // Enhanced response data
                return {
                    ...response.data,
                    performance: {
                        requestId,
                        responseTime,
                        cacheHit: false,
                        timestamp: Date.now()
                    }
                };

            } catch (error) {
                const responseTime = Date.now() - startTime;
                console.error(`❌ News fetch error (${responseTime}ms):`, error);
                
                // Enhanced error handling with specific error types
                if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                    throw new Error('Request timeout - please check your connection and try again');
                } else if (error.response?.status === 429) {
                    const retryAfter = error.response.headers['retry-after'] || 60;
                    throw new Error(`Too many requests - please wait ${retryAfter} seconds before trying again`);
                } else if (error.response?.status >= 500) {
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
            const cacheKey = `stories-${JSON.stringify(activeFilters)}-${pageParam}`;
            
            // Check cache
            const cachedData = queryClient.getQueryData(['stories-cached', cacheKey]);
            if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
                return cachedData.data;
            }

            const params = new URLSearchParams({
                page: pageParam.toString(),
                limit: STORIES_PER_PAGE.toString(),
                enhanced: 'true',
                includeMetrics: 'true',
                minArticles: '2',
                ...Object.fromEntries(
                    Object.entries(activeFilters).filter(([key, value]) => 
                        value !== 'all' && value !== '' && value !== false
                    )
                )
            });

            const requestId = `stories-${Date.now()}`;
            const startTime = Date.now();

            try {
                console.log(`🔗 Fetching stories from: ${API_URL}/api/news/stories?${params}`);
                
                const response = await axios.get(`${API_URL}/api/news/stories?${params}`, {
                    timeout: API_TIMEOUT,
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'max-age=300',
                        'X-Request-ID': requestId
                    }
                });

                const responseTime = Date.now() - startTime;
                console.log(`✅ Fetched ${response.data.storyGroups?.length || 0} story groups in ${responseTime}ms`);
                
                // Cache the response
                queryClient.setQueryData(['stories-cached', cacheKey], {
                    data: response.data,
                    timestamp: Date.now()
                });

                return response.data;
                
            } catch (error) {
                console.error('Stories fetch error:', error);
                throw error;
            }
        },

        fetchStats: async () => {
            const cacheKey = 'news-stats';
            
            // Check cache
            const cachedData = queryClient.getQueryData(['stats-cached', cacheKey]);
            if (cachedData && Date.now() - cachedData.timestamp < 120000) { // 2 minutes cache
                return cachedData.data;
            }

            try {
                const response = await axios.get(`${API_URL}/api/news/stats`, {
                    timeout: 10000,
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'max-age=120'
                    }
                });
                
                // Cache stats
                queryClient.setQueryData(['stats-cached', cacheKey], {
                    data: response.data,
                    timestamp: Date.now()
                });

                return response.data;
                
            } catch (error) {
                console.error('Stats fetch error:', error);
                throw error;
            }
        },

        // Enhanced bias analysis with comprehensive fallback
        fetchBiasAnalysis: async (articleId, articleContent, articleSource) => {
            try {
                // Try backend first (may have cached result)
                const response = await axios.get(`${API_URL}/api/analyze/${articleId}`, {
                    timeout: API_TIMEOUT / 2,
                    headers: { 
                        'Accept': 'application/json',
                        'X-Analysis-Mode': 'comprehensive'
                    }
                });
                
                console.log(`✅ Backend bias analysis successful for article ${articleId}`);
                return response.data;
                
            } catch (backendError) {
                console.warn('Backend bias analysis failed, trying Python service:', backendError.message);
                
                // Fallback to Python service for direct analysis
                try {
                    const response = await axios.post(`${PYTHON_API_URL}/analyze-bias`, {
                        text: articleContent,
                        title: articleContent?.substring(0, 200) || '',
                        source: articleSource,
                        article_id: articleId,
                        priority: 'normal'
                    }, {
                        timeout: API_TIMEOUT,
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    console.log(`✅ Python bias analysis successful for article ${articleId}`);
                    return response.data;
                    
                } catch (pythonError) {
                    console.error('Both bias analysis services failed:', {
                        backend: backendError.message,
                        python: pythonError.message,
                        articleId
                    });
                    
                    throw new Error('Bias analysis temporarily unavailable - both services failed');
                }
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
                }, { timeout: 5000 });
            } catch (reportError) {
                console.warn('Failed to report error:', reportError);
            }
        }
    }), [activeFilters, searchQuery, sortBy, sortOrder, offlineMode, animationEnabled, isMobile, queryClient]);

    // 🔄 ENHANCED INFINITE QUERY FOR ARTICLES
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
                const { pagination } = lastPage;
                return pagination.hasMore ? pagination.currentPage + 1 : undefined;
            },
            cacheTime: CACHE_TIME,
            staleTime: STALE_TIME,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
                // Don't retry on client errors (4xx) except 429
                if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
                    return false;
                }
                // Retry with exponential backoff
                if (failureCount < MAX_RETRIES) {
                    setTimeout(() => {}, RETRY_DELAY * Math.pow(2, failureCount));
                    return true;
                }
                return false;
            },
            retryDelay: (attemptIndex) => Math.min(RETRY_DELAY * Math.pow(2, attemptIndex), 30000),
            onError: (error) => {
                console.error('Articles query error:', error);
                // Track error analytics
                if (window.gtag) {
                    window.gtag('event', 'news_fetch_error', {
                        'event_category': 'API Error',
                        'error_message': error.message,
                        'filters': JSON.stringify(activeFilters)
                    });
                }
            },
            onSuccess: (data) => {
                console.log(`📊 Articles query successful: ${data.pages.length} pages loaded`);
            }
        }
    );

    // 📚 ENHANCED STORY GROUPS QUERY
    const {
        data: storiesData,
        isLoading: isStoriesLoading,
        error: storiesError,
        refetch: refetchStories
    } = useQuery(
        ['stories', activeFilters],
        () => newsAPI.fetchStories(),
        {
            cacheTime: CACHE_TIME,
            staleTime: STALE_TIME,
            enabled: viewMode === 'stories',
            retry: 2,
            onError: (error) => {
                console.error('Stories query error:', error);
            }
        }
    );

    // 📊 ENHANCED STATISTICS QUERY - FIXED: Removed unused variables
    const {
        data: statsData
    } = useQuery(
        ['news-stats'],
        newsAPI.fetchStats,
        {
            cacheTime: CACHE_TIME,
            staleTime: STALE_TIME * 0.4, // Refresh stats more frequently
            refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
            retry: 1,
            onError: (error) => {
                console.error('Stats query error:', error);
            }
        }
    );

    // 📱 RESPONSIVE AND ACCESSIBILITY HANDLERS
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

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

    // 🌐 ONLINE/OFFLINE DETECTION
    useEffect(() => {
        setOfflineMode(!isOnline);
        
        if (isOnline && offlineMode) {
            // Coming back online - refresh data
            queryClient.invalidateQueries(['articles']);
            queryClient.invalidateQueries(['stories']);
            queryClient.invalidateQueries(['news-stats']);
        }
    }, [isOnline, offlineMode, queryClient]);

    // 📊 COMBINE ARTICLES FROM ALL PAGES
    const allArticles = useMemo(() => {
        if (!articlesData?.pages) return [];
        return articlesData.pages.flatMap(page => page.articles || []);
    }, [articlesData]);

    // 👁️ ENHANCED INTERSECTION OBSERVER FOR LAZY LOADING AND ANALYTICS
    useEffect(() => {
        if (!containerRef.current || !animationEnabled) return;

        const observerOptions = {
            threshold: isMobile ? 0.3 : 0.5,
            rootMargin: isMobile ? '30px 0px' : '50px 0px'
        };

        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Trigger animations
                        entry.target.classList.add('visible');
                        
                        // Track article view
                        const articleId = entry.target.dataset.articleId;
                        if (articleId && !viewStats[articleId]) {
                            const viewTime = Date.now();
                            setViewStats(prev => ({ ...prev, [articleId]: viewTime }));
                            
                            // Analytics tracking with enhanced data
                            if (window.gtag) {
                                window.gtag('event', 'article_view', {
                                    'event_category': 'Content',
                                    'article_id': articleId,
                                    'view_mode': viewMode,
                                    'time_on_page': Date.now() - lastInteraction,
                                    'scroll_depth': Math.round((window.scrollY / document.body.scrollHeight) * 100)
                                });
                            }
                        }
                    }
                });
            },
            observerOptions
        );

        // Observe all article cards
        const articleCards = containerRef.current.querySelectorAll('.news-card, .story-group-card');
        articleCards.forEach(card => {
            if (observerRef.current) {
                observerRef.current.observe(card);
            }
        });

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [allArticles, viewMode, viewStats, lastInteraction, animationEnabled, isMobile]);

    // 🎨 ENHANCED GSAP ANIMATIONS
    useLayoutEffect(() => {
        if (!containerRef.current || allArticles.length === 0 || !animationEnabled) return;

        const ctx = gsap.context(() => {
            // Animate article cards on load
            gsap.fromTo('.news-card:not(.visible)', 
                { 
                    opacity: 0, 
                    y: isMobile ? 20 : 30,
                    scale: 0.98
                },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: prefersReducedMotion ? 0.2 : 0.6,
                    stagger: prefersReducedMotion ? 0 : 0.1,
                    ease: "power2.out"
                }
            );

            // Animate bias indicators
            gsap.fromTo('.bias-indicator:not(.animated)',
                { scale: 0, rotation: -180 },
                { 
                    scale: 1, 
                    rotation: 0, 
                    duration: prefersReducedMotion ? 0.1 : 0.8, 
                    delay: prefersReducedMotion ? 0 : 0.3,
                    stagger: prefersReducedMotion ? 0 : 0.05,
                    ease: "back.out(1.7)",
                    onComplete: function() {
                        this.targets().forEach(target => target.classList.add('animated'));
                    }
                }
            );

            // Animate statistics dashboard
            if (statsData && statsRef.current) {
                gsap.fromTo('.stats-card',
                    { opacity: 0, x: -20 },
                    { 
                        opacity: 1, 
                        x: 0, 
                        duration: prefersReducedMotion ? 0.1 : 0.5,
                        stagger: prefersReducedMotion ? 0 : 0.1,
                        ease: "power1.out"
                    }
                );
            }

            // Animate articles grid
            if (articlesGridRef.current) {
                gsap.fromTo(articlesGridRef.current,
                    { opacity: 0, y: 20 },
                    { 
                        opacity: 1, 
                        y: 0, 
                        duration: prefersReducedMotion ? 0.1 : 0.4,
                        ease: "power1.out"
                    }
                );
            }

        }, containerRef);

        return () => ctx.revert();
    }, [allArticles, statsData, animationEnabled, prefersReducedMotion, isMobile]);

    // 🖱️ ENHANCED EVENT HANDLERS
    const handleArticleClick = useCallback((article) => {
        setLocalSelectedArticle(article);
        setLastInteraction(Date.now());
        
        if (onArticleSelect) {
            onArticleSelect(article);
        }
        
        // Enhanced analytics tracking
        if (window.gtag) {
            window.gtag('event', 'article_click', {
                'event_category': 'Content Interaction',
                'article_id': article._id,
                'article_bias': article.articleBias,
                'article_confidence': Math.round((article.biasConfidence || 0) * 100),
                'source': article.source?.name,
                'category': article.category,
                'interaction_time': Date.now() - lastInteraction
            });
        }
    }, [onArticleSelect, lastInteraction]);

    const handleComparisonToggle = useCallback((article) => {
        const newShowComparison = selectedArticle?._id !== article._id || !showComparison;
        
        if (selectedArticle?._id === article._id) {
            setShowComparison(newShowComparison);
        } else {
            setLocalSelectedArticle(article);
            setShowComparison(true);
            if (onArticleSelect) {
                onArticleSelect(article);
            }
        }
        
        setLastInteraction(Date.now());
        
        // Enhanced comparison analytics
        if (window.gtag) {
            window.gtag('event', 'comparison_toggle', {
                'event_category': 'Feature Usage',
                'article_id': article._id,
                'show_comparison': newShowComparison,
                'comparison_count': viewStats ? Object.keys(viewStats).length : 0
            });
        }
    }, [selectedArticle, showComparison, onArticleSelect, viewStats]);

    // 🔄 ENHANCED ERROR RETRY WITH EXPONENTIAL BACKOFF
    const handleRetry = useCallback(async () => {
        const retryKey = `${viewMode}-${Date.now()}`;
        const currentAttempts = retryAttempts[retryKey] || 0;
        
        if (currentAttempts >= MAX_RETRIES) {
            console.error('Max retry attempts reached');
            return;
        }

        setRetryAttempts(prev => ({ ...prev, [retryKey]: currentAttempts + 1 }));
        
        console.log(`🔄 Retrying failed request (attempt ${currentAttempts + 1}/${MAX_RETRIES})...`);
        
        // Exponential backoff delay
        const delay = RETRY_DELAY * Math.pow(2, currentAttempts);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
            if (viewMode === 'articles') {
                await refetchArticles();
            } else {
                await refetchStories();
            }
            
            // Clear retry attempts on success
            setRetryAttempts(prev => {
                const newAttempts = { ...prev };
                delete newAttempts[retryKey];
                return newAttempts;
            });
            
            console.log('✅ Retry successful');
            
        } catch (retryError) {
            console.error('❌ Retry failed:', retryError);
        }
    }, [viewMode, refetchArticles, refetchStories, retryAttempts]);

    const handleErrorReport = useCallback(async (error) => {
        try {
            await newsAPI.reportError(error);
            console.log('✅ Error reported successfully');
        } catch (reportError) {
            console.error('❌ Failed to report error:', reportError);
        }
    }, [newsAPI]);

    // 📊 COMPUTED VALUES AND LOADING STATES
    const isLoading = viewMode === 'articles' ? isArticlesLoading && !isRefetching : isStoriesLoading;
    const error = viewMode === 'articles' ? articlesError : storiesError;
    const hasData = viewMode === 'articles' ? allArticles.length > 0 : storiesData?.storyGroups?.length > 0;
    const isInitialLoading = isLoading && !hasData;

    // 🔍 DEBUG INFORMATION (Development Mode)
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('🔍 NewsFeed Debug Info:', {
                API_URL,
                PYTHON_API_URL,
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
    }, [isLoading, error, hasData, allArticles.length, activeFilters, searchQuery, 
        sortBy, sortOrder, isOnline, offlineMode, cacheStats, performanceMetrics, viewMode]);

    // 📱 RENDER: INITIAL LOADING STATE
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

    // 🚨 RENDER: ERROR STATE
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

    // 📰 RENDER: ARTICLES VIEW
    if (viewMode === 'articles') {
        return (
            <div className="newsfeed-container articles-view" ref={containerRef}>
                {/* Enhanced Statistics Dashboard */}
                <div ref={statsRef}>
                    <StatisticsDashboard 
                        statsData={statsData}
                        viewMode={viewMode}
                        onViewModeChange={onViewModeChange}
                    />
                </div>

                {/* Search Results Info */}
                {searchQuery && (
                    <div className="search-results-info">
                        <h3>🔍 Search Results for "{searchQuery}"</h3>
                        <p>Found {allArticles.length} articles</p>
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

                {/* Filters Summary */}
                {Object.values(activeFilters).some(v => v !== 'all' && v !== false && v !== '') && (
                    <div className="active-filters-summary">
                        <h4>🎯 Active Filters:</h4>
                        <div className="filter-tags">
                            {Object.entries(activeFilters)
                                .filter(([key, value]) => value !== 'all' && value !== false && value !== '')
                                .map(([key, value]) => (
                                    <span key={key} className="filter-tag">
                                        {key}: {String(value)}
                                    </span>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* Enhanced Infinite Scroll Articles List */}
                <div ref={articlesGridRef}>
                    <InfiniteScroll
                        dataLength={allArticles.length}
                        next={fetchNextPage}
                        hasMore={hasNextPage}
                        loader={
                            <InfiniteScrollLoader 
                                isLoading={isFetchingNextPage}
                                hasMore={hasNextPage}
                                error={null}
                                onRetry={fetchNextPage}
                            />
                        }
                        endMessage={
                            <InfiniteScrollLoader 
                                isLoading={false}
                                hasMore={false}
                                error={null}
                            />
                        }
                        scrollThreshold={isMobile ? 0.8 : 0.9}
                        style={{ overflow: 'visible' }}
                    >
                        <div className={`articles-grid ${isMobile ? 'mobile' : 'desktop'}`}>
                            {allArticles.map((article, index) => (
                                <Suspense 
                                    key={`${article._id}-${index}`} 
                                    fallback={
                                        <div className="article-loading">
                                            <Skeleton height={isMobile ? 250 : 300} />
                                        </div>
                                    }
                                >
                                    <div
                                        className="news-card"
                                        data-article-id={article._id}
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
                                            onCompare={() => handleComparisonToggle(article)}
                                            showComparison={
                                                (selectedArticle || localSelectedArticle)?._id === article._id && showComparison
                                            }
                                            viewStats={viewStats[article._id]}
                                            enhanced={true}
                                            isBookmarked={false} // Implement bookmarking if needed
                                            className={`article-${index}`}
                                        />
                                    </div>
                                </Suspense>
                            ))}
                        </div>
                    </InfiniteScroll>
                </div>

                {/* Enhanced Comparison Panel */}
                {showComparison && (selectedArticle || localSelectedArticle) && (
                    <Suspense fallback={
                        <div className="comparison-loading">
                            <LoadingState message="Loading comparison..." count={3} />
                        </div>
                    }>
                        <CompareCoverage
                            article={selectedArticle || localSelectedArticle}
                            onClose={() => {
                                setShowComparison(false);
                                setLocalSelectedArticle(null);
                                if (onArticleSelect) {
                                    onArticleSelect(null);
                                }
                            }}
                            apiService={newsAPI}
                            enhanced={true}
                        />
                    </Suspense>
                )}

                {/* Performance Info (Development) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="dev-performance-info">
                        <details>
                            <summary>📊 Performance Info</summary>
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
    }

    // 📚 RENDER: STORIES VIEW
    return (
        <div className="newsfeed-container stories-view" ref={containerRef}>
            <div className="stories-header">
                <h2>📚 Story Groups</h2>
                <p>Articles grouped by topic and analyzed for bias coverage</p>
                {storiesData?.pagination && (
                    <div className="stories-stats">
                        <span>{storiesData.pagination.totalStories} story groups available</span>
                    </div>
                )}
            </div>

            {storiesData?.storyGroups?.length > 0 ? (
                <div className={`stories-grid ${isMobile ? 'mobile' : 'desktop'}`}>
                    {storiesData.storyGroups.map((story, index) => (
                        <div 
                            key={`${story._id}-${index}`} 
                            className="story-group-card"
                            data-story-id={story._id}
                        >
                            <div className="story-header">
                                <h3>{story.title}</h3>
                                <div className="story-meta">
                                    <span className="article-count">
                                        📰 {story.totalArticles} articles
                                    </span>
                                    <span className="last-updated">
                                        🕒 Updated {moment(story.lastUpdated || story.createdAt).fromNow()}
                                    </span>
                                    {story.diversityScore && (
                                        <span className="diversity-score">
                                            🎯 Diversity: {Math.round(story.diversityScore * 100)}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="story-bias-analysis">
                                <h4>Bias Distribution</h4>
                                <div className="bias-distribution">
                                    {story.biasAnalytics?.biasDistribution ? 
                                        Object.entries(story.biasAnalytics.biasDistribution).map(([bias, count]) => (
                                            <div key={bias} className={`bias-segment ${bias}`}>
                                                <EnhancedBiasIndicator 
                                                    bias={bias}
                                                    confidence={0.8} // Story group confidence
                                                    compact={true}
                                                />
                                                <span className="bias-count">{count}</span>
                                            </div>
                                        )) : 
                                        <div className="no-bias-data">No bias data available</div>
                                    }
                                </div>
                            </div>

                            <div className="story-articles">
                                <h5>Sample Articles:</h5>
                                {story.articles?.slice(0, 3).map(article => (
                                    <div key={article._id} className="story-article-preview">
                                        <div className="article-preview-header">
                                            <span className="source-name">{article.source?.name}</span>
                                            <EnhancedBiasIndicator 
                                                bias={article.articleBias} 
                                                confidence={article.biasConfidence}
                                                compact={true}
                                            />
                                        </div>
                                        <span className="article-title">{article.title}</span>
                                        <span className="article-time">
                                            {moment(article.publishedAt).fromNow()}
                                        </span>
                                    </div>
                                )) || <div>No articles available</div>}
                            </div>

                            <div className="story-actions">
                                <button 
                                    onClick={() => {
                                        handleArticleClick(story);
                                        if (onViewModeChange) {
                                            onViewModeChange('comparison');
                                        }
                                    }}
                                    className="view-story-btn primary"
                                >
                                    🔍 View Full Coverage
                                </button>
                                
                                <button 
                                    onClick={() => {
                                        if (window.gtag) {
                                            window.gtag('event', 'story_share', {
                                                'story_id': story._id,
                                                'article_count': story.totalArticles
                                            });
                                        }
                                        
                                        if (navigator.share) {
                                            navigator.share({
                                                title: story.title,
                                                text: `Check out this story with ${story.totalArticles} different perspectives`,
                                                url: window.location.href
                                            });
                                        }
                                    }}
                                    className="share-story-btn secondary"
                                >
                                    🔗 Share
                                </button>
                            </div>

                            {/* Story Quality Indicators */}
                            {story.qualityIndicators && (
                                <div className="story-quality">
                                    <div className="quality-indicators">
                                        {story.qualityIndicators.hasDiversePerspectives && (
                                            <span className="quality-badge diverse">
                                                🌈 Diverse Perspectives
                                            </span>
                                        )}
                                        {story.qualityIndicators.hasReliableSources && (
                                            <span className="quality-badge reliable">
                                                ✅ Reliable Sources
                                            </span>
                                        )}
                                        {story.qualityIndicators.isRecent && (
                                            <span className="quality-badge recent">
                                                🆕 Recent Updates
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-stories">
                    <div className="no-stories-content">
                        <div className="no-stories-icon">📚</div>
                        <h3>No Story Groups Available</h3>
                        <p>Story groups will appear as articles are analyzed and grouped by topic.</p>
                        <div className="no-stories-suggestions">
                            <h4>This happens when:</h4>
                            <ul>
                                <li>Articles are still being processed</li>
                                <li>No articles match your current filters</li>
                                <li>The system is building story groups</li>
                            </ul>
                        </div>
                        <button 
                            onClick={() => {
                                refetchStories();
                                if (onViewModeChange) {
                                    onViewModeChange('articles');
                                }
                            }}
                            className="view-articles-btn"
                        >
                            📰 View Individual Articles Instead
                        </button>
                    </div>
                </div>
            )}

            {/* Stories Pagination (if needed) */}
            {storiesData?.pagination?.hasMore && (
                <div className="stories-pagination">
                    <button 
                        onClick={() => {
                            // Implement pagination for stories if needed
                            console.log('Load more stories');
                        }}
                        className="load-more-stories-btn"
                    >
                        📚 Load More Story Groups
                    </button>
                </div>
            )}
        </div>
    );
};

NewsFeed.displayName = 'NewsFeed';

// 🔧 Default props
NewsFeed.defaultProps = {
    activeFilters: {},
    viewMode: 'articles',
    sortBy: 'publishedAt',
    sortOrder: 'desc',
    searchQuery: '',
    isOnline: true
};

export default NewsFeed;
