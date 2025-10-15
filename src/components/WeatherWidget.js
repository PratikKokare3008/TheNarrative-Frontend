import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { gsap } from 'gsap';
import moment from 'moment';

const WeatherWidget = ({ location = null, compact = false }) => {
  const [currentLocation, setCurrentLocation] = useState(location);
  const [locationError, setLocationError] = useState(null);
  const [units, setUnits] = useState('metric'); // metric, imperial
  const [animationEnabled] = useState(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  
  const widgetRef = useRef(null);
  const iconRef = useRef(null);

  // Weather API configuration
  const API_KEY = process.env.REACT_APP_WEATHER_API_KEY || 'demo';
  const API_BASE = 'https://api.openweathermap.org/data/2.5';

  // Get user's location
  useEffect(() => {
    if (!currentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          console.warn('Location access denied:', error);
          setLocationError('Location access denied');
          // Fallback to a default location (e.g., New York)
          setCurrentLocation({ lat: 40.7128, lon: -74.0060, name: 'New York' });
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    }
  }, [currentLocation]);

  // Fetch current weather
  const { 
    data: weatherData, 
    isLoading: weatherLoading, 
    error: weatherError,
    refetch: refetchWeather 
  } = useQuery(
    ['weather', currentLocation, units],
    async () => {
      if (!currentLocation) throw new Error('No location available');
      
      const params = new URLSearchParams({
        appid: API_KEY,
        units,
        ...currentLocation
      });

      const response = await axios.get(`${API_BASE}/weather?${params}`, {
        timeout: 5000
      });
      
      return response.data;
    },
    {
      enabled: Boolean(currentLocation && API_KEY !== 'demo'),
      refetchInterval: 10 * 60 * 1000, // 10 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      onError: (error) => {
        console.error('Weather fetch error:', error);
      }
    }
  );

  // Fetch forecast
  const { 
    data: forecastData, 
    isLoading: forecastLoading 
  } = useQuery(
    ['forecast', currentLocation, units],
    async () => {
      if (!currentLocation) throw new Error('No location available');
      
      const params = new URLSearchParams({
        appid: API_KEY,
        units,
        cnt: 5,
        ...currentLocation
      });

      const response = await axios.get(`${API_BASE}/forecast?${params}`, {
        timeout: 5000
      });
      
      return response.data;
    },
    {
      enabled: Boolean(currentLocation && API_KEY !== 'demo' && !compact),
      staleTime: 5 * 60 * 1000,
      retry: 2
    }
  );

  // Weather icon animation
  useEffect(() => {
    if (!iconRef.current || !animationEnabled || !weatherData) return;

    gsap.fromTo(iconRef.current,
      { scale: 0.8, opacity: 0.7 },
      { 
        scale: 1, 
        opacity: 1, 
        duration: 0.6, 
        ease: "power2.out",
        repeat: -1,
        yoyo: true,
        repeatDelay: 3
      }
    );
  }, [weatherData, animationEnabled]);

  // Widget entrance animation
  useEffect(() => {
    if (!widgetRef.current || !animationEnabled) return;

    gsap.fromTo(widgetRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, delay: 0.2, ease: "power2.out" }
    );
  }, [animationEnabled]);

  // Temperature unit toggle
  const toggleUnits = useCallback(() => {
    setUnits(prev => prev === 'metric' ? 'imperial' : 'metric');
    
    if (window.gtag) {
      window.gtag('event', 'weather_units_toggle', {
        event_category: 'Weather Widget',
        units: units === 'metric' ? 'imperial' : 'metric'
      });
    }
  }, [units]);

  // Weather icon mapping
  const getWeatherIcon = (iconCode, size = 'medium') => {
    const iconMap = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '🌨️', '13n': '🌨️',
      '50d': '🌫️', '50n': '🌫️'
    };
    
    return iconMap[iconCode] || '🌤️';
  };

  // Format temperature
  const formatTemp = (temp) => {
    return `${Math.round(temp)}°${units === 'metric' ? 'C' : 'F'}`;
  };

  // Format wind speed
  const formatWind = (speed) => {
    const unit = units === 'metric' ? 'm/s' : 'mph';
    return `${Math.round(speed)} ${unit}`;
  };

  // Get weather condition color
  const getWeatherColor = (condition) => {
    const colorMap = {
      'clear': '#FFA500',
      'clouds': '#87CEEB',
      'rain': '#4682B4',
      'thunderstorm': '#4B0082',
      'snow': '#F0F8FF',
      'mist': '#D3D3D3',
      'fog': '#A9A9A9'
    };
    return colorMap[condition?.toLowerCase()] || '#87CEEB';
  };

  // Demo data for when API is not available
  const demoData = {
    name: 'New York',
    main: { temp: 22, feels_like: 25, humidity: 60, pressure: 1013 },
    weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
    wind: { speed: 3.5 },
    visibility: 10000
  };

  const displayData = API_KEY === 'demo' ? demoData : weatherData;
  const isLoading = weatherLoading && API_KEY !== 'demo';
  const hasError = weatherError && API_KEY !== 'demo';

  // Loading state
  if (isLoading) {
    return (
      <div ref={widgetRef} className="weather-widget loading">
        <div className="weather-loading">
          <div className="loading-icon">🌤️</div>
          <p>Loading weather...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div ref={widgetRef} className="weather-widget error">
        <div className="weather-error">
          <div className="error-icon">⚠️</div>
          <h3>Weather Unavailable</h3>
          <p>{weatherError?.message || 'Failed to load weather data'}</p>
          <button onClick={refetchWeather} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // Compact view
  if (compact && displayData) {
    return (
      <div ref={widgetRef} className="weather-widget compact">
        <div className="weather-compact">
          <span ref={iconRef} className="weather-icon">
            {getWeatherIcon(displayData.weather[0]?.icon)}
          </span>
          <span className="temperature">
            {formatTemp(displayData.main.temp)}
          </span>
          <button 
            onClick={toggleUnits} 
            className="units-toggle"
            title="Toggle temperature units"
          >
            °{units === 'metric' ? 'C' : 'F'}
          </button>
        </div>
      </div>
    );
  }

  // Full weather widget
  if (!displayData) {
    return (
      <div ref={widgetRef} className="weather-widget">
        <div className="weather-placeholder">
          <div className="placeholder-icon">🌍</div>
          <p>Weather information will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={widgetRef} className="weather-widget">
      <div className="weather-header">
        <h3>🌤️ Weather</h3>
        {API_KEY === 'demo' && (
          <span className="demo-badge">Demo</span>
        )}
      </div>

      <div className="weather-current">
        <div className="current-main">
          <div className="weather-icon-large">
            <span 
              ref={iconRef}
              style={{ color: getWeatherColor(displayData.weather[0]?.main) }}
            >
              {getWeatherIcon(displayData.weather[0]?.icon, 'large')}
            </span>
          </div>
          <div className="temperature-display">
            <span className="temperature-main">
              {formatTemp(displayData.main.temp)}
            </span>
            <button 
              onClick={toggleUnits} 
              className="units-toggle"
              title="Toggle temperature units"
            >
              Switch to °{units === 'metric' ? 'F' : 'C'}
            </button>
          </div>
        </div>

        <div className="weather-info">
          <div className="location-info">
            <span className="location-name">
              📍 {displayData.name || currentLocation?.name || 'Current Location'}
            </span>
            {locationError && (
              <span className="location-error">⚠️ {locationError}</span>
            )}
          </div>
          
          <div className="weather-description">
            {displayData.weather[0]?.description || 'No description'}
          </div>
          
          <div className="feels-like">
            Feels like {formatTemp(displayData.main.feels_like)}
          </div>
        </div>
      </div>

      <div className="weather-details">
        <div className="detail-item">
          <span className="detail-icon">💧</span>
          <span className="detail-label">Humidity</span>
          <span className="detail-value">{displayData.main.humidity}%</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-icon">🌬️</span>
          <span className="detail-label">Wind</span>
          <span className="detail-value">{formatWind(displayData.wind?.speed || 0)}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-icon">📊</span>
          <span className="detail-label">Pressure</span>
          <span className="detail-value">{displayData.main.pressure} hPa</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-icon">👁️</span>
          <span className="detail-label">Visibility</span>
          <span className="detail-value">
            {displayData.visibility ? `${(displayData.visibility / 1000).toFixed(1)} km` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Forecast (if available) */}
      {forecastData && !forecastLoading && (
        <div className="weather-forecast">
          <h4>📅 5-Day Forecast</h4>
          <div className="forecast-list">
            {forecastData.list?.slice(0, 5).map((item, index) => (
              <div key={index} className="forecast-item">
                <span className="forecast-day">
                  {moment.unix(item.dt).format('ddd')}
                </span>
                <span className="forecast-icon">
                  {getWeatherIcon(item.weather[0]?.icon)}
                </span>
                <span className="forecast-temp">
                  {formatTemp(item.main.temp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="weather-footer">
        <div className="last-updated">
          Updated: {moment().format('HH:mm')}
        </div>
        <button 
          onClick={refetchWeather} 
          className="refresh-btn"
          disabled={isLoading}
          title="Refresh weather data"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

WeatherWidget.displayName = 'WeatherWidget';

export default WeatherWidget;
