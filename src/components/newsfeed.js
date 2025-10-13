import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useRef, 
  useMemo,
  useLayoutEffect,
  Suspense 
} from 'react';
import { useQuery, useQueryClient, useInfiniteQuery } from 'react-query';
import InfiniteScroll from 'react-infinite-scroll-component';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import axios from 'axios';
import moment from 'moment';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Lazy load components
const NewsSummaryCard = React.lazy(() => import('./NewsSummaryCard'));
const CompareCoverage = React.lazy(() => import('./CompareCoverage'));
const BiasIndicator = React.lazy(() => import('./BiasIndicator'));

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Constants
const API_URL = process.env.REACT_APP_API_URL || 'https://twosides-backend.up.railway.app';
const ARTICLES_PER_PAGE = 20;
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Performance monitoring hook
const usePerformanceMonitoring = (componentName) => {
  const renderStartTime = useRef(Date.now());

  useLayoutEffect(() => {
    const renderTime = Date.now() - renderStartTime.current;

    // Report performance metrics
    if (window.gtag) {
      window.gtag('event', 'component_render_time', {
        component: componentName,
        render_time: renderTime,
        custom_parameter: 'performance_monitoring'
      });
    }

    console.log(`${componentName} rendered in ${renderTime}ms`);
  });
};

