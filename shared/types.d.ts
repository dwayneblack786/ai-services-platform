export declare enum UserRole {
    ADMIN = "ADMIN",
    PROJECT_ADMIN = "PROJECT_ADMIN",
    ANALYST = "ANALYST",
    DEVELOPER = "DEVELOPER",
    CLIENT = "CLIENT"
}
export interface User {
    id: string;
    email: string;
    name: string;
    picture: string;
    role: UserRole;
    tenantId: string;
    emailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationTokenExpires?: Date;
    companyDetailsCompleted: boolean;
    passwordHash?: string;
    authProvider?: 'local' | 'keycloak';
    idpSub?: string;
    idpIssuer?: string;
    keycloakSub?: string;
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface AuthResponse {
    authenticated: boolean;
    user?: User;
}
