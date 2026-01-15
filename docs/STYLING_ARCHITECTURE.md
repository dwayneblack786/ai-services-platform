# Frontend Styling Architecture & Best Practices

## Overview

This document covers CSS-in-JS with Emotion, design system implementation, theme management, responsive design, and styling best practices.

**Styling Stack:**
- Emotion for CSS-in-JS
- Design tokens for consistency
- Mobile-first responsive design
- Light/dark theme support
- Accessibility-compliant color contrasts

## Design Tokens & Theme System

### Design Token Definition

```typescript
// src/styles/tokens.ts
export const lightTheme = {
  colors: {
    // Primary
    primary: {
      50: '#f0f7ff',
      100: '#e0efff',
      200: '#bfe3ff',
      300: '#87cdff',
      400: '#4eb7ff',
      500: '#1a9aff', // Main
      600: '#0d7fd6',
      700: '#0861ad',
      800: '#074d8a',
      900: '#063d70',
    },
    // Semantic
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    // Neutral
    white: '#ffffff',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    background: '#ffffff',
    surface: '#f9fafb',
    surfaceAlt: '#f3f4f6',
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      tertiary: '#9ca3af',
      inverse: '#ffffff',
    },
    border: '#e5e7eb',
    divider: '#f3f4f6',
  },
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"Fira Code", "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  transitions: {
    fast: 'all 0.2s ease-in-out',
    base: 'all 0.3s ease-in-out',
    slow: 'all 0.5s ease-in-out',
  },
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },
};

export const darkTheme: typeof lightTheme = {
  colors: {
    primary: { ...lightTheme.colors.primary },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    white: '#ffffff',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    background: '#111827',
    surface: '#1f2937',
    surfaceAlt: '#374151',
    text: {
      primary: '#f9fafb',
      secondary: '#d1d5db',
      tertiary: '#9ca3af',
      inverse: '#111827',
    },
    border: '#374151',
    divider: '#1f2937',
  },
  // ... rest of dark theme
};
```

### Theme Context Setup

```typescript
// src/context/ThemeContext.tsx
import { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider as EmotionThemeProvider } from '@emotion/react';
import { lightTheme, darkTheme } from '../styles/tokens';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode(mode: ThemeMode): void;
  theme: typeof lightTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('themeMode') as ThemeMode) || 'auto';
  });

  const isDark = useMemo(() => {
    if (mode === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return mode === 'dark';
  }, [mode]);

  const theme = isDark ? darkTheme : lightTheme;

  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const value: ThemeContextType = {
    mode,
    isDark,
    setMode: handleSetMode,
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <EmotionThemeProvider theme={theme}>
        {children}
      </EmotionThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

## Emotion Styling Patterns

### Global Styles

```typescript
// src/styles/globals.ts
import { css, Global } from '@emotion/react';
import { lightTheme, darkTheme } from './tokens';

export const GlobalStyles = () => (
  <Global
    styles={css`
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
        font-size: 16px;
      }

      body {
        font-family: ${lightTheme.typography.fontFamily.sans};
        font-size: ${lightTheme.typography.fontSize.base};
        line-height: ${lightTheme.typography.lineHeight.normal};
        color: ${lightTheme.colors.text.primary};
        background-color: ${lightTheme.colors.background};
        transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
      }

      body.dark-mode {
        background-color: ${darkTheme.colors.background};
        color: ${darkTheme.colors.text.primary};
      }

      /* Headings */
      h1, h2, h3, h4, h5, h6 {
        font-weight: ${lightTheme.typography.fontWeight.bold};
        line-height: ${lightTheme.typography.lineHeight.tight};
        margin-bottom: ${lightTheme.spacing[4]};
      }

      h1 {
        font-size: ${lightTheme.typography.fontSize['4xl']};
      }

      h2 {
        font-size: ${lightTheme.typography.fontSize['3xl']};
      }

      h3 {
        font-size: ${lightTheme.typography.fontSize['2xl']};
      }

      /* Links */
      a {
        color: ${lightTheme.colors.primary[500]};
        text-decoration: none;
        transition: color 0.2s;

        &:hover {
          color: ${lightTheme.colors.primary[600]};
        }
      }

      /* Form elements */
      input, textarea, select {
        font-family: inherit;
        font-size: inherit;
      }

      button {
        cursor: pointer;
        border: none;
        font-family: inherit;
        font-size: inherit;
      }

      /* Scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: ${lightTheme.colors.surface};
      }

      ::-webkit-scrollbar-thumb {
        background: ${lightTheme.colors.gray[400]};
        border-radius: ${lightTheme.borderRadius.md};

        &:hover {
          background: ${lightTheme.colors.gray[500]};
        }
      }
    `}
  />
);
```

### Styled Components

```typescript
// src/components/common/Button.tsx
import styled from '@emotion/styled';
import { css } from '@emotion/react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
}

const variantStyles = (variant: ButtonVariant, isDark: boolean) => {
  const variants = {
    primary: css`
      background-color: #1a9aff;
      color: white;
      
      &:hover:not(:disabled) {
        background-color: #0d7fd6;
      }
    `,
    secondary: css`
      background-color: ${isDark ? '#374151' : '#f3f4f6'};
      color: ${isDark ? '#f9fafb' : '#111827'};
      border: 1px solid ${isDark ? '#4b5563' : '#d1d5db'};
      
      &:hover:not(:disabled) {
        background-color: ${isDark ? '#4b5563' : '#e5e7eb'};
      }
    `,
    danger: css`
      background-color: #ef4444;
      color: white;
      
      &:hover:not(:disabled) {
        background-color: #dc2626;
      }
    `,
  };

  return variants[variant];
};