// Enhanced NewsFeed Component
const NewsFeed = ({ 
  filters: propFilters, 
  onError, 
  onFilterChange,
  onStorySelect 
}) => {
  // Performance monitoring
  usePerformanceMonitoring('NewsFeed');

  // State management
  const [selectedStory, setSelectedStory] = useState(null);
  const [view, setView] = useState('articles'); // 'articles' or 'stories'
  const [sortOptions, setSortOptions] = useState({
    sortBy: 'publishedAt',
    sortOrder: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilters, setLocalFilters] = useState({
    category: 'all',
    bias: 'all',
    publication: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
    minBiasScore: 0,
    showOnlyRelevant: true
  });

  // Refs for animations and performance
  const containerRef = useRef();
  const observerRef = useRef();
  const queryClient = useQueryClient();

  // Combine filters
  const activeFilters = useMemo(() => ({
    ...localFilters,
    ...propFilters,
    ...sortOptions,
    search: searchTerm || propFilters?.search || '',
    showOnlyRelevant: localFilters.showOnlyRelevant
  }), [localFilters, propFilters, sortOptions, searchTerm]);

  // Enhanced API service with caching
  const newsAPI = useMemo(() => ({
    fetchArticles: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: ARTICLES_PER_PAGE.toString(),
        ...(activeFilters.category !== 'all' && { category: activeFilters.category }),
        ...(activeFilters.bias !== 'all' && { bias: activeFilters.bias }),
        ...(activeFilters.publication !== 'all' && { source: activeFilters.publication }),
        ...(activeFilters.showOnlyRelevant && { relevant_only: 'true' }),
        ...(activeFilters.minBiasScore > 0 && { min_bias_score: activeFilters.minBiasScore }),
        sortBy: activeFilters.sortBy,
        sortOrder: activeFilters.sortOrder,
        ...(activeFilters.search && { search: activeFilters.search }),
        ...(activeFilters.dateFrom && { dateFrom: activeFilters.dateFrom }),
        ...(activeFilters.dateTo && { dateTo: activeFilters.dateTo }),
        enhanced: 'true' // Request enhanced data with bias analysis
      });

      const response = await axios.get(`${API_URL}/api/news?${params}`, {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      return response.data;
    },

    fetchStories: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: 10,
        ...(activeFilters.category !== 'all' && { category: activeFilters.category }),
        enhanced: 'true'
      });

      const response = await axios.get(`${API_URL}/api/news/stories?${params}`, {
        timeout: 15000
      });

      return response.data;
    },

    fetchStats: async () => {
      const response = await axios.get(`${API_URL}/api/news/stats`, {
        timeout: 10000
      });
      return response.data;
    },

    fetchStoryDetails: async (storyId) => {
      const response = await axios.get(`${API_URL}/api/news/stories/${storyId}`, {
        timeout: 10000
      });
      return response.data;
    }
  }), [activeFilters]);

  // Infinite query for articles
  const {
    data: articlesData,
    fetchNextPage: fetchNextArticlesPage,
    hasNextPage: hasNextArticlesPage,
    isFetchingNextPage: isFetchingNextArticlesPage,
    isLoading: articlesLoading,
    isError: articlesError,
    error: articlesErrorDetails,
    refetch: refetchArticles
  } = useInfiniteQuery(
    ['articles', activeFilters],
    newsAPI.fetchArticles,
    {
      getNextPageParam: (lastPage, pages) => {
        return lastPage.pagination?.hasMore ? pages.length + 1 : undefined;
      },
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error) => {
        console.error('Articles fetch error:', error);
        if (onError) onError(error);
      }
    }
  );

  // Infinite query for stories
  const {
    data: storiesData,
    fetchNextPage: fetchNextStoriesPage,
    hasNextPage: hasNextStoriesPage,
    isFetchingNextPage: isFetchingNextStoriesPage,
    isLoading: storiesLoading,
    isError: storiesError
  } = useInfiniteQuery(
    ['stories', activeFilters],
    newsAPI.fetchStories,
    {
      getNextPageParam: (lastPage, pages) => {
        return lastPage.pagination?.hasMore ? pages.length + 1 : undefined;
      },
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      enabled: view === 'stories',
      retry: 1
    }
  );

  // Stats query
  const { data: stats } = useQuery(
    ['newsStats'],
    newsAPI.fetchStats,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 1
    }
  );

  // Flatten data for easier consumption
  const articles = useMemo(() => {
    return articlesData?.pages?.flatMap(page => page.articles) || [];
  }, [articlesData]);

  const stories = useMemo(() => {
    return storiesData?.pages?.flatMap(page => page.storyGroups) || [];
  }, [storiesData]);

  // Enhanced animations with performance optimization
  useEffect(() => {
    if (articles.length > 0 && containerRef.current) {
      const newCards = containerRef.current.querySelectorAll('.news-card:not(.animated)');

      if (newCards.length > 0) {
        gsap.fromTo(newCards,
          { 
            opacity: 0, 
            y: 50, 
            scale: 0.95 
          },
          { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            duration: 0.6,
            stagger: 0.08,
            ease: "power2.out",
            onComplete: () => {
              newCards.forEach(card => card.classList.add('animated'));
            }
          }
        );
      }
    }
  }, [articles]);

  // Scroll-triggered animations for performance
  useEffect(() => {
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll('.news-card');

      cards.forEach((card, index) => {
        ScrollTrigger.create({
          trigger: card,
          start: "top 85%",
          once: true,
          onEnter: () => {
            gsap.to(card, {
              opacity: 1,
              y: 0,
              duration: 0.5,
              delay: index * 0.05,
              ease: "power2.out"
            });
          }
        });
      });

      return () => {
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      };
    }
  }, [articles, stories, view]);

  // Handlers with optimization
  const handleViewChange = useCallback((newView) => {
    setView(newView);

    // Analytics
    if (window.gtag) {
      window.gtag('event', 'view_change', {
        from_view: view,
        to_view: newView,
        custom_parameter: 'newsfeed_navigation'
      });
    }
  }, [view]);

  const handleStoryClick = useCallback(async (storyId) => {
    try {
      const storyData = await newsAPI.fetchStoryDetails(storyId);
      setSelectedStory(storyData);
      if (onStorySelect) onStorySelect(storyData);
    } catch (error) {
      console.error('Error loading story details:', error);
      if (onError) onError(error);
    }
  }, [newsAPI, onStorySelect, onError]);

  const handleCompareClick = useCallback(async (article) => {
    try {
      const response = await axios.get(`${API_URL}/api/news/compare/${article._id}`, {
        timeout: 10000
      });

      if (response.data.storyId) {
        await handleStoryClick(response.data.storyId);
      } else {
        // Create temporary story for single article
        const tempStory = {
          _id: 'temp_' + article._id,
          mainHeadline: article.title,
          summary: article.summary || article.description,
          articles: [article],
          biasDistribution: {
            [article.articleBias || 'unknown']: 1,
            left: 0, center: 0, right: 0, unknown: 0
          }
        };
        tempStory.biasDistribution[article.articleBias || 'unknown'] = 1;

        setSelectedStory(tempStory);
      }

      // Analytics
      if (window.gtag) {
        window.gtag('event', 'compare_coverage', {
          article_id: article._id,
          article_bias: article.articleBias,
          custom_parameter: 'bias_analysis'
        });
      }

    } catch (error) {
      console.error('Error loading comparison data:', error);
      alert('Unable to load comparison data. This article may not have alternative coverage yet.');
    }
  }, [handleStoryClick]);

  const handleFilterChange = useCallback((newFilters) => {
    setLocalFilters(prev => ({ ...prev, ...newFilters }));
    if (onFilterChange) onFilterChange(newFilters);

    // Clear cache when filters change significantly
    if (newFilters.category || newFilters.bias || newFilters.search) {
      queryClient.invalidateQueries(['articles']);
      queryClient.invalidateQueries(['stories']);
    }
  }, [onFilterChange, queryClient]);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);

    // Debounce search
    const timeoutId = setTimeout(() => {
      handleFilterChange({ search: term });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [handleFilterChange]);

  // Enhanced bias color system
  const getBiasColor = useCallback((bias) => {
    const colors = {
      left: '#2563eb', // Blue
      center: '#7c3aed', // Purple  
      right: '#dc2626', // Red
      unknown: '#6b7280' // Gray
    };
    return colors[bias] || colors.unknown;
  }, []);

  const getBiasLabel = useCallback((bias) => {
    const labels = {
      left: 'Left-Leaning',
      center: 'Center',
      right: 'Right-Leaning', 
      unknown: 'Unknown'
    };
    return labels[bias] || labels.unknown;
  }, []);

  const getBiasIcon = useCallback((bias) => {
    const icons = {
      left: '🔵',
      center: '🟣',
      right: '🔴',
      unknown: '⚪'
    };
    return icons[bias] || icons.unknown;
  }, []);

  // Enhanced article card renderer
  const renderArticleCard = useCallback((article, index) => {
    const hasReliableBiasData = article.biasConfidence > 0.6 && article.articleBias !== 'unknown';
    const isHighBias = article.biasScore > 60;
    const isPolitical = article.relevanceCheck?.isRelevant && article.category === 'politics';

    return (
      <div 
        key={article._id} 
        className={`news-card ${isPolitical ? 'political-content' : 'general-content'} ${hasReliableBiasData ? 'bias-analyzed' : 'bias-pending'}`}
        data-bias={article.articleBias}
        data-bias-score={article.biasScore}
        style={{
          '--bias-color': getBiasColor(article.articleBias),
          '--animation-delay': `${index * 0.1}s`
        }}
        role="article"
        aria-label={`Article: ${article.title}`}
      >
        {/* Enhanced Article Image with Lazy Loading */}
        {article.imageUrl && (
          <div className="news-image">
            <img 
              src={article.imageUrl} 
              alt={article.title}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
              style={{
                aspectRatio: '16/9',
                objectFit: 'cover'
              }}
            />
          </div>
        )}

        {/* Enhanced Bias Indicator */}
        {hasReliableBiasData && (
          <Suspense fallback={<div className="bias-indicator-skeleton" />}>
            <BiasIndicator 
              bias={article.articleBias}
              score={article.biasScore}
              confidence={article.biasConfidence}
              direction={article.biasDirection}
              keyIndicators={article.keyIndicators}
              reasoning={article.biasReasoning}
              compact={true}
            />
          </Suspense>
        )}

        <div className="news-content">
          {/* Category and Source */}
          <div className="news-meta">
            <span className="category-tag" data-category={article.category}>
              {article.category}
            </span>
            <span className="source-name">{article.source?.name || 'Unknown Source'}</span>
            <time className="publish-time" dateTime={article.publishedAt}>
              {moment(article.publishedAt).fromNow()}
            </time>
          </div>

          {/* Enhanced Title with Bias Context */}
          <h3 className="news-title">
            <a 
              href={article.url} 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label={`Read full article: ${article.title}`}
            >
              {article.title}
            </a>
            {isHighBias && (
              <span className="high-bias-indicator" title="High bias detected">
                ⚠️
              </span>
            )}
          </h3>

          {/* Enhanced Summary with AI Insights */}
          {article.summary ? (
            <p className="news-summary ai-generated" title="AI-generated summary">
              <span className="ai-badge">AI</span>
              {article.summary}
            </p>
          ) : article.description ? (
            <p className="news-summary original">
              {article.description}
            </p>
          ) : null}

          {/* Detailed Bias Analysis (Expandable) */}
          {hasReliableBiasData && article.biasReasoning && (
            <details className="bias-reasoning">
              <summary>
                {getBiasIcon(article.articleBias)} Why {getBiasLabel(article.articleBias)}? 
                <span className="confidence-score">
                  ({Math.round(article.biasConfidence * 100)}% confidence)
                </span>
              </summary>
              <div className="reasoning-content">
                <p>{article.biasReasoning}</p>
                {article.keyIndicators && article.keyIndicators.length > 0 && (
                  <div className="key-indicators">
                    <strong>Key indicators:</strong>
                    <ul>
                      {article.keyIndicators.slice(0, 5).map((indicator, idx) => (
                        <li key={idx}>{indicator}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Article Keywords */}
          {article.keywords && article.keywords.length > 0 && (
            <div className="article-keywords">
              {article.keywords.slice(0, 5).map((keyword, idx) => (
                <span key={idx} className="keyword-tag">
                  {keyword}
                </span>
              ))}
            </div>
          )}

          {/* Enhanced Actions */}
          <div className="news-actions">
            <a 
              href={article.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="read-more-btn"
              onClick={() => {
                if (window.gtag) {
                  window.gtag('event', 'article_click', {
                    article_id: article._id,
                    article_title: article.title,
                    article_bias: article.articleBias,
                    custom_parameter: 'engagement'
                  });
                }
              }}
            >
              Read Article →
            </a>

            {isPolitical && (
              <button 
                onClick={() => handleCompareClick(article)}
                className="compare-btn"
                title="Compare coverage across different sources and perspectives"
              >
                📊 Compare Coverage
              </button>
            )}

            {/* Share Button */}
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: article.title,
                    url: article.url
                  });
                } else {
                  navigator.clipboard.writeText(article.url);
                  alert('Link copied to clipboard!');
                }
              }}
              className="share-btn"
              title="Share article"
            >
              🔗 Share
            </button>
          </div>

          {/* Quality and Processing Information */}
          <div className="processing-info">
            {article.processingStats?.method && (
              <span className="processing-method" title={`Analyzed using ${article.processingStats.method}`}>
                Method: {article.processingStats.method}
              </span>
            )}
            {article.qualityScore && (
              <span className="quality-score" title="Content quality score">
                Quality: {article.qualityScore}/100
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }, [getBiasColor, getBiasLabel, getBiasIcon, handleCompareClick]);

  // Enhanced story group renderer
  const renderStoryGroup = useCallback((storyGroup, index) => {
    const biasAnalytics = storyGroup.biasAnalytics || {};
    const hasDiversePerspectives = biasAnalytics.coverageCompleteness?.score > 0.6;

    return (
      <div 
        key={storyGroup._id}
        className="story-group-card"
        style={{ '--animation-delay': `${index * 0.1}s` }}
        role="article"
        aria-label={`Story group: ${storyGroup.mainHeadline}`}
      >
        {/* Story Header */}
        <div className="story-header">
          <h3 className="story-headline">{storyGroup.mainHeadline}</h3>
          <div className="story-meta">
            <span className="article-count">
              {storyGroup.totalArticles} articles
            </span>
            <span className="story-category">{storyGroup.category}</span>
            {hasDiversePerspectives && (
              <span className="diversity-indicator" title="Multiple perspectives available">
                🎭 Diverse Coverage
              </span>
            )}
          </div>
        </div>

        {/* Bias Distribution Visualization */}
        {storyGroup.biasDistribution && (
          <div className="bias-distribution-chart">
            <h4>Coverage Distribution</h4>
            <div className="bias-bars">
              {Object.entries(storyGroup.biasDistribution).map(([bias, count]) => {
                if (count === 0) return null;
                const percentage = (count / storyGroup.totalArticles) * 100;

                return (
                  <div key={bias} className="bias-bar-container">
                    <div className="bias-bar-label">
                      {getBiasIcon(bias)} {getBiasLabel(bias)} ({count})
                    </div>
                    <div className="bias-bar">
                      <div 
                        className="bias-bar-fill"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getBiasColor(bias)
                        }}
                        title={`${percentage.toFixed(1)}% (${count} articles)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Enhanced Analytics */}
        {biasAnalytics && (
          <div className="story-analytics">
            <div className="analytics-grid">
              <div className="metric">
                <span className="metric-label">Avg. Bias Score</span>
                <span className="metric-value">{biasAnalytics.averageBiasScore || 0}/100</span>
              </div>
              <div className="metric">
                <span className="metric-label">Polarization</span>
                <span className="metric-value">
                  {Math.round((biasAnalytics.polarizationIndex || 0) * 100)}%
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Source Diversity</span>
                <span className="metric-value">
                  {biasAnalytics.sourceDiversity?.uniqueSources || 0} sources
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Quality</span>
                <span className="metric-value">
                  {Math.round(biasAnalytics.averageQuality || 0)}/100
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Story Summary */}
        <div className="story-summary">
          <p>{storyGroup.summary}</p>
        </div>

        {/* Missing Perspectives Alert */}
        {biasAnalytics.coverageCompleteness?.missingPerspectives?.length > 0 && (
          <div className="missing-perspectives">
            <span className="warning-icon">⚠️</span>
            <span>
              Limited {biasAnalytics.coverageCompleteness.missingPerspectives.join(' and ')} perspective coverage
            </span>
          </div>
        )}

        {/* Story Actions */}
        <div className="story-actions">
          <button 
            onClick={() => handleStoryClick(storyGroup._id)}
            className="explore-story-btn"
          >
            📊 Explore All Perspectives
          </button>

          <span className="last-updated">
            Updated {moment(storyGroup.lastUpdated || storyGroup.createdAt).fromNow()}
          </span>
        </div>
      </div>
    );
  }, [getBiasColor, getBiasLabel, getBiasIcon, handleStoryClick]);

  // Loading skeleton renderer
  const renderSkeleton = useCallback((count = 5) => {
    return Array.from({ length: count }).map((_, index) => (
      <div key={index} className="news-card skeleton-card">
        <Skeleton height={200} />
        <div className="news-content">
          <Skeleton height={20} width="60%" />
          <Skeleton height={60} />
          <Skeleton height={20} width="80%" />
          <Skeleton height={40} />
        </div>
      </div>
    ));
  }, []);

  // Main component render
  const currentData = view === 'articles' ? articles : stories;
  const isLoading = view === 'articles' ? articlesLoading : storiesLoading;
  const isError = view === 'articles' ? articlesError : storiesError;
  const hasNextPage = view === 'articles' ? hasNextArticlesPage : hasNextStoriesPage;
  const isFetchingNextPage = view === 'articles' ? isFetchingNextArticlesPage : isFetchingNextStoriesPage;
  const fetchNextPage = view === 'articles' ? fetchNextArticlesPage : fetchNextStoriesPage;

  if (isError) {
    return (
      <div className="error-state" role="alert">
        <h2>Unable to load news</h2>
        <p>
          {articlesErrorDetails?.message || 'There was a problem loading the news feed. Please try again.'}
        </p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="news-feed-container" ref={containerRef}>
      {/* Enhanced Controls */}
      <div className="news-feed-controls">
        <div className="view-toggles">
          <button 
            onClick={() => handleViewChange('articles')}
            className={`view-toggle ${view === 'articles' ? 'active' : ''}`}
            aria-pressed={view === 'articles'}
          >
            📰 Articles {stats?.totalArticles ? `(${stats.totalArticles.toLocaleString()})` : ''}
          </button>
          <button 
            onClick={() => handleViewChange('stories')}
            className={`view-toggle ${view === 'stories' ? 'active' : ''}`}
            aria-pressed={view === 'stories'}
          >
            📊 Stories {stats?.totalStories ? `(${stats.totalStories})` : ''}
          </button>
        </div>

        {/* Enhanced Search */}
        <div className="search-container">
          <input
            type="search"
            placeholder="Search news..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
            aria-label="Search news articles"
          />
          <button className="search-btn" aria-label="Search">
            🔍
          </button>
        </div>

        {/* Enhanced Filters */}
        <div className="quick-filters">
          <select 
            value={activeFilters.bias}
            onChange={(e) => handleFilterChange({ bias: e.target.value })}
            aria-label="Filter by bias"
          >
            <option value="all">All Bias Types</option>
            <option value="left">Left-Leaning</option>
            <option value="center">Center</option>
            <option value="right">Right-Leaning</option>
            <option value="unknown">Unknown</option>
          </select>

          <label className="relevance-filter">
            <input
              type="checkbox"
              checked={localFilters.showOnlyRelevant}
              onChange={(e) => handleFilterChange({ showOnlyRelevant: e.target.checked })}
            />
            Political content only
          </label>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="news-stats">
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-value">{stats.totalArticles?.toLocaleString()}</span>
              <span className="stat-label">Total Articles</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.biasStats?.analyzed || 0}</span>
              <span className="stat-label">Analyzed for Bias</span>
            </div>
            <div className="stat">
              <span className="stat-value">{Math.round(stats.biasStats?.averageAccuracy * 100) || 0}%</span>
              <span className="stat-label">Analysis Accuracy</span>
            </div>
            <div className="stat">
              <span className="stat-value">{moment(stats.lastUpdate).fromNow()}</span>
              <span className="stat-label">Last Updated</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="news-content-area" role="main" aria-live="polite">
        {isLoading && currentData.length === 0 ? (
          <div className="loading-skeleton">
            {renderSkeleton(8)}
          </div>
        ) : currentData.length === 0 ? (
          <div className="empty-state">
            <h3>No {view} found</h3>
            <p>Try adjusting your filters or search terms.</p>
            <button onClick={() => {
              setLocalFilters({
                category: 'all',
                bias: 'all',
                publication: 'all',
                dateFrom: '',
                dateTo: '',
                search: '',
                minBiasScore: 0,
                showOnlyRelevant: false
              });
              setSearchTerm('');
            }} className="reset-filters-btn">
              Reset Filters
            </button>
          </div>
        ) : (
          <InfiniteScroll
            dataLength={currentData.length}
            next={fetchNextPage}
            hasMore={hasNextPage}
            loader={
              <div className="loading-more">
                {renderSkeleton(3)}
              </div>
            }
            endMessage={
              <div className="end-message">
                <p>You've reached the end! 🎉</p>
                <p>Found {currentData.length} {view === 'articles' ? 'articles' : 'story groups'}.</p>
              </div>
            }
            scrollThreshold={0.8}
          >
            <div className={`news-grid ${view === 'stories' ? 'stories-grid' : 'articles-grid'}`}>
              {view === 'articles' 
                ? currentData.map((article, index) => renderArticleCard(article, index))
                : currentData.map((story, index) => renderStoryGroup(story, index))
              }
            </div>
          </InfiniteScroll>
        )}

        {isFetchingNextPage && (
          <div className="fetching-more">
            {renderSkeleton(2)}
          </div>
        )}
      </div>

      {/* Compare Coverage Modal */}
      {selectedStory && (
        <Suspense fallback={<div className="modal-loading">Loading comparison...</div>}>
          <CompareCoverage
            story={selectedStory}
            onClose={() => setSelectedStory(null)}
            enhanced={true}
          />
        </Suspense>
      )}
    </div>
  );
};

export default React.memo(NewsFeed);
