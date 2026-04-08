import { Router, Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import RegistrationSession from '../models/RegistrationSession';
import User from '../models/User';
import Tenant from '../models/Tenant';
import logger from '../utils/logger';
import { trackEvent } from '../middleware/appInsights.middleware';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '../types/shared';
import UserActivity from '../models/UserActivity';

const router = Router();

// Apply admin role requirement to all routes in this router
router.use(requireRole(UserRole.ADMIN, UserRole.PROJECT_ADMIN));

/**
 * @route   GET /api/admin/registrations
 * @desc    Get all registration sessions with pagination and filters
 * @access  Admin only
 */
router.get(
  '/registrations',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['initiated', 'phone-verified', 'account-setup', 'company-setup', 'review', 'submitted', 'provisioning', 'complete']),
    query('search').optional().isString(),
    query('tenantId').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const tenantId = req.query.tenantId as string;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {};
      if (status) {
        query.currentStep = status;
      }
      if (tenantId) {
        query.tempTenantId = tenantId;
      }
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } },
          { 'metadata.companyName': { $regex: search, $options: 'i' } },
        ];
      }

      // Get registrations
      const [registrations, total] = await Promise.all([
        RegistrationSession.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        RegistrationSession.countDocuments(query),
      ]);

      // Get statistics
      const stats = await RegistrationSession.aggregate([
        {
          $group: {
            _id: '$currentStep',
            count: { $sum: 1 },
          },
        },
      ]);

      const statusCounts = stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {} as Record<string, number>);

      trackEvent('AdminViewedRegistrations', {
        page: page.toString(),
        limit: limit.toString(),
        status: status || 'all',
      });

      res.json({
        success: true,
        data: {
          registrations,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
          statistics: statusCounts,
        },
      });
    } catch (error: any) {
      logger.error('Get registrations failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve registrations',
      });
    }
  }
);

/**
 * @route   GET /api/admin/registrations/:sessionId
 * @desc    Get detailed registration session
 * @access  Admin only
 */
router.get(
  '/registrations/:sessionId',
  [
    param('sessionId').isString().withMessage('Valid session ID is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { sessionId } = req.params;

      const session = await RegistrationSession.findOne({ sessionId }).lean();

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Registration session not found',
        });
      }

      // Get associated user if exists
      let user = null;
      if (session.userId) {
        user = await User.findById(session.userId).select('-passwordHash').lean();
      }

      // Get associated tenant if exists
      let tenant = null;
      if (session.tempTenantId) {
        tenant = await Tenant.findOne({ tenantId: session.tempTenantId }).lean();
      }

      trackEvent('AdminViewedRegistrationDetail', {
        sessionId,
        status: session.currentStep,
      });

      res.json({
        success: true,
        data: {
          session,
          user,
          tenant,
        },
      });
    } catch (error: any) {
      logger.error('Get registration detail failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve registration details',
      });
    }
  }
);

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin only
 */
