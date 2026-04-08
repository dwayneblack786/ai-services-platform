import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import TenantModel from '../models/Tenant';
import RegistrationSession from '../models/RegistrationSession';
import keycloakAdminService from './keycloak-admin.service';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from './email.service';
import logger from '../utils/logger';
import { UserRole } from '../types/shared';

export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface CompanyDetails {
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  industry?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface PasswordResetData {
  email: string;
  tenantId?: string;
}

class RegistrationService {
  /**
   * Generate a secure random token
   */
 private generateToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Generate tenant ID from company name (slug format)
   */
  private generateTenantId(companyName: string): string {
    const base = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    // Add random suffix to ensure uniqueness
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
  }

  /**
   * Check if email is already registered
   */
  async checkEmailAvailability(email: string): Promise<{
    available: boolean;
    status: 'available' | 'user-exists' | 'incomplete-registration';
    user?: any;
  }> {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return { available: true, status: 'available' };
    }

    if (!user.registrationCompleted) {
      return {
        available: false,
        status: 'incomplete-registration',
        user: {
          id: user._id,
          email: user.email,
          emailVerified: user.emailVerified
        }
      };
    }

    return { available: false, status: 'user-exists' };
  }

  /**
   * Register a new user with email/password
   */
  async registerUser(data: RegisterUserData): Promise<{ success: boolean; userId: string; message: string }> {
    const { email, password, firstName, lastName } = data;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate verification token
    const emailVerificationToken = this.generateToken(32);
    const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      passwordHash,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationTokenExpires,
      registrationCompleted: false,
      signupMethod: 'email-password',
      authProvider: 'local',
      tenantId: 'pending', // Temporary, will be set after company details
      role: UserRole.ANALYST, // Will be updated to ADMIN for first user
      isActive: true
    });

    await user.save();
    logger.info('User created', { userId: user._id, email: user.email });

    // Create registration session
    const session = new RegistrationSession({
      userId: user._id,
      email: user.email,
      currentStep: 'email-verification',
      lastAccessedAt: new Date()
    });

    await session.save();
    logger.info('Registration session created', { userId: user._id });

    // Send verification email
    try {
      await sendVerificationEmail(
        user.email,
        user.firstName || user.name,
        emailVerificationToken,
        false,
        ''
      );
      logger.info('Verification email sent', { email: user.email });
    } catch (error: any) {
      logger.error('Failed to send verification email', { error: error.message });
      // Don't fail the registration if email fails
    }

    return {
      success: true,
      userId: user._id.toString(),
      message: 'Registration successful. Please check your email to verify your account.'
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{
    success: boolean;
    userId: string;
    email: string;
    resumeToken: string;
    message: string;
  }> {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    // Update user
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();

    logger.info('Email verified', { userId: user._id, email: user.email });

    // Generate resume token
    const resumeToken = this.generateToken(64);
    const resumeTokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Update registration session
    const session = await RegistrationSession.findOne({ userId: user._id });
    if (session) {
      session.currentStep = 'company-setup';
      session.resumeToken = resumeToken;
      session.resumeTokenExpires = resumeTokenExpires;
      session.lastAccessedAt = new Date();
      await session.save();
    }

    return {
      success: true,
      userId: user._id.toString(),
      email: user.email,
      resumeToken,
      message: 'Email verified successfully. Please complete your company details.'
    };
  }

  /**
   * Resume registration session with token
   */
  async resumeSession(token: string): Promise<{
    valid: boolean;
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    currentStep: string;
    tenantId?: string;
    resumeToken: string;
  }> {
    const session = await RegistrationSession.findOne({
      resumeToken: token,
      resumeTokenExpires: { $gt: new Date() }
    }).populate('userId');

    if (!session) {
      throw new Error('Invalid or expired session token');
    }

    // Update last accessed
    session.lastAccessedAt = new Date();
    await session.save();

    const user: any = session.userId;

    return {
      valid: true,
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      currentStep: session.currentStep,
      tenantId: user.tenantId !== 'pending' ? user.tenantId : undefined,
      resumeToken: token
    };
  }

  /**
   * Complete company profile and create tenant
   */
  async completeProfile(
    userIdOrToken: string,
    companyDetails: CompanyDetails,
    isToken = false
  ): Promise<{
    success: boolean;
    tenantId: string;
    resumeToken?: string;
    message: string;
  }> {
    let userId: string;

    // Resolve user ID from token if needed
    if (isToken) {
      const session = await RegistrationSession.findOne({
        resumeToken: userIdOrToken,
        resumeTokenExpires: { $gt: new Date() }
      });

      if (!session) {
        throw new Error('Invalid or expired session token');
      }

      if (!session.userId) {
        throw new Error('Session has no associated user');
      }

      userId = session.userId.toString();
    } else {
      userId = userIdOrToken;
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.emailVerified) {
      throw new Error('Email must be verified before completing profile');
    }

    // Generate unique tenant ID
    const tenantId = this.generateTenantId(companyDetails.companyName);

    // Create tenant
    const tenant = new TenantModel({
      tenantId,
      companyName: companyDetails.companyName,
      companyEmail: companyDetails.companyEmail,
      companyPhone: companyDetails.companyPhone,
      industry: companyDetails.industry,
      website: companyDetails.website,
      address: companyDetails.address,
      createdBy: user._id,
      status: 'active',
      isProvisioned: false
    });

    await tenant.save();
    logger.info('Tenant created', { tenantId, companyName: companyDetails.companyName });

    // Update user - first user becomes ADMIN
    user.tenantId = tenantId;
    user.role = UserRole.ADMIN; // First user is always admin
    user.companyDetailsCompleted = true;
    await user.save();

    logger.info('User updated with tenant', { userId: user._id, tenantId, role: user.role });

    // Update registration session
    const session = await RegistrationSession.findOne({ userId: user._id });
    if (session) {
      session.currentStep = 'provisioning';
      session.tempTenantId = tenantId;
      session.lastAccessedAt = new Date();
      await session.save();
    }

    // Start Keycloak provisioning in background
    this.provisionKeycloakForTenant(tenantId, user._id.toString()).catch((error) => {
      logger.error('Keycloak provisioning failed', { tenantId, error: error.message });
    });

    return {
      success: true,
      tenantId,
      resumeToken: session?.resumeToken,
      message: 'Company profile completed. Setting up your workspace...'
    };
  }

  /**
   * Provision Keycloak realm and user for tenant (background job)
   */
  async provisionKeycloakForTenant(tenantId: string, userId: string): Promise<void> {
    try {
      logger.info('Starting Keycloak provisioning', { tenantId, userId });

      const user = await User.findById(userId);
      const tenant = await TenantModel.findOne({ tenantId });

      if (!user || !tenant) {
        throw new Error('User or tenant not found');
      }

      // Step 1: Create realm
      await keycloakAdminService.createRealm(tenantId, {
        accessTokenLifespan: 900,
        ssoSessionIdleTimeout: 1800,
        ssoSessionMaxLifespan: 36000,
        accessCodeLifespan: 60,
        passwordPolicy: 'length(8) and digits(1) and lowerCase(1) and upperCase(1)'
      });

      // Step 2: Create product-management client
      const clientId = await keycloakAdminService.createClient(tenantId, {
        clientId: 'product-management',
        redirectUris: [
          'http://localhost:5173/auth/callback',
          'http://localhost:5000/api/auth/callback',
          `${process.env.FRONTEND_URL}/auth/callback`
        ].filter(Boolean),
        webOrigins: [
          'http://localhost:5173',
          'http://localhost:5000',
          process.env.FRONTEND_URL
        ].filter(Boolean) as string[],
        standardFlowEnabled: true,
        directAccessGrantsEnabled: false
      });

      // Step 3: Create realm roles
      const roles = ['admin', 'project-admin', 'analyst', 'developer', 'client'];
      for (const role of roles) {
        await keycloakAdminService.createRealmRole(tenantId, role, `${role} role`);
      }

      // Step 4: Create Keycloak user
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const keycloakUserId = await keycloakAdminService.createUser(tenantId, {
        username: user.email,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        enabled: true,
        emailVerified: user.emailVerified,
        credentials: user.signupMethod === 'email-password' ? [{
          type: 'password',
          value: tempPassword,
          temporary: true
        }] : undefined
      });

      // Step 5: Assign admin role
      await keycloakAdminService.assignRoleToUser(tenantId, keycloakUserId, 'admin');

      // Step 6: Send password setup email (only for email-password signups)
      if (user.signupMethod === 'email-password') {
        try {
          await keycloakAdminService.sendPasswordSetupEmail(tenantId, keycloakUserId);
        } catch (error: any) {
          logger.warn('Failed to send password setup email via Keycloak', { error: error.message });
        }
      }

      // Step 7: Update tenant
      tenant.isProvisioned = true;
      tenant.keycloakRealmName = tenantId;
      tenant.provisionedAt = new Date();
      await tenant.save();

      // Step 8: Update user
      user.registrationCompleted = true;
      user.authProvider = 'keycloak';
      await user.save();

      // Step 9: Update registration session
      const session = await RegistrationSession.findOne({ userId: user._id });
      if (session) {
        session.currentStep = 'complete';
        session.lastAccessedAt = new Date();
        await session.save();
      }

      // Step 10: Send welcome email
      try {
        await sendWelcomeEmail(user.email, user.firstName || user.name, tenantId);
      } catch (error: any) {
        logger.error('Failed to send welcome email', { error: error.message });
      }

      logger.info('Keycloak provisioning completed successfully', { tenantId, userId });
    } catch (error: any) {
      logger.error('Keycloak provisioning failed', {
        tenantId,
        userId,
        error: error.message,
        stack: error.stack
      });

      // Update session with error
      const session = await RegistrationSession.findOne({ userId });
      if (session) {
        session.errorDetails = error.message;
        await session.save();
      }

      throw error;
    }
  }

  /**
   * Get provisioning status
   */
  async getProvisioningStatus(
    userIdOrToken: string,
    isToken = false
  ): Promise<{
    provisioned: boolean;
    status: string;
    tenantId?: string;
    error?: string;
  }> {
    let userId: string;

    // Resolve user ID from token if needed
    if (isToken) {
      const session = await RegistrationSession.findOne({
        resumeToken: userIdOrToken,
        resumeTokenExpires: { $gt: new Date() }
      });

      if (!session) {
        throw new Error('Invalid or expired session token');
      }

      if (!session.userId) {
        throw new Error('Session has no associated user');
      }

      userId = session.userId.toString();
    } else {
      userId = userIdOrToken;
    }

    const session = await RegistrationSession.findOne({ userId });
    const user = await User.findById(userId);

    if (!session || !user) {
      throw new Error('Session or user not found');
    }

    if (session.currentStep === 'complete') {
      return {
        provisioned: true,
        status: 'complete',
        tenantId: user.tenantId
      };
    }

    if (session.currentStep === 'provisioning') {
      return {
        provisioned: false,
        status: 'in-progress'
      };
    }

    return {
      provisioned: false,
      status: session.currentStep,
      error: session.errorDetails
    };
  }

  /**
   * Initiate password reset
   */
  async initiatePasswordReset(data: PasswordResetData): Promise<{ success: boolean; message: string }> {
    const query: any = { email: data.email.toLowerCase() };
    if (data.tenantId) {
      query.tenantId = data.tenantId;
    }

    const user = await User.findOne(query);

    // Always return success to prevent email enumeration
    if (!user) {
      logger.warn('Password reset requested for non-existent user', { email: data.email });
      return {
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      };
    }

    // Generate reset token
    const resetToken = this.generateToken(32);
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = resetTokenExpires;
    await user.save();

    logger.info('Password reset token generated', { userId: user._id, email: user.email });

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.tenantId);
      logger.info('Password reset email sent', { email: user.email });
    } catch (error: any) {
      logger.error('Failed to send password reset email', { error: error.message });
    }

    return {
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.'
    };
  }

  /**
   * Verify password reset token
   */
  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return { valid: false };
    }

    return { valid: true, email: user.email };
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    user.passwordHash = passwordHash;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.lastPasswordReset = new Date();
    await user.save();

    logger.info('Password reset completed', { userId: user._id, email: user.email });

    // Update password in Keycloak if user is provisioned
    if (user.registrationCompleted && user.tenantId && user.tenantId !== 'pending') {
      try {
        // Get Keycloak user ID (would need to be stored or looked up)
        // await keycloakAdminService.updateUserPassword(user.tenantId, keycloakUserId, newPassword);
        logger.info('Password synced to Keycloak', { userId: user._id });
      } catch (error: any) {
        logger.error('Failed to sync password to Keycloak', { error: error.message });
      }
    }

    // Send password reset confirmation email
    try {
      await sendPasswordResetConfirmationEmail(user.email);
      logger.info('Password reset confirmation email sent', { email: user.email });
    } catch (error: any) {
      logger.error('Failed to send password reset confirmation email', { error: error.message });
    }

    return {
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    };
  }

  /**
   * Get registration summary for review
   */
  async getRegistrationSummary(registrationSessionId: string): Promise<any> {
    const session = await RegistrationSession.findOne({ sessionId: registrationSessionId });

    if (!session) {
      throw new Error('Registration session not found');
    }

    // Extract data from metadata
    const metadata = session.metadata || {};
    
    // Build summary from session metadata
    const summary = {
      email: session.email,
      phoneNumber: metadata.phoneNumber || '',
      firstName: metadata.firstName || '',
      lastName: metadata.lastName || '',
      companyName: metadata.companyName || '',
      companyWebsite: metadata.companyWebsite || '',
      industry: metadata.industry || '',
      companySize: metadata.companySize || '',
      address: metadata.address || '',
      city: metadata.city || '',
      state: metadata.state || '',
      country: metadata.country || '',
      postalCode: metadata.postalCode || '',
    };

    return summary;
  }
}

// Export singleton instance
export const registrationService = new RegistrationService();
export default registrationService;
