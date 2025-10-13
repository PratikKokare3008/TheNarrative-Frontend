import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';

// Enhanced Theme Configuration
const THEMES = {
    light: {
        name: 'Light',
        id: 'light',
        colors: {
            primary: '#2563eb',
            secondary: '#64748b',
            accent: '#059669',
            background: '#ffffff',
            surface: '#f8fafc',
            text: '#1e293b',
            textSecondary: '#64748b',
            border: '#e2e8f0',
            error: '#dc2626',
            warning: '#d97706',
            success: '#059669',
            info: '#0ea5e9'
        },
        shadows: {
            small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            large: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }
    },
    dark: {
        name: 'Dark',
        id: 'dark',
        colors: {
            primary: '#3b82f6',
            secondary: '#94a3b8',
            accent: '#10b981',
            background: '#0f172a',
            surface: '#1e293b',
            text: '#f1f5f9',
            textSecondary: '#94a3b8',
            border: '#334155',
            error: '#ef4444',
            warning: '#f59e0b',
            success: '#10b981',
            info: '#06b6d4'
        },
        shadows: {
            small: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
            medium: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
            large: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }
    },
    auto: {
        name: 'Auto',
        id: 'auto',
        description: 'Follows system preference'
    }
};

const INITIAL_STATE = {
    currentTheme: 'auto',
    actualTheme: 'light', // The actual theme being applied
    systemPreference: 'light',
    isTransitioning: false,
    customizations: {},
    accessibility: {
        highContrast: false,
        reducedMotion: false,
        largerText: false
    }
};

// Theme Actions
const THEME_ACTIONS = {
    SET_THEME: 'SET_THEME',
    SET_SYSTEM_PREFERENCE: 'SET_SYSTEM_PREFERENCE',
    SET_TRANSITIONING: 'SET_TRANSITIONING',
    UPDATE_CUSTOMIZATIONS: 'UPDATE_CUSTOMIZATIONS',
    UPDATE_ACCESSIBILITY: 'UPDATE_ACCESSIBILITY',
    RESET_THEME: 'RESET_THEME'
};

// Enhanced Theme Reducer
const themeReducer = (state, action) => {
    switch (action.type) {
        case THEME_ACTIONS.SET_THEME: {
            const newTheme = action.payload;
            const actualTheme = newTheme === 'auto' ? state.systemPreference : newTheme;
            
            return {
                ...state,
                currentTheme: newTheme,
                actualTheme
            };
        }
        
        case THEME_ACTIONS.SET_SYSTEM_PREFERENCE: {
            const systemPreference = action.payload;
            const actualTheme = state.currentTheme === 'auto' ? systemPreference : state.actualTheme;
            
            return {
                ...state,
                systemPreference,
                actualTheme
            };
        }
        
        case THEME_ACTIONS.SET_TRANSITIONING:
            return {
                ...state,
                isTransitioning: action.payload
            };
            
        case THEME_ACTIONS.UPDATE_CUSTOMIZATIONS:
            return {
                ...state,
                customizations: {
                    ...state.customizations,
                    ...action.payload
                }
            };
            
        case THEME_ACTIONS.UPDATE_ACCESSIBILITY:
            return {
                ...state,
                accessibility: {
                    ...state.accessibility,
                    ...action.payload
                }
            };
            
        case THEME_ACTIONS.RESET_THEME:
            return {
                ...INITIAL_STATE,
                systemPreference: state.systemPreference
            };
            
        default:
            return state;
    }
};

// Create Theme Context
const ThemeContext = createContext();

