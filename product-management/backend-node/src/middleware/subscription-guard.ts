import { Request, Response, NextFunction } from 'express';
import { ProductSubscriptionModel } from '../models/ProductSubscription';
import ProductModel from '../models/Product';

/**
 * Middleware factory that blocks requests unless the tenant has an active
 * (or trial) subscription to the given product slug.
 *
 * Returns 403 with the product ID so the client can redirect to the sign-up flow.
 */
export function requireSubscription(productSlug: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user?.tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Admins bypass subscription check — they need access to verify product UX
      if (user.role === 'ADMIN' || user.role === 'PROJECT_ADMIN') {
        return next();
      }

      const product = await ProductModel.findOne({ slug: productSlug }).lean();
      if (!product) {
        return res.status(403).json({
          error: `Product "${productSlug}" not found.`,
          productSlug,
        });
      }

      const subscription = await ProductSubscriptionModel.findOne({
        tenantId: user.tenantId,
        productId: product._id,
        status: { $in: ['active', 'trial'] },
      }).lean();

      if (!subscription) {
        return res.status(403).json({
          error: `Active subscription required for ${product.name}.`,
          productId: String(product._id),
          productSlug,
          signupUrl: `/products/${product._id}/signup`,
        });
      }

      next();
    } catch (err: any) {
      console.error('[subscription-guard] Error checking subscription:', err.message);
      res.status(500).json({ error: 'Failed to verify subscription.' });
    }
  };
}
