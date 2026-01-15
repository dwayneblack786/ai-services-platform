# Frontend Routing Patterns & Advanced Navigation

## Overview

This document covers React Router v6 patterns, advanced routing strategies, nested routes, code splitting, route guards, and programmatic navigation.

## Router Setup

### Basic Router Configuration

```typescript
// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { ProtectedLayout } from './components/layout/ProtectedLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { lazy, Suspense } from 'react';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

const PageSkeleton = () => <div>Loading...</div>;

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Default and catch-all */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
};

export default App;
```

## Route Guards

### Protected Route Component

```typescript
// src/components/routes/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
```

### Role-Based Route Protection

```typescript
// src/components/routes/RoleProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, UserRole } from '../../hooks/useAuth';

interface RoleProtectedRouteProps {
  requiredRoles: UserRole[];
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  requiredRoles,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasRequiredRole = requiredRoles.some(role => user.roles.includes(role));

  if (!hasRequiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

// Usage in router
<Route element={<RoleProtectedRoute requiredRoles={['ADMIN']} />}>
  <Route path="/admin" element={<AdminPage />} />
</Route>
```

### Tenant-Based Route Protection

```typescript
// src/components/routes/TenantRoute.tsx
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const TenantRoute: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Verify user has access to this tenant
  if (!user || user.tenantId !== tenantId) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Usage
<Route path="/tenant/:tenantId" element={<TenantRoute />}>
  <Route path="settings" element={<TenantSettingsPage />} />
  <Route path="users" element={<TenantUsersPage />} />
</Route>
```

## Nested Routes

### Feature-Based Nested Routes

```typescript
// Organize routes by feature
const DashboardRoutes = () => (
  <Routes>
    <Route path="/" element={<DashboardOverview />} />
    <Route path="/analytics" element={<AnalyticsPage />} />
    <Route path="/reports" element={<ReportsPage />} />
  </Routes>
);

const AssistantsRoutes = () => (
  <Routes>
    <Route path="/" element={<AssistantsList />} />
    <Route path="/:id" element={<AssistantDetail />} />
    <Route path="/:id/settings" element={<AssistantSettings />} />
    <Route path="/:id/analytics" element={<AssistantAnalytics />} />
  </Routes>
);

// Main routes
const App: React.FC = () => (
  <Routes>
    <Route element={<ProtectedRoute />}>
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard/*" element={<DashboardRoutes />} />
        <Route path="/assistants/*" element={<AssistantsRoutes />} />
      </Route>
    </Route>
  </Routes>
);
```

### URL Parameters and Query Strings

```typescript
// src/pages/AssistantDetailPage.tsx
import { useParams, useSearchParams } from 'react-router-dom';

const AssistantDetailPage: React.FC = () => {
  const { assistantId } = useParams<{ assistantId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get('tab') || 'overview';
  const highlightId = searchParams.get('highlight');

  const handleTabChange = (newTab: string) => {
    setSearchParams({ tab: newTab, highlight: highlightId });
  };

  return (
    <div>
      <h1>Assistant: {assistantId}</h1>
      <Tabs active={tab} onChange={handleTabChange}>
        <Tab name="overview" label="Overview" />
        <Tab name="settings" label="Settings" />
        <Tab name="analytics" label="Analytics" />
      </Tabs>
      {highlightId && <HighlightBox id={highlightId} />}
    </div>
  );
};
```

## Navigation Patterns

### Programmatic Navigation

```typescript
// src/hooks/useNavigation.ts
import { useNavigate } from 'react-router-dom';

export const useNavigation = () => {
  const navigate = useNavigate();

  return {
    goToLogin: () => navigate('/login'),
    goToDashboard: () => navigate('/dashboard'),
    goToAssistant: (id: string) => navigate(`/assistants/${id}`),
    goToSettings: (tab?: string) => navigate(`/settings${tab ? `?tab=${tab}` : ''}`),
    goBack: () => navigate(-1),
    replace: (path: string) => navigate(path, { replace: true }),
  };
};

// Usage
const MyComponent: React.FC = () => {
  const { goToDashboard, goToAssistant } = useNavigation();

  return (
    <button onClick={() => goToAssistant('123')}>
      View Assistant
    </button>
  );
};
```

