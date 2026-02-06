import { Router, Request, Response } from 'express';
import User from '../models/User';
import { keycloakService } from '../services/keycloak.service';
import { mapKeycloakIdentityToUser } from '../services/tenant.service';

const router = Router();

/**
 * Step 1: Tenant Lookup
 * POST /api/auth/tenant/lookup
 * 
 * Request body:
 * {
 *   "identifier": "acme-corp" | "acmecorp.com" | "acme"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "tenant": {
 *     "tenantId": "acme-corp",
 *     "name": "Acme Corporation",
 *     "keycloakRealm": "tenant-acme-corp",
 *     "allowedAuthMethods": ["password", "google", "microsoft"]
 *   }
 * }
 */
router.post('/tenant/lookup', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;

    // Validate input
    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: 'Tenant identifier is required'
      });
    }

    // Normalize tenant identifier
    const tenantId = identifier.toLowerCase().trim();

    // Basic validation: 2-50 characters, alphanumeric with hyphens
    const validationRegex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
    if (!validationRegex.test(tenantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tenant identifier format'
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 TENANT LOOKUP REQUEST');
    console.log('='.repeat(80));
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`🏢 Identifier: ${tenantId}`);
    console.log('='.repeat(80));

    // Check if tenant exists by querying User collection
    const userCount = await User.countDocuments({ tenantId: tenantId });

    if (userCount === 0) {
      console.log(`❌ RESULT: Tenant not found (no users with tenantId: ${tenantId})`);
      console.log('='.repeat(80) + '\n');

      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    // tenantId IS the realm name (they're the same)
    const realmName = tenantId;

    console.log(`✅ RESULT: Tenant found (${userCount} users)`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Keycloak Realm: ${realmName}`);
    console.log('='.repeat(80) + '\n');

    // Store tenant info in session for subsequent login
    req.session.tenantContext = {
      tenantId: tenantId,
      keycloakRealm: realmName,
      timestamp: Date.now()
    };

    // Save session explicitly to ensure tenant context persists
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to save session'
        });
      }

      res.json({
        success: true,
        tenant: {
          tenantId: tenantId,
          keycloakRealm: realmName
        }
      });
    });
  } catch (error: any) {
    console.error('Tenant lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Tenant lookup failed'
    });
  }
});

/**
 * Step 1b: Suggest Tenant from Email
 * POST /api/auth/tenant/suggest
 * 
 * Request body:
 * {
 *   "email": "user@acmecorp.com"
 * }
 * 
 * Response: Same as /tenant/lookup
 */
router.post('/tenant/suggest', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 TENANT SUGGESTION FROM EMAIL');
    console.log('='.repeat(80));
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`📧 Email: ${email}`);
    console.log('='.repeat(80));

    // Look up user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log(`❌ RESULT: User not found with email ${email}`);
      console.log('='.repeat(80) + '\n');

      return res.json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.tenantId) {
      console.log(`❌ RESULT: User found but has no tenantId`);
      console.log('='.repeat(80) + '\n');

      return res.json({
        success: false,
        error: 'User has no associated tenant'
      });
    }

    // tenantId IS the realm name (they're the same)
    const realmName = user.tenantId;

    console.log(`✅ RESULT: Tenant suggested from email`);
    console.log(`   Tenant ID: ${user.tenantId}`);
    console.log(`   Keycloak Realm: ${realmName}`);
    console.log('='.repeat(80) + '\n');

    // Store in session
    req.session.tenantContext = {
      tenantId: user.tenantId,
      keycloakRealm: realmName,
      timestamp: Date.now()
    };

    res.json({
      success: true,
      tenant: {
        tenantId: user.tenantId,
        keycloakRealm: realmName
      }
    });
  } catch (error: any) {
    console.error('Tenant suggestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Tenant suggestion failed'
    });
  }
});

/**
 * Step 2: Initiate Keycloak Login with Tenant Context
 * GET /api/auth/tenant/login
 * 
 * Requires tenant context in session (from /tenant/lookup)
 * Redirects to Keycloak with correct realm
 */
router.get('/tenant/login', (req: Request, res: Response) => {
  try {
    // Check for tenant context in session
    const tenantContext = req.session.tenantContext;

    if (!tenantContext || !tenantContext.keycloakRealm) {
      return res.status(400).json({
        error: 'tenant_context_missing',
        message: 'Please select your organization first'
      });
    }

    // Check if context is not too old (5 minutes)
    const contextAge = Date.now() - (tenantContext.timestamp || 0);
    if (contextAge > 5 * 60 * 1000) {
      delete req.session.tenantContext;
      return res.status(400).json({
        error: 'tenant_context_expired',
        message: 'Tenant selection expired, please try again'
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔐 TENANT-AWARE KEYCLOAK LOGIN');
    console.log('='.repeat(80));
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`🏢 Tenant ID: ${tenantContext.tenantId}`);
    console.log(`🌐 Keycloak Realm: ${tenantContext.keycloakRealm}`);
    console.log('='.repeat(80));

    // Use centralized Keycloak service
    const { codeVerifier, codeChallenge } = keycloakService.generatePKCE();
    const state = keycloakService.generateState();

    // Store in session for callback verification
    req.session.keycloakAuth = {
      codeVerifier,
      state,
      realm: tenantContext.keycloakRealm,
      tenantId: tenantContext.tenantId,
      returnTo: req.query.returnTo as string || '/'
    };

    // Get authorization URL using centralized service
    const authUrl = keycloakService.getAuthorizationUrl(
      tenantContext.keycloakRealm,
      state,
      codeChallenge
    );

    console.log(`🔗 Authorization URL: ${authUrl}`);
    console.log(`🎲 State: ${state}`);
    console.log('='.repeat(80) + '\n');

    // Save session before redirect to ensure PKCE values persist
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        return res.redirect(`${clientUrl}/login?error=session_save_failed`);
      }
      res.redirect(authUrl);
    });
  } catch (error: any) {
    console.error('Tenant login error:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/login?error=${encodeURIComponent('tenant_login_failed')}`);
  }
});

