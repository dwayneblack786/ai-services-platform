import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User, UserRole } from '../../../shared/types';
import { hasOAuthCredentials } from '../config/passport';
import { getDB } from '../config/database';
import { Tenant } from '../models/Tenant';
import { UserDocument } from '../models/User';
import { sendVerificationEmail, sendCompanySetupCompleteEmail } from '../services/email.service';

const router = express.Router();

// Development tenant ID
const DEV_TENANT_ID = 'dev-tenant-001';

// Ensure development tenant exists in database
export const ensureDevTenant = async () => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const db = getDB();
      const existingTenant = await db.collection<Tenant>('tenants').findOne({ tenantId: DEV_TENANT_ID });
      
      if (!existingTenant) {
        const now = new Date();
        const devTenant: Omit<Tenant, '_id'> = {
          tenantId: DEV_TENANT_ID,
          companyName: 'Development Company',
          companyEmail: 'dev@example.com',
          companyPhone: '555-0100',
          address: {
            street: '123 Dev Street',
            city: 'Dev City',
            state: 'DC',
            zipCode: '10000',
            country: 'USA'
          },
          industry: 'Technology',
          website: 'https://dev.example.com',
          createdBy: 'dev-user-123',
          createdAt: now,
          updatedAt: now,
          status: 'active'
        };
        
        await db.collection<Tenant>('tenants').insertOne(devTenant as any);
        console.log(`✓ Development tenant created: ${DEV_TENANT_ID}`);
      } else {
        console.log(`✓ Development tenant exists: ${DEV_TENANT_ID}`);
      }
    } catch (error) {
      console.error('Failed to create development tenant:', error);
    }
  }
};

export { DEV_TENANT_ID };

