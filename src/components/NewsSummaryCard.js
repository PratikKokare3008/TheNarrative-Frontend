import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import moment from 'moment';
import gsap from 'gsap';

// Enhanced Bias Indicator Component
const BiasIndicator = memo(({ bias, confidence, score, compact = false }) => {
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
    <div className="bias-indicator" title={`Bias: ${getBiasLabel(bias)}, Confidence: ${Math.round(confidence * 100)}%`}>
      <div className="bias-visual">
        <div 
          className="bias-circle"
          style={{ 
            backgroundColor: getBiasColor(bias),
            transform: `scale(${0.8 + confidence * 0.4})` 
          }}
        >
          {getBiasEmoji(bias)}
        </div>
        <div className="bias-score">
          {score && (
            <div 
              className="score-bar"
              style={{ 
                width: `${Math.abs(score - 50) * 2}%`,
                backgroundColor: getBiasColor(bias),
                marginLeft: score < 50 ? 'auto' : '0'
              }}
            />
          )}
        </div>
      </div>
      <div className="bias-details">
        <span className="bias-label">{getBiasLabel(bias)}</span>
        <span className="bias-confidence">{Math.round(confidence * 100)}%</span>
      </div>
    </div>
  );
});

// Enhanced Source Badge Component
const SourceBadge = memo(({ source, publishedAt, category }) => {
  const getSourceColor = (sourceName) => {
    const hash = sourceName.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 60%, 50%)`;
  };

  return (
    <div className="source-badge">
      <div 
        className="source-dot"
        style={{ backgroundColor: getSourceColor(source?.name || 'Unknown') }}
      />
      <div className="source-info">
        <span className="source-name">{source?.name || 'Unknown Source'}</span>
        <span className="source-meta">
          {category && <span className="category-tag">{category}</span>}
          {publishedAt && (
            <span className="publish-time" title={moment(publishedAt).format('LLLL')}>
              {moment(publishedAt).fromNow()}
            </span>
          )}
        </span>
      </div>
    </div>
  );
});

// Enhanced Article Content Component
const ArticleContent = memo(({ article, expanded, onToggle }) => {
  const contentRef = useRef(null);
  
  useEffect(() => {
    if (contentRef.current) {
      if (expanded) {
        gsap.fromTo(contentRef.current, 
          { height: 0, opacity: 0 },
          { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
      } else {
        gsap.to(contentRef.current, 
          { height: 0, opacity: 0, duration: 0.2, ease: 'power2.in' }
        );
      }
    }
  }, [expanded]);

  const getPreviewText = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className="article-content">
      <h3 className="article-title" title={article.title}>
        {article.title}
      </h3>
      
      {article.aiHeading && article.aiHeading !== article.title && (
        <h4 className="ai-heading">
          <span className="ai-badge">AI</span>
          {article.aiHeading}
        </h4>
      )}
      
      <p className="article-summary">
        {getPreviewText(article.summary || article.description || article.content, 150)}
      </p>
      
      {(article.content || article.description) && (
        <button 
          className="expand-button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? 'Show less content' : 'Show more content'}
        >
          {expanded ? '📖 Show Less' : '📚 Read More'}
        </button>
      )}
      
      {expanded && (
        <div ref={contentRef} className="expanded-content">
          <div className="full-content">
            {article.content || article.description}
          </div>
          
          {article.keywords && article.keywords.length > 0 && (
            <div className="article-keywords">
              <span className="keywords-label">Keywords:</span>
              <div className="keywords-list">
                {article.keywords.slice(0, 8).map((keyword, index) => (
                  <span key={index} className="keyword-tag">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {article.keyIndicators && article.keyIndicators.length > 0 && (
            <div className="bias-indicators-section">
              <span className="indicators-label">Bias Indicators:</span>
              <div className="indicators-list">
                {article.keyIndicators.slice(0, 6).map((indicator, index) => (
                  <span key={index} className="bias-indicator-tag">
                    {indicator}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Enhanced Actions Component
const ArticleActions = memo(({ 
  article, 
  onCompare, 
  onShare, 
  onSave, 
  onAnalyze, 
  showComparison,
  isBookmarked = false 
}) => {
  const [actionStates, setActionStates] = useState({
    sharing: false,
    analyzing: false,
    saving: false
  });

  const handleAction = useCallback(async (actionType, handler) => {
    setActionStates(prev => ({ ...prev, [actionType]: true }));
    
    try {
      await handler();
    } catch (error) {
      console.error(`Action ${actionType} failed:`, error);
    } finally {
      setActionStates(prev => ({ ...prev, [actionType]: false }));
    }
  }, []);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary || article.description,
        url: article.url || window.location.href,
      }).catch(err => console.log('Share failed:', err));
    } else if (onShare) {
      onShare(article);
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(article.url || window.location.href);
      // You could show a toast notification here
    }
  }, [article, onShare]);

  return (
    <div className="article-actions">
      <div className="primary-actions">
        <button
          className={`action-btn compare-btn ${showComparison ? 'active' : ''}`}
          onClick={onCompare}
          aria-label="Compare with other perspectives"
          title="Compare with other perspectives"
        >
          ⚖️ Compare
        </button>
        
        <button
          className="action-btn share-btn"
          onClick={() => handleAction('sharing', handleShare)}
          disabled={actionStates.sharing}
          aria-label="Share article"
          title="Share article"
        >
          {actionStates.sharing ? '⏳' : '🔗'} Share
        </button>
        
        {onSave && (
          <button
            className={`action-btn save-btn ${isBookmarked ? 'bookmarked' : ''}`}
            onClick={() => handleAction('saving', () => onSave(article))}
            disabled={actionStates.saving}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark article'}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark article'}
          >
            {actionStates.saving ? '⏳' : isBookmarked ? '🔖' : '📝'} Save
          </button>
        )}
        
        {onAnalyze && (
          <button
            className="action-btn analyze-btn"
            onClick={() => handleAction('analyzing', () => onAnalyze(article))}
            disabled={actionStates.analyzing}
            aria-label="Analyze bias"
            title="Deep bias analysis"
          >
            {actionStates.analyzing ? '⏳' : '🔍'} Analyze
          </button>
        )}
      </div>
      
      {article.url && (
        <div className="secondary-actions">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn external-link"
            aria-label="Read full article (opens in new tab)"
            title="Read full article"
          >
            🌐 Read Full
          </a>
        </div>
      )}
    </div>
  );
});

// Enhanced Quality Metrics Component
const QualityMetrics = memo(({ article, enhanced }) => {
  if (!enhanced) return null;

  const getQualityScore = () => {
    let score = 0;
    let factors = [];

    if (article.biasConfidence > 0.7) {
      score += 30;
      factors.push('High confidence analysis');
    }
    
    if (article.content && article.content.length > 500) {
      score += 20;
      factors.push('Comprehensive content');
    }
    
    if (article.keyIndicators && article.keyIndicators.length > 3) {
      score += 20;
      factors.push('Multiple bias indicators');
    }
    
    if (article.source && article.source.name) {
      score += 15;
      factors.push('Verified source');
    }
    
    if (article.relevanceCheck?.isRelevant) {
      score += 15;
      factors.push('Politically relevant');
    }

    return { score: Math.min(score, 100), factors };
  };

  const { score, factors } = getQualityScore();

  return (
    <div className="quality-metrics" title={`Quality factors: ${factors.join(', ')}`}>
      <div className="quality-score">
        <span className="score-label">Quality</span>
        <div className="score-bar-container">
          <div 
            className="score-bar"
            style={{ 
              width: `${score}%`,
              backgroundColor: score > 70 ? '#059669' : score > 40 ? '#d97706' : '#dc2626'
            }}
          />
        </div>
        <span className="score-value">{score}</span>
      </div>
    </div>
  );
});

// Main NewsSummaryCard Component
const NewsSummaryCard = memo(({ 
  article, 
  onCompare, 
  onShare, 
  onSave, 
  onAnalyze,
  showComparison = false,
  viewStats = null,
  enhanced = false,
  isBookmarked = false,
  className = ''
}) => {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);
  const imageRef = useRef(null);

  // Intersection Observer for lazy loading and animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          
          // Animate card entrance
          gsap.fromTo(cardRef.current,
            { opacity: 0, y: 20, scale: 0.98 },
            { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' }
          );
          
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle image loading
  const handleImageLoad = useCallback(() => {
    if (imageRef.current && isVisible) {
      gsap.fromTo(imageRef.current,
        { opacity: 0, scale: 1.05 },
        { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [isVisible]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Generate card class names
  const cardClasses = [
    'news-summary-card',
    `bias-${article.articleBias || 'unknown'}`,
    expanded ? 'expanded' : '',
    showComparison ? 'comparison-active' : '',
    isVisible ? 'visible' : '',
    className
  ].filter(Boolean).join(' ');

  if (!article) {
    return (
      <div className="news-summary-card skeleton">
        <div className="skeleton-content">
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
          <div className="skeleton-line"></div>
        </div>
      </div>
    );
  }

  return (
    <article  // FIXED: Removed redundant role="article"
      ref={cardRef}
      className={cardClasses}
      data-article-id={article._id}
      aria-labelledby={`article-title-${article._id}`}
    >
      {/* Article Image */}
      {article.urlToImage && !imageError && (
        <div className="article-image-container">
          <img
            ref={imageRef}
            src={article.urlToImage}
            alt={article.title}
            className="article-image"
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          <div className="image-overlay">
            <BiasIndicator 
              bias={article.articleBias}
              confidence={article.biasConfidence}
              score={article.biasScore}
            />
          </div>
        </div>
      )}

      {/* Card Header */}
      <header className="card-header">
        <SourceBadge 
          source={article.source}
          publishedAt={article.publishedAt}
          category={article.category}
        />
        
        {!article.urlToImage && (
          <BiasIndicator 
            bias={article.articleBias}
            confidence={article.biasConfidence}
            score={article.biasScore}
            compact={true}
          />
        )}
      </header>

      {/* Main Content */}
      <div className="card-body">
        <ArticleContent
          article={article}
          expanded={expanded}
          onToggle={() => setExpanded(!expanded)}
        />
        
        {/* Quality Metrics */}
        <QualityMetrics article={article} enhanced={enhanced} />
        
        {/* Bias Reasoning */}
        {article.biasReasoning && expanded && (
          <div className="bias-reasoning">
            <h5>Analysis Reasoning:</h5>
            <p>{article.biasReasoning}</p>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <footer className="card-footer">
        <ArticleActions
          article={article}
          onCompare={onCompare}
          onShare={onShare}
          onSave={onSave}
          onAnalyze={onAnalyze}
          showComparison={showComparison}
          isBookmarked={isBookmarked}
        />
        
        {/* View Stats */}
        {viewStats && enhanced && (
          <div className="view-stats">
            <span className="view-time" title="Time when article was viewed">
              👁️ Viewed {moment(viewStats).fromNow()}
            </span>
          </div>
        )}
      </footer>

      {/* Processing Stats (Debug) */}
      {process.env.NODE_ENV === 'development' && article.processingStats && (
        <div className="debug-stats">
          <small>
            Method: {article.processingStats.method} | 
            Time: {article.processingStats.processingTime}ms |
            Quality: {Math.round((article.biasConfidence || 0) * 100)}%
          </small>
        </div>
      )}
    </article>
  );
});

NewsSummaryCard.displayName = 'NewsSummaryCard';

export default NewsSummaryCard;
