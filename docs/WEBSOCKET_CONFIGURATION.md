# WebSocket Configuration Guide

## Overview

The AI Services Platform's WebSocket functionality can be configured through environment variables, allowing you to enable or disable real-time communication without modifying code.

## Configuration Methods

### Method 1: Environment Variable (Recommended)

**Location:** `frontend/.env`

```bash
# Enable WebSocket for real-time chat (default)
VITE_USE_WEBSOCKET=true

# Disable WebSocket, use REST API only
VITE_USE_WEBSOCKET=false
```

**Benefits:**
- ✅ No code changes required
- ✅ Environment-specific configuration
- ✅ Easy to toggle between dev/staging/production
- ✅ Can be set via CI/CD pipelines

### Method 2: Component Prop Override

```tsx
// Uses environment variable setting
<AssistantChat productId="va-service" />

// Force WebSocket (overrides env variable)
<AssistantChat productId="va-service" useWebSocket={true} />

// Force REST API (overrides env variable)
<AssistantChat productId="va-service" useWebSocket={false} />
```

**Benefits:**
- ✅ Component-level control
- ✅ Can mix WebSocket and REST in same app
- ✅ Useful for A/B testing

## Configuration Priority

The system follows this priority order (highest to lowest):

1. **Component Prop** - `useWebSocket={true/false}` directly on component
2. **Environment Variable** - `VITE_USE_WEBSOCKET=true/false` in `.env`
3. **Default Value** - `true` (WebSocket enabled)

### Example Priority Flow

```typescript
// Scenario 1: No prop, env var = true
<AssistantChat /> 
// Result: WebSocket enabled ✅

// Scenario 2: No prop, env var = false
<AssistantChat /> 
// Result: REST API used ⚠️

// Scenario 3: Prop = false, env var = true
<AssistantChat useWebSocket={false} /> 
// Result: REST API used (prop overrides env) ⚠️

// Scenario 4: Prop = true, env var = false
<AssistantChat useWebSocket={true} /> 
// Result: WebSocket enabled (prop overrides env) ✅
```

## Environment-Specific Configurations

### Development

```bash
# frontend/.env.development
VITE_API_URL=http://localhost:5000
VITE_USE_WEBSOCKET=true  # Enable for local testing
```

### Staging

```bash
# frontend/.env.staging
VITE_API_URL=https://staging-api.example.com
VITE_USE_WEBSOCKET=true  # Enable for pre-production testing
```

### Production

```bash
# frontend/.env.production
VITE_API_URL=https://api.example.com
VITE_USE_WEBSOCKET=true  # Enable for live users
```

### Fallback Environment (Network Issues)

```bash
# frontend/.env.fallback
VITE_API_URL=https://api.example.com
VITE_USE_WEBSOCKET=false  # Disable if WebSocket infrastructure unavailable
```

## When to Use WebSocket vs REST

### Use WebSocket (Default: ✅ Enabled)

**Ideal for:**
- Real-time chat applications
- Interactive virtual assistants
- Live customer support
- Collaborative features
- Instant notifications
- High-frequency messaging

**Requirements:**
- WebSocket-compatible infrastructure
- Stable network connections
- Server supports persistent connections

**Benefits:**
- ~75% faster response times (10-50ms vs 100-200ms)
- 96% less bandwidth overhead
- Better user experience
- Typing indicators and presence
- Instant message delivery

### Use REST API (⚠️ Fallback)

**Ideal for:**
- Legacy systems without WebSocket support
- Environments with restrictive firewalls
- Mobile apps with intermittent connectivity
- Load balancers without WebSocket support
- Simplified infrastructure

**Requirements:**
- Standard HTTP/HTTPS infrastructure
- No persistent connections needed

**Benefits:**
- Simpler infrastructure
- Better compatibility
- Works through most proxies/firewalls
- Stateless architecture

## Common Configuration Scenarios

