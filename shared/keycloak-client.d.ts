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
export declare class KeycloakOIDCClient {
    private config;
    private issuer;
    private jwksClient;
    constructor(config: KeycloakConfig);
    generatePKCE(): PKCEChallenge;
    generateState(): string;
    getAuthorizationUrl(state: string, codeChallenge: string, prompt?: 'none' | 'login' | 'consent', scopes?: string[]): string;
    exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse>;
    refreshAccessToken(refreshToken: string): Promise<TokenResponse>;
    getUserInfo(accessToken: string): Promise<UserInfo>;
    validateIdToken(idToken: string): Promise<any>;
    validateAccessToken(accessToken: string): Promise<any>;
    private validateToken;
    introspectToken(token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<any>;
    getLogoutUrl(idTokenHint?: string): string;
    getDiscoveryDocument(): Promise<any>;
    getJWKS(): Promise<any>;
    decodeToken(token: string): any;
}
export declare function createKeycloakClient(config?: Partial<KeycloakConfig>): KeycloakOIDCClient;
export declare function getKeycloakClient(): KeycloakOIDCClient;
