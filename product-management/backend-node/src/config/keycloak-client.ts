import axios, { AxiosResponse } from 'axios';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import crypto from 'crypto';

// Fallback logger if config/logger doesn't exist
const logger = {
  error: (...args: any[]) => console.error('[Keycloak]', ...args),
  info: (...args: any[]) => console.log('[Keycloak]', ...args),
  debug: (...args: any[]) => console.log('[Keycloak]', ...args),
  warn: (...args: any[]) => console.warn('[Keycloak]', ...args)
};
// Uncomment when logger is available:
// import logger from './logger';

interface KeycloakConfig {
  realm: string;
  authServerUrl: string;
  clientId: string;
  clientSecret?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface UserInfo {
  sub: string;
  email: string;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  [key: string]: any;
}

class ProductManagementKeycloakClient {
  private config: KeycloakConfig;
  private jwksClient: jwksClient.JwksClient;

  constructor() {
    this.config = {
      realm: process.env.KEYCLOAK_REALM || 'ai-services',
      authServerUrl: process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080/auth',
      clientId: process.env.KEYCLOAK_CLIENT_ID || 'product-management-client',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET
    };

    this.jwksClient = jwksClient({
      jwksUri: `${this.config.authServerUrl}/realms/${this.config.realm}/protocol/openid_connect/certs`,
      cache: true,
      cacheMaxAge: 86400000 // 24 hours
    });
  }

  generatePKCEChallenge(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  getAuthorizationUrl(redirectUri: string, state?: string): string {
    const { codeChallenge } = this.generatePKCEChallenge();
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      ...(state && { state })
    });

    return `${this.config.authServerUrl}/realms/${this.config.realm}/protocol/openid_connect/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<TokenResponse> {
    try {
      const tokenUrl = `${this.config.authServerUrl}/realms/${this.config.realm}/protocol/openid_connect/token`;
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      });

      if (this.config.clientSecret) {
        params.append('client_secret', this.config.clientSecret);
      }

      const response: AxiosResponse<TokenResponse> = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to exchange code for tokens:', error);
      throw new Error('Token exchange failed');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const tokenUrl = `${this.config.authServerUrl}/realms/${this.config.realm}/protocol/openid_connect/token`;
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        refresh_token: refreshToken
      });

      if (this.config.clientSecret) {
        params.append('client_secret', this.config.clientSecret);
      }

      const response: AxiosResponse<TokenResponse> = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to refresh access token:', error);
      throw new Error('Token refresh failed');
    }
  }

  async verifyToken(token: string): Promise<jwt.JwtPayload | null> {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        return null;
      }

      const kid = decoded.header.kid;
      if (!kid) {
        throw new Error('Token missing kid header');
      }

      const key = await this.jwksClient.getSigningKey(kid);
      const publicKey = key.getPublicKey();

      const verified = jwt.verify(token, publicKey, {
        issuer: `${this.config.authServerUrl}/realms/${this.config.realm}`,
        audience: this.config.clientId
      }) as jwt.JwtPayload;

      return verified;
    } catch (error) {
      logger.error('Token verification failed:', error);
      return null;
    }
  }

  async getUserInfo(accessToken: string): Promise<UserInfo | null> {
    try {
      const userInfoUrl = `${this.config.authServerUrl}/realms/${this.config.realm}/protocol/openid_connect/userinfo`;
      
      const response: AxiosResponse<UserInfo> = await axios.get(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get user info:', error);
      return null;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const logoutUrl = `${this.config.authServerUrl}/realms/${this.config.realm}/protocol/openid_connect/logout`;
      
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        refresh_token: refreshToken
      });

      if (this.config.clientSecret) {
        params.append('client_secret', this.config.clientSecret);
      }

      await axios.post(logoutUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    } catch (error) {
      logger.error('Failed to logout:', error);
      throw new Error('Logout failed');
    }
  }
}

export default new ProductManagementKeycloakClient();