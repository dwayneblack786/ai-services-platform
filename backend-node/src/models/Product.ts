export interface PricingTier {
  name: 'small' | 'medium' | 'large';
  displayName: string;
  description: string;
  price: number;
  features: string[];
}

export interface Product {
  _id?: string;
  name: string;
  category: 'Virtual Assistant' | 'IDP' | 'Computer Vision';
  subCategory?: string;
  description: string;
  features: string[];
  pricing: {
    model: 'subscription' | 'per-use' | 'enterprise';
    currency: string;
    tiers?: PricingTier[]; // Optional for per-use and enterprise models
    perUseRate?: number; // For per-use pricing
    perUseUnit?: string; // e.g., 'request', 'page', 'document', 'hour'
    minimumCharge?: number; // Optional minimum charge for per-use
    enterprisePrice?: number; // For enterprise pricing
    enterpriseDescription?: string; // Description of enterprise pricing
  };
  industries: string[];
  status: 'active' | 'beta' | 'coming-soon';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