### Conditional Redirection

```typescript
// Redirect unauthenticated users to login with return URL
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

// In login page, redirect back after successful login
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleLoginSuccess = async () => {
    await login();
    
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    navigate(from);
  };

  return (
    <div>
      <LoginForm onSuccess={handleLoginSuccess} />
    </div>
  );
};
```

## Link and Navigation Components

### Custom Link Component

```typescript
// src/components/common/NavLink.tsx
import { Link, useLocation } from 'react-router-dom';
import { css } from '@emotion/react';

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  exact?: boolean;
}

export const NavLink: React.FC<NavLinkProps> = ({ to, children, exact = false }) => {
  const location = useLocation();
  
  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      css={css`
        color: ${isActive ? '#0066cc' : '#333'};
        font-weight: ${isActive ? 'bold' : 'normal'};
        text-decoration: none;

        &:hover {
          color: #0066cc;
        }
      `}
    >
      {children}
    </Link>
  );
};
```

### Breadcrumb Navigation

```typescript
// src/components/navigation/Breadcrumb.tsx
import { useLocation, Link } from 'react-router-dom';

interface BreadcrumbItem {
  path: string;
  label: string;
}

const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const parts = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ path: '/', label: 'Home' }];

  let path = '';
  parts.forEach(part => {
    path += `/${part}`;
    breadcrumbs.push({
      path,
      label: part.charAt(0).toUpperCase() + part.slice(1),
    });
  });

  return breadcrumbs;
};

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const breadcrumbs = generateBreadcrumbs(location.pathname);

  return (
    <nav aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.path}>
          {index > 0 && <span> / </span>}
          {index === breadcrumbs.length - 1 ? (
            <span>{crumb.label}</span>
          ) : (
            <Link to={crumb.path}>{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
};
```

## Route State Management

### Persisting Route State

```typescript
// src/hooks/useRouteState.ts
import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Persist state in URL query parameters
 */
export const useRouteState = <T extends Record<string, any>>(
  defaultState: T
): [T, (newState: Partial<T>) => void] => {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse state from query params
  const params = new URLSearchParams(location.search);
  const state: T = {
    ...defaultState,
  };

  Object.keys(defaultState).forEach(key => {
    const value = params.get(key);
    if (value !== null) {
      try {
        state[key as keyof T] = JSON.parse(value);
      } catch {
        state[key as keyof T] = value as any;
      }
    }
  });

  const setState = useCallback(
    (newState: Partial<T>) => {
      const updatedState = { ...state, ...newState };
      const newParams = new URLSearchParams();

      Object.entries(updatedState).forEach(([key, value]) => {
        if (value !== defaultState[key as keyof T]) {
          newParams.set(key, JSON.stringify(value));
        }
      });

      navigate(`?${newParams.toString()}`, { replace: true });
    },
    [state, defaultState, navigate]
  );

  return [state, setState];
};

// Usage
const AssistantListPage: React.FC = () => {
  const [state, setState] = useRouteState({
    page: 1,
    sortBy: 'name',
    filter: 'all',
  });

  return (
    <div>
      <AssistantList
        page={state.page}
        sortBy={state.sortBy}
        filter={state.filter}
        onPageChange={page => setState({ page })}
        onSortChange={sortBy => setState({ sortBy })}
      />
    </div>
  );
};
```

## Route Transitions

### Handling Route Changes

```typescript
// src/hooks/useRouteChanged.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Execute callback when route changes
 */
export const useRouteChanged = (callback: (pathname: string) => void) => {
  const location = useLocation();

  useEffect(() => {
    callback(location.pathname);
  }, [location.pathname, callback]);
};

// Usage
const useScrollToTop = () => {
  useRouteChanged(() => {
    window.scrollTo(0, 0);
  });
};
```

### Page Transitions with Animations

```typescript
// src/components/routes/PageTransition.tsx
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Usage
const App: React.FC = () => (
  <PageTransition>
    <Routes>
      {/* routes */}
    </Routes>
  </PageTransition>
);
```

## Route Metadata

### Document Title Management

