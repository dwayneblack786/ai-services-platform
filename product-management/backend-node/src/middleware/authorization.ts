import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ProductSubscriptionModel } from '../models/ProductSubscription';
import ProductModel from '../models/Product';

/**
 * Middleware to check if user is a tenant admin
 */
export const requireTenantAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userRole = user.role?.toLowerCase();
  
  if (userRole !== 'admin' && userRole !== 'project_admin') {
    return res.status(403).json({ 
      error: 'Access denied. Tenant admin privileges required.',
      message: 'Only tenant administrators can perform this action.'
    });
  }

  next();
};

/**
 * Middleware to check if tenant has active virtual assistant subscriptions
 */
export const requireVirtualAssistantSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Find active product subscriptions by tenantId
    let activeSubscriptions: any[] = [];
    
    if (user.tenantId) {
      activeSubscriptions = await ProductSubscriptionModel.find({
        tenantId: user.tenantId,
        status: 'active'
      }).lean();
    }
    
    // Fallback: try using MongoDB user._id if no tenantId
    if (activeSubscriptions.length === 0 && user._id) {
      const userIdToQuery = mongoose.Types.ObjectId.isValid(user._id)
        ? new mongoose.Types.ObjectId(user._id.toString())
        : user._id;
      activeSubscriptions = await ProductSubscriptionModel.find({
        userId: userIdToQuery,
        status: 'active'
      }).lean();
    }

    if (activeSubscriptions.length === 0) {
      return res.status(403).json({
        error: 'No active subscriptions',
        message: 'Your organization does not have any active product subscriptions.'
      });
    }

    // Get product details for all subscriptions
    const productIds = activeSubscriptions.map((sub: any) => 
      mongoose.Types.ObjectId.isValid(sub.productId) && sub.productId.length === 24
        ? new mongoose.Types.ObjectId(sub.productId)
        : sub.productId
    );

    const products = await ProductModel.find({
      _id: { $in: productIds }
    }).lean();

    // Check if any product is a virtual assistant product
    const hasVirtualAssistant = products.some((product: any) => 
      product.category === 'Virtual Assistant' || 
      product.category === 'AI Assistant' ||
      product.name?.toLowerCase().includes('assistant') ||
      product.name?.toLowerCase().includes('voice') ||
      product.name?.toLowerCase().includes('chat')
    );

    if (!hasVirtualAssistant) {
      return res.status(403).json({
        error: 'No virtual assistant subscription',
        message: 'Your organization does not have an active Virtual Assistant subscription. Please subscribe to a Virtual Assistant product to access this feature.'
      });
    }

    // Attach subscription info to request for use in route handlers
    req.activeSubscriptions = activeSubscriptions;
    req.subscribedProducts = products;

    next();
  } catch (error) {
    console.error('Error checking subscriptions:', error);
    return res.status(500).json({ error: 'Error verifying subscriptions' });
  }
};

/**
 * Middleware to verify user has access to a specific product
 */
export const requireProductAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as any;
  const productId = req.body.productId || req.query.productId || req.params.productId;

  if (!productId) {
    return res.status(400).json({ error: 'Product ID required' });
  }

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Find active product subscription by tenantId and productId
    let subscription = null;
    
    // Convert productId to ObjectId if valid, otherwise use as-is
    const productIdToQuery = mongoose.Types.ObjectId.isValid(productId) && productId.length === 24
      ? new mongoose.Types.ObjectId(productId)
      : productId;
    
    console.log('[Authorization] requireProductAccess called:', {
      userMongoId: user._id?.toString(),
      tenantId: user.tenantId,
      productId,
      productIdType: typeof productIdToQuery
    });
    
    // Primary: Query by tenantId (subscriptions are tenant-level)
    if (user.tenantId) {
      subscription = await ProductSubscriptionModel.findOne({
        tenantId: user.tenantId,
        productId: productIdToQuery,
        status: 'active'
      }).lean();
      
      console.log('[Authorization] Query by tenantId result:', !!subscription);
    }
    
    // Fallback: Query by MongoDB user._id (for user-level subscriptions)
    if (!subscription && user._id) {
      const userIdToQuery = mongoose.Types.ObjectId.isValid(user._id)
        ? new mongoose.Types.ObjectId(user._id.toString())
        : user._id;
        
      subscription = await ProductSubscriptionModel.findOne({
        userId: userIdToQuery,
        productId: productIdToQuery,
        status: 'active'
      }).lean();
      
      console.log('[Authorization] Query by MongoDB userId result:', !!subscription);
    }

    if (!subscription) {
      return res.status(403).json({
        error: 'Product access denied',
        message: 'Your organization does not have an active subscription for this product.'
      });
    }

    // Attach subscription to request
    req.productSubscription = subscription;

    next();
  } catch (error) {
    console.error('Error checking product access:', error);
    return res.status(500).json({ error: 'Error verifying product access' });
  }
};

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      activeSubscriptions?: any[];
      subscribedProducts?: any[];
      productSubscription?: any;
    }
  }
}
