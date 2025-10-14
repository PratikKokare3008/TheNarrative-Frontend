import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import gsap from 'gsap';

const FilterSidebar = ({ 
    activeFilters, 
    onFiltersChange, 
    onSearch, 
    searchQuery, 
    onSort,
    sortBy,
    sortOrder,
    viewMode,
    onClose,
    availableCategories = [],
    availableSources = [],
    statistics = null
}) => {
    const [localFilters, setLocalFilters] = useState(activeFilters);
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const [isExpanded, setIsExpanded] = useState({
        filters: true,
        search: true,
        sorting: true,
        advanced: false
    });
    const [animationEnabled] = useState(  // FIXED: Removed unused setAnimationEnabled
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
    
    const sidebarRef = useRef(null);
    const searchInputRef = useRef(null);

    // Default categories and sources if not provided
    const defaultCategories = [
        'politics', 'business', 'technology', 'science', 'health',
        'sports', 'entertainment', 'world', 'national', 'local'
    ];
    
    const defaultSources = [
        'CNN', 'BBC', 'Reuters', 'Associated Press', 'NPR',
        'Wall Street Journal', 'New York Times', 'Washington Post',
        'Fox News', 'MSNBC', 'The Guardian', 'Times of India',
        'Hindu', 'Indian Express', 'NDTV'
    ];

    const categories = availableCategories.length > 0 ? availableCategories : defaultCategories;
    const sources = availableSources.length > 0 ? availableSources : defaultSources;

    // Enhanced entrance animation
    useEffect(() => {
        if (!sidebarRef.current || !animationEnabled) return;

        gsap.fromTo(sidebarRef.current,
            { x: -300, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
        );

        gsap.fromTo('.filter-section',
            { opacity: 0, y: 20 },
            { 
                opacity: 1, 
                y: 0, 
                duration: 0.3,
                stagger: 0.1,
                delay: 0.2,
                ease: 'power1.out'
            }
        );
    }, [animationEnabled]);

    // Sync local filters with props
    useEffect(() => {
        setLocalFilters(activeFilters);
    }, [activeFilters]);

    useEffect(() => {
        setLocalSearch(searchQuery);
    }, [searchQuery]);

    // Debounced search - FIXED: Converted to inline function to resolve dependency issue
    const debouncedSearch = useCallback((query) => {
        let timeoutId;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            onSearch(query);
        }, 300);
    }, [onSearch]);

    const handleFilterChange = useCallback((filterType, value) => {
        const newFilters = { ...localFilters, [filterType]: value };
        setLocalFilters(newFilters);
        onFiltersChange(newFilters);

        // Analytics
        if (window.gtag) {
            window.gtag('event', 'filter_change', {
                'filter_type': filterType,
                'filter_value': value,
                'view_mode': viewMode
            });
        }
    }, [localFilters, onFiltersChange, viewMode]);

    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        setLocalSearch(value);
        debouncedSearch(value);
    }, [debouncedSearch]);

    const handleSortChange = useCallback((field) => {
        const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
        onSort(field, newOrder);
    }, [sortBy, sortOrder, onSort]);

    const clearAllFilters = useCallback(() => {
        const clearedFilters = {
            category: 'all',
            bias: 'all',
            source: 'all',
            dateRange: 'all',
            relevantOnly: false
        };
        setLocalFilters(clearedFilters);
        setLocalSearch('');
        onFiltersChange(clearedFilters);
        onSearch('');

        // Analytics
        if (window.gtag) {
            window.gtag('event', 'filters_cleared', {
                'view_mode': viewMode
            });
        }
    }, [onFiltersChange, onSearch, viewMode]);

    const toggleSection = useCallback((section) => {
        setIsExpanded(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch(e.key) {
                case '/':
                    e.preventDefault();
                    searchInputRef.current?.focus();
                    break;
                case 'Escape':
                    if (onClose) onClose();
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Filter statistics
    const filterStats = useMemo(() => {
        const activeCount = Object.values(localFilters).filter(
            value => value !== 'all' && value !== false && value !== ''
        ).length;
        
        return {
            activeCount,
            hasActiveFilters: activeCount > 0,
            searchActive: localSearch.trim().length > 0
        };
    }, [localFilters, localSearch]);

    const dateRangeOptions = [
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'quarter', label: 'Last 3 Months' },
        { value: 'year', label: 'This Year' }
    ];

    const sortOptions = [
        { field: 'publishedAt', label: 'Publication Date' },
        { field: 'biasScore', label: 'Bias Score' },
        { field: 'biasConfidence', label: 'Analysis Confidence' },
        { field: 'title', label: 'Title (A-Z)' },
        { field: 'relevanceScore', label: 'Relevance' }
    ];

    return (
        <aside ref={sidebarRef} className="filter-sidebar"> {/* FIXED: Removed redundant role="complementary" */}
            {/* Sidebar Header */}
            <div className="sidebar-header">
                <div className="header-content">
                    <h2>🎛️ Filters & Search</h2>
                    <div className="filter-stats">
                        {filterStats.activeCount > 0 && (
                            <span className="active-count">
                                {filterStats.activeCount} active
                            </span>
                        )}
                    </div>
                </div>
                
                {onClose && (
                    <button 
                        className="sidebar-close"
                        onClick={onClose}
                        aria-label="Close filters"
                    >
                        ✕
                    </button>
                )}

                {filterStats.hasActiveFilters && (
                    <button 
                        className="clear-all-btn"
                        onClick={clearAllFilters}
                        aria-label="Clear all filters"
                    >
                        🗑️ Clear All
                    </button>
                )}
            </div>

            <div className="sidebar-content">
                {/* Enhanced Search Section */}
                <div className="filter-section search-section">
                    <button 
                        className="section-header"
                        onClick={() => toggleSection('search')}
                        aria-expanded={isExpanded.search}
                    >
                        <span>🔍 Search Articles</span>
                        <span className={`expand-icon ${isExpanded.search ? 'expanded' : ''}`}>
                            ▼
                        </span>
                    </button>
                    
                    {isExpanded.search && (
                        <div className="section-content">
                            <div className="search-input-container">
                                <input
                                    ref={searchInputRef}
                                    type="search"
                                    placeholder="Search articles, titles, content..."
                                    value={localSearch}
                                    onChange={handleSearchChange}
                                    className="search-input"
                                    aria-label="Search articles"
                                />
                                {localSearch && (
                                    <button 
                                        className="clear-search"
                                        onClick={() => {
                                            setLocalSearch('');
                                            onSearch('');
                                        }}
                                        aria-label="Clear search"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <div className="search-tips">
                                <small>💡 Tip: Press '/' to focus search</small>
                            </div>
                        </div>
                    )}
                </div>

                {/* Enhanced Filters Section */}
                <div className="filter-section filters-section">
                    <button 
                        className="section-header"
                        onClick={() => toggleSection('filters')}
                        aria-expanded={isExpanded.filters}
                    >
                        <span>🎯 Filter Articles</span>
                        <span className={`expand-icon ${isExpanded.filters ? 'expanded' : ''}`}>
                            ▼
                        </span>
                    </button>
                    
                    {isExpanded.filters && (
                        <div className="section-content">
                            {/* Category Filter */}
                            <div className="filter-group">
                                <label className="filter-label">
                                    📂 Category
                                </label>
                                <select
                                    value={localFilters.category || 'all'}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                    className="filter-select"
                                    aria-label="Filter by category"
                                >
                                    <option value="all">All Categories</option>
                                    {categories.map(category => (
                                        <option key={category} value={category}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Bias Filter */}
                            <div className="filter-group">
                                <label className="filter-label">
                                    ⚖️ Political Bias
                                </label>
                                <div className="bias-filter-options">
                                    {[
                                        { value: 'all', label: 'All Biases', color: '#6b7280' },
                                        { value: 'left', label: 'Left', color: '#2563eb' },
                                        { value: 'center', label: 'Center', color: '#059669' },
                                        { value: 'right', label: 'Right', color: '#dc2626' }
                                    ].map(option => (
                                        <button
                                            key={option.value}
                                            className={`bias-option ${localFilters.bias === option.value ? 'active' : ''}`}
                                            onClick={() => handleFilterChange('bias', option.value)}
                                            style={{ 
                                                borderColor: localFilters.bias === option.value ? option.color : 'transparent',
                                                color: localFilters.bias === option.value ? option.color : '#6b7280'
                                            }}
                                            aria-label={`Filter by ${option.label.toLowerCase()} bias`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Source Filter */}
                            <div className="filter-group">
                                <label className="filter-label">
                                    📺 News Source
                                </label>
                                <select
                                    value={localFilters.source || 'all'}
                                    onChange={(e) => handleFilterChange('source', e.target.value)}
                                    className="filter-select"
                                    aria-label="Filter by news source"
                                >
                                    <option value="all">All Sources</option>
                                    {sources.map(source => (
                                        <option key={source} value={source}>
                                            {source}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Range Filter */}
                            <div className="filter-group">
                                <label className="filter-label">
                                    📅 Date Range
                                </label>
                                <select
                                    value={localFilters.dateRange || 'all'}
                                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                                    className="filter-select"
                                    aria-label="Filter by date range"
                                >
                                    {dateRangeOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Relevance Filter */}
                            <div className="filter-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={localFilters.relevantOnly || false}
                                        onChange={(e) => handleFilterChange('relevantOnly', e.target.checked)}
                                        aria-label="Show only politically relevant articles"
                                    />
                                    <span className="checkbox-text">
                                        🎯 Politically Relevant Only
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Enhanced Sorting Section */}
                <div className="filter-section sorting-section">
                    <button 
                        className="section-header"
                        onClick={() => toggleSection('sorting')}
                        aria-expanded={isExpanded.sorting}
                    >
                        <span>🔄 Sort Articles</span>
                        <span className={`expand-icon ${isExpanded.sorting ? 'expanded' : ''}`}>
                            ▼
                        </span>
                    </button>
                    
                    {isExpanded.sorting && (
                        <div className="section-content">
                            <div className="sort-options">
                                {sortOptions.map(option => (
                                    <button
                                        key={option.field}
                                        className={`sort-option ${sortBy === option.field ? 'active' : ''}`}
                                        onClick={() => handleSortChange(option.field)}
                                        aria-label={`Sort by ${option.label}`}
                                    >
                                        <span>{option.label}</span>
                                        {sortBy === option.field && (
                                            <span className="sort-direction">
                                                {sortOrder === 'desc' ? '↓' : '↑'}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Advanced Filters */}
                <div className="filter-section advanced-section">
                    <button 
                        className="section-header"
                        onClick={() => toggleSection('advanced')}
                        aria-expanded={isExpanded.advanced}
                    >
                        <span>⚙️ Advanced Filters</span>
                        <span className={`expand-icon ${isExpanded.advanced ? 'expanded' : ''}`}>
                            ▼
                        </span>
                    </button>
                    
                    {isExpanded.advanced && (
                        <div className="section-content">
                            {/* Confidence Filter */}
                            <div className="filter-group">
                                <label className="filter-label">
                                    📊 Minimum Confidence
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={localFilters.minConfidence || 0}
                                    onChange={(e) => handleFilterChange('minConfidence', parseInt(e.target.value))}
                                    className="confidence-slider"
                                    aria-label="Minimum analysis confidence"
                                />
                                <div className="slider-value">
                                    {localFilters.minConfidence || 0}%
                                </div>
                            </div>

                            {/* Bias Score Range */}
                            <div className="filter-group">
                                <label className="filter-label">
                                    ⚖️ Bias Score Range
                                </label>
                                <div className="range-inputs">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="Min"
                                        value={localFilters.minBiasScore || ''}
                                        onChange={(e) => handleFilterChange('minBiasScore', e.target.value)}
                                        className="range-input"
                                        aria-label="Minimum bias score"
                                    />
                                    <span>to</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="Max"
                                        value={localFilters.maxBiasScore || ''}
                                        onChange={(e) => handleFilterChange('maxBiasScore', e.target.value)}
                                        className="range-input"
                                        aria-label="Maximum bias score"
                                    />
                                </div>
                            </div>

                            {/* Quality Filters */}
                            <div className="filter-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={localFilters.hasImage || false}
                                        onChange={(e) => handleFilterChange('hasImage', e.target.checked)}
                                    />
                                    <span className="checkbox-text">📸 Has Image</span>
                                </label>
                            </div>

                            <div className="filter-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={localFilters.highQuality || false}
                                        onChange={(e) => handleFilterChange('highQuality', e.target.checked)}
                                    />
                                    <span className="checkbox-text">⭐ High Quality Analysis</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Statistics Section */}
                {statistics && (
                    <div className="filter-section stats-section">
                        <div className="section-header">
                            <span>📈 Current Results</span>
                        </div>
                        <div className="section-content">
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <span className="stat-value">{statistics.totalArticles || 0}</span>
                                    <span className="stat-label">Articles</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{statistics.avgConfidence || 0}%</span>
                                    <span className="stat-label">Avg Confidence</span>
                                </div>
                                {statistics.biasDistribution && (
                                    <div className="bias-distribution-mini">
                                        {Object.entries(statistics.biasDistribution).map(([bias, count]) => (
                                            <div key={bias} className={`bias-mini ${bias}`}>
                                                <span>{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Footer */}
            <div className="sidebar-footer">
                <div className="footer-info">
                    <small>
                        💡 Use filters to find specific types of articles
                    </small>
                </div>
                {process.env.NODE_ENV === 'development' && (
                    <div className="debug-info">
                        <small>
                            Active Filters: {filterStats.activeCount} | 
                            Search: {filterStats.searchActive ? 'Yes' : 'No'}
                        </small>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default FilterSidebar;
