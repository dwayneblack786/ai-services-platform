import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

interface KeycloakAdminConfig {
  url: string;
  adminUsername: string;
  adminPassword: string;
  adminClientId: string;
}

interface RealmSettings {
  accessTokenLifespan?: number;
  ssoSessionIdleTimeout?: number;
  ssoSessionMaxLifespan?: number;
  refreshTokenMaxReuse?: number;
  accessCodeLifespan?: number;
  passwordPolicy?: string;
}

interface ClientConfig {
  clientId: string;
  redirectUris: string[];
  webOrigins: string[];
  publicClient?: boolean;
  standardFlowEnabled?: boolean;
  directAccessGrantsEnabled?: boolean;
}

interface UserData {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  credentials?: Array<{
    type: string;
    value: string;
    temporary: boolean;
  }>;
}

class KeycloakAdminService {
  private config: KeycloakAdminConfig;
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      url: process.env.KEYCLOAK_URL || 'http://localhost:9999',
      adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME || 'admin',
      adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
      adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli'
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Authenticate with Keycloak Admin API to get access token
   */
  private async authenticate(): Promise<void> {
    try {
      const response = await this.axiosInstance.post(
        '/realms/master/protocol/openid-connect/token',
        new URLSearchParams({
          grant_type: 'password',
          client_id: this.config.adminClientId,
          username: this.config.adminUsername,
          password: this.config.adminPassword
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 10000; // 10s buffer

      logger.info('Keycloak Admin API authenticated successfully');
    } catch (error: any) {
      logger.error('Failed to authenticate with Keycloak Admin API', {
        error: error.message,
        status: error.response?.status
      });
      throw new Error('Keycloak Admin authentication failed');
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  /**
   * Make authenticated request to Keycloak Admin API with retry logic
   */
  private async makeRequest<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: any,
    retries = 2
  ): Promise<T> {
    await this.ensureAuthenticated();

    try {
      const response = await this.axiosInstance.request<T>({
        method,
        url,
        data,
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401 && retries > 0) {
        // Token might be expired, re-authenticate and retry
        this.accessToken = null;
        await this.authenticate();
        return this.makeRequest(method, url, data, retries - 1);
      }

      logger.error('Keycloak Admin API request failed', {
        method,
        url,
        status: error.response?.status,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Create a new realm
   */
  async createRealm(tenantId: string, settings?: RealmSettings): Promise<void> {
    const realmName = tenantId;

    const realmConfig = {
      realm: realmName,
      enabled: true,
      displayName: `Tenant: ${tenantId}`,
      accessTokenLifespan: settings?.accessTokenLifespan || 900, // 15 minutes
      ssoSessionIdleTimeout: settings?.ssoSessionIdleTimeout || 1800, // 30 minutes
      ssoSessionMaxLifespan: settings?.ssoSessionMaxLifespan || 36000, // 10 hours
      refreshTokenMaxReuse: settings?.refreshTokenMaxReuse || 0,
      accessCodeLifespan: settings?.accessCodeLifespan || 60, // 1 minute
      passwordPolicy: settings?.passwordPolicy || 'length(8) and digits(1) and lowerCase(1) and upperCase(1)',
      registrationAllowed: false,
      resetPasswordAllowed: true,
      rememberMe: true,
      verifyEmail: true,
      loginWithEmailAllowed: true,
      duplicateEmailsAllowed: false
    };

    try {
      await this.makeRequest('post', '/admin/realms', realmConfig);
      logger.info(`Created Keycloak realm: ${realmName}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        logger.warn(`Realm ${realmName} already exists`);
        return; // Realm exists, continue
      }
      throw new Error(`Failed to create realm ${realmName}: ${error.message}`);
    }
  }

  /**
   * Create a client in a realm
   */
  async createClient(realmName: string, config: ClientConfig): Promise<string> {
    const clientConfig = {
      clientId: config.clientId,
      enabled: true,
      protocol: 'openid-connect',
      publicClient: config.publicClient ?? false,
      standardFlowEnabled: config.standardFlowEnabled ?? true,
      directAccessGrantsEnabled: config.directAccessGrantsEnabled ?? false,
      redirectUris: config.redirectUris,
      webOrigins: config.webOrigins,
      attributes: {
        'pkce.code.challenge.method': 'S256'
      },
      defaultClientScopes: ['profile', 'email', 'roles'],
      optionalClientScopes: ['address', 'phone']
    };

    try {
      const response = await this.axiosInstance.post(
        `/admin/realms/${realmName}/clients`,
        clientConfig,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Get the client ID from Location header
      const location = response.headers['location'];
      const clientUuid = location ? location.split('/').pop() : '';

      logger.info(`Created client ${config.clientId} in realm ${realmName}`);
      return clientUuid;
    } catch (error: any) {
      if (error.response?.status === 409) {
        logger.warn(`Client ${config.clientId} already exists in realm ${realmName}`);
        // Get existing client ID
        const clients: any = await this.makeRequest('get', `/admin/realms/${realmName}/clients?clientId=${config.clientId}`);
        return clients[0]?.id || '';
      }
      throw new Error(`Failed to create client in realm ${realmName}: ${error.message}`);
    }
  }

  /**
   * Create a realm role
   */
  async createRealmRole(realmName: string, roleName: string, description?: string): Promise<void> {
    const roleConfig = {
      name: roleName,
      description: description || `${roleName} role`,
      composite: false,
      clientRole: false
    };

    try {
      await this.makeRequest('post', `/admin/realms/${realmName}/roles`, roleConfig);
      logger.info(`Created role ${roleName} in realm ${realmName}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        logger.warn(`Role ${roleName} already exists in realm ${realmName}`);
        return;
      }
      throw new Error(`Failed to create role ${roleName}: ${error.message}`);
    }
  }

  /**
   * Create a user in a realm
   */
  async createUser(realmName: string, userData: UserData): Promise<string> {
    const userConfig = {
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      enabled: userData.enabled ?? true,
      emailVerified: userData.emailVerified ?? false,
      credentials: userData.credentials || []
    };

    try {
      const response = await this.axiosInstance.post(
        `/admin/realms/${realmName}/users`,
        userConfig,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Get the user ID from Location header
      const location = response.headers['location'];
      const userId = location ? location.split('/').pop() : '';

      logger.info(`Created user ${userData.username} in realm ${realmName}`);
      return userId;
    } catch (error: any) {
      if (error.response?.status === 409) {
        logger.warn(`User ${userData.username} already exists in realm ${realmName}`);
        // Get existing user ID
        const users: any = await this.makeRequest('get', `/admin/realms/${realmName}/users?username=${userData.username}`);
        return users[0]?.id || '';
      }
      throw new Error(`Failed to create user in realm ${realmName}: ${error.message}`);
    }
  }

  /**
   * Assign a realm role to a user
   */
  async assignRoleToUser(realmName: string, userId: string, roleName: string): Promise<void> {
    try {
      // Get the role details first
      const role: any = await this.makeRequest('get', `/admin/realms/${realmName}/roles/${roleName}`);

      // Assign the role to the user
      await this.makeRequest('post', `/admin/realms/${realmName}/users/${userId}/role-mappings/realm`, [role]);

      logger.info(`Assigned role ${roleName} to user ${userId} in realm ${realmName}`);
    } catch (error: any) {
      throw new Error(`Failed to assign role ${roleName} to user: ${error.message}`);
    }
  }

  /**
   * Update user password
   */
  async updateUserPassword(realmName: string, userId: string, newPassword: string, temporary = false): Promise<void> {
    const credentials = {
      type: 'password',
      value: newPassword,
      temporary
    };

    try {
      await this.makeRequest('put', `/admin/realms/${realmName}/users/${userId}/reset-password`, credentials);
      logger.info(`Updated password for user ${userId} in realm ${realmName}`);
    } catch (error: any) {
      throw new Error(`Failed to update user password: ${error.message}`);
    }
  }

  /**
   * Send verification email action to user
   */
  async sendVerifyEmailAction(realmName: string, userId: string): Promise<void> {
    try {
      await this.makeRequest('put', `/admin/realms/${realmName}/users/${userId}/execute-actions-email`, ['VERIFY_EMAIL']);
      logger.info(`Sent verify email action to user ${userId} in realm ${realmName}`);
    } catch (error: any) {
      throw new Error(`Failed to send verify email action: ${error.message}`);
    }
  }

  /**
   * Send password setup email action to user
   */
  async sendPasswordSetupEmail(realmName: string, userId: string): Promise<void> {
    try {
      await this.makeRequest('put', `/admin/realms/${realmName}/users/${userId}/execute-actions-email`, ['UPDATE_PASSWORD']);
      logger.info(`Sent password setup email to user ${userId} in realm ${realmName}`);
    } catch (error: any) {
      throw new Error(`Failed to send password setup email: ${error.message}`);
    }
  }

  /**
   * Configure Identity Providers for social login
   */
  async configureIdentityProvider(
    realmName: string,
    provider: 'google' | 'microsoft' | 'github',
    clientId: string,
    clientSecret: string
  ): Promise<void> {
    const providerConfig: any = {
      alias: provider,
      providerId: provider,
      enabled: true,
      trustEmail: true,
      firstBrokerLoginFlowAlias: 'first broker login',
      config: {
        clientId,
        clientSecret,
        syncMode: 'IMPORT'
      }
    };

    // Provider-specific configuration
    if (provider === 'google') {
      providerConfig.config.hostedDomain = '';
    }

    try {
      await this.makeRequest('post', `/admin/realms/${realmName}/identity-provider/instances`, providerConfig);
      logger.info(`Configured ${provider} identity provider in realm ${realmName}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        logger.warn(`Identity provider ${provider} already exists in realm ${realmName}`);
        return;
      }
      throw new Error(`Failed to configure identity provider ${provider}: ${error.message}`);
    }
  }
}

// Export singleton instance
export const keycloakAdminService = new KeycloakAdminService();
export default keycloakAdminService;