```typescript
// src/hooks/useDocumentTitle.ts
import { useEffect } from 'react';

/**
 * Update document title for each page
 */
export const useDocumentTitle = (title: string, suffix = ' | AI Services') => {
  useEffect(() => {
    document.title = `${title}${suffix}`;

    return () => {
      document.title = 'AI Services Platform';
    };
  }, [title, suffix]);
};

// Usage in pages
const DashboardPage: React.FC = () => {
  useDocumentTitle('Dashboard');
  // ...
};
```

### Meta Tags Management

```typescript
// src/hooks/useMetaTags.ts
import { useEffect } from 'react';

interface MetaTags {
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export const useMetaTags = (tags: MetaTags) => {
  useEffect(() => {
    const metaTags: Array<[string, string]> = [
      ['description', tags.description || ''],
      ['keywords', tags.keywords || ''],
      ['og:title', tags.ogTitle || ''],
      ['og:description', tags.ogDescription || ''],
    ];

    metaTags.forEach(([name, content]) => {
      const element = document.querySelector(`meta[name="${name}"]`);
      if (element) {
        element.setAttribute('content', content);
      }
    });

    if (tags.ogImage) {
      const imageElement = document.querySelector('meta[property="og:image"]');
      if (imageElement) {
        imageElement.setAttribute('content', tags.ogImage);
      }
    }
  }, [tags]);
};

// Usage
const AssistantDetailPage: React.FC = () => {
  const { assistantId } = useParams();
  const assistant = useFetchAssistant(assistantId);

  useMetaTags({
    description: `View assistant: ${assistant?.name}`,
    ogTitle: assistant?.name,
    ogDescription: assistant?.description,
  });

  // ...
};
```

## Route Prefetching

### Prefetch Route Data

```typescript
// src/hooks/usePrefetchRoute.ts
import { useCallback } from 'react';
import axios from 'axios';

const cache = new Map<string, Promise<any>>();

export const usePrefetchRoute = () => {
  const prefetch = useCallback((url: string) => {
    if (!cache.has(url)) {
      cache.set(url, axios.get(url));
    }
    return cache.get(url);
  }, []);

  return { prefetch };
};

// Usage in navigation
const NavigationLink: React.FC<{ to: string; onMouseEnter: () => void }> = ({
  to,
  onMouseEnter,
}) => {
  const { prefetch } = usePrefetchRoute();

  return (
    <Link
      to={to}
      onMouseEnter={() => {
        prefetch(`/api${to}`);
        onMouseEnter();
      }}
    >
      Link
    </Link>
  );
};
```

## Route Configuration as Data

```typescript
// src/config/routes.ts
export interface RouteConfig {
  path: string;
  name: string;
  component: React.ComponentType;
  exact?: boolean;
  icon?: React.ReactNode;
  requiredRoles?: string[];
  children?: RouteConfig[];
}

export const navigationRoutes: RouteConfig[] = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardPage,
    icon: <DashboardIcon />,
  },
  {
    path: '/assistants',
    name: 'Assistants',
    component: AssistantsPage,
    icon: <AssistantsIcon />,
    children: [
      {
        path: '/assistants/:id',
        name: 'Assistant Details',
        component: AssistantDetailPage,
      },
    ],
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsPage,
    icon: <SettingsIcon />,
    requiredRoles: ['ADMIN'],
  },
];

// Generate routes from config
const renderRoutes = (routes: RouteConfig[]) =>
  routes.map(route => (
    <Route
      key={route.path}
      path={route.path}
      element={<route.component />}
    >
      {route.children && renderRoutes(route.children)}
    </Route>
  ));
```

## Routing Checklist

- [ ] Protected routes configured for authenticated users
- [ ] Role-based routes for admin features
- [ ] Lazy loading implemented for all pages
- [ ] Breadcrumb navigation present
- [ ] Document titles set per page
- [ ] URL query params preserved when appropriate
- [ ] Return-to-URL after login implemented
- [ ] 404 page configured
- [ ] Mobile navigation working
- [ ] Route transitions smooth
- [ ] Performance optimized (code splitting, prefetching)
- [ ] Deep linking supported

## Related Documentation

- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) - Routing in architecture overview
- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Navigation component patterns
- [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) - Code splitting strategies

