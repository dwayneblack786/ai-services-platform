// Transaction model - stores payment transaction history
export interface Transaction {
  _id?: string;
  tenantId: string;
  userId: string;
  paymentMethodId: string;
  // Transaction details
  transactionId: string; // Unique transaction ID
  stripeChargeId?: string; // Stripe charge ID if applicable
  amount: number; // Amount in cents
  currency: string; // e.g., 'usd'
  status: 'success' | 'failed' | 'pending' | 'refunded';
  type: 'charge' | 'refund' | 'subscription' | 'one-time';
  // Product/Service information
  productId?: string;
  productName?: string;
  description?: string;
  // Card details (snapshot at time of transaction)
  cardBrand: string;
  cardLast4: string;
  // Status details
  failureReason?: string;
  failureCode?: string;
  // Metadata
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}
