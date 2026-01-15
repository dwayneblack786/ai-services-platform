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
  createdBy: string; // User ID of the admin who created the tenant
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'suspended' | 'inactive';
}
