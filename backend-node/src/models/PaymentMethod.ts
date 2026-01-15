import { ObjectId } from 'mongodb';

// Payment Method model - stores tokenized payment information
export interface PaymentMethod {
  _id?: ObjectId;
  tenantId: string;
  userId: string; // User who added the payment method
  // Stripe payment method ID (tokenized - never store raw card data)
  stripePaymentMethodId: string;
  // Card details (safe to store - from Stripe)
  cardBrand: string; // e.g., 'visa', 'mastercard', 'amex'
  cardLast4: string; // Last 4 digits
  cardExpMonth: number;
  cardExpYear: number;
  // Billing details
  billingName: string;
  billingEmail: string;
  securityCode?: string; // CVV/CVC code
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  isDefault: boolean;
  status: 'active' | 'expired' | 'removed';
  // Transaction tracking
  lastTransactionDate?: Date;
  lastTransactionAmount?: number;
  lastTransactionStatus?: 'success' | 'failed' | 'pending';
  transactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}
