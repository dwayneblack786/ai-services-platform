/**
 * Real Estate Image Assets
 * High-quality stock photos and illustrations for the platform
 */

// Unsplash image URLs for real estate platform
// Using Unsplash Source API for free, high-quality images

export const realEstateImages = {
  // Hero Section - Modern cityscape/skyline
  hero: {
    main: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=800&fit=crop&q=80', // City skyline
    alt: 'https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?w=1200&h=800&fit=crop&q=80', // Modern architecture
  },

  // Feature Images
  features: {
    speed: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop&q=80', // Technology/speed
    security: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop&q=80', // Security/protection
    focus: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop&q=80', // Modern real estate office
    analytics: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop&q=80', // Data/charts
  },

  // Product Category Images
  products: {
    listingProduction: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop&q=80', // Beautiful modern home
    marketIntelligence: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop&q=80', // Business analytics
    compliance: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop&q=80', // Legal documents
    documentIntelligence: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&h=600&fit=crop&q=80', // Office documents
    voiceReceptionist: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=800&h=600&fit=crop&q=80', // Phone/communication
    propertyManagement: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop&q=80', // Apartment buildings
    underwriting: 'https://images.unsplash.com/photo-1554224154-22dec7ec8818?w=800&h=600&fit=crop&q=80', // Financial analysis
    realEstate: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&h=600&fit=crop&q=80', // Real estate general
  },

  // Placeholder gradient backgrounds as fallback
  gradients: {
    blue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    orange: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)',
    green: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    purple: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
  },
};

// Map product categories to images
export const getProductImage = (subCategory: string, category: string): string => {
  const normalizedSubCat = (subCategory || category || '').toLowerCase();

  // Listing Production
  if (normalizedSubCat.includes('listing') || normalizedSubCat.includes('production')) {
    return realEstateImages.products.listingProduction;
  }

  // Market Intelligence
  if (normalizedSubCat.includes('market') || normalizedSubCat.includes('intelligence')) {
    return realEstateImages.products.marketIntelligence;
  }

  // Legal/Compliance
  if (normalizedSubCat.includes('compliance') || normalizedSubCat.includes('legal')) {
    return realEstateImages.products.compliance;
  }

  // Document Intelligence
  if (normalizedSubCat.includes('document') || normalizedSubCat.includes('cre document')) {
    return realEstateImages.products.documentIntelligence;
  }

  // Voice/Phone
  if (normalizedSubCat.includes('voice') || normalizedSubCat.includes('receptionist')) {
    return realEstateImages.products.voiceReceptionist;
  }

  // Property Management
  if (normalizedSubCat.includes('property') || normalizedSubCat.includes('tenant')) {
    return realEstateImages.products.propertyManagement;
  }

  // Underwriting
  if (normalizedSubCat.includes('underwriting') || normalizedSubCat.includes('deal')) {
    return realEstateImages.products.underwriting;
  }

  // Default to real estate general image
  return realEstateImages.products.realEstate;
};

// Get feature image
export const getFeatureImage = (featureName: string): string => {
  const name = featureName.toLowerCase();
  
  if (name.includes('fast') || name.includes('speed') || name.includes('lightning')) {
    return realEstateImages.features.speed;
  }
  if (name.includes('security') || name.includes('compliant') || name.includes('protection')) {
    return realEstateImages.features.security;
  }
  if (name.includes('focus') || name.includes('estate') || name.includes('property')) {
    return realEstateImages.features.focus;
  }
  if (name.includes('analytic') || name.includes('insight') || name.includes('data')) {
    return realEstateImages.features.analytics;
  }

  return realEstateImages.features.focus; // Default
};

export default realEstateImages;
