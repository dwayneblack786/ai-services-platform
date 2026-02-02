import mongoose, { Schema, Document } from 'mongoose';

export interface IProductConfiguration extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  productId: string;
  userId: string;
  configuration: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive';
}

const ProductConfigurationSchema = new Schema<IProductConfiguration>({
  tenantId: { type: String, required: true, index: true },
  productId: { type: Schema.Types.Mixed, required: true, index: true }, // Accept both String and ObjectId
  userId: { type: String, required: true },
  configuration: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true }
}, {
  collection: 'product_configurations',
  timestamps: true
});

// Add compound index for efficient queries
ProductConfigurationSchema.index({ tenantId: 1, productId: 1, status: 1 });

export const ProductConfigurationModel = mongoose.model<IProductConfiguration>('ProductConfiguration', ProductConfigurationSchema);

// Keep the old interface for backward compatibility
export interface ProductConfiguration {
  _id?: string;
  tenantId: string;
  productId: string;
  userId: string;
  configuration: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive';
}