router.get('/stats', [
  query('tenantId').optional().isString(),
], async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build base queries with optional tenant filter
    const userQuery: any = tenantId ? { tenantId } : {};
    const registrationQuery: any = tenantId ? { tempTenantId: tenantId } : {};
    const activityQuery: any = tenantId ? { tenantId } : {};

    // Get counts
    const [
      totalUsers,
      totalTenants,
      totalRegistrations,
      activeRegistrations,
      completedRegistrations,
      failedRegistrations,
      registrationsLast24h,
      registrationsLast7d,
      registrationsLast30d,
      usersLast24h,
      usersLast7d,
      usersLast30d,
      // Activity metrics
      totalLogins,
      loginsLast24h,
      loginsLast7d,
      loginsLast30d,
      uniqueUsersLast24h,
      uniqueUsersLast7d,
      uniqueUsersLast30d,
    ] = await Promise.all([
      User.countDocuments(userQuery),
      Tenant.countDocuments(),
      RegistrationSession.countDocuments(registrationQuery),
      RegistrationSession.countDocuments({
        ...registrationQuery,
        currentStep: { $in: ['initiated', 'phone-verified', 'account-setup', 'company-setup', 'review', 'submitted', 'provisioning'] },
      }),
      RegistrationSession.countDocuments({ ...registrationQuery, currentStep: 'complete' }),
      RegistrationSession.countDocuments({ ...registrationQuery, errorDetails: { $exists: true, $ne: null } }),
      RegistrationSession.countDocuments({ ...registrationQuery, createdAt: { $gte: last24Hours } }),
      RegistrationSession.countDocuments({ ...registrationQuery, createdAt: { $gte: last7Days } }),
      RegistrationSession.countDocuments({ ...registrationQuery, createdAt: { $gte: last30Days } }),
      User.countDocuments({ ...userQuery, createdAt: { $gte: last24Hours } }),
      User.countDocuments({ ...userQuery, createdAt: { $gte: last7Days } }),
      User.countDocuments({ ...userQuery, createdAt: { $gte: last30Days } }),
      // Activity metrics
      UserActivity.countDocuments({ ...activityQuery, eventType: 'login' }),
      UserActivity.countDocuments({ ...activityQuery, eventType: 'login', timestamp: { $gte: last24Hours } }),
      UserActivity.countDocuments({ ...activityQuery, eventType: 'login', timestamp: { $gte: last7Days } }),
      UserActivity.countDocuments({ ...activityQuery, eventType: 'login', timestamp: { $gte: last30Days } }),
      UserActivity.distinct('userId', { ...activityQuery, timestamp: { $gte: last24Hours } }).then(arr => arr.length),
      UserActivity.distinct('userId', { ...activityQuery, timestamp: { $gte: last7Days } }).then(arr => arr.length),
      UserActivity.distinct('userId', { ...activityQuery, timestamp: { $gte: last30Days } }).then(arr => arr.length),
    ]);

    // Get completion rate
    const completionRate = totalRegistrations > 0
      ? ((completedRegistrations / totalRegistrations) * 100).toFixed(2)
      : '0';

    // Get recent activity
    const recentRegistrations = await RegistrationSession.find(registrationQuery)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('sessionId email currentStep createdAt metadata')
      .lean();

    // Get recent user activities
    const recentActivities = await UserActivity.find(activityQuery)
      .sort({ timestamp: -1 })
      .limit(10)
      .select('userId userEmail eventType eventName timestamp metadata')
      .lean();

    // Get recent logins for activity section
    const recentLogins = await UserActivity.find({ ...activityQuery, eventType: 'login' })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('userEmail timestamp ipAddress')
      .lean();

    trackEvent('AdminViewedDashboard');

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalTenants,
          totalRegistrations,
          activeRegistrations,
          completedRegistrations,
          failedRegistrations,
          completionRate: parseFloat(completionRate),
        },
        trends: {
          registrations: {
            last24Hours: registrationsLast24h,
            last7Days: registrationsLast7d,
            last30Days: registrationsLast30d,
          },
          users: {
            last24Hours: usersLast24h,
            last7Days: usersLast7d,
            last30Days: usersLast30d,
          },
        },
        activity: {
          totalLogins,
          uniqueUsersToday: uniqueUsersLast24h,
          loginTrend: {
            last24Hours: loginsLast24h,
            last7Days: loginsLast7d,
            last30Days: loginsLast30d,
          },
          recentLogins: recentLogins.map(login => ({
            userEmail: login.userEmail,
            timestamp: login.timestamp,
            ipAddress: login.ipAddress,
          })),
        },
        recentActivity: recentRegistrations,
      },
    });
  } catch (error: any) {
    logger.error('Get admin stats failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
    });
  }
});

/**
 * @route   DELETE /api/admin/registrations/:sessionId
 * @desc    Delete a registration session
 * @access  Admin only
 */
router.delete(
  '/registrations/:sessionId',
  [
    param('sessionId').isString().withMessage('Valid session ID is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { sessionId } = req.params;

      const result = await RegistrationSession.deleteOne({ sessionId });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Registration session not found',
        });
      }

      trackEvent('AdminDeletedRegistration', { sessionId });
      logger.info('Registration session deleted by admin', { sessionId });

      res.json({
        success: true,
        message: 'Registration session deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete registration failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to delete registration',
      });
    }
  }
);

/**
 * @route   GET /api/admin/activity/users
 * @desc    Get detailed user activity logs with filters
 * @access  Admin only
 */
router.get(
  '/activity/users',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('eventType').optional().isString(),
    query('userId').optional().isString(),
    query('tenantId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {};
      if (req.query.eventType) query.eventType = req.query.eventType;
      if (req.query.userId) query.userId = req.query.userId;
      if (req.query.tenantId) query.tenantId = req.query.tenantId;
      
      if (req.query.startDate || req.query.endDate) {
        query.timestamp = {};
        if (req.query.startDate) {
          query.timestamp.$gte = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
          query.timestamp.$lte = new Date(req.query.endDate as string);
        }
      }

      const [activities, total] = await Promise.all([
        UserActivity.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        UserActivity.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          activities,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      logger.error('Get user activity failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user activity',
      });
    }
  }
);

