/**
 * Tenant Service
 *
 * Handles tenant validation and realm routing for multi-tenant Keycloak authentication
 * Note: tenantId = Keycloak realmName (they are the same value)
 * Tenant validation is done by checking if users exist with that tenantId in MongoDB
 */

/**
 * Validate tenant identifier format
 *
 * @param identifier - Tenant identifier to validate
 */
export function validateTenantIdentifier(identifier: string): boolean {
  if (!identifier || typeof identifier !== 'string') {
    return false;
  }

  const normalized = identifier.trim().toLowerCase();

  // Must be 2-50 characters, alphanumeric with hyphens
  const regex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
  return regex.test(normalized);
}

/**
 * Extract tenant identifier from email domain
 *
 * @param email - User email address
 * @returns Extracted domain or null
 */
export function extractDomainFromEmail(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const match = email.match(/@([a-z0-9.-]+\.[a-z]{2,})$/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Identity Mapping: Keycloak → MongoDB User
 *
 * Maps Keycloak identity to MongoDB user following these rules:
 * 1. If keycloak_sub exists → load existing user
 * 2. Else if email + tenant match → link Keycloak to existing user
 * 3. Else → create new user
 *
 * @param keycloakUserInfo - User info from Keycloak ID token
 * @param tenantId - Tenant ID (required)
 * @returns MongoDB user document
 */
export async function mapKeycloakIdentityToUser(
  keycloakUserInfo: {
    sub: string;
    email: string;
    given_name?: string;
    family_name?: string;
    name?: string;
    email_verified?: boolean;
    picture?: string;
  },
  tenantId: string
): Promise<any> {
  const User = (await import('../models/User')).default;

  // Rule 1: If keycloak_sub exists → load user
  let user = await User.findOne({ keycloakSub: keycloakUserInfo.sub });

  if (user) {
    console.log(`✅ User found by keycloak_sub: ${user.email}`);

    // Update user info from Keycloak
    user.email = keycloakUserInfo.email;
    user.firstName = keycloakUserInfo.given_name;
    user.lastName = keycloakUserInfo.family_name;
    user.name = keycloakUserInfo.name || [keycloakUserInfo.given_name, keycloakUserInfo.family_name].filter(Boolean).join(' ') || keycloakUserInfo.email;
    user.emailVerified = keycloakUserInfo.email_verified || false;
    if (keycloakUserInfo.picture) {
      user.picture = keycloakUserInfo.picture;
    }
    user.tenantId = tenantId;
    await user.save();

    return user;
  }

  // Rule 2: Else if email + tenant match → link
  user = await User.findOne({
    email: keycloakUserInfo.email,
    tenantId: tenantId
  });

  if (user) {
    console.log(`🔗 Linking Keycloak to existing user: ${user.email} (tenant: ${tenantId})`);

    user.keycloakSub = keycloakUserInfo.sub;
    user.firstName = keycloakUserInfo.given_name;
    user.lastName = keycloakUserInfo.family_name;
    user.name = keycloakUserInfo.name || [keycloakUserInfo.given_name, keycloakUserInfo.family_name].filter(Boolean).join(' ') || keycloakUserInfo.email;
    user.emailVerified = keycloakUserInfo.email_verified || false;
    if (keycloakUserInfo.picture) {
      user.picture = keycloakUserInfo.picture;
    }
    user.authProvider = 'keycloak';
    await user.save();

    return user;
  }

  // Rule 3: Else → create new user
  console.log(`➕ Creating new user: ${keycloakUserInfo.email} (tenant: ${tenantId})`);

  user = new User({
    keycloakSub: keycloakUserInfo.sub,
    email: keycloakUserInfo.email,
    firstName: keycloakUserInfo.given_name,
    lastName: keycloakUserInfo.family_name,
    name: keycloakUserInfo.name || [keycloakUserInfo.given_name, keycloakUserInfo.family_name].filter(Boolean).join(' ') || keycloakUserInfo.email,
    emailVerified: keycloakUserInfo.email_verified || false,
    picture: keycloakUserInfo.picture,
    role: 'ANALYST',
    tenantId: tenantId,
    authProvider: 'keycloak',
    isActive: true
  });

  await user.save();
  return user;
}
