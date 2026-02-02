import mongoose, { Schema, Document } from 'mongoose';

export interface IProductSubscription extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  pricingTier?: 'small' | 'medium' | 'large';
  status: 'active' | 'suspended' | 'cancelled' | 'trial';
  billingCycle: 'monthly' | 'yearly' | 'one-time' | 'usage-based';
  amount: number;
  currency: string;
  startDate: Date;
  renewalDate?: Date;
  cancelledDate?: Date;
  trialEndsAt?: Date;
  autoRenew: boolean;
  paymentMethod?: string;
  lastBillingDate?: Date;
  nextBillingDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSubscriptionSchema = new Schema<IProductSubscription>({
  tenantId: { type: String, required: true, index: true },
  productId: { type: Schema.Types.ObjectId, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  pricingTier: { type: String, enum: ['small', 'medium', 'large'] },
  status: { type: String, enum: ['active', 'suspended', 'cancelled', 'trial'], required: true, index: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly', 'one-time', 'usage-based'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  startDate: { type: Date, required: true },
  renewalDate: { type: Date },
  cancelledDate: { type: Date },
  trialEndsAt: { type: Date },
  autoRenew: { type: Boolean, default: true },
  paymentMethod: { type: String },
  lastBillingDate: { type: Date },
  nextBillingDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'product_subscriptions',
  timestamps: true
});

// Add compound indexes
ProductSubscriptionSchema.index({ tenantId: 1, status: 1 });
ProductSubscriptionSchema.index({ userId: 1, status: 1 });
ProductSubscriptionSchema.index({ tenantId: 1, productId: 1, status: 1 });

export const ProductSubscriptionModel = mongoose.model<IProductSubscription>('ProductSubscription', ProductSubscriptionSchema);

// Keep backward compatibility interface
export interface ProductSubscription {
  _id?: string;
  tenantId: string;
  productId: string | mongoose.Types.ObjectId;
  userId: string | mongoose.Types.ObjectId;
  pricingTier?: 'small' | 'medium' | 'large';
  status: 'active' | 'suspended' | 'cancelled' | 'trial';
  billingCycle: 'monthly' | 'yearly' | 'one-time' | 'usage-based';
  amount: number;
  currency: string;
  startDate: Date;
  renewalDate?: Date;
  cancelledDate?: Date;
  trialEndsAt?: Date;
  autoRenew: boolean;
  paymentMethod?: string;
  lastBillingDate?: Date;
  nextBillingDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
