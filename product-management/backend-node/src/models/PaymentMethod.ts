import mongoose, { Schema, Document } from 'mongoose';

// Mongoose Document interface
export interface IPaymentMethod extends Document {
  tenantId: string;
  userId: string;
  stripePaymentMethodId: string;
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: number;
  cardExpYear: number;
  billingName: string;
  billingEmail: string;
  securityCode?: string;
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
  lastTransactionDate?: Date;
  lastTransactionAmount?: number;
  lastTransactionStatus?: 'success' | 'failed' | 'pending';
  transactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  stripePaymentMethodId: { type: String, required: true },
  cardBrand: { type: String, required: true },
  cardLast4: { type: String, required: true },
  cardExpMonth: { type: Number, required: true },
  cardExpYear: { type: Number, required: true },
  billingName: { type: String, required: true },
  billingEmail: { type: String, required: true },
  securityCode: { type: String },
  billingAddress: {
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String }
  },
  isDefault: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'expired', 'removed'], default: 'active', index: true },
  lastTransactionDate: { type: Date },
  lastTransactionAmount: { type: Number },
  lastTransactionStatus: { type: String, enum: ['success', 'failed', 'pending'] },
  transactionCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'payment_methods'
});

// Compound index for tenant + status queries
PaymentMethodSchema.index({ tenantId: 1, status: 1 });

const PaymentMethodModel = mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);

export default PaymentMethodModel;

// Keep old interface for backwards compatibility
export interface PaymentMethod {
  _id?: any;
  tenantId: string;
  userId: string;
  stripePaymentMethodId: string;
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: number;
  cardExpYear: number;
  billingName: string;
  billingEmail: string;
  securityCode?: string;
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
  lastTransactionDate?: Date;
  lastTransactionAmount?: number;
  lastTransactionStatus?: 'success' | 'failed' | 'pending';
  transactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}
