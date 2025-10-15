import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { gsap } from 'gsap';
import moment from 'moment';

const MarketUpdates = ({ symbols = ['SPY', 'AAPL', 'GOOGL', 'MSFT'], compact = false }) => {
  const [selectedSymbols, setSelectedSymbols] = useState(symbols);
  const [viewMode, setViewMode] = useState('overview'); // overview, detailed, trending
  const [animationEnabled] = useState(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  
  const marketRef = useRef(null);
  const listRef = useRef(null);

  // Market API configuration
  const API_KEY = process.env.REACT_APP_MARKET_API_KEY || 'demo';
  const API_BASE = process.env.REACT_APP_MARKET_API_BASE || 'https://api.marketdata.app/v1';

  // Popular symbols
  const popularSymbols = [
    { symbol: 'SPY', name: 'S&P 500 ETF', category: 'ETF' },
    { symbol: 'AAPL', name: 'Apple Inc.', category: 'Tech' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'Tech' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', category: 'Tech' },
    { symbol: 'TSLA', name: 'Tesla Inc.', category: 'Auto' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'Tech' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', category: 'Tech' },
    { symbol: 'BTC-USD', name: 'Bitcoin', category: 'Crypto' }
  ];

  // Fetch market data
  const { 
    data: marketData, 
    isLoading: marketLoading, 
    error: marketError,
    refetch: refetchMarket 
  } = useQuery(
    ['market-data', selectedSymbols],
    async () => {
      if (API_KEY === 'demo') {
        return generateDemoData();
      }

      const symbolsString = selectedSymbols.join(',');
      const response = await axios.get(`${API_BASE}/stocks/quotes/${symbolsString}`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 5000
      });
      
      return Array.isArray(response.data) ? response.data : [response.data];
    },
    {
      refetchInterval: 30 * 1000, // 30 seconds
      staleTime: 15 * 1000, // 15 seconds
      retry: 2,
      onError: (error) => {
        console.error('Market data fetch error:', error);
      }
    }
  );

  // Generate demo data
  const generateDemoData = () => {
    return selectedSymbols.map((symbol, index) => {
      const basePrice = 150 + (index * 25);
      const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%
      const change = basePrice * (changePercent / 100);
      
      return {
        symbol,
        name: popularSymbols.find(s => s.symbol === symbol)?.name || symbol,
        price: basePrice + change,
        change,
        changePercent,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        high: basePrice + Math.abs(change) + 5,
        low: basePrice - Math.abs(change) - 5,
        open: basePrice + (Math.random() - 0.5) * 10,
        previousClose: basePrice,
        lastUpdated: moment()
      };
    });
  };

  // Animation effects
  useEffect(() => {
    if (!marketRef.current || !animationEnabled) return;

    gsap.fromTo(marketRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
    );
  }, [animationEnabled]);

  useEffect(() => {
    if (!listRef.current || !animationEnabled || !marketData) return;

    gsap.fromTo('.market-card',
      { scale: 0.95, opacity: 0 },
      { 
        scale: 1, 
        opacity: 1, 
        duration: 0.4, 
        stagger: 0.1, 
        ease: "power1.out" 
      }
    );
  }, [marketData, animationEnabled]);

  // Format price
  const formatPrice = (price) => {
    if (typeof price !== 'number') return '$0.00';
    return `$${price.toFixed(2)}`;
  };

  // Format change
  const formatChange = (change, changePercent) => {
    if (typeof change !== 'number' || typeof changePercent !== 'number') {
      return { text: '+$0.00 (+0.00%)', color: '#64748b', isPositive: false };
    }
    
    const isPositive = change >= 0;
    const sign = isPositive ? '+' : '';
    const color = isPositive ? '#059669' : '#dc2626';
    const text = `${sign}$${Math.abs(change).toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
    
    return { text, color, isPositive };
  };

  // Format volume
  const formatVolume = (volume) => {
    if (typeof volume !== 'number') return '0';
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  // Get trend icon
  const getTrendIcon = (changePercent) => {
    if (changePercent > 2) return '🚀';
    if (changePercent > 0) return '📈';
    if (changePercent < -2) return '📉';
    if (changePercent < 0) return '🔻';
    return '➡️';
  };

  // Event handlers
  const handleSymbolToggle = useCallback((symbol) => {
    setSelectedSymbols(prev => {
      if (prev.includes(symbol)) {
        return prev.filter(s => s !== symbol);
      } else {
        return [...prev, symbol];
      }
    });
    
    if (window.gtag) {
      window.gtag('event', 'market_symbol_toggle', {
        event_category: 'Market Updates',
        symbol
      });
    }
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    
    if (window.gtag) {
      window.gtag('event', 'market_view_change', {
        event_category: 'Market Updates',
        view_mode: mode
      });
    }
  }, []);

  // Loading state
  if (marketLoading) {
    return (
      <div ref={marketRef} className="market-updates loading">
        <div className="market-loading">
          <div className="loading-icon">📈</div>
          <p>Loading market data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (marketError) {
    return (
      <div ref={marketRef} className="market-updates error">
        <div className="market-error">
          <div className="error-icon">⚠️</div>
          <h3>Market Data Unavailable</h3>
          <p>{marketError?.message || 'Failed to load market data'}</p>
          <button onClick={refetchMarket} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // Compact view
  if (compact) {
    const topStocks = marketData?.slice(0, 3) || [];
    
    return (
      <div ref={marketRef} className="market-updates compact">
        <div className="market-header">
          <h4>📈 Markets</h4>
          {API_KEY === 'demo' && <span className="demo-badge">Demo</span>}
        </div>
        <div className="stocks-compact">
          {topStocks.map(stock => {
            const changeData = formatChange(stock.change, stock.changePercent);
            return (
              <div key={stock.symbol} className="stock-compact">
                <span className="stock-symbol">{stock.symbol}</span>
                <span className="stock-price">{formatPrice(stock.price)}</span>
                <span 
                  className="stock-change"
                  style={{ color: changeData.color }}
                >
                  {getTrendIcon(stock.changePercent)} {changeData.isPositive ? '+' : ''}{stock.changePercent.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full market updates
  return (
    <div ref={marketRef} className="market-updates">
      <div className="market-header">
        <div className="header-title">
          <h2>📈 Market Updates</h2>
          {API_KEY === 'demo' && <span className="demo-badge">Demo Data</span>}
        </div>

        <div className="market-controls">
          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            {['overview', 'detailed', 'trending'].map(mode => (
              <button
                key={mode}
                className={`view-btn ${viewMode === mode ? 'active' : ''}`}
                onClick={() => handleViewModeChange(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Symbol Selector */}
          <div className="symbol-selector">
            <div className="symbol-pills">
              {popularSymbols.slice(0, 6).map(item => (
                <button
                  key={item.symbol}
                  className={`symbol-pill ${selectedSymbols.includes(item.symbol) ? 'active' : ''}`}
                  onClick={() => handleSymbolToggle(item.symbol)}
                  title={item.name}
                >
                  {item.symbol}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div ref={listRef} className="market-list">
        {marketData && marketData.length > 0 ? (
          marketData.map(stock => {
            const changeData = formatChange(stock.change, stock.changePercent);
            const symbolInfo = popularSymbols.find(s => s.symbol === stock.symbol);
            
            return (
              <div key={stock.symbol} className="market-card">
                <div className="stock-header">
                  <div className="stock-info">
                    <h3 className="stock-symbol">{stock.symbol}</h3>
                    <p className="stock-name">{symbolInfo?.name || stock.name}</p>
                    {symbolInfo?.category && (
                      <span className="stock-category">{symbolInfo.category}</span>
                    )}
                  </div>
                  <div className="trend-indicator">
                    <span className="trend-icon">
                      {getTrendIcon(stock.changePercent)}
                    </span>
                  </div>
                </div>

                <div className="stock-price-section">
                  <div className="current-price">
                    <span className="price-value">{formatPrice(stock.price)}</span>
                    <span 
                      className="price-change"
                      style={{ color: changeData.color }}
                    >
                      {changeData.text}
                    </span>
                  </div>
                </div>

                {viewMode !== 'overview' && (
                  <div className="stock-details">
                    <div className="detail-row">
                      <div className="detail-item">
                        <span className="detail-label">Open</span>
                        <span className="detail-value">{formatPrice(stock.open)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">High</span>
                        <span className="detail-value">{formatPrice(stock.high)}</span>
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-item">
                        <span className="detail-label">Low</span>
                        <span className="detail-value">{formatPrice(stock.low)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Volume</span>
                        <span className="detail-value">{formatVolume(stock.volume)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="stock-footer">
                  <span className="last-updated">
                    Updated: {moment(stock.lastUpdated).format('HH:mm')}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-data">
            <div className="no-data-icon">📈</div>
            <h3>No market data available</h3>
            <p>Please select some symbols to track</p>
          </div>
        )}
      </div>

      <div className="market-footer">
        <div className="market-summary">
          {marketData && marketData.length > 0 && (
            <>
              <span className="summary-item">
                📊 {marketData.length} symbols tracked
              </span>
              <span className="summary-item">
                📈 {marketData.filter(s => s.changePercent > 0).length} up
              </span>
              <span className="summary-item">
                📉 {marketData.filter(s => s.changePercent < 0).length} down
              </span>
            </>
          )}
        </div>
        <div className="footer-actions">
          <span className="update-frequency">Updates every 30s</span>
          <button 
            onClick={refetchMarket} 
            className="refresh-btn"
            disabled={marketLoading}
            title="Refresh market data"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

MarketUpdates.displayName = 'MarketUpdates';

export default MarketUpdates;
