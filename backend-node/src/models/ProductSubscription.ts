export interface ProductSubscription {
  _id?: string;
  tenantId: string;
  productId: string;
  userId: string; // User who created the subscription
  pricingTier?: 'small' | 'medium' | 'large'; // Optional for per-use model
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
