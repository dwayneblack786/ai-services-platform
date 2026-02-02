export interface ProductBilling {
  _id?: string;
  tenantId: string;
  productId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  billingDate: Date;
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: string;
  transactionId?: string;
  invoiceUrl?: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