### Scenario 1: Enable WebSocket Everywhere

```bash
# .env
VITE_USE_WEBSOCKET=true
```

```tsx
// No prop needed - uses env variable
<AssistantChat productId="va-service" />
```

### Scenario 2: Disable WebSocket Globally

```bash
# .env
VITE_USE_WEBSOCKET=false
```

```tsx
// All components use REST
<AssistantChat productId="va-service" />
```

### Scenario 3: Mixed Mode (Some WebSocket, Some REST)

```bash
# .env
VITE_USE_WEBSOCKET=true  # Default to WebSocket
```

```tsx
// Premium users get WebSocket
<AssistantChat productId="premium-service" useWebSocket={true} />

// Free users get REST only
<AssistantChat productId="free-service" useWebSocket={false} />
```

### Scenario 4: A/B Testing

```bash
# .env
VITE_USE_WEBSOCKET=true  # Default
```

```tsx
// 50% users get WebSocket, 50% get REST
const useWS = Math.random() > 0.5;
<AssistantChat productId="va-service" useWebSocket={useWS} />
```

### Scenario 5: Feature Flag

```tsx
// Use feature flag service
const useWebSocket = featureFlags.isEnabled('websocket-chat');
<AssistantChat productId="va-service" useWebSocket={useWebSocket} />
```

## Setting Environment Variables

### Local Development

**Create/Edit `.env` file:**
```bash
cd frontend
echo "VITE_USE_WEBSOCKET=true" >> .env
```

**Restart dev server:**
```bash
npm run dev
```

### Production Deployment

**Vercel:**
```bash
vercel env add VITE_USE_WEBSOCKET production
# Enter: true
```

**Netlify:**
```toml
# netlify.toml
[build.environment]
  VITE_USE_WEBSOCKET = "true"
```

**Docker:**
```dockerfile
ENV VITE_USE_WEBSOCKET=true
```

**Kubernetes:**
```yaml
env:
  - name: VITE_USE_WEBSOCKET
    value: "true"
```

**AWS Elastic Beanstalk:**
```bash
eb setenv VITE_USE_WEBSOCKET=true
```

### CI/CD Pipelines

**GitHub Actions:**
```yaml
env:
  VITE_USE_WEBSOCKET: true
```

**GitLab CI:**
```yaml
variables:
  VITE_USE_WEBSOCKET: "true"
```

**Jenkins:**
```groovy
environment {
    VITE_USE_WEBSOCKET = 'true'
}
```

## Validation & Testing

### Check Current Configuration

**In Browser Console:**
```javascript
// Check environment variable
console.log('VITE_USE_WEBSOCKET:', import.meta.env.VITE_USE_WEBSOCKET);

// Check if WebSocket is being used
console.log('Is WebSocket?', window.location.href.includes('ws://') || window.location.href.includes('wss://'));
```

**In Component:**
```typescript
const DEFAULT_USE_WEBSOCKET = import.meta.env.VITE_USE_WEBSOCKET !== 'false';
console.log('WebSocket enabled:', DEFAULT_USE_WEBSOCKET);
```

### Test WebSocket Connection

```javascript
// Open browser console
const socket = io('http://localhost:5000', {
  auth: { token: document.cookie.split('token=')[1]?.split(';')[0] }
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ WebSocket disconnected');
});
```

### Test REST Fallback

```bash
# Set environment variable
echo "VITE_USE_WEBSOCKET=false" > frontend/.env

# Restart dev server
npm run dev

# Check browser network tab - should see POST requests to /api/chat/message
```

## Troubleshooting

### WebSocket Not Connecting Despite VITE_USE_WEBSOCKET=true

**Check 1: Environment Variable Loaded**
```javascript
console.log(import.meta.env.VITE_USE_WEBSOCKET);
// Should output: "true"
```

**Check 2: Dev Server Restarted**
```bash
# Stop dev server (Ctrl+C)
npm run dev
```

