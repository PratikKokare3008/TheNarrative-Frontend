import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WeatherWidget from './WeatherWidget';
import MarketUpdates from './MarketUpdates';
import SportsSchedule from './SportsSchedule';
import moment from 'moment';

const SidebarWithFilters = ({ onFiltersChange, filters }) => {
  const [availablePublications, setAvailablePublications] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = 'https://twosides-backend.onrender.com';

  useEffect(() => {
    fetchFilterOptions();
    fetchLastUpdated();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/news/filters`);
      setAvailablePublications(response.data.publications || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLastUpdated = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/news/stats`);
      setLastUpdated(response.data.lastUpdate);
    } catch (error) {
      console.error('Error fetching last updated:', error);
    }
  };

  const handleFilterChange = (filterType, value) => {
    onFiltersChange({
      ...filters,
      [filterType]: value,
      page: 1
    });
  };

  const biasOptions = [
    { value: 'all', label: 'All Perspectives' },
    { value: 'left', label: 'Left Leaning' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right Leaning' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'politics', label: 'Politics' },
    { value: 'business', label: 'Business' },
    { value: 'technology', label: 'Technology' },
    { value: 'sports', label: 'Sports' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'health', label: 'Health' },
    { value: 'science', label: 'Science' },
    { value: 'world', label: 'World News' },
    { value: 'defense', label: 'Defense' },
    { value: 'education', label: 'Education' },
    { value: 'environment', label: 'Environment' },
    { value: 'social', label: 'Social Issues' },
    { value: 'regional', label: 'Regional' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="sidebar-with-filters">
      <div className="sidebar-content">
        <div className="sidebar-section filters-section">
          <h3>🎛️ Filters</h3>
          
          {/* Political Perspective Dropdown */}
          <div className="filter-group">
            <label className="filter-label">Political Perspective:</label>
            <select 
              className="filter-select"
              value={filters.bias}
              onChange={(e) => handleFilterChange('bias', e.target.value)}
            >
              {biasOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Publication Filter */}
          <div className="filter-group">
            <label className="filter-label">Publication:</label>
            <select 
              className="filter-select"
              value={filters.publication}
              onChange={(e) => handleFilterChange('publication', e.target.value)}
            >
              <option value="all">All Publications</option>
              {availablePublications.map(pub => (
                <option key={pub._id || pub} value={pub._id || pub}>
                  {pub.name || pub}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <label className="filter-label">Category:</label>
            <select 
              className="filter-select"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sidebar-section">
          <WeatherWidget />
        </div>

        <div className="sidebar-section">
          <MarketUpdates />
        </div>

        <div className="sidebar-section">
          <SportsSchedule />
        </div>
      </div>

      {/* Last Updated Section - Fixed at bottom */}
      <div className="sidebar-footer last-updated-section">
        <div className="last-updated-info">
          <div className="update-icon">🔄</div>
          <div className="update-details">
            <span className="update-label">Feed Last Updated:</span>
            <span className="update-time">
              {lastUpdated ? moment(lastUpdated).format('MMM DD, YYYY h:mm A') : 'Loading...'}
            </span>
            <span className="update-relative">
              {lastUpdated ? moment(lastUpdated).fromNow() : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarWithFilters;
