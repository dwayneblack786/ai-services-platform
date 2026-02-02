import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProduct extends Document {
  userId: string;
  productId: string;
  subscribedAt: Date;
  status: 'active' | 'cancelled' | 'expired';
  expiresAt?: Date;
}

const UserProductSchema = new Schema<IUserProduct>({
  userId: { type: String, required: true, index: true },
  productId: { type: String, required: true, index: true },
  subscribedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active', index: true },
  expiresAt: { type: Date }
}, {
  timestamps: true,
  collection: 'user_products'
});

// Compound index for user + product + status queries
UserProductSchema.index({ userId: 1, productId: 1, status: 1 });

const UserProductModel = mongoose.model<IUserProduct>('UserProduct', UserProductSchema);

export default UserProductModel;

// Keep the old interface for backwards compatibility
export interface UserProduct {
  _id?: string;
  userId: string;
  productId: string;
  subscribedAt: Date;
  status: 'active' | 'cancelled' | 'expired';
  expiresAt?: Date;
}
