import express from 'express';

const router = express.Router();

// Get current user (session-based authentication via Keycloak)
router.get('/me', async (req, res) => {
  try {
    // DIAGNOSTIC LOGGING - Track auth check timing
    const requestStartTime = Date.now();
    console.log('\n' + '='.repeat(80));
    console.log('🔑 USER AUTH CHECK REQUEST (/api/user/me)');
    console.log('='.repeat(80));
    console.log('⏰ Request Time:', new Date().toISOString());
    console.log('🔗 Request URL:', req.originalUrl);
    console.log('🌐 Request IP:', req.ip);
    console.log('🍪 Cookies Received:', Object.keys(req.cookies).join(', ') || 'NONE');
    console.log(`   - Has ai_platform.sid: ${!!req.cookies['ai_platform.sid']}`);
    console.log('📊 Session Status:');
    console.log(`   - Has Session: ${!!req.session}`);
    console.log(`   - Session ID: ${req.sessionID || 'NONE'}`);
    console.log(`   - Has passport.user (serialized ID): ${!!req.session.passport?.user}`);
    console.log(`   - Has req.user (deserialized): ${!!req.user}`);
    
    // Passport deserializes user and attaches to req.user, not req.session.passport.user
    // req.session.passport.user contains only the serialized ID
    // req.user contains the full deserialized user object
    if (!req.user) {
      console.log('❌ AUTHENTICATION FAILED - No req.user (passport deserialization failed)');
      console.log(`   - Session exists: ${!!req.session}`);
      console.log(`   - Session passport.user (ID): ${JSON.stringify(req.session.passport?.user || null)}`);
      console.log(`   - req.user: ${JSON.stringify(req.user || null)}`);
      console.log(`   - ⚠️  User needs to login via /api/auth/tenant/login`);
      console.log('='.repeat(80) + '\n');
      
      return res.status(401).json({ 
        error: 'not_authenticated',
        message: 'User not authenticated - please login' 
      });
    }

    const sessionUser = req.user as any;
    const userId = sessionUser._id?.toString() || sessionUser.id;
    
    console.log(`✅ Session validated - User ID: ${userId}`);
    console.log(`✅ User deserialized by passport: ${sessionUser.email}`);
    
    // User is already loaded by passport.deserializeUser in req.user
    const requestDuration = Date.now() - requestStartTime;
    console.log(`✅ USER PROFILE FETCHED FROM SESSION (${requestDuration}ms)`);
    console.log(`   - User: ${sessionUser.email}`);
    console.log(`   - Tenant: ${sessionUser.tenantId}`);
    console.log(`   - Role: ${sessionUser.role}`);
    console.log('='.repeat(80) + '\n');
    
    // Return user without password hash (already excluded by passport deserialize)
    const { passwordHash, ...userWithoutPassword } = sessionUser;
    res.json({ user: userWithoutPassword });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to fetch user profile'
    });
  }
});

// Session debugging endpoint - helps diagnose authentication issues
router.get('/session-debug', (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 SESSION DEBUG REQUEST');
  console.log('='.repeat(80));
  console.log('⏰ Request Time:', new Date().toISOString());
  console.log('🔗 Request URL:', req.originalUrl);
  console.log('🌐 Request IP:', req.ip);
  console.log('\n📊 Session Information:');
  console.log(`   - Has Session Object: ${!!req.session}`);
  console.log(`   - Session ID: ${req.sessionID || 'NONE'}`);
  console.log(`   - Session passport.user (ID): ${req.session?.passport?.user || 'NONE'}`);
  console.log(`   - Has req.user (deserialized): ${!!req.user}`);
  if (req.user) {
    const user = req.user as any;
    console.log(`   - User email: ${user.email}`);
    console.log(`   - User _id: ${user._id}`);
    console.log(`   - User tenantId: ${user.tenantId}`);
  }
  console.log(`   - Tenant ID in Session: ${req.session?.tenantId || 'NONE'}`);
  console.log(`   - Has Keycloak Access Token: ${!!req.session?.keycloakAccessToken}`);
  console.log(`   - Has Keycloak ID Token: ${!!req.session?.keycloakIdToken}`);
  console.log(`   - Has Keycloak Refresh Token: ${!!req.session?.keycloakRefreshToken}`);
  console.log('\n🍪 Cookie Information:');
  console.log(`   - Cookies Received:`, JSON.stringify(req.cookies, null, 2));
  console.log(`   - Has ai_platform.sid cookie: ${!!req.cookies['ai_platform.sid']}`);
  console.log('='.repeat(80) + '\n');
  
  res.json({
    timestamp: new Date().toISOString(),
    hasSession: !!req.session,
    sessionID: req.sessionID || null,
    serializedUserId: req.session?.passport?.user || null,
    deserializedUser: req.user || null,
    tenantId: req.session?.tenantId || null,
    hasKeycloakToken: !!req.session?.keycloakAccessToken,
    hasKeycloakIdToken: !!req.session?.keycloakIdToken,
    hasKeycloakRefreshToken: !!req.session?.keycloakRefreshToken,
    cookies: req.cookies,
    hasCookie: !!req.cookies['ai_platform.sid']
  });
});

export default router;