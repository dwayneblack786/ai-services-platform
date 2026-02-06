import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  tenantId: string;
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  industry?: string;
  website?: string;
  createdBy: string;
  createdAt: string;

  status: 'active' | 'suspended' | 'inactive';
  // Keycloak provisioning tracking
  keycloakRealmName?: string;
  isProvisioned: boolean;
  provisionedAt?: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    companyName: { type: String, required: true },
    companyEmail: { type: String, required: true },
    companyPhone: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String }
    },
    industry: { type: String },
    website: { type: String },
    createdBy: { type: String, required: true },
    status: { type: String, enum: ['active', 'suspended', 'inactive'], default: 'active' },
    // Keycloak provisioning tracking
    keycloakRealmName: { type: String, unique: true, sparse: true },
    isProvisioned: { type: Boolean, default: false },
    provisionedAt: { type: Date }
  },
  { timestamps: true }
);

const TenantModel = mongoose.model<ITenant>('Tenant', TenantSchema);
export default TenantModel;

// Export interface for backwards compatibility
export interface Tenant {
  _id?: string;
  tenantId: string;
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  industry?: string;
  website?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'suspended' | 'inactive';
}

