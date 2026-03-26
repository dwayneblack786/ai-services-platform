// Home page styles with Real Estate Theme
import { CSSProperties } from 'react';
import { realEstateTheme } from '../theme/realEstateTheme';

const theme = realEstateTheme;

export const styles: { [key: string]: CSSProperties } = {
  container: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: theme.colors.background.default,
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: theme.spacing.lg,
  },

  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: `5px solid ${theme.colors.primary.main}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  // Hero Section - Real Estate Professional
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '100px 80px',
    background: theme.colors.background.hero,
    color: 'white',
    minHeight: '600px',
    gap: '60px',
  },

  heroMobile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    background: theme.colors.background.hero,
    color: 'white',
    minHeight: '500px',
    textAlign: 'center',
  },

  heroContent: {
    flex: 1,
    maxWidth: '650px',
  },

  heroTitle: {
    fontSize: theme.typography.fontSize['5xl'],
    fontWeight: theme.typography.fontWeight.extrabold,
    marginBottom: theme.spacing.lg,
    lineHeight: theme.typography.lineHeight.tight,
    textShadow: '2px 4px 8px rgba(0,0,0,0.3)',
    letterSpacing: '-0.02em',
  },

  heroTitleMobile: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.md,
    lineHeight: theme.typography.lineHeight.tight,
    textShadow: '2px 4px 8px rgba(0,0,0,0.3)',
  },

  heroSubtitle: {
    fontSize: theme.typography.fontSize.xl,
    marginBottom: theme.spacing['3xl'],
    opacity: 0.95,
    lineHeight: theme.typography.lineHeight.relaxed,
    fontWeight: theme.typography.fontWeight.normal,
  },

  heroSubtitleMobile: {
    fontSize: theme.typography.fontSize.base,
    marginBottom: theme.spacing.xl,
    opacity: 0.95,
    lineHeight: theme.typography.lineHeight.normal,
  },

  ctaButton: {
    padding: '18px 48px',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    backgroundColor: theme.colors.secondary.main,
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.full,
    cursor: 'pointer',
    transition: theme.transitions.normal,
    boxShadow: theme.shadows.xl,
    minHeight: '56px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },

  ctaButtonMobile: {
    padding: '16px 36px',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    backgroundColor: theme.colors.secondary.main,
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.full,
    cursor: 'pointer',
    transition: theme.transitions.normal,
    boxShadow: theme.shadows.lg,
    minHeight: '52px',
    width: '100%',
    maxWidth: '320px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },

  heroImage: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },

  // Features Section
  featuresSection: {
    padding: '100px 80px',
    backgroundColor: theme.colors.neutral.white,
  },

  sectionTitle: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    color: theme.colors.neutral.darkest,
    letterSpacing: '-0.01em',
  },

  sectionTitleMobile: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    color: theme.colors.neutral.darkest,
    padding: '0 20px',
  },

  sectionSubtitle: {
    fontSize: theme.typography.fontSize.xl,
    textAlign: 'center',
    marginBottom: theme.spacing['4xl'],
    color: theme.colors.neutral.dark,
    maxWidth: '750px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: theme.typography.lineHeight.relaxed,
  },

  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: theme.spacing['2xl'],
    maxWidth: '1300px',
    margin: '0 auto',
  },

  featuresGridMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xl,
    padding: '0 20px',
  },

  featureCard: {
    padding: theme.spacing['2xl'],
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    textAlign: 'center',
    transition: theme.transitions.normal,
    border: `1px solid ${theme.colors.neutral.light}`,
    cursor: 'pointer',
    boxShadow: theme.shadows.sm,
  },

  featureTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.neutral.darkest,
  },

  featureDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral.dark,
    lineHeight: theme.typography.lineHeight.relaxed,
  },

  // Products Section
  productsSection: {
    padding: '100px 80px',
    backgroundColor: theme.colors.background.default,
  },

  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: theme.spacing['2xl'],
    maxWidth: '1500px',
    margin: '0 auto',
  },

  productsGridMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xl,
    padding: '0 20px',
  },

  productCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    boxShadow: theme.shadows.card,
    transition: theme.transitions.normal,
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${theme.colors.neutral.light}`,
    cursor: 'pointer',
  },

  productImageContainer: {
    position: 'relative',
    height: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: `${theme.borderRadius.xl} ${theme.borderRadius.xl} 0 0`,
  },

  productImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productCategoryBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: theme.borderRadius.full,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    boxShadow: theme.shadows.md,
    backdropFilter: 'blur(8px)',
  },

  productContent: {
    padding: theme.spacing['2xl'],
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },

  productTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.md,
    color: theme.colors.neutral.darkest,
    letterSpacing: '-0.01em',
  },

  productDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral.dark,
    lineHeight: theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.xl,
    flex: 1,
  },

  productFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },

  productFeatureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.darker,
  },

  checkIcon: {
    color: theme.colors.accent.main,
    fontWeight: theme.typography.fontWeight.bold,
    fontSize: theme.typography.fontSize.base,
  },

  productFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.lg,
    borderTop: `1px solid ${theme.colors.neutral.light}`,
    gap: theme.spacing.md,
  },

  productPricing: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  priceLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral.main,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  priceValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary.main,
  },

  pricingModel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral.dark,
  },

   exploreButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.primary.main,
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: theme.transitions.normal,
    minHeight: '44px',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    boxShadow: theme.shadows.sm,
  },

  viewAllContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: theme.spacing['4xl'],
  },

  viewAllButton: {
    padding: `${theme.spacing.md} ${theme.spacing['3xl']}`,
    backgroundColor: theme.colors.primary.main,
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.full,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: theme.transitions.normal,
    boxShadow: theme.shadows.lg,
    minHeight: '56px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },

  // CTA Section
  ctaSection: {
    padding: '100px 80px',
    background: theme.colors.primary.gradient,
    color: 'white',
    textAlign: 'center',
  },

  ctaContent: {
    maxWidth: '900px',
    margin: '0 auto',
  },

  // Tab Styles
  tabButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: 'transparent',
    color: theme.colors.neutral.darker,
    border: `2px solid ${theme.colors.neutral.light}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },

  tabButtonActive: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary.main,
    color: 'white',
    border: `2px solid ${theme.colors.primary.main}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },

  ctaTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '20px',
  },

  ctaTitleMobile: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    marginBottom: '16px',
    padding: '0 20px',
  },

  ctaSubtitle: {
    fontSize: '1.2rem',
    marginBottom: '40px',
    opacity: 0.95,
  },

  ctaSubtitleMobile: {
    fontSize: '1rem',
    marginBottom: '30px',
    opacity: 0.95,
    padding: '0 20px',
  },

  ctaButtons: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  ctaPrimaryButton: {
    padding: '16px 40px',
    fontSize: '1.1rem',
    fontWeight: '600',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    minHeight: '50px',
    minWidth: '180px',
  },

  ctaSecondaryButton: {
    padding: '16px 40px',
    fontSize: '1.1rem',
    fontWeight: '600',
    backgroundColor: 'transparent',
    color: 'white',
    border: '2px solid white',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minHeight: '50px',
    minWidth: '180px',
  }
};
