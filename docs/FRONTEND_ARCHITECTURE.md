# Frontend Architecture Guide

## Overview

This document describes the overall architecture of the React TypeScript frontend application, including the project structure, component hierarchy, data flow patterns, and architectural decisions.

**Technology Stack:**
- React 18.2.0 with TypeScript 5.3.3
- Vite as the build tool
- Emotion for CSS-in-JS styling
- Socket.IO for real-time communication
- Axios for HTTP requests
- React Router for client-side routing

**Key Principles:**
- Component-based architecture with clear separation of concerns
- Unidirectional data flow with React Context for state management
- Type safety through strict TypeScript mode
- Performance optimization through code splitting and lazy loading
- Accessibility standards compliance (WCAG 2.1 Level AA)

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── common/      # Shared UI components (Button, Modal, etc.)
│   │   ├── auth/        # Authentication-specific components
│   │   ├── layout/      # Layout components (Header, Sidebar, etc.)
│   │   ├── forms/       # Form components
│   │   └── features/    # Feature-specific components
│   ├── context/         # React Context providers
│   │   ├── AuthContext.tsx        # Authentication state
│   │   ├── ThemeContext.tsx       # Theme state (light/dark mode)
│   │   └── NotificationContext.tsx # Toast/notification state
│   ├── hooks/           # Custom React hooks
│   │   ├── useAuth.ts           # Authentication hook
│   │   ├── useApi.ts            # API request hook
│   │   └── useLocalStorage.ts   # Local storage hook
│   ├── services/        # API and external service integrations
│   │   ├── api/                 # API client instances and methods
│   │   ├── auth/                # Authentication service
│   │   └── socket/              # WebSocket/Socket.IO service
│   ├── types/           # TypeScript type definitions
│   │   ├── api.ts              # API response types
│   │   ├── auth.ts             # Authentication types
│   │   └── domain.ts           # Business domain types
│   ├── utils/           # Utility functions and helpers
│   │   ├── formatting.ts       # Date, currency, string formatting
│   │   ├── validation.ts       # Form validation utilities
│   │   └── constants.ts        # Application constants
│   ├── pages/           # Page components (route components)
│   │   ├── AuthPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── styles/          # Global styles and theme
│   │   ├── globals.ts         # Global emotion styles
│   │   ├── theme.ts           # Theme configuration
│   │   └── variables.ts       # Design tokens (colors, spacing, etc.)
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.html       # HTML template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example

```

## Component Architecture

### Component Types

**1. Pages/Routes**
- Top-level components that represent entire routes
- Handle page-level data fetching
- Typically located in `src/pages/`
- Example: `DashboardPage.tsx`

```typescript
// src/pages/DashboardPage.tsx
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    // Page-level data fetching
    fetchDashboardData();
  }, []);

  return (
    <PageLayout>
      <DashboardHeader user={user} />
      <DashboardContent data={data} />
    </PageLayout>
  );
};
```

**2. Feature Components**
- Represent major UI features or sections
- Handle feature-level state and logic
- Can contain multiple sub-components
- Located in `src/components/features/`
- Example: `ChatAssistant.tsx`

```typescript
// src/components/features/ChatAssistant.tsx
interface ChatAssistantProps {
  assistantId: string;
  onMessageSent?: (message: string) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ assistantId, onMessageSent }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const handleSendMessage = async (text: string) => {
    // Handle message sending
    onMessageSent?.(text);
  };

  return (
    <ChatContainer>
      <ChatHistory messages={messages} />
      <ChatInput onSend={handleSendMessage} value={input} onChange={setInput} />
    </ChatContainer>
  );
};
```

**3. Container Components**
- Connect to Context API or external data sources
- Handle data fetching and business logic
- Pass data down to presentational components
- Typically wrap feature components
- Example: `ChatAssistantContainer.tsx`

```typescript
// src/components/features/ChatAssistantContainer.tsx
const ChatAssistantContainer: React.FC<{ assistantId: string }> = ({ assistantId }) => {
  const { user } = useAuth();
  const { data, loading, error } = useApi(`/assistants/${assistantId}`);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBoundary error={error} />;

  return <ChatAssistant assistantId={assistantId} data={data} />;
};
```

**4. Presentational Components**
- Pure components focused on UI rendering
- Receive all data via props
- No side effects or API calls
- Located in `src/components/common/` or feature subdirectories
- Example: `ChatInput.tsx`

```typescript
// src/components/common/ChatInput.tsx
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend, disabled }) => {
  return (
    <InputContainer>
      <StyledInput 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <SendButton onClick={onSend} disabled={disabled || !value.trim()}>
        Send
      </SendButton>
    </InputContainer>
  );
};
```

### Component Hierarchy Example

```
App
├── AuthProvider
│   └── Router
│       ├── PublicLayout
│       │   ├── LoginPage
│       │   └── SignupPage
│       └── ProtectedLayout
│           ├── Header
│           ├── Sidebar
│           ├── MainContent
│           │   ├── DashboardPage
│           │   │   ├── DashboardHeader
│           │   │   └── DashboardGrid
│           │   │       ├── ChatAssistantContainer
│           │   │       │   └── ChatAssistant
│           │   │       │       ├── ChatHistory
│           │   │       │       └── ChatInput
│           │   │       └── StatsCard
│           │   └── SettingsPage
│           │       └── SettingsForm
│           └── Footer
```

## Data Flow Architecture

### Request/Response Flow

```
User Interaction
    ↓
