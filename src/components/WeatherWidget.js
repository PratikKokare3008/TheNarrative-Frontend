import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import moment from 'moment';

const API_URL = process.env.REACT_APP_API_URL || 'https://thenarrative-backend.onrender.com';

const WeatherWidget = ({ 
    location = null, 
    compact = true, 
    showForecast = false,
    className = ''
}) => {
    const [userLocation, setUserLocation] = useState(location);
    const [locationError, setLocationError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const widgetRef = useRef(null);

    // Get user's location
    useEffect(() => {
        if (location || userLocation) return;

        const getUserLocation = async () => {
            try {
                if (!navigator.geolocation) {
                    throw new Error('Geolocation is not supported');
                }

                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 10000,
                        enableHighAccuracy: false,
                        maximumAge: 300000 // 5 minutes
                    });
                });

                setUserLocation({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });

                setLocationError(null);

            } catch (error) {
                console.warn('Failed to get user location:', error);
                setLocationError('Location access denied');
                
                // Fallback to IP-based location
                try {
                    const response = await axios.get('https://ipapi.co/json/', { timeout: 5000 });
                    setUserLocation({
                        lat: response.data.latitude,
                        lon: response.data.longitude,
                        city: response.data.city,
                        country: response.data.country_name
                    });
                    setLocationError(null);
                } catch (ipError) {
                    console.warn('IP location failed:', ipError);
                    setLocationError('Unable to determine location');
                }
            }
        };

        getUserLocation();
    }, [location, userLocation]);

    // Weather data query
    const {
        data: weatherData,
        isLoading,
        error,
        refetch
    } = useQuery(
        ['weather', userLocation?.lat, userLocation?.lon],
        async () => {
            if (!userLocation?.lat || !userLocation?.lon) {
                throw new Error('Location not available');
            }

            const response = await axios.get(`${API_URL}/api/weather`, {
                params: {
                    lat: userLocation.lat,
                    lon: userLocation.lon,
                    forecast: showForecast
                },
                timeout: 10000
            });

            return response.data;
        },
        {
            enabled: !!(userLocation?.lat && userLocation?.lon),
            staleTime: 10 * 60 * 1000, // 10 minutes
            cacheTime: 30 * 60 * 1000, // 30 minutes
            retry: 2,
            refetchOnWindowFocus: false
        }
    );

    const getWeatherIcon = useCallback((weatherCode, isDay = true) => {
        const iconMap = {
            // Clear sky
            0: isDay ? '☀️' : '🌙',
            // Partly cloudy
            1: isDay ? '🌤️' : '🌙',
            2: '⛅',
            3: '☁️',
            // Fog
            45: '🌫️',
            48: '🌫️',
            // Rain
            51: '🌦️',
            53: '🌦️',
            55: '🌧️',
            61: '🌧️',
            63: '🌧️',
            65: '⛈️',
            // Snow
            71: '❄️',
            73: '🌨️',
            75: '❄️',
            // Thunderstorm
            95: '⛈️',
            96: '⛈️',
            99: '⛈️'
        };

        return iconMap[weatherCode] || (isDay ? '🌤️' : '🌙');
    }, []);

    const getWeatherDescription = useCallback((weatherCode) => {
        const descriptions = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            95: 'Thunderstorm',
            96: 'Thunderstorm with hail',
            99: 'Heavy thunderstorm'
        };

        return descriptions[weatherCode] || 'Unknown weather';
    }, []);

    const handleToggleExpanded = useCallback(() => {
        setIsExpanded(!isExpanded);
    }, [isExpanded]);

    if (locationError) {
        return (
            <div className={`weather-widget error ${className}`}>
                <div className="weather-error">
                    <span className="error-icon">🌍</span>
                    <span className="error-text">{locationError}</span>
                </div>
            </div>
        );
    }

    if (isLoading || !weatherData) {
        return (
            <div className={`weather-widget loading ${className}`}>
                <div className="weather-loading">
                    <span className="loading-icon">🌤️</span>
                    <span className="loading-text">Getting weather...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`weather-widget error ${className}`}>
                <div className="weather-error">
                    <span className="error-icon">❌</span>
                    <button 
                        onClick={refetch}
                        className="retry-button"
                        title="Retry weather fetch"
                    >
                        🔄 Retry
                    </button>
                </div>
            </div>
        );
    }

    const currentWeather = weatherData.current;
    const forecast = weatherData.forecast;

    if (compact && !isExpanded) {
        return (
            <div 
                ref={widgetRef}
                className={`weather-widget compact ${className}`}
                onClick={handleToggleExpanded}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggleExpanded();
                    }
                }}
                aria-label="Weather widget - click to expand"
            >
                <div className="weather-compact">
                    <span className="weather-icon">
                        {getWeatherIcon(currentWeather?.weatherCode, currentWeather?.isDay)}
                    </span>
                    <span className="weather-temp">
                        {Math.round(currentWeather?.temperature || 0)}°
                    </span>
                    <span className="weather-location">
                        {userLocation?.city || weatherData.location?.city || 'Unknown'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={widgetRef}
            className={`weather-widget expanded ${className}`}
        >
            {/* Header */}
            <div className="weather-header">
                <div className="weather-title">
                    <span className="title-icon">🌤️</span>
                    <span className="title-text">Weather</span>
                </div>
                
                {compact && (
                    <button
                        className="collapse-btn"
                        onClick={handleToggleExpanded}
                        aria-label="Collapse weather widget"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Current Weather */}
            <div className="current-weather">
                <div className="current-main">
                    <div className="current-icon">
                        {getWeatherIcon(currentWeather?.weatherCode, currentWeather?.isDay)}
                    </div>
                    <div className="current-temp">
                        {Math.round(currentWeather?.temperature || 0)}°C
                    </div>
                </div>

                <div className="current-details">
                    <div className="weather-description">
                        {getWeatherDescription(currentWeather?.weatherCode)}
                    </div>
                    
                    <div className="weather-location">
                        📍 {userLocation?.city || weatherData.location?.city || 'Unknown Location'}
                    </div>

                    <div className="weather-meta">
                        {currentWeather?.humidity && (
                            <span className="meta-item">
                                💧 {currentWeather.humidity}%
                            </span>
                        )}
                        {currentWeather?.windSpeed && (
                            <span className="meta-item">
                                💨 {Math.round(currentWeather.windSpeed)} km/h
                            </span>
                        )}
                        {currentWeather?.pressure && (
                            <span className="meta-item">
                                📊 {Math.round(currentWeather.pressure)} hPa
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Forecast */}
            {showForecast && forecast && forecast.length > 0 && (
                <div className="weather-forecast">
                    <h4 className="forecast-title">5-Day Forecast</h4>
                    <div className="forecast-list">
                        {forecast.slice(0, 5).map((day, index) => (
                            <div key={index} className="forecast-item">
                                <div className="forecast-day">
                                    {index === 0 ? 'Today' : moment().add(index, 'days').format('ddd')}
                                </div>
                                <div className="forecast-icon">
                                    {getWeatherIcon(day.weatherCode, true)}
                                </div>
                                <div className="forecast-temps">
                                    <span className="temp-high">{Math.round(day.maxTemp)}°</span>
                                    <span className="temp-low">{Math.round(day.minTemp)}°</span>
                                </div>
                                <div className="forecast-desc">
                                    {getWeatherDescription(day.weatherCode)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="weather-footer">
                <div className="update-time">
                    Updated {moment(weatherData.lastUpdated || Date.now()).fromNow()}
                </div>
                <button
                    onClick={refetch}
                    className="refresh-btn"
                    title="Refresh weather data"
                    disabled={isLoading}
                >
                    🔄
                </button>
            </div>
        </div>
    );
};

export default WeatherWidget;
