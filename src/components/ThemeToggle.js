import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../ThemeContext';
import { gsap } from 'gsap';

const ThemeToggle = ({ compact = false, showLabel = true }) => {
  const { 
    theme, 
    effectiveTheme, 
    changeTheme, 
    toggleTheme, 
    themes, 
    isAuto,
    systemPreference 
  } = useTheme();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [animationEnabled] = useState(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  
  const toggleRef = useRef(null);
  const dropdownRef = useRef(null);
  const iconRef = useRef(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  // Animation on theme change
  useEffect(() => {
    if (!iconRef.current || !animationEnabled) return;

    gsap.fromTo(iconRef.current,
      { scale: 1, rotation: 0 },
      { 
        scale: 1.2, 
        rotation: effectiveTheme === 'dark' ? 360 : -360, 
        duration: 0.4, 
        ease: "back.out(1.7)",
        yoyo: true,
        repeat: 1
      }
    );
  }, [effectiveTheme, animationEnabled]);

  // Dropdown animation
  useEffect(() => {
    if (!dropdownRef.current || !animationEnabled) return;

    if (isExpanded) {
      gsap.fromTo(dropdownRef.current,
        { opacity: 0, scale: 0.95, y: -10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: "power2.out" }
      );
    }
  }, [isExpanded, animationEnabled]);

  const handleThemeSelect = (themeName) => {
    changeTheme(themeName);
    setIsExpanded(false);
    
    // Analytics
    if (window.gtag) {
      window.gtag('event', 'theme_select', {
        event_category: 'User Preference',
        theme_name: themeName
      });
    }
  };

  const getThemeIcon = () => {
    if (isAuto) {
      return `${themes.auto.icon} ${themes[systemPreference].icon}`;
    }
    return themes[effectiveTheme]?.icon || '🎨';
  };

  const getThemeLabel = () => {
    if (isAuto) {
      return `Auto (${themes[systemPreference].displayName})`;
    }
    return themes[effectiveTheme]?.displayName || 'Theme';
  };

  if (compact) {
    return (
      <button
        ref={toggleRef}
        className="theme-toggle compact"
        onClick={toggleTheme}
        title={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} theme`}
        aria-label={`Current theme: ${getThemeLabel()}`}
      >
        <span ref={iconRef} className="theme-icon">
          {getThemeIcon()}
        </span>
      </button>
    );
  }

  return (
    <div className="theme-toggle-container" ref={dropdownRef}>
      <button
        ref={toggleRef}
        className={`theme-toggle ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-haspopup="true"
        aria-label="Theme selection menu"
      >
        <span ref={iconRef} className="theme-icon">
          {getThemeIcon()}
        </span>
        {showLabel && (
          <span className="theme-label">
            {getThemeLabel()}
          </span>
        )}
        <span className="dropdown-arrow">
          {isExpanded ? '⬆️' : '⬇️'}
        </span>
      </button>

      {isExpanded && (
        <div className="theme-dropdown">
          <div className="dropdown-header">
            <span>🎨 Choose Theme</span>
          </div>
          
          {Object.entries(themes).map(([themeKey, themeConfig]) => (
            <button
              key={themeKey}
              className={`theme-option ${theme === themeKey ? 'active' : ''}`}
              onClick={() => handleThemeSelect(themeKey)}
            >
              <span className="option-icon">{themeConfig.icon}</span>
              <span className="option-label">{themeConfig.displayName}</span>
              {theme === themeKey && (
                <span className="option-check">✓</span>
              )}
            </button>
          ))}
          
          <div className="dropdown-footer">
            <small>
              {isAuto ? (
                `Following system preference: ${systemPreference}`
              ) : (
                `Current: ${themes[effectiveTheme]?.displayName}`
              )}
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

ThemeToggle.displayName = 'ThemeToggle';

export default ThemeToggle;