Component Event Handler
    ↓
Service Layer (useApi hook or axios)
    ↓
HTTP Request to Backend
    ↓
Response Handler (success/error)
    ↓
State Update (useState or Context)
    ↓
Component Re-render
```

### Example: Fetching User Data

```typescript
// 1. Service layer - src/services/api/users.ts
export const fetchUserProfile = async (userId: string) => {
  const response = await axios.get(`/api/users/${userId}`);
  return response.data;
};

// 2. Custom hook - src/hooks/useUserProfile.ts
export const useUserProfile = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await fetchUserProfile(userId);
        setUser(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  return { user, loading, error };
};

// 3. Component - src/pages/ProfilePage.tsx
const ProfilePage: React.FC = () => {
  const { user: authUser } = useAuth();
  const { user, loading, error } = useUserProfile(authUser.id);

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ProfileContainer>
      <ProfileHeader user={user} />
      <ProfileContent user={user} />
    </ProfileContainer>
  );
};
```

## Page Layout Patterns

### Public Layout (unauthenticated)

Used for login, signup, and public pages. Minimal navigation, focus on the main content.

```typescript
// src/components/layout/PublicLayout.tsx
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PublicContainer>
      <Header variant="minimal" />
      <MainContent>{children}</MainContent>
      <Footer />
    </PublicContainer>
  );
};
```

### Protected Layout (authenticated)

Used for dashboard, settings, and protected pages. Includes header, sidebar, and main content area.

```typescript
// src/components/layout/ProtectedLayout.tsx
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  return (
    <ProtectedContainer>
      <Header user={user} />
      <MainGrid>
        <Sidebar user={user} />
        <MainContent>{children}</MainContent>
      </MainGrid>
      <Footer />
    </ProtectedContainer>
  );
};
```

## Routing Strategy

**Router Setup (src/App.tsx):**

```typescript
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Routes>
              {/* Public Routes */}
              <Route element={<PublicLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Route>

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<ProtectedLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/assistants" element={<AssistantsPage />} />
                  <Route path="/assistants/:id" element={<AssistantDetailPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/account" element={<AccountPage />} />
                </Route>
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
```

## Performance Considerations

### Code Splitting

Split large routes into separate bundles to reduce initial load time:

```typescript
// src/App.tsx
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AssistantsPage = lazy(() => import('./pages/AssistantsPage'));

// In Routes:
<Suspense fallback={<LoadingSpinner />}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/settings" element={<SettingsPage />} />
</Suspense>
```

### Memoization

Prevent unnecessary re-renders with React.memo and useMemo:

```typescript
// Memoize expensive components
const ChatMessage = React.memo(({ message, userId }: ChatMessageProps) => {
  return <MessageContainer>{message.content}</MessageContainer>;
});

// Memoize expensive calculations
const processedMessages = useMemo(
  () => messages.filter(m => m.userId === userId).sort((a, b) => a.timestamp - b.timestamp),
  [messages, userId]
);
```

### Image Optimization

- Use WebP format with fallbacks
- Implement lazy loading for below-fold images
- Compress images before deployment
- Use appropriate image dimensions for different screen sizes

### Bundle Analysis

Monitor bundle size:

```bash
# Generate bundle analysis report
npm run build:analyze
```

## Error Boundaries

Implement error boundaries to gracefully handle component errors:

```typescript
// src/components/common/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ hasError: true, error });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

Usage:

```typescript
<ErrorBoundary>
  <DashboardPage />
</ErrorBoundary>
```

## Asset Organization

### Images and Icons

```
src/
├── assets/
│   ├── icons/          # SVG icons and icon components
│   ├── images/         # PNG, JPG, WebP images
│   ├── logos/          # Brand logos
│   └── illustrations/  # SVG illustrations
```

### Fonts

- Host fonts locally or use trusted CDN
- Preload critical fonts in `index.html`:

```html
<link rel="preload" as="font" href="/fonts/inter-regular.woff2" type="font/woff2" crossorigin>
```

## Accessibility

### ARIA Labels and Semantic HTML

```typescript
// Use semantic HTML
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/settings">Settings</a></li>
  </ul>
</nav>

// ARIA labels for icons
<button aria-label="Close dialog" onClick={onClose}>
  <CloseIcon />
</button>
```

### Focus Management

```typescript
// Auto-focus input on modal open
const Modal: React.FC<Props> = ({ isOpen }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  return <input ref={inputRef} />;
};
```

### Color Contrast

- Maintain WCAG AA standard contrast ratios (4.5:1 for text)
- Test with accessibility tools (axe DevTools, WAVE)

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- iOS Safari 12+
- Chrome for Android 90+

## Development Workflow

### Starting Development Server

```bash
cd frontend
npm install
npm run dev
```

Server runs at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

### Environment Configuration

Create `.env.local`:

```
VITE_API_URL=http://localhost:5000
VITE_AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Key Architectural Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|-----------|
| Context API for state | Built-in, no external deps | Not optimal for very deep nesting |
| Emotion for styling | CSS-in-JS, type-safe, performant | Bundle size, runtime overhead |
| Vite as bundler | Fast build times, modern ES modules | Less mature than Webpack |
| Custom hooks over libs | Maximum flexibility and control | More code to maintain |
| File-based routing mock | Simpler than learning framework | React Router more powerful |

## Related Documentation

- [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - Context API and state management patterns
- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Common component patterns and best practices
- [HOOKS_CONVENTIONS.md](HOOKS_CONVENTIONS.md) - Custom hooks development guidelines
- [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) - Performance tuning techniques
- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Frontend security considerations
- [API_DESIGN_STANDARDS.md](API_DESIGN_STANDARDS.md) - API integration patterns

## Quick Reference

**Common Tasks:**

| Task | Location | Command |
|------|----------|---------|
| Add new page | `src/pages/` | Import in App.tsx routes |
| Add new component | `src/components/features/` | Build container + presentational split |
| Add new service | `src/services/api/` | Create hook wrapper in `src/hooks/` |
| Add new type | `src/types/` | Import in components and services |
| Global styles | `src/styles/globals.ts` | Use emotion css function |
| Theme values | `src/styles/theme.ts` | Reference in emotion styles |
| Utility functions | `src/utils/` | Pure functions, no side effects |

**Debugging:**
- Enable Redux DevTools for Chrome
- Use React DevTools browser extension
- Check browser console for error messages
- Use `console.log()` with component name prefix: `console.log('[ChatAssistant]', data)`

