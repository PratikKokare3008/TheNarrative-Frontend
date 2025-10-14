import React, { useState, useCallback, useRef } from 'react'; // FIXED: Removed unused useEffect import
import { useQuery } from 'react-query';
import axios from 'axios';
import moment from 'moment';

const API_URL = process.env.REACT_APP_API_URL || 'https://thenarrative-backend.onrender.com';

const MarketUpdates = ({ 
    compact = true, 
    showIndices = ['SPY', 'QQQ', 'DIA'], 
    className = '',
    refreshInterval = 60000 // 1 minute
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState('SPY');
    const widgetRef = useRef(null);

    // Market data query
    const {
        data: marketData,
        isLoading,
        error,
        refetch
    } = useQuery(
        ['market-data', showIndices],
        async () => {
            const response = await axios.get(`${API_URL}/api/markets`, {
                params: {
                    indices: showIndices.join(','),
                    detailed: isExpanded
                },
                timeout: 10000
            });

            return response.data;
        },
        {
            staleTime: refreshInterval,
            cacheTime: refreshInterval * 2,
            refetchInterval: refreshInterval,
            refetchOnWindowFocus: true,
            retry: 2
        }
    );

    const getMarketIcon = useCallback((symbol) => {
        const iconMap = {
            'SPY': '📈',
            'QQQ': '💻',
            'DIA': '🏭',
            'IWM': '🏪',
            'VTI': '🌍',
            'BTC': '₿',
            'ETH': 'Ξ'
        };
        return iconMap[symbol] || '📊';
    }, []);

    const getChangeColor = useCallback((change) => {
        if (change > 0) return '#059669'; // Green
        if (change < 0) return '#dc2626'; // Red
        return '#6b7280'; // Gray
    }, []);

    const getChangeIcon = useCallback((change) => {
        if (change > 0) return '▲';
        if (change < 0) return '▼';
        return '▶';
    }, []);

    const formatCurrency = useCallback((value, decimals = 2) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value || 0);
    }, []);

    const formatPercentage = useCallback((value, decimals = 2) => {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            signDisplay: 'always'
        }).format((value || 0) / 100);
    }, []);

    const handleToggleExpanded = useCallback(() => {
        setIsExpanded(!isExpanded);
    }, [isExpanded]);

    if (isLoading && !marketData) {
        return (
            <div className={`market-widget loading ${className}`}>
                <div className="market-loading">
                    <span className="loading-icon">📊</span>
                    <span className="loading-text">Loading markets...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`market-widget error ${className}`}>
                <div className="market-error">
                    <span className="error-icon">❌</span>
                    <button 
                        onClick={refetch}
                        className="retry-button"
                        title="Retry market data fetch"
                    >
                        🔄 Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!marketData || !marketData.indices) {
        return (
            <div className={`market-widget no-data ${className}`}>
                <div className="no-data-message">
                    <span className="no-data-icon">📊</span>
                    <span className="no-data-text">No market data</span>
                </div>
            </div>
        );
    }

    const indices = marketData.indices || [];
    const primaryIndex = indices.find(index => index.symbol === selectedIndex) || indices[0];

    if (compact && !isExpanded) {
        return (
            <div 
                ref={widgetRef}
                className={`market-widget compact ${className}`}
                onClick={handleToggleExpanded}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggleExpanded();
                    }
                }}
                aria-label="Market widget - click to expand"
            >
                <div className="market-compact">
                    <span className="market-icon">
                        {getMarketIcon(primaryIndex?.symbol)}
                    </span>
                    <span className="market-symbol">
                        {primaryIndex?.symbol}
                    </span>
                    <span 
                        className="market-price"
                        style={{ color: getChangeColor(primaryIndex?.change) }}
                    >
                        {formatCurrency(primaryIndex?.price)}
                    </span>
                    <span 
                        className="market-change"
                        style={{ color: getChangeColor(primaryIndex?.change) }}
                    >
                        {getChangeIcon(primaryIndex?.change)} {formatPercentage(primaryIndex?.changePercent)}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={widgetRef}
            className={`market-widget expanded ${className}`}
        >
            {/* Header */}
            <div className="market-header">
                <div className="market-title">
                    <span className="title-icon">📊</span>
                    <span className="title-text">Markets</span>
                </div>
                
                <div className="market-status">
                    <span className={`status-indicator ${marketData.marketStatus === 'open' ? 'open' : 'closed'}`}>
                        {marketData.marketStatus === 'open' ? '🟢 Open' : '🔴 Closed'}
                    </span>
                </div>
                
                {compact && (
                    <button
                        className="collapse-btn"
                        onClick={handleToggleExpanded}
                        aria-label="Collapse market widget"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Index Selector */}
            {indices.length > 1 && (
                <div className="index-selector">
                    {indices.map(index => (
                        <button
                            key={index.symbol}
                            className={`index-tab ${selectedIndex === index.symbol ? 'active' : ''}`}
                            onClick={() => setSelectedIndex(index.symbol)}
                        >
                            <span className="tab-icon">{getMarketIcon(index.symbol)}</span>
                            <span className="tab-symbol">{index.symbol}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Main Market Display */}
            {primaryIndex && (
                <div className="market-main">
                    <div className="main-display">
                        <div className="symbol-info">
                            <div className="symbol-icon">
                                {getMarketIcon(primaryIndex.symbol)}
                            </div>
                            <div className="symbol-details">
                                <div className="symbol-name">{primaryIndex.name || primaryIndex.symbol}</div>
                                <div className="symbol-code">{primaryIndex.symbol}</div>
                            </div>
                        </div>

                        <div className="price-info">
                            <div className="current-price">
                                {formatCurrency(primaryIndex.price)}
                            </div>
                            <div 
                                className="price-change"
                                style={{ color: getChangeColor(primaryIndex.change) }}
                            >
                                {getChangeIcon(primaryIndex.change)} 
                                {formatCurrency(Math.abs(primaryIndex.change), 2)} 
                                ({formatPercentage(primaryIndex.changePercent)})
                            </div>
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="market-details">
                        {primaryIndex.volume && (
                            <div className="detail-item">
                                <span className="detail-label">Volume:</span>
                                <span className="detail-value">
                                    {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(primaryIndex.volume)}
                                </span>
                            </div>
                        )}
                        
                        {primaryIndex.high && (
                            <div className="detail-item">
                                <span className="detail-label">Day High:</span>
                                <span className="detail-value">{formatCurrency(primaryIndex.high)}</span>
                            </div>
                        )}
                        
                        {primaryIndex.low && (
                            <div className="detail-item">
                                <span className="detail-label">Day Low:</span>
                                <span className="detail-value">{formatCurrency(primaryIndex.low)}</span>
                            </div>
                        )}

                        {primaryIndex.previousClose && (
                            <div className="detail-item">
                                <span className="detail-label">Prev Close:</span>
                                <span className="detail-value">{formatCurrency(primaryIndex.previousClose)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* All Indices Summary */}
            {isExpanded && indices.length > 1 && (
                <div className="indices-summary">
                    <h4>All Indices</h4>
                    <div className="indices-list">
                        {indices.map(index => (
                            <div 
                                key={index.symbol} 
                                className={`index-item ${selectedIndex === index.symbol ? 'selected' : ''}`}
                                onClick={() => setSelectedIndex(index.symbol)}
                            >
                                <div className="index-basic">
                                    <span className="index-icon">{getMarketIcon(index.symbol)}</span>
                                    <span className="index-symbol">{index.symbol}</span>
                                    <span className="index-price">{formatCurrency(index.price)}</span>
                                </div>
                                <div 
                                    className="index-change"
                                    style={{ color: getChangeColor(index.change) }}
                                >
                                    {getChangeIcon(index.change)} {formatPercentage(index.changePercent)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="market-footer">
                <div className="update-info">
                    <span className="update-time">
                        Updated {moment(marketData.lastUpdated || Date.now()).fromNow()}
                    </span>
                    {marketData.source && (
                        <span className="data-source">
                            via {marketData.source}
                        </span>
                    )}
                </div>
                
                <button
                    onClick={refetch}
                    className="refresh-btn"
                    title="Refresh market data"
                    disabled={isLoading}
                >
                    🔄
                </button>
            </div>

            {/* Market Hours Info */}
            {marketData.marketHours && (
                <div className="market-hours">
                    <div className="hours-info">
                        Market Hours: {marketData.marketHours.open} - {marketData.marketHours.close}
                        {marketData.marketHours.timezone && ` (${marketData.marketHours.timezone})`}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketUpdates;
