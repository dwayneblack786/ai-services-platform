import express from 'express';
import { authenticateSession } from '../middleware/auth';
import mongoose from 'mongoose';
import User from '../models/User';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateSession);

// Get all tenants (ADMIN role only)
router.get('/', async (req, res) => {
  try {
    const user = req.user as any;
    
    // Check if user has admin role
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Admin access required' 
      });
    }
    
    const db = mongoose.connection.db!;
    
    // Get unique tenants from users collection
    const tenants = await db.collection('users')
      .aggregate([
        {
          $group: {
            _id: '$tenantId',
            tenantId: { $first: '$tenantId' },
            userCount: { $sum: 1 },
            users: {
              $push: {
                _id: '$_id',
                email: '$email',
                name: '$name',
                role: '$role',
                emailVerified: '$emailVerified'
              }
            }
          }
        },
        { $sort: { tenantId: 1 } }
      ])
      .toArray();
    
    res.json({ success: true, tenants });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users by tenant
router.get('/:tenantId/users', async (req, res) => {
  try {
    const user = req.user as any;
    const { tenantId } = req.params;
    
    // Check access: either admin or same tenant
    if (user.role !== 'ADMIN' && user.tenantId !== tenantId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only access users from your own tenant' 
      });
    }
    
    const tenantUsers = await User.find({ tenantId })
      .select('-passwordHash -__v')
      .lean();
    
    res.json({ success: true, users: tenantUsers });
  } catch (error) {
    console.error('Get tenant users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users with tenant info (Admin or own tenant)
router.get('/users/all', async (req, res) => {
  try {
    const user = req.user as any;
    
    let query: any = {};
    
    // If not admin, only return users from same tenant
    if (user.role !== 'ADMIN') {
      query.tenantId = user.tenantId;
    }
    
    const allUsers = await User.find(query)
      .select('-passwordHash -__v')
      .lean();
    
    res.json({ success: true, users: allUsers });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign user to tenant (ADMIN only)
router.put('/users/:userId/tenant', async (req, res) => {
  try {
    const user = req.user as any;
    const { userId } = req.params;
    const { tenantId } = req.body;
    
    // Check if user has admin role
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Admin access required' 
      });
    }
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user's tenant
    targetUser.tenantId = tenantId;
    await targetUser.save();
    
    const userResponse = targetUser.toObject();
    delete (userResponse as any).passwordHash;
    
    res.json({ 
      success: true, 
      message: 'User tenant updated successfully',
      user: userResponse 
    });
  } catch (error) {
    console.error('Update user tenant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new tenant (ADMIN only)
router.post('/', async (req, res) => {
  try {
    const user = req.user as any;
    const { name } = req.body;
    
    // Check if user has admin role
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Admin access required' 
      });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'Tenant name is required' });
    }
    
    // Generate new tenant ID
    const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({ 
      success: true, 
      tenant: { tenantId, name },
      message: 'Tenant created successfully. You can now assign users to this tenant.'
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
