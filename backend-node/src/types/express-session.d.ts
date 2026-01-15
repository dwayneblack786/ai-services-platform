declare module 'express-session' {
  interface SessionData {
    pendingTenantId?: string;
  }
}

export {};
