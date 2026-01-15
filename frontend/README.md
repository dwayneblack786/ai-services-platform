# Client - React Frontend

React TypeScript frontend application with OAuth2 authentication and protected routes.

## Features

- React 18 with TypeScript
- Vite for fast development and builds
- React Router v6 for routing
- Context API for authentication state
- Protected routes
- OAuth2 authentication flow
- Axios for API calls
- Separate style files

## Structure

```
client/
├── src/
│   ├── components/
│   │   └── ProtectedRoute.tsx  # Route protection component
│   ├── context/
│   │   └── AuthContext.tsx     # Authentication context
│   ├── pages/
│   │   ├── Login.tsx           # Login page
│   │   └── Dashboard.tsx       # Dashboard page
│   ├── styles/
│   │   ├── Login.styles.ts     # Login page styles
│   │   └── Dashboard.styles.ts # Dashboard page styles
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # App entry point
│   └── index.css               # Global styles
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the client directory (optional):

```env
VITE_API_URL=http://localhost:5000
```

## Running

### Development Mode

```bash
npm run dev
```

Starts the development server on http://localhost:5173

### Production Build

```bash
npm run build
npm run preview
```

## Pages

### Login Page (`/`)
- Google OAuth login button
- Redirects to dashboard after successful authentication

### Dashboard Page (`/dashboard`)
- Protected route (requires authentication)
- Displays user profile information
- Logout functionality
- Links to Infero API resources

## Authentication Flow

1. User navigates to login page
2. Clicks "Sign in with Google"
3. Redirected to `/api/auth/google` on the Node.js server
4. Google OAuth authentication
5. JWT token stored in HTTP-only cookie
6. Redirected back to dashboard
7. `AuthContext` manages authentication state
8. Protected routes check authentication status

## Protected Routes

The `ProtectedRoute` component wraps routes that require authentication:

```tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

If user is not authenticated, they are redirected to the login page.

## API Communication

The app communicates with the Node.js middleware server (port 5000):

```typescript
axios.get('http://localhost:5000/api/auth/status', {
  withCredentials: true
});
```

The `withCredentials: true` option ensures cookies are sent with requests.

## Styling

Component styles are separated into individual files in the `styles/` directory:

- `Login.styles.ts` - Login page styles
- `Dashboard.styles.ts` - Dashboard page styles

Styles are defined as React CSSProperties objects for type safety.

## Dependencies

- **react** - UI library
- **react-dom** - React DOM rendering
- **react-router-dom** - Routing
- **axios** - HTTP client
- **typescript** - Type safety
- **vite** - Build tool and dev server

## Development

### Hot Module Replacement

Vite provides instant hot module replacement during development. Changes to React components are reflected immediately without full page reload.

### Type Safety

All components are written in TypeScript with proper type annotations. The `shared/types.ts` file contains shared types used across the application.

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory. The build is minified and optimized for performance.

## Environment

The app runs on port 5173 by default and expects:
- Node.js middleware server on port 5000
- Infero API on port 8136 (via middleware proxy)
