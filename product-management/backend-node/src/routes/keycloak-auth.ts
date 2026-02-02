import { Router, Request, Response } from 'express';
import User from '../models/User';
import { keycloakService } from '../services/keycloak.service';
import { mapKeycloakIdentityToUser } from '../services/tenant.service';

const router = Router();

/**
 * Initiate Keycloak login
 * GET /api/auth/keycloak/login
 */
router.get('/keycloak/login', async (req: Request, res: Response) => {
  try {
    const { tenantId, returnTo } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        error: 'tenant_id_required',
        message: 'Tenant ID is required for Keycloak login'
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔐 KEYCLOAK LOGIN - Prompt Management');
    console.log('='.repeat(80));
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`🏢 Tenant ID: ${tenantId}`);
    console.log(`🔙 Return To: ${returnTo || '/'}`);
    console.log('='.repeat(80));

    // Validate tenant by checking if users exist with this tenantId
    const normalizedTenantId = (tenantId as string).toLowerCase().trim();
    const userCount = await User.countDocuments({ tenantId: normalizedTenantId });

    if (userCount === 0) {
      console.log(`❌ Tenant not found: ${normalizedTenantId} (no users)`);
      console.log('='.repeat(80) + '\n');
      return res.status(404).json({
        error: 'tenant_not_found',
        message: 'Tenant not found or is inactive'
      });
    }

    // tenantId IS the realm name (they're the same)
    const realmName = normalizedTenantId;

    console.log(`✅ Tenant found (${userCount} users)`);
    console.log(`🌐 Keycloak Realm: ${realmName}`);

    // Use centralized Keycloak service
    const { codeVerifier, codeChallenge } = keycloakService.generatePKCE();
    const state = keycloakService.generateState();

    // Store in session for callback verification
    req.session.keycloakAuth = {
      codeVerifier,
      state,
      realm: realmName,
      tenantId: normalizedTenantId,
      returnTo: req.query.returnTo as string || '/'
    };

    // Get authorization URL using centralized service
    const authUrl = keycloakService.getAuthorizationUrl(realmName, state, codeChallenge);

    console.log('🔐 Initiating Keycloak login');
    console.log(`   State: ${state}`);
    console.log(`   Redirect to: ${authUrl}`);

    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Keycloak login initiation failed:', error);
    res.redirect(`/login?error=${encodeURIComponent('auth_init_failed')}`);
  }
});

/**
 * Keycloak OAuth callback
 * GET /api/auth/keycloak/callback
 */