/**
 * Step 3: OAuth Callback (handles any realm)
 * GET /api/auth/tenant/callback
 * 
 * Keycloak redirects here after authentication
 */
router.get('/tenant/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    console.log('\n' + '='.repeat(80));
    console.log('🎫 TENANT-AWARE OAUTH CALLBACK');
    console.log('='.repeat(80));
    console.log(`📅 Time: ${new Date().toISOString()}`);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    // Check for OAuth errors
    if (error) {
      console.error('OAuth error:', error, error_description);
      console.log('='.repeat(80) + '\n');
      return res.redirect(`${clientUrl}/login?error=${error}`);
    }

    // Validate session
    const sessionAuth = req.session.keycloakAuth;
    if (!sessionAuth || state !== sessionAuth.state) {
      console.error('State mismatch - possible CSRF attack');
      console.log('='.repeat(80) + '\n');
      return res.redirect(`${clientUrl}/login?error=invalid_state`);
    }

    const { codeVerifier, realm, tenantId, returnTo } = sessionAuth;

    if (!realm || !tenantId) {
      console.error('Missing realm or tenantId in session');
      console.log('='.repeat(80) + '\n');
      return res.redirect(`${clientUrl}/login?error=invalid_session`);
    }

    console.log(`🏢 Tenant ID: ${tenantId}`);
    console.log(`🌐 Keycloak Realm: ${realm}`);

    // Exchange code for tokens using centralized service
    console.log('🔄 Exchanging authorization code for tokens...');
    const tokens = await keycloakService.exchangeCodeForTokens(
      realm,
      code as string,
      codeVerifier
    );

    console.log('✅ Token exchange successful');

    // Get user info from Keycloak API
    console.log('📡 Fetching user info from Keycloak API...');
    const keycloakUserInfo = await keycloakService.getUserInfo(realm, tokens.access_token);

    console.log(`👤 User: ${keycloakUserInfo.email}`);
    console.log(`🔑 Sub: ${keycloakUserInfo.sub}`);

    // Map Keycloak identity to MongoDB user (JIT provisioning)
    console.log('🔗 Mapping Keycloak identity to MongoDB user...');
    const user = await mapKeycloakIdentityToUser(keycloakUserInfo, tenantId);

    // Update last login
    if (user.updateLastLogin) {
      await user.updateLastLogin();
    }

    console.log(`✅ User ${user._id} authenticated (${user.email})`);

    // Store tokens in session
    req.session.tenantId = tenantId;
    req.session.keycloakAccessToken = tokens.access_token;
    req.session.keycloakIdToken = tokens.id_token;
    if (tokens.refresh_token) {
      req.session.keycloakRefreshToken = tokens.refresh_token;
    }

    // Clear auth context
    delete req.session.keycloakAuth;
    delete req.session.tenantContext;

    // ✅ CRITICAL: Use req.login() to properly serialize user into passport session
    // This ensures req.session.passport.user is set for Socket.IO authentication
    const userForPassport = {
      _id: user._id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      role: user.role
    };

    req.login(userForPassport, (err) => {
      if (err) {
        console.error('❌ Passport login error:', err);
        const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/login?error=passport_login_failed`);
      }

      console.log(`✅ User serialized into passport session with _id: ${user._id}`);
      console.log(`✅ User authenticated and linked to tenant ${tenantId}`);

    // Build redirect URL - ensure we redirect to frontend, not backend
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    let redirectUrl: string;
    
    // Security: Validate and sanitize returnTo URL
    const allowedPaths = [
      '/dashboard', '/products', '/users', '/customers', '/reports', 
      '/settings', '/billing', '/subscriptions', '/tenants', '/payment',
      '/transactions', '/profile'
    ];
    
    let validatedReturnTo = returnTo;
    
    if (!returnTo || returnTo === '/') {
      validatedReturnTo = '/dashboard';
      console.log('ℹ️  No returnTo specified, using default: /dashboard');
    } else if (returnTo.startsWith('http')) {
      // Security: Reject external URLs to prevent open redirects
      console.warn(`⚠️  SECURITY: Rejected external redirect URL: ${returnTo}`);
      validatedReturnTo = '/dashboard';
    } else {
      // Remove dangerous patterns and validate path
      const sanitized = returnTo
        .replace(/\.\./g, '') // Remove directory traversal
        .replace(/\/\//g, '/') // Remove double slashes
        .trim();
      
      const pathOnly = sanitized.split('?')[0].split('#')[0];
      const isAllowed = allowedPaths.some(allowed => pathOnly.startsWith(allowed));
      
      if (!isAllowed) {
        console.warn(`⚠️  SECURITY: Rejected unsafe redirect path: ${returnTo}`);
        validatedReturnTo = '/dashboard';
      } else {
        validatedReturnTo = sanitized;
        console.log(`✅ Validated returnTo path: ${validatedReturnTo}`);
      }
    }
    
    // Build final redirect URL
    redirectUrl = `${frontendUrl}${validatedReturnTo.startsWith('/') ? '' : '/'}${validatedReturnTo}`;

    console.log(`🔙 Redirecting to: ${redirectUrl}`);
    console.log('='.repeat(80) + '\n');

    // Explicitly save session before redirect to ensure it persists
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.redirect(`${frontendUrl}/login?error=session_save_failed`);
      }
      
      // DIAGNOSTIC LOGGING - Session persistence debugging
      console.log('\n' + '='.repeat(80));
      console.log('✅ SESSION SAVED SUCCESSFULLY');
      console.log('='.repeat(80));
      console.log('📊 Session Details:');
      console.log(`   - Session ID: ${req.sessionID}`);
      console.log(`   - User ID: ${req.session?.userId || req.session.passport?.user?._id}`);
      console.log(`   - Tenant ID: ${req.session.tenantId}`);
      console.log(`   - Has Passport User: ${!!req.session.passport?.user}`);
      console.log(`   - Has Keycloak Token: ${!!req.session.keycloakAccessToken}`);
      console.log(`   - Cookie Name: ai_platform.sid`);
      console.log(`   - Cookie Settings:`);
      console.log(`      * httpOnly: true`);
      console.log(`      * sameSite: lax`);
      console.log(`      * secure: ${process.env.SESSION_COOKIE_SECURE || 'false'}`);
      console.log(`      * maxAge: ${process.env.SESSION_COOKIE_MAX_AGE || '24h'}`);
      console.log('\n🔗 Redirect Information:');
      console.log(`   - Target URL: ${redirectUrl}`);
      console.log(`   - Set-Cookie header will be sent with this redirect response`);
      console.log(`   - Browser should receive and store cookie before loading target page`);
      console.log('\n⏰ Timing:');
      console.log(`   - Redirect happening NOW at: ${new Date().toISOString()}`);
      console.log(`   - Frontend auth check will occur when target page loads`);
      console.log(`   - ⚠️  Watch for race condition: auth check may fire before cookie is set`);
      console.log('='.repeat(80) + '\n');
      
      res.redirect(redirectUrl);
    });
    }); // Close req.login callback
  } catch (error: any) {
    console.error('Tenant callback error:', error);
    console.log('='.repeat(80) + '\n');
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/login?error=${encodeURIComponent('auth_callback_failed')}`);
  }
});

/**
 * Get tenant context from session
 * GET /api/auth/tenant/context
 */
router.get('/tenant/context', (req: Request, res: Response) => {
  const tenantContext = req.session.tenantContext;

  if (!tenantContext) {
    return res.json({
      hasTenant: false
    });
  }

  res.json({
    hasTenant: true,
    tenantId: tenantContext.tenantId,
    keycloakRealm: tenantContext.keycloakRealm
  });
});

/**
 * Clear tenant context
 * POST /api/auth/tenant/clear
 */
router.post('/tenant/clear', (req: Request, res: Response) => {
  delete req.session.tenantContext;
  delete req.session.keycloakAuth;

  res.json({ success: true });
});

export default router;
