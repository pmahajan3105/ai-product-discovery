/**
 * Design Token System
 * Centralized design system with semantic tokens and theme support
 */

import { Colors } from './colors';

// Spacing tokens (based on 4px base unit)
export const spacing = {
  0: '0px',
  1: '4px',     // 0.25rem
  2: '8px',     // 0.5rem  
  3: '12px',    // 0.75rem
  4: '16px',    // 1rem  
  5: '20px',    // 1.25rem
  6: '24px',    // 1.5rem
  8: '32px',    // 2rem
  10: '40px',   // 2.5rem
  12: '48px',   // 3rem
  16: '64px',   // 4rem
  20: '80px',   // 5rem
  24: '96px',   // 6rem
  32: '128px',  // 8rem
  40: '160px',  // 10rem
  48: '192px',  // 12rem
  56: '224px',  // 14rem
  64: '256px',  // 16rem
} as const;

// Typography tokens
export const typography = {
  fontFamily: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  },
  fontSize: {
    xs: ['12px', '16px'],   // [fontSize, lineHeight]
    sm: ['14px', '20px'],
    base: ['16px', '24px'],
    lg: ['18px', '28px'],
    xl: ['20px', '28px'],
    '2xl': ['24px', '32px'],
    '3xl': ['30px', '36px'],
    '4xl': ['36px', '40px'],
    '5xl': ['48px', '1'],
    '6xl': ['60px', '1'],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
  },
} as const;

// Border radius tokens
export const borderRadius = {
  none: '0px',
  sm: '2px',
  base: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const;

// Shadow tokens
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

// Z-index tokens
export const zIndex = {
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Animation tokens
export const animation = {
  duration: {
    fastest: '100ms',
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
    slower: '800ms',
    slowest: '1200ms',
  },
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// Breakpoint tokens
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Semantic color tokens (light theme)
export const semanticColors = {
  // Background colors
  background: {
    primary: Colors.white,
    secondary: Colors.grey25,
    tertiary: Colors.grey50,
    inverse: Colors.grey900,
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Surface colors (cards, panels, etc.)
  surface: {
    primary: Colors.white,
    secondary: Colors.grey50,
    tertiary: Colors.grey100,
    inverse: Colors.grey800,
    raised: Colors.white,
  },
  
  // Border colors
  border: {
    primary: Colors.grey200,
    secondary: Colors.grey300,
    focus: Colors.primary500,
    error: Colors.error300,
    success: Colors.success300,
    warning: Colors.warning300,
  },
  
  // Text colors
  text: {
    primary: Colors.grey900,
    secondary: Colors.grey600,
    tertiary: Colors.grey500,
    inverse: Colors.white,
    disabled: Colors.grey400,
    link: Colors.primary600,
    linkHover: Colors.primary700,
  },
  
  // Interactive element colors
  interactive: {
    primary: Colors.primary500,
    primaryHover: Colors.primary600,
    primaryActive: Colors.primary700,
    primaryDisabled: Colors.grey300,
    
    secondary: Colors.grey100,
    secondaryHover: Colors.grey200,
    secondaryActive: Colors.grey300,
    
    ghost: 'transparent',
    ghostHover: Colors.grey50,
    ghostActive: Colors.grey100,
  },
  
  // Status colors
  status: {
    success: Colors.success500,
    successBackground: Colors.success50,
    successBorder: Colors.success200,
    
    warning: Colors.warning500,
    warningBackground: Colors.warning50,
    warningBorder: Colors.warning200,
    
    error: Colors.error500,
    errorBackground: Colors.error50,
    errorBorder: Colors.error200,
    
    info: Colors.info500,
    infoBackground: Colors.info50,
    infoBorder: Colors.info200,
  },
} as const;

// Dark theme semantic colors
export const darkSemanticColors = {
  background: {
    primary: Colors.grey900,
    secondary: Colors.grey800,
    tertiary: Colors.grey700,
    inverse: Colors.white,
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  surface: {
    primary: Colors.grey800,
    secondary: Colors.grey700,
    tertiary: Colors.grey600,
    inverse: Colors.grey100,
    raised: Colors.grey800,
  },
  
  border: {
    primary: Colors.grey600,
    secondary: Colors.grey500,
    focus: Colors.primary400,
    error: Colors.error400,
    success: Colors.success400,
    warning: Colors.warning400,
  },
  
  text: {
    primary: Colors.white,
    secondary: Colors.grey300,
    tertiary: Colors.grey400,
    inverse: Colors.grey900,
    disabled: Colors.grey500,
    link: Colors.primary400,
    linkHover: Colors.primary300,
  },
  
  interactive: {
    primary: Colors.primary400,
    primaryHover: Colors.primary300,
    primaryActive: Colors.primary200,
    primaryDisabled: Colors.grey600,
    
    secondary: Colors.grey700,
    secondaryHover: Colors.grey600,
    secondaryActive: Colors.grey500,
    
    ghost: 'transparent',
    ghostHover: Colors.grey700,
    ghostActive: Colors.grey600,
  },
  
  status: {
    success: Colors.success400,
    successBackground: Colors.success900,
    successBorder: Colors.success600,
    
    warning: Colors.warning400,
    warningBackground: Colors.warning900,
    warningBorder: Colors.warning600,
    
    error: Colors.error400,
    errorBackground: Colors.error900,
    errorBorder: Colors.error600,
    
    info: Colors.info400,
    infoBackground: Colors.info900,
    infoBorder: Colors.info600,
  },
} as const;

// Component-specific tokens
export const componentTokens = {
  button: {
    height: {
      sm: spacing[8],    // 32px
      md: spacing[10],   // 40px
      lg: spacing[12],   // 48px
    },
    padding: {
      sm: `${spacing[2]} ${spacing[3]}`,    // 8px 12px
      md: `${spacing[3]} ${spacing[4]}`,    // 12px 16px
      lg: `${spacing[4]} ${spacing[6]}`,    // 16px 24px
    },
    borderRadius: borderRadius.md,
    fontSize: {
      sm: typography.fontSize.sm,
      md: typography.fontSize.base,
      lg: typography.fontSize.lg,
    },
  },
  
  input: {
    height: {
      sm: spacing[8],
      md: spacing[10],
      lg: spacing[12],
    },
    padding: `${spacing[2]} ${spacing[3]}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
  },
  
  card: {
    padding: spacing[6],         // 24px
    borderRadius: borderRadius.xl,  // 12px
    shadow: shadows.sm,
  },
  
  modal: {
    borderRadius: borderRadius['2xl'],  // 16px
    shadow: shadows['2xl'],
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  
  table: {
    rowHeight: spacing[12],      // 48px
    cellPadding: spacing[4],     // 16px
    headerHeight: spacing[10],   // 40px
  },
} as const;

// Complete design token system
export const tokens = {
  spacing,
  typography,
  borderRadius,
  shadows,
  zIndex,
  animation,
  breakpoints,
  semanticColors,
  darkSemanticColors,
  componentTokens,
  colors: Colors, // Include raw colors for special cases
} as const;

// Type exports for TypeScript support
export type SpacingToken = keyof typeof spacing;
export type FontSizeToken = keyof typeof typography.fontSize;
export type BorderRadiusToken = keyof typeof borderRadius;
export type ShadowToken = keyof typeof shadows;
export type ZIndexToken = keyof typeof zIndex;
export type BreakpointToken = keyof typeof breakpoints;

// Default export
export default tokens;