/**
 * @route   GET /api/admin/activity/logins
 * @desc    Get login statistics with breakdown by tenant
 * @access  Admin only
 */
router.get('/activity/logins', [
  query('tenantId').optional().isString(),
], async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build base match filter
    const baseMatch: any = { eventType: 'login' };
    if (tenantId) {
      baseMatch.tenantId = tenantId;
    }

    // Get login counts by tenant
    const loginsByTenant = await UserActivity.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$tenantId',
          totalLogins: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          tenantId: '$_id',
          totalLogins: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { totalLogins: -1 } },
    ]);

    // Get login trend (last 7 days, grouped by day)
    const loginTrend = await UserActivity.aggregate([
      {
        $match: {
          ...baseMatch,
          timestamp: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get most active users
    const topUsers = await UserActivity.aggregate([
      {
        $match: {
          ...baseMatch,
          timestamp: { $gte: last30Days },
        },
      },
      {
        $group: {
          _id: '$userId',
          userEmail: { $first: '$userEmail' },
          loginCount: { $sum: 1 },
          lastLogin: { $max: '$timestamp' },
        },
      },
      { $sort: { loginCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          userEmail: 1,
          loginCount: 1,
          lastLogin: 1,
        },
      },
    ]);

    // Format login trend to return date and count
    const formattedTrend = loginTrend.map(item => ({
      date: item._id,
      count: item.count,
    }));

    // Format logins by tenant
    const formattedByTenant = loginsByTenant.map(item => ({
      tenantId: item._id,
      loginCount: item.totalLogins,
      uniqueUsers: item.uniqueUsers,
    }));

    res.json({
      success: true,
      data: {
        byTenant: formattedByTenant,
        trend: formattedTrend,
        topUsers,
        summary: {
          last24Hours: await UserActivity.countDocuments({
            ...baseMatch,
            timestamp: { $gte: last24Hours },
          }),
          last7Days: await UserActivity.countDocuments({
            ...baseMatch,
            timestamp: { $gte: last7Days },
          }),
          last30Days: await UserActivity.countDocuments({
            ...baseMatch,
            timestamp: { $gte: last30Days },
          }),
        },
      },
    });
  } catch (error: any) {
    logger.error('Get login stats failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve login statistics',
    });
  }
});

/**
 * @route   GET /api/admin/users/details
 * @desc    Get detailed user list with last login, activity stats
 * @access  Admin only
 */
router.get(
  '/users/details',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('tenantId').optional().isString(),
    query('role').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const query: any = {};
      if (req.query.tenantId) query.tenantId = req.query.tenantId;
      if (req.query.role) query.role = req.query.role;

      const [users, total] = await Promise.all([
        User.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('-passwordHash -passwordResetToken')
          .lean(),
        User.countDocuments(query),
      ]);

      // Enrich with activity data
      const usersWithActivity = await Promise.all(
        users.map(async (user) => {
          const [loginCount, lastActivity] = await Promise.all([
            UserActivity.countDocuments({ userId: user._id.toString(), eventType: 'login' }),
            UserActivity.findOne({ userId: user._id.toString() })
              .sort({ timestamp: -1 })
              .select('timestamp eventType eventName')
              .lean(),
          ]);

          return {
            ...user,
            loginCount,
            lastActivity: lastActivity || null,
          };
        })
      );

      res.json({
        success: true,
        data: {
          users: usersWithActivity,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      logger.error('Get user details failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user details',
      });
    }
  }
);

/**
 * @route   GET /api/admin/tenants
 * @desc    Get list of all tenants for dropdown
 * @access  Admin only
 */
router.get('/tenants', async (req: Request, res: Response) => {
  try {
    const tenants = await Tenant.find()
      .select('tenantId companyName createdAt')
      .sort({ companyName: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        tenants: tenants.map(tenant => ({
          tenantId: tenant.tenantId,
          companyName: tenant.companyName,
          createdAt: tenant.createdAt,
        })),
      },
    });
  } catch (error: any) {
    logger.error('Get tenants list failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tenants',
    });
  }
});

export default router;
