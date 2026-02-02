import { KeycloakOIDCClient, TokenResponse, UserInfo, PKCEChallenge } from '../lib/keycloak-client';

/**
 * Centralized Keycloak Service
 *
 * Provides a single source of truth for all Keycloak interactions.
 * Caches client instances per realm to avoid creating multiple clients.
 */
class KeycloakService {
  private clientCache: Map<string, KeycloakOIDCClient> = new Map();

  /**
   * Get or create cached client for a specific realm
   *
   * @param realm - Keycloak realm name (e.g., "tenant-acme-corp")
   * @returns Cached or new KeycloakOIDCClient instance
   */
  getClientForRealm(realm: string): KeycloakOIDCClient {
    if (!this.clientCache.has(realm)) {
      console.log(`[KeycloakService] Creating new client for realm: ${realm}`);

      this.clientCache.set(realm, new KeycloakOIDCClient({
        url: process.env.KEYCLOAK_URL || 'http://localhost:9999',
        realm: realm,
        clientId: process.env.KEYCLOAK_CLIENT_ID || '',
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
        redirectUri: process.env.KEYCLOAK_REDIRECT_URI || ''
      }));
    }

    return this.clientCache.get(realm)!;
  }

  /**
   * Generate PKCE challenge for authorization code flow
   *
   * @returns Object with codeVerifier, codeChallenge, and codeChallengeMethod
   */
  generatePKCE(): PKCEChallenge {
    // Use any realm client since PKCE generation is realm-independent
    const client = this.getDefaultClient();
    return client.generatePKCE();
  }

  /**
   * Generate state token for CSRF protection
   *
   * @returns Random state string
   */
  generateState(): string {
    // Use any realm client since state generation is realm-independent
    const client = this.getDefaultClient();
    return client.generateState();
  }

  /**
   * Get authorization URL for OAuth flow
   *
   * @param realm - Keycloak realm name
   * @param state - State token for CSRF protection
   * @param codeChallenge - PKCE code challenge
   * @param prompt - Optional prompt parameter ('none' | 'login' | 'consent')
   * @param scopes - Additional scopes beyond default (openid, profile, email)
   * @returns Authorization URL
   */
  getAuthorizationUrl(
    realm: string,
    state: string,
    codeChallenge: string,
    prompt?: 'none' | 'login' | 'consent',
    scopes: string[] = []
  ): string {
    const client = this.getClientForRealm(realm);
    return client.getAuthorizationUrl(state, codeChallenge, prompt, scopes);
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param realm - Keycloak realm name
   * @param code - Authorization code from Keycloak callback
   * @param codeVerifier - PKCE code verifier
   * @returns Token response with access_token, id_token, refresh_token
   */
  async exchangeCodeForTokens(
    realm: string,
    code: string,
    codeVerifier: string
  ): Promise<TokenResponse> {
    const client = this.getClientForRealm(realm);
    return await client.exchangeCodeForTokens(code, codeVerifier);
  }

  /**
   * Get user info from Keycloak using access token
   *
   * @param realm - Keycloak realm name
   * @param accessToken - Valid access token
   * @returns User info from Keycloak
   */
  async getUserInfo(realm: string, accessToken: string): Promise<UserInfo> {
    const client = this.getClientForRealm(realm);
    return await client.getUserInfo(accessToken);
  }

  /**
   * Validate access token
   *
   * @param realm - Keycloak realm name
   * @param accessToken - Token to validate
   * @returns Decoded token payload
   */
  async validateAccessToken(realm: string, accessToken: string): Promise<any> {
    const client = this.getClientForRealm(realm);
    return await client.validateAccessToken(accessToken);
  }

  /**
   * Validate ID token
   *
   * @param realm - Keycloak realm name
   * @param idToken - Token to validate
   * @returns Decoded token payload
   */
  async validateIdToken(realm: string, idToken: string): Promise<any> {
    const client = this.getClientForRealm(realm);
    return await client.validateIdToken(idToken);
  }

  /**
   * Refresh access token using refresh token
   *
   * @param realm - Keycloak realm name
   * @param refreshToken - Valid refresh token
   * @returns New token response
   */
  async refreshAccessToken(realm: string, refreshToken: string): Promise<TokenResponse> {
    const client = this.getClientForRealm(realm);
    return await client.refreshAccessToken(refreshToken);
  }

  /**
   * Introspect token to check if it's valid and active
   *
   * @param realm - Keycloak realm name
   * @param token - Token to introspect
   * @param tokenTypeHint - Hint about token type ('access_token' or 'refresh_token')
   * @returns Introspection result
   */
  async introspectToken(
    realm: string,
    token: string,
    tokenTypeHint: 'access_token' | 'refresh_token' = 'access_token'
  ): Promise<any> {
    const client = this.getClientForRealm(realm);
    return await client.introspectToken(token, tokenTypeHint);
  }

  /**
   * Get logout URL
   *
   * @param realm - Keycloak realm name
   * @param idTokenHint - Optional ID token for hint
   * @returns Logout URL
   */
  getLogoutUrl(realm: string, idTokenHint?: string): string {
    const client = this.getClientForRealm(realm);
    return client.getLogoutUrl(idTokenHint);
  }

  /**
   * Decode token without validation (for inspection)
   *
   * @param token - JWT token to decode
   * @returns Decoded token
   */
  decodeToken(token: string): any {
    // Use any realm client since token decoding is realm-independent
    const client = this.getDefaultClient();
    return client.decodeToken(token);
  }

  /**
   * Get OIDC discovery document for a realm
   *
   * @param realm - Keycloak realm name
   * @returns Discovery document
   */
  async getDiscoveryDocument(realm: string): Promise<any> {
    const client = this.getClientForRealm(realm);
    return await client.getDiscoveryDocument();
  }

  /**
   * Get JWKS (JSON Web Key Set) for a realm
   *
   * @param realm - Keycloak realm name
   * @returns JWKS
   */
  async getJWKS(realm: string): Promise<any> {
    const client = this.getClientForRealm(realm);
    return await client.getJWKS();
  }

  /**
   * Clear cached client for a specific realm
   *
   * @param realm - Keycloak realm name
   */
  clearClientCache(realm: string): void {
    if (this.clientCache.has(realm)) {
      console.log(`[KeycloakService] Clearing cached client for realm: ${realm}`);
      this.clientCache.delete(realm);
    }
  }

  /**
   * Clear all cached clients
   */
  clearAllClientCaches(): void {
    console.log(`[KeycloakService] Clearing all cached clients (${this.clientCache.size} realms)`);
    this.clientCache.clear();
  }

  /**
   * Get cache statistics
   *
   * @returns Object with cache size and realm list
   */
  getCacheStats(): { size: number; realms: string[] } {
    return {
      size: this.clientCache.size,
      realms: Array.from(this.clientCache.keys())
    };
  }

  /**
   * Get a default client for realm-independent operations
   * Uses a default realm or creates a temporary client
   *
   * @private
   * @returns KeycloakOIDCClient instance
   */
  private getDefaultClient(): KeycloakOIDCClient {
    const defaultRealm = process.env.KEYCLOAK_DEFAULT_REALM || 'master';
    return this.getClientForRealm(defaultRealm);
  }
}

// Export singleton instance
export const keycloakService = new KeycloakService();

// Export class for testing purposes
export { KeycloakService };