router.get('/keycloak/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    console.log('\n' + '='.repeat(80));
    console.log('🎫 KEYCLOAK CALLBACK - Prompt Management');
    console.log('='.repeat(80));
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`🎲 State: ${state}`);
    console.log(`🎫 Code: ${code ? 'Present' : 'Missing'}`);
    console.log(`❌ Error: ${error || 'None'}`);
    console.log('='.repeat(80));

    // Check for OAuth errors
    if (error) {
      console.error(`❌ OAuth error: ${error} - ${error_description}`);
      console.log('='.repeat(80) + '\n');
      return res.redirect(`/login?error=${error}`);
    }

    // Validate state
    const sessionAuth = (req as any).session.keycloakAuth;
    if (!sessionAuth || state !== sessionAuth.state) {
      console.error('❌ State mismatch - possible CSRF attack');
      console.log('='.repeat(80) + '\n');
      return res.redirect('/login?error=invalid_state');
    }

    const { codeVerifier, realm, tenantId, returnTo } = sessionAuth;

    if (!realm || !tenantId) {
      console.error('❌ Missing realm or tenantId in session');
      console.log('='.repeat(80) + '\n');
      return res.redirect('/login?error=invalid_session');
    }

    console.log(`🏢 Tenant ID: ${tenantId}`);
    console.log(`🌐 Keycloak Realm: ${realm}`);

    // Exchange code for tokens using centralized service
    console.log('🎫 Exchanging authorization code for tokens...');
    const tokens = await keycloakService.exchangeCodeForTokens(
      realm,
      code as string,
      codeVerifier
    );

    console.log('✅ Token exchange successful');

    // Get user info from Keycloak API
    console.log('📡 Fetching user info from Keycloak API...');
    const keycloakUserInfo = await keycloakService.getUserInfo(realm, tokens.access_token);

    console.log(`   User: ${keycloakUserInfo.email}`);
    console.log(`   Sub: ${keycloakUserInfo.sub}`);

    // Map Keycloak identity to MongoDB user (JIT provisioning)
    console.log('🔗 Mapping Keycloak identity to MongoDB user...');
    const user = await mapKeycloakIdentityToUser(keycloakUserInfo, tenantId);

    // Update last login
    if (user.updateLastLogin) {
      await user.updateLastLogin();
    }

    console.log(`✅ User ${user._id} authenticated (${user.email})`);

    // Store tokens and user info in session
    req.session.userId = user._id.toString();
    req.session.tenantId = tenantId;
    req.session.keycloakAccessToken = tokens.access_token;
    req.session.keycloakIdToken = tokens.id_token;
    if (tokens.refresh_token) {
      req.session.keycloakRefreshToken = tokens.refresh_token;
    }

    // Track login activity
    try {
      await UserActivity.create({
        userId: user._id,
        userEmail: user.email,
        tenantId: tenantId,
        eventType: 'login',
        eventName: 'User Login',
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
        metadata: {
          path: req.path,
          method: req.method,
          authMethod: 'keycloak'
        },
      });
      console.log('✅ Login activity tracked');
    } catch (activityError: any) {
      console.error('❌ Failed to track login activity:', activityError.message);
    }

    // Redirect to application
    const redirectUrl = returnTo || process.env.CLIENT_URL || 'http://localhost:5173';
    console.log(`🔙 Redirecting to: ${redirectUrl}`);

    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Keycloak callback error:', error);
    res.redirect(`/login?error=${encodeURIComponent('auth_callback_failed')}`);
  }
});

/**
 * Silent authentication check (for SSO)
 * GET /api/auth/keycloak/silent-check
 */
router.get('/keycloak/silent-check', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id_required' });
    }

    // Validate tenant by checking if users exist with this tenantId
    const normalizedTenantId = (tenantId as string).toLowerCase().trim();
    const userCount = await User.countDocuments({ tenantId: normalizedTenantId });

    if (userCount === 0) {
      return res.status(404).json({ error: 'tenant_not_found' });
    }

    // tenantId IS the realm name (they're the same)
    const realmName = normalizedTenantId;

    const { codeVerifier, codeChallenge } = keycloakService.generatePKCE();
    const state = keycloakService.generateState();

    req.session.keycloakAuth = {
      codeVerifier,
      state,
      realm: realmName,
      tenantId: normalizedTenantId,
      silent: true
    };

    // Use prompt=none for silent authentication
    const authUrl = keycloakService.getAuthorizationUrl(realmName, state, codeChallenge, 'none');

    console.log('🔍 Checking silent authentication (SSO)');

    res.json({
      authUrl,
      state
    });
  } catch (error: any) {
    console.error('Silent check failed:', error);
    res.status(500).json({ error: 'silent_check_failed' });
  }
});

/**
 * Refresh access token
 * POST /api/auth/keycloak/refresh
 */
router.post('/keycloak/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.session.keycloakRefreshToken;
    const tenantId = req.session.tenantId;

    if (!refreshToken) {
      return res.status(401).json({ error: 'no_refresh_token' });
    }

    if (!tenantId) {
      return res.status(401).json({ error: 'no_tenant_context' });
    }

    // tenantId IS the realm name (they're the same)
    const realm = tenantId;

    console.log('🔄 Refreshing Keycloak access token...');
    console.log(`   Realm: ${realm}`);

    // Use centralized service to refresh token
    const tokens = await keycloakService.refreshAccessToken(realm, refreshToken);

    // Update session
    req.session.keycloakAccessToken = tokens.access_token;
    if (tokens.refresh_token) {
      req.session.keycloakRefreshToken = tokens.refresh_token;
    }

    console.log('✅ Token refreshed successfully');

    res.json({
      success: true,
      expiresIn: tokens.expires_in
    });
  } catch (error: any) {
    console.error('Token refresh failed:', error);
    res.status(401).json({ error: 'refresh_failed' });
  }
});

