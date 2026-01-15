# WebSocket Configuration - Quick Reference

📑 **Table of Contents**
- [🔧 Enable/Disable WebSocket](#-enabledisable-websocket)
  - [Environment Variable (Recommended)](#environment-variable-recommended)
  - [Component Override](#component-override)
- [📋 Configuration Priority](#-configuration-priority)
- [🚀 Quick Start](#-quick-start)
- [📊 Feature Comparison](#-feature-comparison)
- [✅ When to Use WebSocket](#-when-to-use-websocket)
- [⚠️ When to Use REST](#️-when-to-use-rest)
- [🔍 Verify Configuration](#-verify-configuration)
- [🎯 Common Scenarios](#-common-scenarios)
  - [Development (WebSocket ON)](#development-websocket-on)
  - [Production (WebSocket ON)](#production-websocket-on)
  - [Fallback Mode (REST Only)](#fallback-mode-rest-only)
  - [A/B Testing](#ab-testing)
- [🐛 Troubleshooting](#-troubleshooting)
  - [Not working after env change?](#not-working-after-env-change)
  - [Still using REST despite env=true?](#still-using-rest-despite-envtrue)
  - [Want to force REST for testing?](#want-to-force-rest-for-testing)
- [📚 Documentation](#-documentation)

---

## 🔧 Enable/Disable WebSocket

### Environment Variable (Recommended)

**File:** `frontend/.env`

```bash
# Enable WebSocket (default)
VITE_USE_WEBSOCKET=true

# Disable WebSocket (use REST)
VITE_USE_WEBSOCKET=false
```

### Component Override

```tsx
// Use environment variable setting
<AssistantChat productId="va-service" />

// Force WebSocket ON
<AssistantChat productId="va-service" useWebSocket={true} />

// Force WebSocket OFF (REST only)
<AssistantChat productId="va-service" useWebSocket={false} />
```

## 📋 Configuration Priority

1. **Component Prop** (highest) - overrides everything
2. **Environment Variable** - set in `.env` file  
3. **Default** - `true` (WebSocket enabled)

## 🚀 Quick Start

```bash
# 1. Set environment variable
cd frontend
echo "VITE_USE_WEBSOCKET=true" >> .env

# 2. Restart dev server
npm run dev

# 3. Use in component (no prop needed)
<AssistantChat productId="va-service" />
```

## 📊 Feature Comparison

| Feature | WebSocket | REST API |
|---------|-----------|----------|
| **Speed** | ~10-50ms | ~100-200ms |
| **Bandwidth** | Low (~20 bytes) | High (~500 bytes) |
| **Real-time** | ✅ Yes | ❌ No |
| **Typing Indicators** | ✅ Yes | ❌ No |
| **Connection Status** | ✅ Yes | ❌ No |
| **Compatibility** | Most servers | All servers |
| **Firewall Issues** | Possible | Rare |

## ✅ When to Use WebSocket

- Real-time chat applications
- Interactive virtual assistants
- High-frequency messaging
- Need typing indicators
- Need instant updates

## ⚠️ When to Use REST

- Legacy infrastructure
- Restrictive firewalls
- Intermittent connectivity
- Simplified deployment

## 🔍 Verify Configuration

**Browser Console:**
```javascript
// Check env variable
console.log(import.meta.env.VITE_USE_WEBSOCKET);

// Check if connected
// Look for 🟢 Connected in chat header
```

## 🎯 Common Scenarios

### Development (WebSocket ON)
```bash
VITE_USE_WEBSOCKET=true
```

### Production (WebSocket ON)
```bash
VITE_USE_WEBSOCKET=true
```

### Fallback Mode (REST Only)
```bash
VITE_USE_WEBSOCKET=false
```

### A/B Testing
```tsx
const useWS = experimentGroup === 'A';
<AssistantChat useWebSocket={useWS} />
```

## 🐛 Troubleshooting

### Not working after env change?
```bash
# Restart dev server
Ctrl+C
npm run dev
```

### Still using REST despite env=true?
1. Check WebSocket server is running on backend
2. Check browser console for connection errors
3. May have fallen back automatically

### Want to force REST for testing?
```tsx
<AssistantChat useWebSocket={false} />
```

## 📚 Documentation

- **[WEBSOCKET_CONFIGURATION.md](WEBSOCKET_CONFIGURATION.md)** - Full configuration guide
- **[WEBSOCKET_IMPLEMENTATION.md](WEBSOCKET_IMPLEMENTATION.md)** - Technical details
- **[WEBSOCKET_QUICK_START.md](WEBSOCKET_QUICK_START.md)** - Getting started

---

**Default:** WebSocket Enabled (`VITE_USE_WEBSOCKET=true`)
**Fallback:** Automatic REST API if WebSocket fails
