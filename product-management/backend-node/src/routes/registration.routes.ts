import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import registrationService from '../services/registration.service';
import logger from '../utils/logger';

const router = Router();

/**
 * @route   POST /api/auth/signup/check-email
 * @desc    Check if email is available for registration
 * @access  Public
 */
router.post(
  '/signup/check-email',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
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

      const { email } = req.body;
      const result = await registrationService.checkEmailAvailability(email);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Check email availability failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to check email availability'
      });
    }
  }
);

/**
 * @route   POST /api/auth/signup/register
 * @desc    Register a new user with email/password
 * @access  Public
 */
router.post(
  '/signup/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
    body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required')
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

      const { email, password, firstName, lastName } = req.body;

      const result = await registrationService.registerUser({
        email,
        password,
        firstName,
        lastName
      });

      res.status(201).json({
        success: true,
        data: {
          userId: result.userId,
          message: result.message
        }
      });
    } catch (error: any) {
      logger.error('User registration failed', { error: error.message });

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }
  }
);

/**
 * @route   GET /api/auth/signup/verify-email/:token
 * @desc    Verify email with token
 * @access  Public
 */
router.get(
  '/signup/verify-email/:token',
  [
    param('token').isString().isLength({ min: 32 }).withMessage('Invalid token')
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

      const { token } = req.params;
      const result = await registrationService.verifyEmail(token);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Email verification failed', { error: error.message });

      if (error.message.includes('Invalid or expired')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Email verification failed'
      });
    }
  }
);

/**
 * @route   GET /api/auth/signup/resume/:token
 * @desc    Resume registration session with token
 * @access  Public
 */
router.get(
  '/signup/resume/:token',
  [
    param('token').isString().isLength({ min: 32 }).withMessage('Invalid token')
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

      const { token } = req.params;
      const result = await registrationService.resumeSession(token);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Resume session failed', { error: error.message });

      if (error.message.includes('Invalid or expired')) {
        return res.status(400).json({
          success: false,
          error: 'Your session has expired. Please start the registration process again.'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to resume session'
      });
    }
  }
);

/**
 * @route   POST /api/auth/signup/complete-profile
 * @desc    Complete company profile and create tenant
 * @access  Public (requires userId or resumeToken)
 */
router.post(
  '/signup/complete-profile',
  [
    body('companyName').trim().isLength({ min: 2 }).withMessage('Company name is required'),
    body('companyEmail').isEmail().normalizeEmail().withMessage('Valid company email is required'),
    body('companyPhone').optional().trim(),
    body('industry').optional().trim(),
    body('website').optional().isURL().withMessage('Valid website URL required'),
    body('address').optional().isObject(),
    body('userId').optional().isString(),
    body('resumeToken').optional().isString()
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

      const {
        userId,
        resumeToken,
        companyName,
        companyEmail,
        companyPhone,
        industry,
        website,
        address
      } = req.body;

      if (!userId && !resumeToken) {
        return res.status(400).json({
          success: false,
          error: 'Either userId or resumeToken is required'
        });
      }

      const result = await registrationService.completeProfile(
        resumeToken || userId,
        {
          companyName,
          companyEmail,
          companyPhone,
          industry,
          website,
          address
        },
        !!resumeToken
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Complete profile failed', { error: error.message });

      if (error.message.includes('not found') || error.message.includes('expired')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      if (error.message.includes('Email must be verified')) {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to complete profile'
      });
    }
  }
);

/**
 * @route   GET /api/auth/signup/provision-status/:userId
 * @desc    Get Keycloak provisioning status (supports query param ?token=resumeToken)
 * @access  Public
 */
router.get(
  '/signup/provision-status/:userId',
  [
    param('userId').isString().withMessage('User ID required')
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

      const { userId } = req.params;
      const { token } = req.query;

      const result = await registrationService.getProvisioningStatus(
        token ? String(token) : userId,
        !!token
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Get provisioning status failed', { error: error.message });

      if (error.message.includes('not found') || error.message.includes('expired')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get provisioning status'
      });
    }
  }
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Initiate password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('tenantId').optional().trim()
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

      const { email, tenantId } = req.body;

      const result = await registrationService.initiatePasswordReset({
        email,
        tenantId
      });

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      logger.error('Password reset initiation failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to initiate password reset'
      });
    }
  }
);

/**
 * @route   GET /api/auth/reset-password/verify/:token
 * @desc    Verify password reset token
 * @access  Public
 */
router.get(
  '/reset-password/verify/:token',
  [
    param('token').isString().isLength({ min: 32 }).withMessage('Invalid token')
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

      const { token } = req.params;
      const result = await registrationService.verifyResetToken(token);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token'
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Reset token verification failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to verify reset token'
      });
    }
  }
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  [
    body('token').isString().isLength({ min: 32 }).withMessage('Invalid token'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
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

      const { token, newPassword } = req.body;

      const result = await registrationService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      logger.error('Password reset failed', { error: error.message });

      if (error.message.includes('Invalid or expired')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to reset password'
      });
    }
  }
);

/**
 * @route   GET /api/registration/summary/:registrationSessionId
 * @desc    Get registration summary for review
 * @access  Public
 */
router.get(
  '/summary/:registrationSessionId',
  [
    param('registrationSessionId').isString().withMessage('Valid session ID is required'),
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

      const { registrationSessionId } = req.params;

      const summary = await registrationService.getRegistrationSummary(registrationSessionId);

      res.json({
        success: true,
        summary
      });
    } catch (error: any) {
      logger.error('Get registration summary failed', { error: error.message });

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get registration summary'
      });
    }
  }
);

export default router;
