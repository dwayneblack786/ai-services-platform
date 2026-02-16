import mongoose, { Schema, Document } from 'mongoose';

export interface IProductSignupSession extends Document {
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  tenantId: string;
  productId: mongoose.Types.ObjectId;
  selectedTierId?: 'small' | 'medium' | 'large';
  lockedPrice: number;
  currency: string;
  paymentMethodId?: string;
  termsAccepted: boolean;
  paymentValidated: boolean;
  lastChargeAttempt?: Date;
  currentStep: 'initiated' | 'tier-selected' | 'payment-validated' | 'complete';
  resumeToken?: string;
  resumeTokenExpiresAt?: Date;
  resumeTokenUsed: boolean;
  lastAccessedAt: Date;
  metadata?: Record<string, any>;
  cancelledAt?: Date;
  completedSubscriptionId?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSignupSessionSchema = new Schema<IProductSignupSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    selectedTierId: { type: String, enum: ['small', 'medium', 'large'] },
    lockedPrice: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    paymentMethodId: { type: String },
    termsAccepted: { type: Boolean, default: false },
    paymentValidated: { type: Boolean, default: false },
    lastChargeAttempt: { type: Date },
    currentStep: {
      type: String,
      enum: ['initiated', 'tier-selected', 'payment-validated', 'complete'],
      required: true,
      default: 'initiated'
    },
    resumeToken: { type: String, unique: true, sparse: true, index: true },
    resumeTokenExpiresAt: { type: Date },
    resumeTokenUsed: { type: Boolean, default: false },
    lastAccessedAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
    cancelledAt: { type: Date },
    completedSubscriptionId: { type: String, index: true },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    }
  },
  { timestamps: true }
);

// TTL Index for automatic cleanup of expired sessions
ProductSignupSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for common queries
ProductSignupSessionSchema.index({ userId: 1, productId: 1 });
ProductSignupSessionSchema.index({ userId: 1, completedSubscriptionId: 1 });
ProductSignupSessionSchema.index({ tenantId: 1, currentStep: 1 });

const ProductSignupSessionModel = mongoose.model<IProductSignupSession>(
  'ProductSignupSession',
  ProductSignupSessionSchema
);

export default ProductSignupSessionModel;