// Email/Password Signup - New flow with email verification
router.post('/signup', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      name,
      tenantId,
      isNewCustomer,
      companyEmail,  // Optional: for pre-validation of company
      role  // Optional: for admin-created users
    } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Validate role if provided
    if (role && !Object.values(UserRole).includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const db = getDB();
    
    // Check if user already exists
    const existingUser = await db.collection<UserDocument>('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'An account with this email already exists',
        details: 'Please use a different email address or try logging in if this is your account.'
      });
    }

    // If new customer, check if company with this email already exists
    if (isNewCustomer && companyEmail) {
      const existingCompany = await db.collection<Tenant>('tenants').findOne({ 
        companyEmail: companyEmail,
        status: 'active'
      });
      if (existingCompany) {
        return res.status(400).json({ 
          error: 'A company with this email already exists',
          details: `Company "${existingCompany.companyName}" is already registered. If you're joining this company, uncheck the new company option and enter the tenant ID: ${existingCompany.tenantId}`,
          existingTenantId: existingCompany.tenantId,
          existingCompanyName: existingCompany.companyName
        });
      }
    }

    // If joining existing tenant, validate it
    let assignedTenantId = tenantId;
    if (!isNewCustomer && tenantId) {
      const tenant = await db.collection<Tenant>('tenants').findOne({ tenantId, status: 'active' });
      if (!tenant) {
        return res.status(404).json({ error: 'Invalid tenant ID or tenant is inactive' });
      }
      
      // Check if user email already exists in this tenant
      const existingTenantUser = await db.collection<UserDocument>('users').findOne({ 
        email, 
        tenantId 
      });
      if (existingTenantUser) {
        return res.status(400).json({ 
          error: 'You already have an account with this company',
          details: `An account with email ${email} already exists for ${tenant.companyName}. Please try logging in instead.`
        });
      }
    } else if (isNewCustomer) {
      // Generate temporary tenant ID for new customer (will be finalized with company details)
      assignedTenantId = `ten-temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    } else {
      return res.status(400).json({ error: 'Tenant ID is required for existing customer signup' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    console.log('Creating user with verification token:', {
      email,
      tokenPreview: verificationToken.substring(0, 10) + '...',
      expiresAt: tokenExpires.toISOString()
    });

    // Create user
    const userId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    // Determine user role: use provided role, or default based on customer type
    let assignedRole: UserRole;
    if (role) {
      // Admin is creating a user with specific role
      assignedRole = role;
    } else if (isNewCustomer) {
      // New customer signup - make them ADMIN
      assignedRole = UserRole.ADMIN;
    } else {
      // Existing tenant signup - default to CLIENT
      assignedRole = UserRole.CLIENT;
    }
    
    const newUser: UserDocument = {
      id: userId,
      email,
      name,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      role: assignedRole,
      tenantId: assignedTenantId,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: tokenExpires,
      companyDetailsCompleted: !isNewCustomer,
      passwordHash,
      authProvider: 'local',
      createdAt: now,
      updatedAt: now
    };

    // Store user in MongoDB
    await db.collection<UserDocument>('users').insertOne(newUser as any);

    // Send verification email
    await sendVerificationEmail(email, name, verificationToken, isNewCustomer, assignedTenantId);

    res.json({ 
      success: true, 
      message: 'Verification email sent. Please check your inbox.',
      requiresVerification: true
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    console.log('Verify email request received:', { token: token?.substring(0, 10) + '...' });
    
    if (!token) {
      console.log('Error: No token provided');
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const db = getDB();
    
    // Find user with this verification token
    const foundUser = await db.collection<UserDocument>('users').findOne({ 
      emailVerificationToken: token 
    });

    console.log('User found:', foundUser ? `Yes (${foundUser.email})` : 'No');
    
    if (!foundUser) {
      console.log('Error: Invalid or expired token - no user found');
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    if (foundUser.emailVerified) {
      console.log('Error: Email already verified');
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Check if token has expired
    if (foundUser.emailVerificationTokenExpires) {
      const now = new Date();
      const expires = new Date(foundUser.emailVerificationTokenExpires);
      console.log('Token expiration check:', {
        now: now.toISOString(),
        expires: expires.toISOString(),
        expired: expires < now,
        expiresType: typeof foundUser.emailVerificationTokenExpires
      });
      
      if (expires < now) {
        console.log('Error: Token has expired');
        return res.status(400).json({ 
          error: 'Verification token has expired',
          details: 'Your verification link has expired (valid for 30 minutes). Please sign up again to receive a new verification email.'
        });
      }
    } else {
      console.log('Warning: No expiration field found - token may be from old signup, treating as expired');
      return res.status(400).json({ 
        error: 'Invalid or expired verification token',
        details: 'This verification link is no longer valid. Please sign up again to receive a new verification email.'
      });
    }

    // Update user as verified in MongoDB
    await db.collection<UserDocument>('users').updateOne(
      { id: foundUser.id },
      { 
        $set: { 
          emailVerified: true,
          updatedAt: new Date()
        },
        $unset: { 
          emailVerificationToken: '',
          emailVerificationTokenExpires: ''
        }
      }
    );
    
    // Get updated user
    const updatedUser = await db.collection<UserDocument>('users').findOne({ id: foundUser.id });
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to retrieve updated user' });
    }

    // Generate JWT token and log in user
    const jwtToken = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, tenantId: updatedUser.tenantId },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );

    // Send token as cookie
    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    const { passwordHash: _, emailVerificationToken: __, ...userWithoutSensitiveData } = updatedUser;
    res.json({ 
      success: true, 
      message: 'Email verified successfully',
      user: userWithoutSensitiveData,
      needsCompanyDetails: !updatedUser.companyDetailsCompleted,
      tenantId: updatedUser.tenantId
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Complete Company Details
router.post('/complete-company-details', async (req, res) => {
  try {
    // Check JWT token from cookie
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as { id: string };
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const db = getDB();
    const user = await db.collection<UserDocument>('users').findOne({ id: decoded.id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { 
      companyName, 
      companyEmail, 
      companyPhone,
      address,
      industry,
      website
    } = req.body;

    // Validation
    if (!companyName || !companyEmail) {
      return res.status(400).json({ error: 'Company name and email are required' });
    }

    // Check if company with this email already exists
    const existingCompanyByEmail = await db.collection<Tenant>('tenants').findOne({ 
      companyEmail,
      status: 'active'
    });
    if (existingCompanyByEmail) {
      return res.status(400).json({ 
        error: 'Company already exists',
        details: `A company with email ${companyEmail} is already registered as "${existingCompanyByEmail.companyName}". Tenant ID: ${existingCompanyByEmail.tenantId}`,
        existingTenantId: existingCompanyByEmail.tenantId
      });
    }

    // Generate final tenant ID based on company information
    // Format: ten-companyname-state-zip (e.g., ten-acmecorp-ca-90210)
    const companySanitized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    const stateSanitized = address?.state ? address.state.toLowerCase().replace(/[^a-z0-9]/g, '') : 'us';
    const zipSanitized = address?.zipCode ? address.zipCode.replace(/[^0-9]/g, '') : '00000';
    const finalTenantId = `ten-${companySanitized}-${stateSanitized}-${zipSanitized}`;

    // Check if tenant ID already exists
    let uniqueTenantId = finalTenantId;
    let counter = 1;
    while (await db.collection<Tenant>('tenants').findOne({ tenantId: uniqueTenantId })) {
      uniqueTenantId = `${finalTenantId}-${counter}`;
      counter++;
    }

    // Save tenant to MongoDB
    const now = new Date();
    const newTenant: Omit<Tenant, '_id'> = {
      tenantId: uniqueTenantId,
      companyName,
      companyEmail,
      companyPhone,
      address,
      industry,
      website,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      status: 'active'
    };

    await db.collection<Tenant>('tenants').insertOne(newTenant as any);
    console.log(`✓ Tenant created in MongoDB: ${uniqueTenantId}`);
    
    // Update user in MongoDB with new tenant ID and completion status
    await db.collection<UserDocument>('users').updateOne(
      { id: user.id },
      { 
        $set: { 
          tenantId: uniqueTenantId,
          companyDetailsCompleted: true,
          updatedAt: now
        }
      }
    );
    console.log(`✓ User updated with tenant ID: ${uniqueTenantId}`);
    
    // Get updated user
    const updatedUser = await db.collection<UserDocument>('users').findOne({ id: user.id });
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to retrieve updated user' });
    }

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    console.log(`✓ Company setup complete. Tenant: ${uniqueTenantId}, User: ${updatedUser.email}`);
    
    // Send company setup completion email with login link
    await sendCompanySetupCompleteEmail(
      updatedUser.email,
      updatedUser.name,
      companyName,
      uniqueTenantId
    );
    console.log(`✓ Company setup completion email sent to: ${updatedUser.email}`);
    
    res.json({ success: true, user: userWithoutPassword, tenantId: uniqueTenantId });
  } catch (error) {
    console.error('Complete company details error:', error);
    res.status(500).json({ error: 'Failed to save company details' });
  }
});

// Email/Password Login
router.post('/login', async (req, res, next) => {
  const { tenantId } = req.body;
  
  // Validate tenant ID is provided
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }
  
  // Validate tenant exists
  try {
    const db = getDB();
    const tenant = await db.collection<Tenant>('tenants').findOne({ tenantId, status: 'active' });
    if (!tenant) {
      return res.status(404).json({ error: 'Invalid tenant ID or tenant is inactive' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to validate tenant' });
  }
  
  passport.authenticate('local', (err: any, user: User, info: any) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Authentication failed' });
    }
    
    // Verify user belongs to the specified tenant
    if (user.tenantId !== tenantId) {
      return res.status(403).json({ error: 'User does not belong to the specified tenant' });
    }

    // Verify email is verified (non-dev users only)
    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox for the verification link.' });
    }

    // Log user into passport session
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('Failed to establish passport session:', loginErr);
        return res.status(500).json({ error: 'Failed to establish session' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '24h' }
      );

      // Send token as cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      console.log('Email login successful - JWT and session established for:', user.email);
      res.json({ success: true, user });
    });
  })(req, res, next);
});

// Google OAuth login (only if configured)
if (hasOAuthCredentials) {
  router.get('/google', async (req, res, next) => {
    const tenantId = req.query.tenantId as string;
    
    // Validate tenant ID is provided
    if (!tenantId) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=invalid_tenant`);
    }
    
    // Validate tenant exists and is active
    try {
      const db = getDB();
      const tenant = await db.collection<Tenant>('tenants').findOne({ tenantId, status: 'active' });
      if (!tenant) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=invalid_tenant`);
      }
      
      // Store tenant ID in session for callback validation
      if (req.session) {
        (req.session as any).pendingTenantId = tenantId;
      }
    } catch (error) {
      console.error('Failed to validate tenant:', error);
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=invalid_tenant`);
    }
    
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  });
} else {
  router.get('/google', (req, res) => {
    res.status(503).json({ 
      error: 'OAuth not configured',
      message: 'Google OAuth credentials are not set. Use /api/auth/dev-login for development.'
    });
  });
}

