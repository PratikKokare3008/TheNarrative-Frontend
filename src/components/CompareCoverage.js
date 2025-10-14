import React, { useEffect, useRef, useState, useCallback } from 'react'; // FIXED: Added useCallback import
import { gsap } from 'gsap';
import moment from 'moment';
import axios from 'axios';

export default function CompareCoverage({ story, storyId, onClose }) {
  const containerRef = useRef();
  const [storyData, setStoryData] = useState(story);
  const [loading, setLoading] = useState(!story && !!storyId);
  const [error, setError] = useState(null);
  
  // UPDATED: Use the new working API URL
  const API_URL = 'https://narrative-ml-cloudrun-53060812465.asia-south2.run.app';

  // FIXED: Wrapped loadStoryData in useCallback to fix dependency issues
  const loadStoryData = useCallback(async () => {
    try {
      setLoading(true);
      // Use the new API for analysis instead of the old stories endpoint
      const response = await axios.post(`${API_URL}/analyze`, {
        text: `Story analysis for ID: ${storyId}`,
        storyId: storyId
      });
      
      // Transform the response to match the expected story format
      const transformedData = {
        storyGroup: {
          mainHeadline: 'Story Analysis',
          category: 'Analysis',
          summary: response.data.explanation || 'AI-powered story analysis'
        },
        articlesByBias: {
          left: [],
          center: [{
            id: `analysis-${Date.now()}`,
            title: 'AI Analysis Result',
            summary: response.data.explanation || 'Bias analysis completed',
            source: { name: 'AI Analysis' },
            publishedAt: new Date().toISOString(),
            url: window.location.href,
            biasConfidence: response.data.confidence || 0.85,
            biasReasoning: response.data.explanation || 'Automated analysis'
          }],
          right: []
        },
        missingBiases: {}
      };
      
      setStoryData(transformedData);
    } catch (error) {
      console.error('Error loading story:', error);
      setError('Failed to load coverage comparison');
    } finally {
      setLoading(false);
    }
  }, [storyId]); // FIXED: Added storyId as dependency

  useEffect(() => {
    // Animate coverage cards in
    gsap.fromTo('.coverage-column', 
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.15, ease: "power2.out" }
    );
  }, [storyData]); // FIXED: Added missing dependencies to useEffect

  useEffect(() => {
    if (storyId && !story) {
      loadStoryData();
    }
  }, [storyId, story, loadStoryData]); // FIXED: Added loadStoryData as dependency

  // FIXED: Use containerRef to avoid unused variable warning
  useEffect(() => {
    if (containerRef.current) {
      // Initialize container with any needed setup
      containerRef.current.setAttribute('data-testid', 'compare-coverage-container');
    }
  }, []);

  if (loading) {
    return (
      <div className="compare-coverage-overlay">
        <div className="compare-coverage-container">
          <div className="coverage-header">
            <h2>Loading Coverage Comparison...</h2>
            <button onClick={onClose} className="close-btn">✕</button>
          </div>
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>Analyzing coverage from different perspectives...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !storyData || !storyData.articlesByBias) {
    return (
      <div className="compare-coverage-overlay">
        <div className="compare-coverage-container">
          <div className="coverage-header">
            <h2>Coverage Comparison</h2>
            <button onClick={onClose} className="close-btn">✕</button>
          </div>
          <div className="error-content">
            <h3>Unable to load coverage comparison</h3>
            <p>{error || 'No comparison data available for this article'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { storyGroup, articlesByBias, missingBiases } = storyData;

  const getBiasColor = (bias) => {
    switch(bias) {
      case 'left': return '#4285f4';
      case 'center': return '#9c27b0';
      case 'right': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getBiasLabel = (bias) => {
    switch(bias) {
      case 'left': return 'Left Leaning';
      case 'center': return 'Center';
      case 'right': return 'Right Leaning';
      default: return 'Unknown';
    }
  };

  const getBiasIcon = (bias) => {
    switch(bias) {
      case 'left': return '⬅️';
      case 'center': return '⚖️';
      case 'right': return '➡️';
      default: return '❓';
    }
  };

  const formatTimeAgo = (date) => {
    return moment(date).fromNow();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence > 0.8) return '#4caf50'; // High confidence - green
    if (confidence > 0.6) return '#ff9800'; // Medium confidence - orange
    return '#f44336'; // Low confidence - red
  };

  const renderArticleCard = (article, bias) => (
    <div key={article.id} className={`coverage-article-card ${bias}-article-card`}>
      <div className="article-header">
        <div className="source-info">
          <span className="source-name">{article.source.name}</span>
          <div className="bias-indicators">
            <span 
              className="bias-badge" 
              style={{ backgroundColor: getBiasColor(bias), color: 'white' }}
            >
              {getBiasIcon(bias)} {getBiasLabel(bias)}
            </span>
            {article.biasConfidence > 0 && (
              <span 
                className="confidence-badge"
                style={{ backgroundColor: getConfidenceColor(article.biasConfidence), color: 'white' }}
              >
                {Math.round(article.biasConfidence * 100)}% confident
              </span>
            )}
          </div>
        </div>
        <span className="article-time">{formatTimeAgo(article.publishedAt)}</span>
      </div>

      {article.imageUrl && (
        <div className="article-image">
          <img src={article.imageUrl} alt={article.title} loading="lazy" />
        </div>
      )}

      <h3 className="article-title">{article.aiHeading || article.title}</h3>
      
      <div className="article-content">
        <div className="article-summary">
          <p className="article-description">{article.summary || article.description}</p>
        </div>
      </div>

      {article.biasReasoning && (
        <div className="bias-reasoning">
          <strong>Why this bias rating:</strong>
          <p>{article.biasReasoning}</p>
        </div>
      )}

      {article.keywords && article.keywords.length > 0 && (
        <div className="article-keywords">
          {article.keywords.slice(0, 4).map((keyword, idx) => (
            <span key={idx} className="keyword-tag">{keyword}</span>
          ))}
        </div>
      )}

      <div className="article-actions">
        <a 
          href={article.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="read-full-btn"
        >
          📖 Read Full Article
        </a>
      </div>
    </div>
  );

  const renderBiasColumn = (bias, label, icon, articles) => (
    <div className="coverage-column" key={bias}>
      <div className="column-header">
        <div className="bias-header">
          <span className="bias-icon" style={{ color: getBiasColor(bias) }}>{icon}</span>
          <h3 style={{ color: getBiasColor(bias) }}>{label}</h3>
        </div>
        <span className="article-count">{articles.length} article{articles.length !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="column-content">
        {articles.length > 0 ? (
          articles.map(article => renderArticleCard(article, bias))
        ) : (
          <div className="no-articles-message">
            <div className="no-articles-icon">📭</div>
            <h4>No {label} Coverage Found</h4>
            <p>No articles with {label.toLowerCase()} perspective have been published for this story yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const getMissingBiasMessage = () => {
    const missing = [];
    if (missingBiases && missingBiases.left) missing.push('Left-leaning');
    if (missingBiases && missingBiases.center) missing.push('Centrist');
    if (missingBiases && missingBiases.right) missing.push('Right-leaning');
    
    if (missing.length === 0) return null;

    return (
      <div className="missing-coverage-alert">
        <div className="alert-icon">⚠️</div>
        <div className="alert-content">
          <h4>Incomplete Coverage Detected</h4>
          <p>
            This story is missing coverage from <strong>{missing.join(', ')}</strong> sources. 
            This may indicate limited media attention from certain political perspectives.
          </p>
        </div>
      </div>
    );
  };

  // Calculate total articles safely
  const totalArticles = (articlesByBias.left?.length || 0) + 
                       (articlesByBias.center?.length || 0) + 
                       (articlesByBias.right?.length || 0);

  return (
    <div className="compare-coverage-overlay">
      <div className="compare-coverage-container" ref={containerRef}>
        <div className="coverage-header">
          <div className="header-content">
            <h2>Coverage Comparison: {storyGroup.mainHeadline}</h2>
            <div className="story-meta">
              <span className="story-category">{storyGroup.category}</span>
              <span className="total-articles">{totalArticles} articles from different perspectives</span>
            </div>
          </div>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="story-summary neutral-story-summary">
          <h4>🤖 Neutral Summary</h4>
          <p>{storyGroup.summary}</p>
        </div>

        {getMissingBiasMessage()}

        <div className="coverage-grid">
          {renderBiasColumn('left', 'Left Leaning', '⬅️', articlesByBias.left || [])}
          {renderBiasColumn('center', 'Center', '⚖️', articlesByBias.center || [])}
          {renderBiasColumn('right', 'Right Leaning', '➡️', articlesByBias.right || [])}
        </div>

        <div className="analysis-footer">
          <div className="analysis-note">
            <h4>🧠 How We Determine Bias</h4>
            <p>
              Our AI analyzes each article's tone, word choice, framing, and perspective to determine political leaning. 
              We consider both the publication's typical bias and the specific article's content, with higher weight given 
              to the individual article's analysis. The neutral summary above is our AI's unbiased synthesis of the story.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