// Enhanced Theme Provider
export const ThemeProvider = ({ children }) => {
    const [state, dispatch] = useReducer(themeReducer, INITIAL_STATE);

    // Initialize theme from localStorage and system preference
    useEffect(() => {
        try {
            // Load saved theme preference
            const savedTheme = localStorage.getItem('thenarrative_theme');
            const savedCustomizations = localStorage.getItem('thenarrative_theme_customizations');
            const savedAccessibility = localStorage.getItem('thenarrative_accessibility');
            
            // Detect system preference
            const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            dispatch({ type: THEME_ACTIONS.SET_SYSTEM_PREFERENCE, payload: systemPreference });
            
            // Apply saved theme or default to auto
            const themeToApply = savedTheme || 'auto';
            dispatch({ type: THEME_ACTIONS.SET_THEME, payload: themeToApply });
            
            // Apply saved customizations
            if (savedCustomizations) {
                const customizations = JSON.parse(savedCustomizations);
                dispatch({ type: THEME_ACTIONS.UPDATE_CUSTOMIZATIONS, payload: customizations });
            }
            
            // Apply saved accessibility settings
            if (savedAccessibility) {
                const accessibility = JSON.parse(savedAccessibility);
                dispatch({ type: THEME_ACTIONS.UPDATE_ACCESSIBILITY, payload: accessibility });
            } else {
                // Detect system accessibility preferences
                const accessibility = {
                    highContrast: window.matchMedia('(prefers-contrast: high)').matches,
                    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                    largerText: false
                };
                dispatch({ type: THEME_ACTIONS.UPDATE_ACCESSIBILITY, payload: accessibility });
            }
        } catch (error) {
            console.warn('Failed to load theme preferences:', error);
        }
    }, []);

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = (e) => {
            const systemPreference = e.matches ? 'dark' : 'light';
            dispatch({ type: THEME_ACTIONS.SET_SYSTEM_PREFERENCE, payload: systemPreference });
        };
        
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, []);

    // Apply theme to DOM and save preferences
    useEffect(() => {
        const applyTheme = async () => {
            dispatch({ type: THEME_ACTIONS.SET_TRANSITIONING, payload: true });
            
            try {
                // Get current theme configuration
                const currentThemeConfig = getCurrentTheme();
                
                // Apply CSS custom properties
                const root = document.documentElement;
                Object.entries(currentThemeConfig.colors || {}).forEach(([key, value]) => {
                    root.style.setProperty(`--color-${key}`, value);
                });
                
                Object.entries(currentThemeConfig.shadows || {}).forEach(([key, value]) => {
                    root.style.setProperty(`--shadow-${key}`, value);
                });
                
                // Apply theme class to document
                document.documentElement.className = document.documentElement.className
                    .replace(/theme-\w+/g, '')
                    .concat(` theme-${state.actualTheme}`);
                
                // Apply accessibility settings
                if (state.accessibility.highContrast) {
                    document.documentElement.classList.add('high-contrast');
                } else {
                    document.documentElement.classList.remove('high-contrast');
                }
                
                if (state.accessibility.reducedMotion) {
                    document.documentElement.classList.add('reduced-motion');
                } else {
                    document.documentElement.classList.remove('reduced-motion');
                }
                
                if (state.accessibility.largerText) {
                    document.documentElement.classList.add('larger-text');
                } else {
                    document.documentElement.classList.remove('larger-text');
                }
                
                // Update meta theme-color for mobile browsers
                const metaThemeColor = document.querySelector('meta[name="theme-color"]');
                if (metaThemeColor) {
                    metaThemeColor.setAttribute('content', currentThemeConfig.colors?.primary || '#2563eb');
                }
                
                // Save preferences to localStorage
                localStorage.setItem('thenarrative_theme', state.currentTheme);
                localStorage.setItem('thenarrative_theme_customizations', JSON.stringify(state.customizations));
                localStorage.setItem('thenarrative_accessibility', JSON.stringify(state.accessibility));
                
                // Brief delay for smooth transition
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error('Failed to apply theme:', error);
            } finally {
                dispatch({ type: THEME_ACTIONS.SET_TRANSITIONING, payload: false });
            }
        };
        
        applyTheme();
    }, [state.actualTheme, state.customizations, state.accessibility]);

    // Get current theme configuration with customizations
    const getCurrentTheme = useCallback(() => {
        const baseTheme = THEMES[state.actualTheme] || THEMES.light;
        
        // Apply customizations
        if (Object.keys(state.customizations).length > 0) {
            return {
                ...baseTheme,
                colors: {
                    ...baseTheme.colors,
                    ...state.customizations.colors
                },
                shadows: {
                    ...baseTheme.shadows,
                    ...state.customizations.shadows
                }
            };
        }
        
        return baseTheme;
    }, [state.actualTheme, state.customizations]);

    // Enhanced theme switching with animation
    const setTheme = useCallback((themeName) => {
        if (!THEMES[themeName]) {
            console.warn(`Theme '${themeName}' not found`);
            return;
        }
        
        dispatch({ type: THEME_ACTIONS.SET_THEME, payload: themeName });
        
        // Analytics
        if (window.gtag) {
            window.gtag('event', 'theme_change', {
                'theme': themeName,
                'from_theme': state.currentTheme
            });
        }
    }, [state.currentTheme]);

    // Toggle between light and dark (skip auto)
    const toggleTheme = useCallback(() => {
        const nextTheme = state.actualTheme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
    }, [state.actualTheme, setTheme]);

    // Update theme customizations
    const updateCustomizations = useCallback((customizations) => {
        dispatch({ type: THEME_ACTIONS.UPDATE_CUSTOMIZATIONS, payload: customizations });
    }, []);

    // Update accessibility settings
    const updateAccessibility = useCallback((accessibilitySettings) => {
        dispatch({ type: THEME_ACTIONS.UPDATE_ACCESSIBILITY, payload: accessibilitySettings });
        
        // Analytics
        if (window.gtag) {
            window.gtag('event', 'accessibility_change', {
                'settings': JSON.stringify(accessibilitySettings)
            });
        }
    }, []);

    // Reset theme to defaults
    const resetTheme = useCallback(() => {
        dispatch({ type: THEME_ACTIONS.RESET_THEME });
        
        // Clear localStorage
        localStorage.removeItem('thenarrative_theme');
        localStorage.removeItem('thenarrative_theme_customizations');
        localStorage.removeItem('thenarrative_accessibility');
    }, []);

    // Get theme-aware color utility
    const getThemeColor = useCallback((colorName, opacity = 1) => {
        const currentTheme = getCurrentTheme();
        const color = currentTheme.colors?.[colorName];
        
        if (!color) return colorName; // Return original if not found
        
        if (opacity === 1) return color;
        
        // Convert hex to rgba if opacity is specified
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }, [getCurrentTheme]);

    // Enhanced context value
    const contextValue = useMemo(() => ({
        // State
        currentTheme: state.currentTheme,
        actualTheme: state.actualTheme,
        systemPreference: state.systemPreference,
        isTransitioning: state.isTransitioning,
        customizations: state.customizations,
        accessibility: state.accessibility,
        
        // Theme configurations
        themes: THEMES,
        currentThemeConfig: getCurrentTheme(),
        
        // Actions
        setTheme,
        toggleTheme,
        updateCustomizations,
        updateAccessibility,
        resetTheme,
        
        // Utilities
        getThemeColor,
        isDark: state.actualTheme === 'dark',
        isLight: state.actualTheme === 'light',
        isAuto: state.currentTheme === 'auto'
    }), [
        state,
        getCurrentTheme,
        setTheme,
        toggleTheme,
        updateCustomizations,
        updateAccessibility,
        resetTheme,
        getThemeColor
    ]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

// Enhanced useTheme hook
export const useTheme = () => {
    const context = useContext(ThemeContext);
    
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    
    return context;
};

// Additional utility hooks
export const useThemeColor = (colorName, opacity) => {
    const { getThemeColor } = useTheme();
    return getThemeColor(colorName, opacity);
};

export const useIsDark = () => {
    const { isDark } = useTheme();
    return isDark;
};

export const useThemeTransition = () => {
    const { isTransitioning } = useTheme();
    return isTransitioning;
};

export default ThemeContext;