/**
 * Get current user info
 * GET /api/auth/keycloak/me
 */
router.get('/keycloak/me', async (req: Request, res: Response) => {
  try {
    const accessToken = req.session.keycloakAccessToken;
    const tenantId = req.session.tenantId;

    if (!accessToken) {
      return res.status(401).json({ error: 'not_authenticated' });
    }

    if (!tenantId) {
      return res.status(401).json({ error: 'no_tenant_context' });
    }

    // tenantId IS the realm name (they're the same)
    const realm = tenantId;

    // Validate token using centralized service
    const tokenPayload = await keycloakService.validateAccessToken(realm, accessToken);

    // Get user from database
    const user = await User.findOne({ keycloakSub: tokenPayload.sub });

    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    res.json({
      keycloakUser: tokenPayload,
      appUser: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        emailVerified: user.emailVerified
      }
    });
  } catch (error: any) {
    console.error('Get user info failed:', error);
    res.status(401).json({ error: 'invalid_token' });
  }
});

/**
 * Logout
 * POST /api/auth/keycloak/logout
 */
router.post('/keycloak/logout', async (req: Request, res: Response) => {
  try {
    const idToken = req.session.keycloakIdToken;
    const tenantId = req.session.tenantId;
    const userId = req.session.userId;

    console.log('🚪 Logging out from Keycloak');

    // Track logout activity before destroying session
    if (userId && tenantId) {
      try {
        const user = await User.findById(userId);
        if (user) {
          await UserActivity.create({
            userId: user._id,
            userEmail: user.email,
            tenantId: tenantId,
            eventType: 'logout',
            eventName: 'User Logout',
            ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            timestamp: new Date(),
            metadata: {
              path: req.path,
              method: req.method,
              authMethod: 'keycloak'
            },
          });
          console.log('✅ Logout activity tracked');
        }
      } catch (activityError: any) {
        console.error('❌ Failed to track logout activity:', activityError.message);
      }
    }

    // tenantId IS the realm name (they're the same)
    const realm = tenantId || process.env.KEYCLOAK_DEFAULT_REALM || 'master';

    // Get Keycloak logout URL using centralized service
    const logoutUrl = keycloakService.getLogoutUrl(realm, idToken);

    console.log(`   Realm: ${realm}`);
    console.log(`   Redirect to: ${logoutUrl}`);

    // Clear local session
    req.session.destroy((err: any) => {
      if (err) {
        console.error('❌ Session destruction failed:', err);
      }
    });

    res.json({
      success: true,
      logoutUrl
    });
  } catch (error: any) {
    console.error('Logout failed:', error);
    res.status(500).json({ error: 'logout_failed' });
  }
});

/**
 * Check authentication status
 * GET /api/auth/keycloak/status
 */
router.get('/keycloak/status', async (req: Request, res: Response) => {
  try {
    const accessToken = req.session.keycloakAccessToken;
    const tenantId = req.session.tenantId;

    if (!accessToken || !tenantId) {
      return res.json({
        authenticated: false
      });
    }

    // Validate token
    try {
      // tenantId IS the realm name (they're the same)
      const realm = tenantId;

      // Validate token using centralized service
      const payload = await keycloakService.validateAccessToken(realm, accessToken);

      res.json({
        authenticated: true,
        user: {
          sub: payload.sub,
          email: payload.email,
          name: payload.name
        },
        expiresAt: payload.exp
      });
    } catch (error) {
      // Token expired or invalid
      res.json({
        authenticated: false,
        reason: 'token_invalid'
      });
    }
  } catch (error: any) {
    console.error('Status check failed:', error);
    res.status(500).json({ error: 'status_check_failed' });
  }
});

export default router;
