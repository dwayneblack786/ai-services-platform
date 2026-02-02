import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Get current user profile with RBAC data
 * GET /api/users/me
 * 
 * Returns complete user profile from MongoDB:
 * - user_id, tenant_id, email, name
 * - roles (from MongoDB, not Keycloak)
 * - subscriptions (product subscriptions)
 * - permissions (computed from roles)
 * - feature_flags (tenant-specific)
 * - usage_limits (quotas)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Check authentication
    const userId = req.session.userId;
    const tenantId = req.session.tenantId;

    if (!userId) {
      return res.status(401).json({
        error: 'not_authenticated',
        message: 'User not authenticated'
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('👤 USER PROFILE REQUEST');
    console.log('='.repeat(80));
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`🆔 User ID: ${userId}`);
    console.log(`🏢 Tenant ID: ${tenantId}`);
    console.log('='.repeat(80));

    // Load user from MongoDB
    const User = (await import('../models/User')).default;
    const user = await User.findById(userId);

    if (!user) {
      console.log('❌ User not found in database');
      console.log('='.repeat(80) + '\n');
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found'
      });
    }

    // Compute permissions from role (MongoDB logic)
    const permissions = computePermissionsFromRole(user.role);

    // Get subscriptions (stub - implement based on your schema)
    const subscriptions = await getUserSubscriptions(userId);

    // Get feature flags (tenant-level)
    // Since tenantId = realmName, feature flags are determined by Keycloak realm configuration
    const featureFlags = {
      allowedAuthMethods: ['password', 'google', 'microsoft'],
      keycloakEnabled: true
    };

    // Get usage limits (stub - implement based on your schema)
    const usageLimits = await getUserUsageLimits(userId, user.tenantId);

    const profile = {
      user_id: user._id.toString(),
      tenant_id: user.tenantId,
      email: user.email,
      name: user.name,
      first_name: user.firstName,
      last_name: user.lastName,
      picture: user.picture,
      email_verified: user.emailVerified,
      
      // RBAC data (from MongoDB)
      role: user.role,
      roles: [user.role], // Array format for backward compat
      permissions: permissions,
      
      // Product subscriptions
      subscriptions: subscriptions,
      
      // Feature flags (tenant-level)
      feature_flags: featureFlags,
      
      // Usage limits
      usage_limits: usageLimits,
      
      // Status
      is_active: user.isActive,
      auth_provider: user.authProvider || 'keycloak',
      
      // Timestamps
      created_at: user.createdAt,
      updated_at: user.updatedAt
    };

    console.log('✅ User profile resolved');
    console.log(`   Email: ${profile.email}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Permissions: ${profile.permissions.length} items`);
    console.log(`   Subscriptions: ${profile.subscriptions.length} items`);
    console.log('='.repeat(80) + '\n');

    res.json(profile);
  } catch (error: any) {
    console.error('User profile error:', error);
    console.log('='.repeat(80) + '\n');
    res.status(500).json({
      error: 'profile_load_failed',
      message: 'Failed to load user profile'
    });
  }
});

/**
 * Compute permissions from role
 * 
 * MongoDB is the source of truth for roles and permissions
 */
function computePermissionsFromRole(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    ADMIN: [
      'users:read',
      'users:write',
      'users:delete',
      'tenants:read',
      'tenants:write',
      'projects:read',
      'projects:write',
      'projects:delete',
      'analytics:read',
      'settings:write'
    ],
    PROJECT_ADMIN: [
      'projects:read',
      'projects:write',
      'projects:delete',
      'users:read',
      'analytics:read'
    ],
    ANALYST: [
      'projects:read',
      'analytics:read'
    ],
    DEVELOPER: [
      'projects:read',
      'projects:write',
      'analytics:read'
    ],
    CLIENT: [
      'projects:read'
    ]
  };

  return rolePermissions[role] || rolePermissions['ANALYST'];
}

/**
 * Get user subscriptions from MongoDB
 * 
 * Stub implementation - replace with actual schema query
 */
async function getUserSubscriptions(userId: string): Promise<any[]> {
  // TODO: Implement based on your subscription schema
  // Example:
  // const Subscription = (await import('../models/Subscription')).default;
  // return await Subscription.find({ userId, status: 'active' });
  
  return [
    {
      product_id: 'product-management',
      product_name: 'Product Management Platform',
      status: 'active',
      tier: 'professional'
    }
  ];
}

/**
 * Get usage limits for user/tenant
 * 
 * Stub implementation - replace with actual schema query
 */
async function getUserUsageLimits(userId: string, tenantId: string): Promise<any> {
  // TODO: Implement based on your quota/limits schema
  // Example:
  // const UsageLimit = (await import('../models/UsageLimit')).default;
  // return await UsageLimit.findOne({ tenantId });
  
  return {
    projects_max: 100,
    projects_current: 5,
    users_max: 50,
    users_current: 3,
    storage_gb_max: 100,
    storage_gb_current: 2.5,
    api_calls_per_month: 100000,
    api_calls_current_month: 1250
  };
}

export default router;
