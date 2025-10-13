import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import gsap from 'gsap';

const ThemeToggle = ({ 
    size = 'medium', 
    showLabel = false, 
    className = '',
    variant = 'button' // 'button' | 'switch' | 'dropdown'
}) => {
    const {
        currentTheme,
        actualTheme,
        setTheme,
        toggleTheme,
        themes,
        isTransitioning,
        accessibility
    } = useTheme();
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const toggleRef = useRef(null);
    const dropdownRef = useRef(null);
    const iconRef = useRef(null);

    // Enhanced animation on theme change
    useEffect(() => {
        if (!iconRef.current || accessibility.reducedMotion) return;

        gsap.fromTo(iconRef.current,
            { rotation: 0, scale: 1 },
            { 
                rotation: 360, 
                scale: 1.2,
                duration: 0.6,
                ease: 'back.out(1.7)',
                onComplete: () => {
                    gsap.to(iconRef.current, {
                        scale: 1,
                        duration: 0.2,
                        ease: 'power2.out'
                    });
                }
            }
        );
    }, [actualTheme, accessibility.reducedMotion]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isDropdownOpen) return;

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    // Get theme icon
    const getThemeIcon = useCallback((theme) => {
        switch (theme) {
            case 'light': return '☀️';
            case 'dark': return '🌙';
            case 'auto': return '🔄';
            default: return '🎨';
        }
    }, []);

    // Get theme description
    const getThemeDescription = useCallback((theme) => {
        switch (theme) {
            case 'light': return 'Light theme - easier on the eyes in bright environments';
            case 'dark': return 'Dark theme - reduces eye strain in low light';
            case 'auto': return 'Auto theme - follows your system preference';
            default: return 'Custom theme';
        }
    }, []);

    // Handle theme selection
    const handleThemeSelect = useCallback((themeName) => {
        setTheme(themeName);
        setIsDropdownOpen(false);
        
        // Haptic feedback on supported devices
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }, [setTheme]);

    // Size classes
    const sizeClasses = {
        small: 'w-8 h-8 text-sm',
        medium: 'w-10 h-10 text-base',
        large: 'w-12 h-12 text-lg'
    };

    if (variant === 'dropdown') {
        return (
            <div className={`theme-toggle-dropdown ${className}`} ref={dropdownRef}>
                <button
                    ref={toggleRef}
                    className={`theme-dropdown-button ${sizeClasses[size]} ${isDropdownOpen ? 'open' : ''}`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    aria-label={`Current theme: ${themes[currentTheme]?.name || currentTheme}. Click to change theme.`}
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="true"
                    disabled={isTransitioning}
                >
                    <span ref={iconRef} className="theme-icon">
                        {getThemeIcon(actualTheme)}
                    </span>
                    {showLabel && (
                        <span className="theme-label">
                            {themes[currentTheme]?.name || currentTheme}
                        </span>
                    )}
                    <span className="dropdown-arrow">▼</span>
                </button>

                {isDropdownOpen && (
                    <div className="theme-dropdown-menu">
                        <div className="dropdown-header">
                            <h4>Choose Theme</h4>
                        </div>
                        {Object.entries(themes).map(([themeId, themeConfig]) => (
                            <button
                                key={themeId}
                                className={`theme-option ${currentTheme === themeId ? 'active' : ''}`}
                                onClick={() => handleThemeSelect(themeId)}
                                title={getThemeDescription(themeId)}
                            >
                                <span className="option-icon">
                                    {getThemeIcon(themeId)}
                                </span>
                                <div className="option-content">
                                    <span className="option-name">
                                        {themeConfig.name}
                                    </span>
                                    {themeConfig.description && (
                                        <span className="option-description">
                                            {themeConfig.description}
                                        </span>
                                    )}
                                </div>
                                {currentTheme === themeId && (
                                    <span className="option-check">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (variant === 'switch') {
        return (
            <div className={`theme-toggle-switch ${className}`}>
                {showLabel && (
                    <label className="switch-label">
                        Theme
                    </label>
                )}
                <div className="switch-container">
                    <span className="switch-option">☀️</span>
                    <button
                        ref={toggleRef}
                        className={`theme-switch ${actualTheme === 'dark' ? 'dark' : 'light'}`}
                        onClick={toggleTheme}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} theme`}
                        disabled={isTransitioning}
                    >
                        <span ref={iconRef} className="switch-thumb">
                            {getThemeIcon(actualTheme)}
                        </span>
                    </button>
                    <span className="switch-option">🌙</span>
                </div>
            </div>
        );
    }

    // Default button variant
    return (
        <button
            ref={toggleRef}
            className={`theme-toggle-button ${sizeClasses[size]} ${className} ${isHovered ? 'hovered' : ''}`}
            onClick={toggleTheme}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} theme`}
            title={`Current: ${themes[currentTheme]?.name || currentTheme}. Click to toggle.`}
            disabled={isTransitioning}
        >
            <span ref={iconRef} className="theme-icon">
                {getThemeIcon(actualTheme)}
            </span>
            {showLabel && (
                <span className="theme-label">
                    {themes[currentTheme]?.name || currentTheme}
                </span>
            )}
            {isTransitioning && (
                <span className="transition-indicator">
                    <span className="spinner"></span>
                </span>
            )}
        </button>
    );
};

export default ThemeToggle;
