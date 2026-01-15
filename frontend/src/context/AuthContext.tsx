import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { User, UserRole } from '../types/shared';
import { getApiUrl } from '../config/api';
import { AuthContextType } from '../types';

interface Subscription {
  _id: string;
  productId: string;
  tenantId: string;
  status: string;
  product?: {
    _id: string;
    name: string;
    category: string;
    description: string;
  };
}

interface VirtualAssistantProduct {
  _id: string;
  name: string;
  category: string;
  description?: string;
  hasVoice: boolean;
  hasChat: boolean;
}

interface ExtendedAuthContextType extends AuthContextType {
  subscriptions: Subscription[];
  virtualAssistantProducts: VirtualAssistantProduct[];
  hasVirtualAssistant: boolean;
  isLoadingSubscriptions: boolean;
  refreshSubscriptions: () => Promise<void>;
  isTenantAdmin: () => boolean;
}

const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [virtualAssistantProducts, setVirtualAssistantProducts] = useState<VirtualAssistantProduct[]>([]);
  const [hasVirtualAssistant, setHasVirtualAssistant] = useState(false);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Load subscriptions when user is authenticated
  useEffect(() => {
    if (user && user.tenantId) {
      refreshSubscriptions();
    } else {
      setSubscriptions([]);
      setVirtualAssistantProducts([]);
      setHasVirtualAssistant(false);
    }
  }, [user]);

  const checkAuthStatus = async () => {
    // Prevent multiple simultaneous auth checks
    if (isCheckingAuth) return;
    
    setIsCheckingAuth(true);
    try {
      console.log('Checking auth status...');
      const response = await apiClient.get(getApiUrl('api/auth/status'));
      console.log('Auth status response:', response.data);
      if (response.data.authenticated) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
      setIsCheckingAuth(false);
    }
  };

  const login = (tenantId: string) => {
    // Store tenant ID in session storage for OAuth callback
    sessionStorage.setItem('pendingTenantId', tenantId);
    // Pass tenant ID as query parameter for backend validation
    window.location.href = getApiUrl(`api/auth/google?tenantId=${encodeURIComponent(tenantId)}`);
  };

  const devLogin = async () => {
    try {
      const response = await apiClient.post(getApiUrl('api/auth/dev-login'), {});
      if (response.data.success) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: 'Dev login failed' };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Dev login failed';
      console.error('Dev login failed:', errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post(getApiUrl('api/auth/logout'), {});
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const emailLogin = async (email: string, password: string, tenantId: string) => {
    try {
      const response = await apiClient.post(getApiUrl('api/auth/login'), 
        { email, password, tenantId }
      );
      if (response.data.success) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Login failed';
      console.error('Email login failed:', errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const response = await apiClient.post(getApiUrl('api/auth/signup'),
        { email, password, name }
      );
      if (response.data.success) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: 'Signup failed' };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Signup failed';
      console.error('Signup failed:', errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (...roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const isAdmin = (): boolean => {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.PROJECT_ADMIN;
  };

  const isProjectAdmin = (): boolean => {
    return user?.role === UserRole.PROJECT_ADMIN;
  };

  const isTenantAdmin = (): boolean => {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.PROJECT_ADMIN;
  };

  const refreshSubscriptions = async () => {
    if (!user || !user.tenantId) return;
    
    setIsLoadingSubscriptions(true);
    try {
      const [activeResponse, vaResponse] = await Promise.all([
        apiClient.get(getApiUrl('api/subscriptions-info/active')),
        apiClient.get(getApiUrl('api/subscriptions-info/virtual-assistant'))
      ]);

      if (activeResponse.data) {
        setSubscriptions(activeResponse.data.subscriptions || []);
        setHasVirtualAssistant(activeResponse.data.hasVirtualAssistant || false);
      }

      if (vaResponse.data) {
        setVirtualAssistantProducts(vaResponse.data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      setSubscriptions([]);
      setVirtualAssistantProducts([]);
      setHasVirtualAssistant(false);
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      devLogin, 
      emailLogin, 
      signup, 
      logout, 
      hasRole, 
      hasAnyRole, 
      isAdmin,
      isProjectAdmin,
      subscriptions,
      virtualAssistantProducts,
      hasVirtualAssistant,
      isLoadingSubscriptions,
      refreshSubscriptions,
      isTenantAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export type { Subscription, VirtualAssistantProduct, ExtendedAuthContextType };
