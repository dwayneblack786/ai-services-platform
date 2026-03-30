import mongoose, { Schema, Document } from 'mongoose';

export interface PricingTier {
  name: 'small' | 'medium' | 'large';
  displayName: string;
  description: string;
  price: number;
  features: string[];
}

// Mongoose Document interface
export interface IProduct extends Document {
  name: string;
  slug?: string;
  category: 'Virtual Assistant' | 'IDP' | 'Computer Vision' | 'Real Estate AI';
  subCategory?: string;
  description: string;
  features: string[];
  pricing: {
    model: 'subscription' | 'per-use' | 'enterprise';
    currency: string;
    tiers?: PricingTier[];
    perUseRate?: number;
    perUseUnit?: string;
    minimumCharge?: number;
    enterprisePrice?: number;
    enterpriseDescription?: string;
  };
  industries: string[];
  status: 'active' | 'beta' | 'coming-soon';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true, index: true },
  category: { type: String, enum: ['Virtual Assistant', 'IDP', 'Computer Vision', 'Real Estate AI'], required: true, index: true },
  subCategory: { type: String },
  description: { type: String, required: true },
  features: [{ type: String }],
  pricing: {
    model: { type: String, enum: ['subscription', 'per-use', 'enterprise'], required: true },
    currency: { type: String, default: 'USD' },
    tiers: [{
      name: { type: String, enum: ['small', 'medium', 'large'] },
      displayName: { type: String },
      description: { type: String },
      price: { type: Number },
      features: [{ type: String }]
    }],
    perUseRate: { type: Number },
    perUseUnit: { type: String },
    minimumCharge: { type: Number },
    enterprisePrice: { type: Number },
    enterpriseDescription: { type: String }
  },
  industries: [{ type: String }],
  status: { type: String, enum: ['active', 'beta', 'coming-soon'], default: 'active', index: true },
  tags: [{ type: String }]
}, {
  timestamps: true,
  collection: 'products'
});

// Indexes for common queries
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ tags: 1 });

const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);

export default ProductModel;

// Keep old interface for backwards compatibility
export interface Product {
  _id?: string;
  name: string;
  slug?: string;
  category: 'Virtual Assistant' | 'IDP' | 'Computer Vision' | 'Real Estate AI';
  subCategory?: string;
  description: string;
  features: string[];
  pricing: {
    model: 'subscription' | 'per-use' | 'enterprise';
    currency: string;
    tiers?: PricingTier[];
    perUseRate?: number;
    perUseUnit?: string;
    minimumCharge?: number;
    enterprisePrice?: number;
    enterpriseDescription?: string;
  };
  industries: string[];
  status: 'active' | 'beta' | 'coming-soon';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