// Google OAuth callback (only if configured)
if (hasOAuthCredentials) {
  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
    async (req, res) => {
    try {
      const user = req.user as User;
      
      // Validate user belongs to the tenant from session
      const pendingTenantId = (req.session as any)?.pendingTenantId;
      if (pendingTenantId && user.tenantId !== pendingTenantId) {
        // Clear session tenant ID
        if (req.session) {
          (req.session as any).pendingTenantId = undefined;
        }
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=tenant_mismatch`);
      }
      
      // Clear session tenant ID after validation
      if (req.session) {
        (req.session as any).pendingTenantId = undefined;
      }
      
      // For new OAuth users, they should complete company setup
      if (!user.companyDetailsCompleted) {
        // Redirect to complete company details
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
          process.env.JWT_SECRET || 'your-jwt-secret',
          { expiresIn: '24h' }
        );
        
        res.cookie('token', token, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000
        });
        
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/complete-company-details?tenantId=${user.tenantId}`);
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '24h' }
      );

      // Send token as cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      // Redirect to client dashboard
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=oauth_callback_failed');
    }
  });
} else {
  router.get('/google/callback', (req, res) => {
    res.status(503).json({ 
      error: 'OAuth not configured',
      message: 'Google OAuth is not available without credentials.'
    });
  });
}

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  });
});

