"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakOIDCClient = void 0;
exports.createKeycloakClient = createKeycloakClient;
exports.getKeycloakClient = getKeycloakClient;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
class KeycloakOIDCClient {
    constructor(config) {
        this.config = config;
        this.issuer = `${config.url}/realms/${config.realm}`;
        this.jwksClient = (0, jwks_rsa_1.default)({
            jwksUri: `${this.issuer}/protocol/openid-connect/certs`,
            cache: true,
            cacheMaxAge: 86400000,
            rateLimit: true,
            jwksRequestsPerMinute: 10
        });
    }
    generatePKCE() {
        const codeVerifier = crypto_1.default.randomBytes(32).toString('base64url');
        const codeChallenge = crypto_1.default
            .createHash('sha256')
            .update(codeVerifier)
            .digest('base64url');
        return {
            codeVerifier,
            codeChallenge,
            codeChallengeMethod: 'S256'
        };
    }
    generateState() {
        return crypto_1.default.randomBytes(16).toString('hex');
    }
    getAuthorizationUrl(state, codeChallenge, prompt, scopes = []) {
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
    async exchangeCodeForTokens(code, codeVerifier) {
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
            const response = await axios_1.default.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Token exchange failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error_description ||
                'Failed to exchange authorization code for tokens');
        }
    }
    async refreshAccessToken(refreshToken) {
        const tokenUrl = `${this.issuer}/protocol/openid-connect/token`;
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret
        });
        try {
            const response = await axios_1.default.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Token refresh failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error_description ||
                'Failed to refresh access token');
        }
    }
    async getUserInfo(accessToken) {
        const userInfoUrl = `${this.issuer}/protocol/openid-connect/userinfo`;
        try {
            const response = await axios_1.default.get(userInfoUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Get user info failed:', error.response?.data || error.message);
            throw new Error('Failed to get user info');
        }
    }
    async validateIdToken(idToken) {
        return this.validateToken(idToken);
    }
    async validateAccessToken(accessToken) {
        return this.validateToken(accessToken);
    }
    async validateToken(token) {
        return new Promise((resolve, reject) => {
            const getKey = (header, callback) => {
                this.jwksClient.getSigningKey(header.kid, (err, key) => {
                    if (err) {
                        return callback(err);
                    }
                    const signingKey = key?.getPublicKey();
                    callback(null, signingKey);
                });
            };
            jsonwebtoken_1.default.verify(token, getKey, {
                issuer: this.issuer,
                audience: this.config.clientId,
                algorithms: ['RS256']
            }, (err, decoded) => {
                if (err) {
                    console.error('Token validation failed:', err.message);
                    return reject(new Error(`Token validation failed: ${err.message}`));
                }
                resolve(decoded);
            });
        });
    }
    async introspectToken(token, tokenTypeHint = 'access_token') {
        const introspectUrl = `${this.issuer}/protocol/openid-connect/token/introspect`;
        const params = new URLSearchParams({
            token,
            token_type_hint: tokenTypeHint,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret
        });
        try {
            const response = await axios_1.default.post(introspectUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Token introspection failed:', error.response?.data || error.message);
            throw new Error('Failed to introspect token');
        }
    }
    getLogoutUrl(idTokenHint) {
        const logoutUrl = new URL(`${this.issuer}/protocol/openid-connect/logout`);
        const postLogoutUri = this.config.postLogoutRedirectUri || this.config.redirectUri;
        logoutUrl.searchParams.set('post_logout_redirect_uri', postLogoutUri);
        if (idTokenHint) {
            logoutUrl.searchParams.set('id_token_hint', idTokenHint);
        }
        return logoutUrl.toString();
    }
    async getDiscoveryDocument() {
        const discoveryUrl = `${this.issuer}/.well-known/openid-configuration`;
        try {
            const response = await axios_1.default.get(discoveryUrl);
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch discovery document:', error.message);
            throw new Error('Failed to fetch OIDC discovery document');
        }
    }
    async getJWKS() {
        const jwksUrl = `${this.issuer}/protocol/openid-connect/certs`;
        try {
            const response = await axios_1.default.get(jwksUrl);
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch JWKS:', error.message);
            throw new Error('Failed to fetch JWKS');
        }
    }
    decodeToken(token) {
        try {
            return jsonwebtoken_1.default.decode(token, { complete: true });
        }
        catch (error) {
            throw new Error('Failed to decode token');
        }
    }
}
exports.KeycloakOIDCClient = KeycloakOIDCClient;
function createKeycloakClient(config) {
    const defaultConfig = {
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
let keycloakClientInstance = null;
function getKeycloakClient() {
    if (!keycloakClientInstance) {
        keycloakClientInstance = createKeycloakClient();
    }
    return keycloakClientInstance;
}
//# sourceMappingURL=keycloak-client.js.map