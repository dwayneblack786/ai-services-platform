import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  picture?: string;
}

export class KeycloakOIDCClient {
  private config: KeycloakConfig;
  private issuer: string;
  private jwksClient: jwksClient.JwksClient;

  constructor(config: KeycloakConfig) {
    this.config = config;
    this.issuer = `${config.url}/realms/${config.realm}`;
    this.jwksClient = jwksClient({
      jwksUri: `${this.issuer}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxAge: 86400000,
      rateLimit: true,
      jwksRequestsPerMinute: 10
    });
  }

  generatePKCE(): PKCEChallenge {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256'
    };
  }

  generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  getAuthorizationUrl(state: string, codeChallenge: string, prompt?: 'none' | 'login' | 'consent', scopes: string[] = []): string {
    const authUrl = new URL(`${this.issuer}/protocol/openid-connect/auth`);
    const defaultScopes = ['openid', 'profile', 'email'];
    const allScopes = [...new Set([...defaultScopes, ...scopes])];

    authUrl.searchParams.set('client_id', this.config.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', allScopes.join(' '));
    authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    if (prompt) {
      authUrl.searchParams.set('prompt', prompt);
    }

    return authUrl.toString();
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
    const tokenUrl = `${this.issuer}/protocol/openid-connect/token`;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code_verifier: codeVerifier
    });

    try {
      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Token exchange failed:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error_description ||
        'Failed to exchange authorization code for tokens'
      );
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const tokenUrl = `${this.issuer}/protocol/openid-connect/token`;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    try {
      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Token refresh failed:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error_description ||
        'Failed to refresh access token'
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const userInfoUrl = `${this.issuer}/protocol/openid-connect/userinfo`;

    try {
      const response = await axios.get(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Get user info failed:', error.response?.data || error.message);
      throw new Error('Failed to get user info');
    }
  }

  async validateIdToken(idToken: string): Promise<any> {
    return this.validateToken(idToken);
  }

  async validateAccessToken(accessToken: string): Promise<any> {
    return this.validateToken(accessToken);
  }

  private async validateToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const getKey = (header: any, callback: any) => {
        this.jwksClient.getSigningKey(header.kid, (err, key) => {
          if (err) {
            return callback(err);
          }
          const signingKey = key?.getPublicKey();
          callback(null, signingKey);
        });
      };

      jwt.verify(
        token,
        getKey,
        {
          issuer: this.issuer,
          audience: this.config.clientId,
          algorithms: ['RS256']
        },
        (err, decoded) => {
          if (err) {
            console.error('Token validation failed:', err.message);
            return reject(new Error(`Token validation failed: ${err.message}`));
          }
          resolve(decoded);
        }
      );
    });
  }

  async introspectToken(token: string, tokenTypeHint: 'access_token' | 'refresh_token' = 'access_token'): Promise<any> {
    const introspectUrl = `${this.issuer}/protocol/openid-connect/token/introspect`;

    const params = new URLSearchParams({
      token,
      token_type_hint: tokenTypeHint,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    try {
      const response = await axios.post(introspectUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Token introspection failed:', error.response?.data || error.message);
      throw new Error('Failed to introspect token');
    }
  }

  getLogoutUrl(idTokenHint?: string): string {
    const logoutUrl = new URL(`${this.issuer}/protocol/openid-connect/logout`);
    const postLogoutUri = this.config.postLogoutRedirectUri || this.config.redirectUri;

    logoutUrl.searchParams.set('post_logout_redirect_uri', postLogoutUri);

    if (idTokenHint) {
      logoutUrl.searchParams.set('id_token_hint', idTokenHint);
    }

    return logoutUrl.toString();
  }

  async getDiscoveryDocument(): Promise<any> {
    const discoveryUrl = `${this.issuer}/.well-known/openid-configuration`;

    try {
      const response = await axios.get(discoveryUrl);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch discovery document:', error.message);
      throw new Error('Failed to fetch OIDC discovery document');
    }
  }

  async getJWKS(): Promise<any> {
    const jwksUrl = `${this.issuer}/protocol/openid-connect/certs`;

    try {
      const response = await axios.get(jwksUrl);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch JWKS:', error.message);
      throw new Error('Failed to fetch JWKS');
    }
  }

  decodeToken(token: string): any {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      throw new Error('Failed to decode token');
    }
  }
}

export function createKeycloakClient(config?: Partial<KeycloakConfig>): KeycloakOIDCClient {
  const defaultConfig: KeycloakConfig = {
    url: process.env.KEYCLOAK_URL || 'http://localhost:9999',
    realm: process.env.KEYCLOAK_REALM || 'tenant-default',
    clientId: process.env.KEYCLOAK_CLIENT_ID || '',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
    redirectUri: process.env.KEYCLOAK_REDIRECT_URI || '',
    postLogoutRedirectUri: process.env.KEYCLOAK_POST_LOGOUT_REDIRECT_URI
  };

  const finalConfig = { ...defaultConfig, ...config };

  if (!finalConfig.clientId) {
    throw new Error('KEYCLOAK_CLIENT_ID is required');
  }

  if (!finalConfig.clientSecret) {
    throw new Error('KEYCLOAK_CLIENT_SECRET is required');
  }

  if (!finalConfig.redirectUri) {
    throw new Error('KEYCLOAK_REDIRECT_URI is required');
  }

  return new KeycloakOIDCClient(finalConfig);
}

let keycloakClientInstance: KeycloakOIDCClient | null = null;

export function getKeycloakClient(): KeycloakOIDCClient {
  if (!keycloakClientInstance) {
    keycloakClientInstance = createKeycloakClient();
  }
  return keycloakClientInstance;
}
