/**
 * Real Estate Platform Design System
 * Professional color palette and design tokens for a modern real estate AI platform
 */

export const realEstateTheme = {
  // Primary Brand Colors - Professional blues and earth tones
  colors: {
    primary: {
      main: '#2563EB', // Strong blue - trust and professionalism
      light: '#3B82F6',
      dark: '#1E40AF',
      lighter: '#DBEAFE',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
    },
    secondary: {
      main: '#F59E0B', // Warm amber - real estate gold
      light: '#FCD34D',
      dark: '#D97706',
      lighter: '#FEF3C7',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    },
    accent: {
      main: '#10B981', // Success green
      light: '#34D399',
      dark: '#059669',
      lighter: '#D1FAE5',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
      lighter: '#D1FAE5',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
      lighter: '#FEF3C7',
    },
    neutral: {
      white: '#FFFFFF',
      lightest: '#F9FAFB',
      lighter: '#F3F4F6',
      light: '#E5E7EB',
      main: '#9CA3AF',
      dark: '#6B7280',
      darker: '#374151',
      darkest: '#1F2937',
      black: '#111827',
    },
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
      hero: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)', // Deep professional gradient
      heroAlt: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #3B82F6 100%)', // Blue gradient
      card: '#FFFFFF',
      cardHover: '#F9FAFB',
    },
  },

  // Typography
  typography: {
    fontFamily: {
      primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
      secondary: "'Poppins', sans-serif",
      mono: "'Roboto Mono', monospace",
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Spacing (8px base unit)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '2.5rem', // 40px
    '3xl': '3rem',   // 48px
    '4xl': '4rem',   // 64px
    '5xl': '6rem',   // 96px
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    card: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cardHover: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },

  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Breakpoints
  breakpoints: {
    xs: '480px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

// Product Category Colors (for real estate products)
export const productCategoryColors = {
  'Listing Production': {
    icon: 'Home',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    color: '#F59E0B',
    bg: '#FEF3C7',
  },
  'Market Intelligence': {
    icon: 'TrendingUp',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
    color: '#3B82F6',
    bg: '#DBEAFE',
  },
  'Legal Compliance': {
    icon: 'Shield',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: '#10B981',
    bg: '#D1FAE5',
  },
  'CRE Document Intelligence': {
    icon: 'FileText',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    color: '#6366F1',
    bg: '#E0E7FF',
  },
  'AI Voice Receptionist': {
    icon: 'Phone',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
    color: '#EC4899',
    bg: '#FCE7F3',
  },
  'Property Management': {
    icon: 'Building2',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    color: '#14B8A6',
    bg: '#CCFBF1',
  },
  'CRE Underwriting': {
    icon: 'Calculator',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    color: '#F97316',
    bg: '#FFEDD5',
  },
  'Real Estate': {
    icon: 'Building',
    gradient: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
    color: '#2563EB',
    bg: '#DBEAFE',
  },
};

// Helper function to get color with opacity
export const withOpacity = (color: string, opacity: number): string => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// Helper function to get category styling
export const getCategoryStyle = (subCategory: string) => {
  return productCategoryColors[subCategory as keyof typeof productCategoryColors] || 
         productCategoryColors['Real Estate'];
};

export default realEstateTheme;