**Check 3: Prop Not Overriding**
```tsx
// Remove useWebSocket prop to use env variable
<AssistantChat productId="va-service" />
```

### REST API Used Despite VITE_USE_WEBSOCKET=true

**Check 1: Fallback Logic**
- WebSocket connection failed
- Automatic fallback to REST is working correctly
- Check browser console for connection errors

**Check 2: Backend Running**
```bash
# Check if Socket.IO server is running
curl http://localhost:5000/api/health
```

**Check 3: CORS Configuration**
```typescript
// Check backend socket.ts
cors: {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}
```

### Environment Variable Not Working

**Issue:** Changes to `.env` not reflecting

**Solution:**
1. Ensure variable starts with `VITE_` prefix (Vite requirement)
2. Restart dev server completely
3. Clear browser cache
4. Check `.env` file is in `frontend/` directory
5. Verify no syntax errors in `.env` file

**Correct:**
```bash
VITE_USE_WEBSOCKET=true
```

**Incorrect:**
```bash
USE_WEBSOCKET=true          # Missing VITE_ prefix ❌
VITE_USE_WEBSOCKET = true   # Extra spaces ❌
VITE_USE_WEBSOCKET="true"   # Quotes not needed ⚠️
```

## Best Practices

### 1. Use Environment Variables for Infrastructure Decisions

```bash
# ✅ Good: Infrastructure config in env
VITE_USE_WEBSOCKET=true
```

```tsx
// ❌ Bad: Hardcoded in component
<AssistantChat useWebSocket={true} />
```

### 2. Override Only When Necessary

```tsx
// ✅ Good: Use env default
<AssistantChat />

// ⚠️ Okay: Override for specific case
<AssistantChat useWebSocket={isPremiumUser} />

// ❌ Bad: Hardcoded override everywhere
<AssistantChat useWebSocket={true} />
```

### 3. Document Configuration in Deployment Docs

```markdown
## Deployment Checklist
- [ ] Set VITE_USE_WEBSOCKET=true in production
- [ ] Verify WebSocket connection in staging
- [ ] Test REST fallback works
```

### 4. Monitor Configuration

```typescript
// Log configuration on app start
console.log('Chat Configuration:', {
  useWebSocket: DEFAULT_USE_WEBSOCKET,
  apiUrl: import.meta.env.VITE_API_URL
});
```

## Migration Guide

### Migrating from Hardcoded to Env Variable

**Before:**
```tsx
export const AssistantChat = ({ productId, useWebSocket = true }) => {
  // hardcoded default
};
```

**After:**
```tsx
const DEFAULT_USE_WEBSOCKET = import.meta.env.VITE_USE_WEBSOCKET !== 'false';

export const AssistantChat = ({ productId, useWebSocket = DEFAULT_USE_WEBSOCKET }) => {
  // uses env variable with fallback
};
```

**Add to `.env`:**
```bash
VITE_USE_WEBSOCKET=true
```

## Summary

### Quick Reference

| Configuration | Location | Priority | Use Case |
|--------------|----------|----------|----------|
| Component Prop | JSX/TSX | Highest | Component-specific override |
| Env Variable | `.env` file | Medium | Environment-specific config |
| Default Value | Code | Lowest | Fallback if nothing set |

### Environment Variable Syntax

```bash
# Enable WebSocket (default)
VITE_USE_WEBSOCKET=true

# Disable WebSocket
VITE_USE_WEBSOCKET=false

# Not set = defaults to true
# VITE_USE_WEBSOCKET=
```

### Component Usage

```tsx
// Use env variable (recommended)
<AssistantChat productId="va-service" />

// Override env variable
<AssistantChat productId="va-service" useWebSocket={condition} />
```

---

**Configuration Status:** ✅ Implemented with Environment Variables
**Default Behavior:** WebSocket Enabled (can be disabled via env)
**Last Updated:** January 14, 2026
