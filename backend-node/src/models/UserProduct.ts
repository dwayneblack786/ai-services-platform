export interface UserProduct {
  _id?: string;
  userId: string;
  productId: string;
  subscribedAt: Date;
  status: 'active' | 'cancelled' | 'expired';
  expiresAt?: Date;
}
