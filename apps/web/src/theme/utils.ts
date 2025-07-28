/**
 * Theme Utilities
 * Helper functions for working with design tokens and theme system
 */

import { tokens, semanticColors, darkSemanticColors, SpacingToken, BorderRadiusToken } from './tokens';

// CSS custom property helpers
export const cssVar = {
  // Color variables
  color: (path: string) => `var(--color-${path})`,
  
  // Spacing variables  
  spacing: (token: SpacingToken) => `var(--spacing-${token})`,
  
  // Border radius variables
  radius: (token: BorderRadiusToken) => `var(--radius-${token})`,
  
  // Shadow variables
  shadow: (token: keyof typeof tokens.shadows) => `var(--shadow-${token})`,
  
  // Z-index variables
  z: (token: keyof typeof tokens.zIndex) => `var(--z-${token})`,
};

// Direct token access (for when CSS variables aren't available)
export const token = {
  spacing: (key: SpacingToken) => tokens.spacing[key],
  radius: (key: BorderRadiusToken) => tokens.borderRadius[key],
  shadow: (key: keyof typeof tokens.shadows) => tokens.shadows[key],
  zIndex: (key: keyof typeof tokens.zIndex) => tokens.zIndex[key],
};

// Responsive design helpers
export const responsive = {
  // Media query generator
  up: (breakpoint: keyof typeof tokens.breakpoints) => 
    `@media (min-width: ${tokens.breakpoints[breakpoint]})`,
  
  down: (breakpoint: keyof typeof tokens.breakpoints) => {
    const breakpointValue = parseInt(tokens.breakpoints[breakpoint]);
    return `@media (max-width: ${breakpointValue - 1}px)`;
  },
  
  between: (min: keyof typeof tokens.breakpoints, max: keyof typeof tokens.breakpoints) => {
    const minValue = tokens.breakpoints[min];
    const maxValue = parseInt(tokens.breakpoints[max]) - 1;
    return `@media (min-width: ${minValue}) and (max-width: ${maxValue}px)`;
  },
};

// Animation helpers
export const animate = {
  // Transition helper
  transition: (
    properties: string | string[] = 'all',
    duration: keyof typeof tokens.animation.duration = 'normal',
    easing: keyof typeof tokens.animation.easing = 'easeInOut'
  ) => {
    const props = Array.isArray(properties) ? properties.join(', ') : properties;
    return `transition: ${props} ${tokens.animation.duration[duration]} ${tokens.animation.easing[easing]}`;
  },
  
  // Common animations
  fadeIn: `
    animation: fadeIn ${tokens.animation.duration.normal} ${tokens.animation.easing.easeOut};
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  
  slideInUp: `
    animation: slideInUp ${tokens.animation.duration.normal} ${tokens.animation.easing.easeOut};
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  
  bounce: `
    animation: bounce ${tokens.animation.duration.slower} ${tokens.animation.easing.bounce};
    @keyframes bounce {
      0%, 20%, 53%, 80%, 100% {
        transform: translate3d(0, 0, 0);
      }
      40%, 43% {
        transform: translate3d(0, -8px, 0);
      }
      70% {
        transform: translate3d(0, -4px, 0);
      }
      90% {
        transform: translate3d(0, -2px, 0);
      }
    }
  `,
};

// Focus management helpers
export const focus = {
  // Accessible focus ring
  ring: (color = cssVar.color('border-focus')) => `
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px ${color};
  `,
  
  // Remove focus for mouse users, keep for keyboard
  mouseOnly: `
    &:focus:not(:focus-visible) {
      outline: none;
      box-shadow: none;
    }
  `,
  
  // Skip link styles
  skipLink: `
    position: absolute;
    top: -40px;
    left: 6px;
    background: ${cssVar.color('background-primary')};
    color: ${cssVar.color('text-primary')};
    padding: 8px;
    border-radius: ${cssVar.radius('md')};
    text-decoration: none;
    z-index: ${cssVar.z('skipLink')};
    
    &:focus {
      top: 6px;
      ${focus.ring()}
    }
  `,
};

// Layout helpers
export const layout = {
  // Flexbox utilities
  flex: {
    center: 'display: flex; align-items: center; justify-content: center;',
    centerY: 'display: flex; align-items: center;',
    centerX: 'display: flex; justify-content: center;',
    between: 'display: flex; justify-content: space-between;',
    end: 'display: flex; justify-content: flex-end;',
    column: 'display: flex; flex-direction: column;',
    columnCenter: 'display: flex; flex-direction: column; align-items: center;',
  },
  
  // Grid utilities
  grid: {
    auto: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));',
    twoColumn: 'display: grid; grid-template-columns: 1fr 1fr;',
    threeColumn: 'display: grid; grid-template-columns: repeat(3, 1fr);',
    sidebar: 'display: grid; grid-template-columns: 240px 1fr;',
  },
  
  // Container utilities
  container: (maxWidth = '1200px') => `
    width: 100%;
    max-width: ${maxWidth};
    margin: 0 auto;
    padding: 0 ${token.spacing('4')};
    
    ${responsive.up('sm')} {
      padding: 0 ${token.spacing('6')};
    }
  `,
  
  // Aspect ratio helper
  aspectRatio: (ratio: string) => `
    aspect-ratio: ${ratio};
    
    @supports not (aspect-ratio: 1) {
      &::before {
        content: '';
        display: block;
        padding-bottom: calc(100% / (${ratio}));
      }
    }
  `,
};

