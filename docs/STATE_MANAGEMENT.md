# State Management & Context API Guide

📑 **Table of Contents**
- [Overview](#overview)
- [Context Architecture](#context-architecture)
  - [1. AuthContext - Authentication State](#1-authcontext---authentication-state)
  - [2. ThemeContext - Theme State](#2-themecontext---theme-state)
  - [3. NotificationContext - Toast Notifications](#3-notificationcontext---toast-notifications)
- [Custom Hooks for State Management](#custom-hooks-for-state-management)
  - [useLocalStorage Hook](#uselocalstorage-hook)
  - [useApi Hook](#useapi-hook)
  - [usePrevious Hook](#useprevious-hook)
  - [useAsync Hook](#useasync-hook)
- [State Management Best Practices](#state-management-best-practices)
  - [1. Context Splitting](#1-context-splitting)
  - [2. Memoizing Context Value](#2-memoizing-context-value)
  - [3. Avoid Prop Drilling](#3-avoid-prop-drilling)
  - [4. Local State vs. Context](#4-local-state-vs-context)
- [Performance Optimization Patterns](#performance-optimization-patterns)
  - [Selector Pattern with useContext](#selector-pattern-with-usecontext)
  - [Callback Hooks in Context](#callback-hooks-in-context)
- [Debugging State Management](#debugging-state-management)
  - [Chrome DevTools](#chrome-devtools)
  - [Console Logging](#console-logging)
  - [Custom Hook for Debugging](#custom-hook-for-debugging)
- [Related Documentation](#related-documentation)
- [Testing Context Providers](#testing-context-providers)

---

## Overview

This document explains the state management architecture of the frontend application using React Context API and custom hooks. It covers how to manage authentication, theme, notifications, and application-level state.

**Design Philosophy:**
- Minimize prop drilling through Context API
- Encapsulate related state in separate contexts
- Provide custom hooks for easy consumption
- Maintain clear separation of concerns
- Optimize performance through context splitting

## Context Architecture

### 1. AuthContext - Authentication State

**Purpose:** Manage user authentication, login/logout, and user profile

**Location:** `src/context/AuthContext.tsx`

```typescript
// Type definitions
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: UserRole[];
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

enum UserRole {
  USER = 'USER',
  TENANT_USER = 'TENANT_USER',
  TENANT_ADMIN = 'TENANT_ADMIN',
  PROJECT_ADMIN = 'PROJECT_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  
  // Auth methods
  login(email: string, password: string): Promise<void>;
  googleLogin(code: string): Promise<void>;
  logout(): Promise<void>;
  refreshToken(): Promise<void>;
  updateProfile(profile: Partial<User>): Promise<void>;
  
  // Permission checks
  hasRole(role: UserRole): boolean;
  hasPermission(permission: string): boolean;
  canAccess(resource: string, action: string): boolean;
}

// Context creation
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await axios.get('/api/auth/me');
        setUser(response.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      setUser(response.data.user);
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (code: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/google', { code });
      setUser(response.data.user);
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.roles.includes(role) ?? false;
  };

  const hasPermission = (permission: string): boolean => {
    // Map roles to permissions
    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.USER]: ['read:own_data'],
      [UserRole.TENANT_USER]: ['read:own_data', 'read:tenant_data'],
      [UserRole.TENANT_ADMIN]: ['read:tenant_data', 'write:tenant_data', 'manage:users'],
      [UserRole.PROJECT_ADMIN]: ['*'],
      [UserRole.SUPER_ADMIN]: ['*'],
    };

    return user?.roles.some(role => 
      rolePermissions[role].includes(permission) || 
      rolePermissions[role].includes('*')
    ) ?? false;
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    googleLogin,
    logout,
    refreshToken: async () => { /* implementation */ },
    updateProfile: async (profile) => { /* implementation */ },
    hasRole,
    hasPermission,
    canAccess: (resource, action) => hasPermission(`${action}:${resource}`),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**Usage:**

```typescript
// In components
const MyComponent: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return (
    <div>
      <p>Welcome, {user?.firstName}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### 2. ThemeContext - Theme State

**Purpose:** Manage application theme (light/dark mode) and design tokens

**Location:** `src/context/ThemeContext.tsx`

```typescript
type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode(mode: ThemeMode): void;
  colors: ColorPalette;
  spacing: SpacingScale;
  typography: TypographyScale;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Load from localStorage or system preference
    const saved = localStorage.getItem('themeMode');
    if (saved) return saved as ThemeMode;

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const isDark = mode === 'dark' || 
    (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  // Update document class for CSS variables
  useEffect(() => {
    const htmlElement = document.documentElement;
    htmlElement.classList.toggle('dark-mode', isDark);
  }, [isDark]);

  // Listen to system theme changes
  useEffect(() => {
    if (mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Force re-render to update isDark
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  const colors = isDark ? darkColorPalette : lightColorPalette;
  const spacing = spacingScale;
  const typography = typographyScale;

  const value: ThemeContextType = {
    mode,
    isDark,
    setMode: handleModeChange,
    colors,
    spacing,
    typography,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

**Usage:**

```typescript
const Header: React.FC = () => {
  const { isDark, setMode } = useTheme();

  return (
    <header css={headerStyles}>
      <button onClick={() => setMode(isDark ? 'light' : 'dark')}>
        {isDark ? '☀️' : '🌙'}
      </button>
    </header>
  );
};
```

### 3. NotificationContext - Toast Notifications

**Purpose:** Manage application-wide toast notifications and alerts

**Location:** `src/context/NotificationContext.tsx`

```typescript
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // 0 = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification(notification: Omit<Notification, 'id'>): string;
  removeNotification(id: string): void;
  clearAll(): void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>): string => {
    const id = uuidv4();
    const fullNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000, // Default 5 seconds
    };

    setNotifications(prev => [...prev, fullNotification]);

    // Auto-remove after duration
    if (fullNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, fullNotification.duration);
    }

    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
```

**Usage:**

```typescript
const SettingsForm: React.FC = () => {
  const { addNotification } = useNotification();

  const handleSave = async () => {
    try {
      await saveSettings();
      addNotification({
        type: 'success',
        message: 'Settings saved successfully!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to save settings. Please try again.',
      });
    }
  };

  return <button onClick={handleSave}>Save</button>;
};
```

## Custom Hooks for State Management

### useLocalStorage Hook

Persist state to browser localStorage:

```typescript
// src/hooks/useLocalStorage.ts
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key ${key}:`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key ${key}:`, error);
    }
  };

  return [storedValue, setValue];
}
```

**Usage:**

```typescript
const UserPreferences: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebarCollapsed', false);

  return (
    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
      {sidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar
    </button>
  );
};
```

### useApi Hook

Manage API request state and caching:

```typescript
// src/hooks/useApi.ts
interface UseApiOptions {
  skip?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useApi<T>(
  url: string,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options.skip) return;

    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(url, {
          signal: abortController.signal,
        });
        
        if (isMounted) {
          setData(response.data);
          setError(null);
          options.onSuccess?.(response.data);
        }
      } catch (err) {
        if (isMounted && !(err instanceof CancelledError)) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          setError(error);
          options.onError?.(error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Refetch interval
    let intervalId: NodeJS.Timeout;
    if (options.refetchInterval) {
      intervalId = setInterval(fetchData, options.refetchInterval);
    }

    return () => {
      isMounted = false;
      abortController.abort();
      if (intervalId) clearInterval(intervalId);
    };
  }, [url, options.skip, options.refetchInterval]);

  const refetch = useCallback(async () => {
    const response = await axios.get(url);
    setData(response.data);
    return response.data;
  }, [url]);

  return { data, loading, error, refetch };
}
```

**Usage:**

```typescript
const AssistantList: React.FC = () => {
  const { data: assistants, loading, error, refetch } = useApi<Assistant[]>('/api/assistants');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} retry={refetch} />;

  return (
    <div>
      {assistants?.map(assistant => (
        <AssistantCard key={assistant.id} assistant={assistant} />
      ))}
    </div>
  );
};
```

### usePrevious Hook

Track previous value of a prop or state:

```typescript
// src/hooks/usePrevious.ts
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
```

**Usage:**

```typescript
const ChatWindow: React.FC<{ selectedAssistantId: string }> = ({ selectedAssistantId }) => {
  const prevId = usePrevious(selectedAssistantId);

  useEffect(() => {
    if (prevId !== selectedAssistantId) {
      // Assistant changed, clear chat history
      clearMessages();
    }
  }, [selectedAssistantId, prevId]);
};
```

### useAsync Hook

Handle async operations with loading/error/success states:

```typescript
// src/hooks/useAsync.ts
interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await asyncFunction();
      setState({ data: response, loading: false, error: null });
      return response;
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
      throw error;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, execute };
}
```

**Usage:**

```typescript
const UserAccount: React.FC = () => {
  const { data: user, loading, error, execute: refreshUser } = useAsync(
    () => axios.get('/api/users/me').then(r => r.data),
    true
  );

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {user && <p>User: {user.name}</p>}
      <button onClick={refreshUser}>Refresh</button>
    </div>
  );
};
```

## State Management Best Practices

### 1. Context Splitting

Avoid putting all state in a single context. Split by feature/concern:

```
✅ Good:
- AuthContext (user, login, logout)
- ThemeContext (dark mode)
- NotificationContext (toasts)

❌ Bad:
- AppContext (user, theme, notifications, settings, preferences, ...)
```

### 2. Memoizing Context Value

Prevent unnecessary re-renders:

```typescript
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  // Memoize value to prevent child re-renders
  const value = useMemo<ThemeContextType>(() => ({
    isDark,
    setIsDark,
  }), [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
```

### 3. Avoid Prop Drilling

**Before (with prop drilling):**

```typescript
<Parent user={user}>
  <Child user={user}>
    <GrandChild user={user}>
      <GreatGrandChild user={user} />
    </GrandChild>
  </Child>
</Parent>
```

**After (with Context):**

```typescript
<AuthProvider>
  <Parent>
    <Child>
      <GrandChild>
        <GreatGrandChild /> {/* useAuth() hook here */}
      </GrandChild>
    </Child>
  </Parent>
</AuthProvider>
```

### 4. Local State vs. Context

**Use local state for:**
- Form input values
- UI toggles (collapsed menus, modals)
- Transient state (hover, focus)

**Use Context for:**
- Authentication state
- User preferences
- Theme settings
- Global notifications

```typescript
// Good: Local state for form input
const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth(); // Context for auth

  return (
    <form onSubmit={() => login(email, password)}>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
};
```

## Performance Optimization Patterns

### Selector Pattern with useContext

Prevent re-renders when only part of context changes:

```typescript
// Create selector hooks for specific values
export const useAuthUser = () => {
  const { user } = useAuth();
  return user;
};

export const useAuthLoading = () => {
  const { isLoading } = useAuth();
  return isLoading;
};

// In components, use specific selectors
const UserGreeting: React.FC = () => {
  const user = useAuthUser(); // Only re-renders when user changes
  return <h1>Hello, {user?.firstName}!</h1>;
};
```

### Callback Hooks in Context

Memoize callback functions to avoid unnecessary child re-renders:

```typescript
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const response = await axios.post('/api/auth/login', { email, password });
    setUser(response.data.user);
  }, []);

  const logout = useCallback(async () => {
    await axios.post('/api/auth/logout');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

## Debugging State Management

### Chrome DevTools

1. React DevTools extension shows Context hierarchy
2. Profiler tab shows component render times
3. Search for components that trigger renders

### Console Logging

```typescript
// Log context changes
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    console.log('[AuthContext] User changed:', user);
  }, [user]);

  // ...
};
```

### Custom Hook for Debugging

```typescript
// src/hooks/useDebugContext.ts
export function useDebugContext<T>(contextName: string, value: T) {
  useEffect(() => {
    console.log(`[${contextName}] Updated:`, value);
  }, [value, contextName]);
}
```

## Related Documentation

- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Component design patterns
- [HOOKS_CONVENTIONS.md](HOOKS_CONVENTIONS.md) - Custom hooks best practices
- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) - Overall frontend architecture
- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Auth security considerations

## Testing Context Providers

Example unit test:

```typescript
// src/context/__tests__/AuthContext.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

const TestComponent = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <div>
      {isAuthenticated && <p>Welcome, {user?.email}</p>}
      {!isAuthenticated && <p>Not logged in</p>}
    </div>
  );
};

describe('AuthContext', () => {
  it('should initialize with no user', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Not logged in')).toBeInTheDocument();
  });

  it('should load user on mount', async () => {
    // Mock API response
    jest.mock('axios').get.mockResolvedValueOnce({ data: { email: 'test@example.com' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome/)).toBeInTheDocument();
    });
  });
});
```

