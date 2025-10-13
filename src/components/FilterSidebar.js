import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FilterSidebar = ({ filters, onFiltersChange, isOpen, onToggle }) => {
  const [availableFilters, setAvailableFilters] = useState({
    categories: [],
    biases: [],
    dateRange: {}
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableFilters();
  }, []);

  const fetchAvailableFilters = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'https://twosides-backend.onrender.com'}/api/news/filters`);
      setAvailableFilters(response.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    onFiltersChange({
      ...filters,
      [filterType]: value,
      page: 1 // Reset to first page when filters change
    });
  };

  const handleDateChange = (dateType, value) => {
    onFiltersChange({
      ...filters,
      [dateType]: value,
      page: 1
    });
  };

  const resetFilters = () => {
    onFiltersChange({
      category: 'all',
      bias: 'all',
      sortBy: 'publishedAt',
      sortOrder: 'desc',
      dateFrom: '',
      dateTo: '',
      search: '',
      page: 1
    });
  };

  const getBiasIcon = (bias) => {
    switch(bias) {
      case 'left': return '🟦';
      case 'center': return '🟪';
      case 'right': return '🟥';
      default: return '⚪';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      politics: '🏛️',
      business: '💼',
      technology: '💻',
      sports: '⚽',
      entertainment: '🎬',
      health: '🏥',
      science: '🔬',
      world: '🌍',
      other: '📰'
    };
    return icons[category] || '📰';
  };

  if (loading) {
    return (
      <div className={`filter-sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="filter-loading">Loading filters...</div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="filter-overlay" onClick={onToggle}></div>}
      
      <div className={`filter-sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="filter-header">
          <h3>
            <span className="filter-icon">🔍</span>
            Filters
          </h3>
          <button className="close-filters" onClick={onToggle}>
            ✕
          </button>
        </div>

        <div className="filter-content">
          {/* Search */}
          <div className="filter-section">
            <label>Search Articles</label>
            <input
              type="text"
              placeholder="Search by title, summary, keywords..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="search-input"
            />
          </div>

          {/* Category Filter */}
          <div className="filter-section">
            <label>Category</label>
            <div className="filter-options">
              <button
                className={`filter-option ${filters.category === 'all' ? 'active' : ''}`}
                onClick={() => handleFilterChange('category', 'all')}
              >
                <span className="option-icon">📂</span>
                All Categories
              </button>
              {availableFilters.categories.map((category) => (
                <button
                  key={category}
                  className={`filter-option ${filters.category === category ? 'active' : ''}`}
                  onClick={() => handleFilterChange('category', category)}
                >
                  <span className="option-icon">{getCategoryIcon(category)}</span>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Bias Filter */}
          <div className="filter-section">
            <label>Political Leaning</label>
            <div className="filter-options">
              <button
                className={`filter-option ${filters.bias === 'all' ? 'active' : ''}`}
                onClick={() => handleFilterChange('bias', 'all')}
              >
                <span className="option-icon">⚪</span>
                All Leanings
              </button>
              {availableFilters.biases.map((bias) => (
                <button
                  key={bias}
                  className={`filter-option bias-${bias} ${filters.bias === bias ? 'active' : ''}`}
                  onClick={() => handleFilterChange('bias', bias)}
                >
                  <span className="option-icon">{getBiasIcon(bias)}</span>
                  {bias.charAt(0).toUpperCase() + bias.slice(1)} Leaning
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="filter-section">
            <label>Sort By</label>
            <div className="sort-options">
              <select
                value={filters.sortBy || 'publishedAt'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="sort-select"
              >
                <option value="publishedAt">Published Date</option>
                <option value="fetchedAt">Added to Site</option>
                <option value="title">Title</option>
                <option value="source.name">Source</option>
              </select>
              
              <div className="sort-order">
                <button
                  className={`sort-order-btn ${filters.sortOrder === 'desc' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('sortOrder', 'desc')}
                >
                  ⬇️ Newest First
                </button>
                <button
                  className={`sort-order-btn ${filters.sortOrder === 'asc' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('sortOrder', 'asc')}
                >
                  ⬆️ Oldest First
                </button>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="filter-section">
            <label>Date Range</label>
            <div className="date-inputs">
              <input
                type="date"
                placeholder="From"
                value={filters.dateFrom || ''}
                onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                className="date-input"
              />
              <input
                type="date"
                placeholder="To"
                value={filters.dateTo || ''}
                onChange={(e) => handleDateChange('dateTo', e.target.value)}
                className="date-input"
              />
            </div>
          </div>

          {/* Reset Filters */}
          <div className="filter-actions">
            <button className="reset-filters-btn" onClick={resetFilters}>
              🔄 Reset All Filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;