// Check auth status
router.get('/status', async (req, res) => {
  console.log('Auth status check - Cookies:', Object.keys(req.cookies));
  console.log('Auth status check - Cookies:', req.cookies);
  console.log('Auth status check - Session ID:', req.sessionID);
  console.log('Auth status check - Is authenticated:', req.isAuthenticated());
  
  console.log('Auth status check - User in session:', req.user,process.env.NODE_ENV );
  // Check JWT token from cookie
  const token = req.cookies.token;
  if (token || process.env.NODE_ENV === 'development') {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as { id: string; email: string };
      const db = getDB();
      const user = await db.collection<UserDocument>('users').findOne({ id: decoded.id });
      if (user) {
        const { passwordHash: _, ...userWithoutPassword } = user;
        console.log('Auth status: Authenticated via JWT token for user:', user.email);
        return res.json({ authenticated: true, user: userWithoutPassword });
      }
    } catch (error) {
      console.log('JWT verification failed:', error);
      // Token invalid, continue to check session
    }
  }
  
  // Fallback to session authentication
  if (req.isAuthenticated() || process.env.NODE_ENV === 'development') {
    console.log('Auth status: Authenticated via session for user:', (req.user as any)?.email);
    res.json({ authenticated: true, user: req.user });
  } else {
    console.log('Auth status: Not authenticated');
    res.json({ authenticated: false });
  }
});

// Development login (bypass OAuth) - available when not in production
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', (req, res) => {
    const { users } = require('../config/passport');
    console.log(`Dev login endpoint called - Using tenant: ${DEV_TENANT_ID}`);
    // Create a mock user
    const mockUser: User = {
      id: 'dev-user-123',
      email: 'dev@example.com',
      name: 'Dev User',
      picture: 'https://via.placeholder.com/150',
      role: UserRole.DEVELOPER,
      tenantId: DEV_TENANT_ID,
      emailVerified: true,
      companyDetailsCompleted: true,
      authProvider: 'local',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Store in memory
    users.set(mockUser.id, mockUser);
    
    // Log user into passport session
    req.login(mockUser, (err) => {
      if (err) {
        console.error('Failed to establish passport session:', err);
        return res.status(500).json({ error: 'Failed to establish session' });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: mockUser.id, email: mockUser.email, role: mockUser.role, tenantId: mockUser.tenantId },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '24h' }
      );
      
      // Send token as cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      console.log('Dev login successful - JWT and session established');
      res.json({ success: true, user: mockUser });
    });
  });
}

export default router;
