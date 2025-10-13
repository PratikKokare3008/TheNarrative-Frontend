import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FilterSidebar from './FilterSidebar';
import gsap from 'gsap';
import moment from 'moment';

const SidebarWithFilters = ({
    activeFilters,
    onFiltersChange,
    onSearch,
    searchQuery,
    onSort,
    sortBy,
    sortOrder,
    viewMode,
    onClose,
    performanceMetrics = {}
}) => {
    const [quickStats, setQuickStats] = useState(null);
    const [recentSearches, setRecentSearches] = useState([]);
    const [savedFilters, setSavedFilters] = useState([]);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeSection, setActiveSection] = useState('filters');
    
    const sidebarRef = useRef(null);
    const statsRef = useRef(null);

    // Load saved data from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('thenarrative_recent_searches');
            if (saved) {
                setRecentSearches(JSON.parse(saved).slice(0, 5));
            }

            const savedFiltersData = localStorage.getItem('thenarrative_saved_filters');
            if (savedFiltersData) {
                setSavedFilters(JSON.parse(savedFiltersData));
            }
        } catch (error) {
            console.warn('Failed to load saved data:', error);
        }
    }, []);

    // Save recent searches
    useEffect(() => {
        if (searchQuery && searchQuery.trim()) {
            setRecentSearches(prev => {
                const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5);
                try {
                    localStorage.setItem('thenarrative_recent_searches', JSON.stringify(updated));
                } catch (error) {
                    console.warn('Failed to save recent searches:', error);
                }
                return updated;
            });
        }
    }, [searchQuery]);

    // Enhanced animation entrance
    useEffect(() => {
        if (!sidebarRef.current) return;

        const tl = gsap.timeline();
        
        tl.fromTo(sidebarRef.current,
            { x: -350, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
        );

        if (statsRef.current) {
            tl.fromTo(statsRef.current.children,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.3, stagger: 0.1 },
                '-=0.2'
            );
        }
    }, []);

    const handleSaveCurrentFilters = useCallback(() => {
        const filterName = `Filters ${moment().format('MMM DD, HH:mm')}`;
        const newSavedFilter = {
            id: Date.now().toString(),
            name: filterName,
            filters: activeFilters,
            searchQuery,
            sortBy,
            sortOrder,
            createdAt: new Date().toISOString()
        };

        const updated = [newSavedFilter, ...savedFilters].slice(0, 10);
        setSavedFilters(updated);

        try {
            localStorage.setItem('thenarrative_saved_filters', JSON.stringify(updated));
        } catch (error) {
            console.warn('Failed to save filters:', error);
        }

        // Analytics
        if (window.gtag) {
            window.gtag('event', 'filters_saved', {
                'filter_count': Object.keys(activeFilters).length
            });
        }
    }, [activeFilters, searchQuery, sortBy, sortOrder, savedFilters]);

    const handleLoadSavedFilter = useCallback((savedFilter) => {
        onFiltersChange(savedFilter.filters);
        onSearch(savedFilter.searchQuery || '');
        onSort(savedFilter.sortBy || 'publishedAt', savedFilter.sortOrder || 'desc');

        // Analytics
        if (window.gtag) {
            window.gtag('event', 'saved_filter_loaded', {
                'filter_id': savedFilter.id
            });
        }
    }, [onFiltersChange, onSearch, onSort]);

    const handleDeleteSavedFilter = useCallback((filterId) => {
        const updated = savedFilters.filter(f => f.id !== filterId);
        setSavedFilters(updated);

        try {
            localStorage.setItem('thenarrative_saved_filters', JSON.stringify(updated));
        } catch (error) {
            console.warn('Failed to delete saved filter:', error);
        }
    }, [savedFilters]);

    // Quick filter presets
    const quickFilterPresets = useMemo(() => [
        {
            name: 'Breaking News',
            icon: '🚨',
            filters: { dateRange: 'today', relevantOnly: true },
            description: 'Latest important news'
        },
        {
            name: 'Political News',
            icon: '🏛️',
            filters: { category: 'politics', relevantOnly: true },
            description: 'Political coverage only'
        },
        {
            name: 'High Confidence',
            icon: '✅',
            filters: { minConfidence: 80, highQuality: true },
            description: 'Most reliable analysis'
        },
        {
            name: 'Diverse Views',
            icon: '🌈',
            filters: { bias: 'all', minConfidence: 60 },
            description: 'Multiple perspectives'
        },
        {
            name: 'Business Focus',
            icon: '💼',
            filters: { category: 'business', dateRange: 'week' },
            description: 'Business & economics'
        }
    ], []);

    const hasActiveFilters = useMemo(() => {
        return Object.values(activeFilters).some(value => 
            value !== 'all' && value !== false && value !== '' && value !== null
        );
    }, [activeFilters]);

    const activeFilterCount = useMemo(() => {
        return Object.values(activeFilters).filter(value => 
            value !== 'all' && value !== false && value !== '' && value !== null
        ).length;
    }, [activeFilters]);

    return (
        <div 
            ref={sidebarRef} 
            className={`sidebar-with-filters ${isCollapsed ? 'collapsed' : ''}`}
        >
            {/* Enhanced Sidebar Header */}
            <div className="sidebar-header-enhanced">
                <div className="header-top">
                    <div className="title-section">
                        <h2>🎛️ News Control Center</h2>
                        <div className="subtitle">
                            Find exactly what you're looking for
                        </div>
                    </div>
                    
                    <div className="header-actions">
                        <button
                            className="collapse-btn"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isCollapsed ? '→' : '←'}
                        </button>
                        
                        {onClose && (
                            <button
                                className="close-btn"
                                onClick={onClose}
                                aria-label="Close sidebar"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {!isCollapsed && (
                    <>
                        {/* Active Filters Summary */}
                        <div className="filters-summary">
                            <div className="summary-stats">
                                <span className="active-filters">
                                    {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
                                </span>
                                {searchQuery && (
                                    <span className="search-active">
                                        🔍 Search: "{searchQuery.substring(0, 20)}..."
                                    </span>
                                )}
                            </div>
                            
                            {hasActiveFilters && (
                                <button
                                    className="save-filters-btn"
                                    onClick={handleSaveCurrentFilters}
                                    title="Save current filter configuration"
                                >
                                    💾 Save Setup
                                </button>
                            )}
                        </div>

                        {/* Section Navigation */}
                        <div className="section-navigation">
                            {[
                                { id: 'filters', label: 'Filters', icon: '🎯' },
                                { id: 'presets', label: 'Presets', icon: '⚡' },
                                { id: 'saved', label: 'Saved', icon: '💾' },
                                { id: 'recent', label: 'Recent', icon: '🕒' }
                            ].map(section => (
                                <button
                                    key={section.id}
                                    className={`nav-btn ${activeSection === section.id ? 'active' : ''}`}
                                    onClick={() => setActiveSection(section.id)}
                                >
                                    <span className="nav-icon">{section.icon}</span>
                                    <span className="nav-label">{section.label}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {!isCollapsed && (
                <div className="sidebar-content-enhanced">
                    {/* Main Filters Section */}
                    {activeSection === 'filters' && (
                        <FilterSidebar
                            activeFilters={activeFilters}
                            onFiltersChange={onFiltersChange}
                            onSearch={onSearch}
                            searchQuery={searchQuery}
                            onSort={onSort}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            viewMode={viewMode}
                            statistics={quickStats}
                        />
                    )}

                    {/* Quick Filter Presets */}
                    {activeSection === 'presets' && (
                        <div className="quick-presets-section">
                            <h3>⚡ Quick Presets</h3>
                            <p className="section-description">
                                One-click filter configurations for common use cases
                            </p>
                            
                            <div className="presets-grid">
                                {quickFilterPresets.map((preset, index) => (
                                    <button
                                        key={index}
                                        className="preset-card"
                                        onClick={() => onFiltersChange({ ...activeFilters, ...preset.filters })}
                                    >
                                        <div className="preset-icon">{preset.icon}</div>
                                        <div className="preset-content">
                                            <h4>{preset.name}</h4>
                                            <p>{preset.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Saved Filter Configurations */}
                    {activeSection === 'saved' && (
                        <div className="saved-filters-section">
                            <h3>💾 Saved Filter Sets</h3>
                            <p className="section-description">
                                Your saved filter configurations
                            </p>
                            
                            {savedFilters.length > 0 ? (
                                <div className="saved-filters-list">
                                    {savedFilters.map(savedFilter => (
                                        <div key={savedFilter.id} className="saved-filter-item">
                                            <div className="filter-info">
                                                <h4>{savedFilter.name}</h4>
                                                <p className="filter-details">
                                                    {Object.keys(savedFilter.filters).length} filters • 
                                                    {savedFilter.searchQuery && ` Search: "${savedFilter.searchQuery}" • `}
                                                    Created {moment(savedFilter.createdAt).fromNow()}
                                                </p>
                                            </div>
                                            <div className="filter-actions">
                                                <button
                                                    onClick={() => handleLoadSavedFilter(savedFilter)}
                                                    className="load-btn"
                                                    title="Load this filter configuration"
                                                >
                                                    📂 Load
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSavedFilter(savedFilter.id)}
                                                    className="delete-btn"
                                                    title="Delete this saved filter"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-saved">
                                    <div className="empty-icon">💾</div>
                                    <h4>No Saved Filters</h4>
                                    <p>Set up filters and click "Save Setup" to create saved configurations</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recent Searches */}
                    {activeSection === 'recent' && (
                        <div className="recent-section">
                            <h3>🕒 Recent Activity</h3>
                            
                            {/* Recent Searches */}
                            {recentSearches.length > 0 && (
                                <div className="recent-searches">
                                    <h4>Recent Searches</h4>
                                    <div className="searches-list">
                                        {recentSearches.map((search, index) => (
                                            <button
                                                key={index}
                                                className="recent-search-item"
                                                onClick={() => onSearch(search)}
                                            >
                                                <span className="search-icon">🔍</span>
                                                <span className="search-text">{search}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        className="clear-recent-btn"
                                        onClick={() => {
                                            setRecentSearches([]);
                                            localStorage.removeItem('thenarrative_recent_searches');
                                        }}
                                    >
                                        🗑️ Clear Recent Searches
                                    </button>
                                </div>
                            )}

                            {/* View Mode History */}
                            <div className="view-mode-section">
                                <h4>Current View</h4>
                                <div className="current-view-info">
                                    <span className="view-mode">
                                        {viewMode === 'articles' ? '📰' : '📚'} {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View
                                    </span>
                                    <span className="sort-info">
                                        Sorted by {sortBy} ({sortOrder === 'desc' ? 'Newest First' : 'Oldest First'})
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Performance Metrics (Development) */}
            {process.env.NODE_ENV === 'development' && !isCollapsed && (
                <div ref={statsRef} className="sidebar-footer performance-section">
                    <h4>📊 Performance Stats</h4>
                    <div className="perf-stats">
                        {Object.entries(performanceMetrics).map(([key, value]) => (
                            <div key={key} className="perf-stat">
                                <span className="stat-label">{key}:</span>
                                <span className="stat-value">
                                    {typeof value === 'number' ? `${value}ms` : String(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Collapsed State Indicator */}
            {isCollapsed && (
                <div className="collapsed-indicator">
                    <div className="collapsed-content">
                        <button
                            className="expand-btn"
                            onClick={() => setIsCollapsed(false)}
                            aria-label="Expand sidebar"
                        >
                            🎛️
                        </button>
                        {activeFilterCount > 0 && (
                            <div className="filter-count-badge">
                                {activeFilterCount}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SidebarWithFilters;
