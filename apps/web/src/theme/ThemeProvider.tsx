/**
 * Theme Provider
 * Provides theme context with light/dark mode support and design tokens
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { tokens, semanticColors, darkSemanticColors } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  actualMode: 'light' | 'dark'; // The actual resolved mode (system mode resolved)
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  tokens: typeof tokens;
  colors: typeof semanticColors;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Custom hook to use theme
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper to get system preference
function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Helper to get stored preference
function getStoredPreference(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem('theme-mode');
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored as ThemeMode;
  }
  return 'system';
}

// Helper to resolve actual mode
function resolveActualMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return getSystemPreference();
  }
  return mode;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
}

export function ThemeProvider({ children, defaultMode = 'system' }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [actualMode, setActualMode] = useState<'light' | 'dark'>(() => 
    resolveActualMode(defaultMode)
  );

  // Initialize theme from localStorage on client
  useEffect(() => {
    const storedMode = getStoredPreference();
    setModeState(storedMode);
    setActualMode(resolveActualMode(storedMode));
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (mode === 'system') {
        setActualMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [mode]);

  // Update document class and CSS variables when theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // Update class for CSS-based theming
    root.classList.remove('light', 'dark');
    root.classList.add(actualMode);
    
    // Update CSS custom properties for design tokens
    const colors = actualMode === 'dark' ? darkSemanticColors : semanticColors;
    
    // Set semantic color CSS variables
    Object.entries(colors).forEach(([category, categoryColors]) => {
      Object.entries(categoryColors).forEach(([colorName, colorValue]) => {
        root.style.setProperty(`--color-${category}-${colorName}`, colorValue);
      });
    });

    // Set other token CSS variables
    Object.entries(tokens.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });

    Object.entries(tokens.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });

    Object.entries(tokens.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    Object.entries(tokens.zIndex).forEach(([key, value]) => {
      root.style.setProperty(`--z-${key}`, value.toString());
    });

  }, [actualMode]);

  // Set mode function
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    setActualMode(resolveActualMode(newMode));
    
    // Store preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme-mode', newMode);
    }
  };

  // Toggle between light and dark (not system)
  const toggleMode = () => {
    const newMode = actualMode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  // Get current colors based on actual mode
  const currentColors = actualMode === 'dark' ? darkSemanticColors : semanticColors;

  const value: ThemeContextValue = {
    mode,
    actualMode,
    setMode,
    toggleMode,
    tokens,
    colors: currentColors,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Styled components theme (for @emotion/styled compatibility)
export function getStyledTheme(actualMode: 'light' | 'dark') {
  const colors = actualMode === 'dark' ? darkSemanticColors : semanticColors;
  
  return {
    mode: actualMode,
    colors,
    ...tokens,
  };
}

// CSS-in-JS helper functions
export const css = {
  // Responsive design helper
  mediaQuery: (breakpoint: keyof typeof tokens.breakpoints) => 
    `@media (min-width: ${tokens.breakpoints[breakpoint]})`,
  
  // Focus ring utility
  focusRing: (color = 'var(--color-border-focus)') => `
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px ${color};
  `,
  
  // Truncate text utility
  truncate: `
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  
  // Screen reader only utility
  srOnly: `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `,
};

// Type exports
export type ThemeContextType = ThemeContextValue;
export type StyledTheme = ReturnType<typeof getStyledTheme>;

export default ThemeProvider;