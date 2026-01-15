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