// Typography helpers
export const typography = {
  // Text size with line height
  text: (size: keyof typeof tokens.typography.fontSize) => {
    const [fontSize, lineHeight] = tokens.typography.fontSize[size];
    return `font-size: ${fontSize}; line-height: ${lineHeight};`;
  },
  
  // Truncate text
  truncate: `
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  
  // Line clamp (multiline truncate)
  lineClamp: (lines: number) => `
    display: -webkit-box;
    -webkit-line-clamp: ${lines};
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  
  // Text styling utilities
  styles: {
    heading: `
      ${typography.text('2xl')}
      font-weight: ${tokens.typography.fontWeight.bold};
      color: ${cssVar.color('text-primary')};
      margin: 0;
    `,
    
    subheading: `
      ${typography.text('lg')}
      font-weight: ${tokens.typography.fontWeight.semibold};
      color: ${cssVar.color('text-primary')};
      margin: 0;
    `,
    
    body: `
      ${typography.text('base')}
      font-weight: ${tokens.typography.fontWeight.normal};
      color: ${cssVar.color('text-primary')};
      line-height: 1.6;
    `,
    
    caption: `
      ${typography.text('sm')}
      font-weight: ${tokens.typography.fontWeight.normal};
      color: ${cssVar.color('text-secondary')};
    `,
    
    label: `
      ${typography.text('sm')}
      font-weight: ${tokens.typography.fontWeight.medium};
      color: ${cssVar.color('text-primary')};
    `,
  },
};

// Component styling helpers
export const component = {
  // Button base styles
  button: {
    base: `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: ${token.spacing('2')};
      font-family: inherit;
      font-weight: ${tokens.typography.fontWeight.medium};
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
      ${animate.transition(['background-color', 'border-color', 'color', 'box-shadow'])}
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      &:focus {
        ${focus.ring()}
      }
      
      ${focus.mouseOnly}
    `,
    
    primary: `
      background: ${cssVar.color('interactive-primary')};
      color: white;
      border-color: ${cssVar.color('interactive-primary')};
      
      &:hover:not(:disabled) {
        background: ${cssVar.color('interactive-primaryHover')};
        border-color: ${cssVar.color('interactive-primaryHover')};
      }
      
      &:active:not(:disabled) {
        background: ${cssVar.color('interactive-primaryActive')};
        border-color: ${cssVar.color('interactive-primaryActive')};
      }
    `,
    
    secondary: `
      background: ${cssVar.color('interactive-secondary')};
      color: ${cssVar.color('text-primary')};
      border-color: ${cssVar.color('border-primary')};
      
      &:hover:not(:disabled) {
        background: ${cssVar.color('interactive-secondaryHover')};
        border-color: ${cssVar.color('border-secondary')};
      }
      
      &:active:not(:disabled) {
        background: ${cssVar.color('interactive-secondaryActive')};
      }
    `,
  },
  
  // Input base styles
  input: {
    base: `
      width: 100%;
      font-family: inherit;
      background: ${cssVar.color('surface-primary')};
      border: 1px solid ${cssVar.color('border-primary')};
      color: ${cssVar.color('text-primary')};
      ${animate.transition(['border-color', 'box-shadow'])}
      
      &::placeholder {
        color: ${cssVar.color('text-tertiary')};
      }
      
      &:focus {
        outline: none;
        border-color: ${cssVar.color('border-focus')};
        ${focus.ring()}
      }
      
      &:disabled {
        background: ${cssVar.color('surface-secondary')};
        color: ${cssVar.color('text-disabled')};
        cursor: not-allowed;
      }
      
      &[aria-invalid="true"] {
        border-color: ${cssVar.color('border-error')};
      }
    `,
  },
  
  // Card base styles
  card: {
    base: `
      background: ${cssVar.color('surface-primary')};
      border: 1px solid ${cssVar.color('border-primary')};
      border-radius: ${cssVar.radius('xl')};
      box-shadow: ${cssVar.shadow('sm')};
      overflow: hidden;
    `,
    
    hover: `
      ${animate.transition(['box-shadow', 'transform'])}
      
      &:hover {
        box-shadow: ${cssVar.shadow('md')};
        transform: translateY(-1px);
      }
    `,
  },
};

// Utility function to convert Tailwind-like classes to CSS
export function tw(className: string): string {
  const twToCss: Record<string, string> = {
    // Spacing
    'p-1': `padding: ${token.spacing('1')};`,
    'p-2': `padding: ${token.spacing('2')};`,
    'p-4': `padding: ${token.spacing('4')};`,
    'p-6': `padding: ${token.spacing('6')};`,
    'm-1': `margin: ${token.spacing('1')};`,
    'm-2': `margin: ${token.spacing('2')};`,
    'm-4': `margin: ${token.spacing('4')};`,
    
    // Colors
    'text-primary': `color: ${cssVar.color('text-primary')};`,
    'text-secondary': `color: ${cssVar.color('text-secondary')};`,
    'bg-primary': `background: ${cssVar.color('background-primary')};`,
    'bg-secondary': `background: ${cssVar.color('background-secondary')};`,
    
    // Border radius
    'rounded': `border-radius: ${cssVar.radius('base')};`,
    'rounded-md': `border-radius: ${cssVar.radius('md')};`,
    'rounded-lg': `border-radius: ${cssVar.radius('lg')};`,
    'rounded-xl': `border-radius: ${cssVar.radius('xl')};`,
    
    // Flex
    'flex': 'display: flex;',
    'flex-col': 'flex-direction: column;',
    'items-center': 'align-items: center;',
    'justify-center': 'justify-content: center;',
    'justify-between': 'justify-content: space-between;',
  };
  
  return className.split(' ')
    .map(cls => twToCss[cls] || '')
    .filter(Boolean)
    .join(' ');
}

export default {
  cssVar,
  token,
  responsive,
  animate,
  focus,
  layout,
  typography,
  component,
  tw,
};