const sizeStyles = (size: ButtonSize) => {
  const sizes = {
    sm: css`
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
    `,
    md: css`
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border-radius: 0.5rem;
    `,
    lg: css`
      padding: 1rem 2rem;
      font-size: 1.125rem;
      border-radius: 0.75rem;
    `,
  };

  return sizes[size];
};

export const StyledButton = styled.button<ButtonProps>`
  ${props => variantStyles(props.variant || 'primary', false)}
  ${props => sizeStyles(props.size || 'md')}
  
  font-weight: 500;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border: none;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${props =>
    props.isLoading &&
    css`
      position: relative;
      color: transparent;

      &::after {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        top: 50%;
        left: 50%;
        margin-left: -8px;
        margin-top: -8px;
        border: 2px solid currentColor;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `}
`;

export const Button: React.FC<ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>> = (
  props
) => <StyledButton {...props} />;
```

## Responsive Design

### Mobile-First Breakpoints

```typescript
// src/styles/breakpoints.ts
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const mq = {
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  '2xl': `@media (min-width: ${breakpoints['2xl']}px)`,
};

// Usage
import { css } from '@emotion/react';
import { mq } from '../styles/breakpoints';

const styles = css`
  font-size: 1rem;
  
  ${mq.md} {
    font-size: 1.25rem;
  }
  
  ${mq.lg} {
    font-size: 1.5rem;
  }
`;
```

### Responsive Grid Component

```typescript
// src/components/layout/Grid.tsx
import styled from '@emotion/styled';
import { mq } from '../styles/breakpoints';

interface GridProps {
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number | string;
}

export const Grid = styled.div<GridProps>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns?.xs || 1}, 1fr);
  gap: ${props => props.gap || '1rem'};

  ${mq.sm} {
    grid-template-columns: repeat(${props => props.columns?.sm || 2}, 1fr);
  }

  ${mq.md} {
    grid-template-columns: repeat(${props => props.columns?.md || 3}, 1fr);
  }

  ${mq.lg} {
    grid-template-columns: repeat(${props => props.columns?.lg || 4}, 1fr);
  }

  ${mq.xl} {
    grid-template-columns: repeat(${props => props.columns?.xl || 5}, 1fr);
  }
`;

// Usage
<Grid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap={16}>
  {items.map(item => (
    <div key={item.id}>{item.name}</div>
  ))}
</Grid>
```

## CSS-in-JS Best Practices

### Colocating Styles

```typescript
// src/components/ChatMessage.tsx
import { css } from '@emotion/react';

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
}

const messageContainerStyles = (isOwn: boolean) => css`
  display: flex;
  justify-content: ${isOwn ? 'flex-end' : 'flex-start'};
  margin-bottom: 1rem;
`;

const messageBubbleStyles = (isOwn: boolean) => css`
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: ${isOwn ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0'};
  background-color: ${isOwn ? '#1a9aff' : '#e5e7eb'};
  color: ${isOwn ? 'white' : 'black'};
  word-break: break-word;
`;

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwn }) => {
  return (
    <div css={messageContainerStyles(isOwn)}>
      <div css={messageBubbleStyles(isOwn)}>
        {message.content}
      </div>
    </div>
  );
};
```

### Extracting Reusable Styles

```typescript
// src/styles/common.ts
import { css } from '@emotion/react';

export const flexCenter = css`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const flexBetween = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const truncate = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const lineClamp = (lines: number) => css`
  display: -webkit-box;
  -webkit-line-clamp: ${lines};
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

// Usage
<div css={[flexCenter, css`height: 200px;`]}>
  Content
</div>
```

## Accessibility in Styling

### Color Contrast

```typescript
// Ensure WCAG AA compliance (4.5:1 for text)
const accessibleColors = {
  text: '#111827', // Contrast ratio: 17.4:1 on white
  error: '#dc2626', // Contrast ratio: 5.4:1 on white
  success: '#047857', // Contrast ratio: 5.3:1 on white
};
```

### Focus States

```typescript
const focusStyles = css`
  &:focus {
    outline: 2px solid #1a9aff;
    outline-offset: 2px;
  }

  &:focus-visible {
    outline: 2px solid #1a9aff;
    outline-offset: 2px;
  }
`;
```

## Styling Utilities

### CSS Variables for Dynamic Themes

```typescript
// src/styles/cssVariables.ts
import { lightTheme, darkTheme } from './tokens';

export const setCSSVariables = (theme: typeof lightTheme) => {
  const root = document.documentElement;

  Object.entries(theme.colors).forEach(([key, value]) => {
    if (typeof value === 'object') {
      Object.entries(value).forEach(([subKey, subValue]) => {
        root.style.setProperty(`--color-${key}-${subKey}`, subValue);
      });
    } else {
      root.style.setProperty(`--color-${key}`, value);
    }
  });

  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });
};
```

## Styling Checklist

- [ ] Design tokens defined and consistent
- [ ] Theme system implemented (light/dark)
- [ ] Global styles applied
- [ ] Responsive design mobile-first
- [ ] Color contrast WCAG AA compliant
- [ ] Focus states defined for accessibility
- [ ] Loading states visually clear
- [ ] Error states clearly indicated
- [ ] Hover/active states consistent
- [ ] Transitions smooth (0.2-0.3s)
- [ ] Z-index scale defined
- [ ] Scrollbars styled consistently
- [ ] Print styles considered
- [ ] No inline styles (use emotion)
- [ ] Emotion setup optimized for production

## Related Documentation

- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) - Styling architecture overview
- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Component styling patterns
- [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) - CSS bundle optimization

