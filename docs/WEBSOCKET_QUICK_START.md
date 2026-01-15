# WebSocket Chat - Quick Start Guide

📑 **Table of Contents**
- [🚀 Quick Start](#-quick-start)
  - [1. Start Backend Server](#1-start-backend-server)
  - [2. Start Frontend](#2-start-frontend)
  - [3. Test the Chat](#3-test-the-chat)
  - [4. Test WebSocket Features](#4-test-websocket-features)
- [🔧 Configuration](#-configuration)
  - [Enable/Disable WebSocket](#enabledisable-websocket)
  - [Environment Variables](#environment-variables)
- [🧪 Testing WebSocket Connection](#-testing-websocket-connection)
  - [Browser Console Test](#browser-console-test)
- [📊 What's Different?](#-whats-different)
  - [Before (REST Only)](#before-rest-only)
  - [After (WebSocket)](#after-websocket)
- [🎯 Key Features Implemented](#-key-features-implemented)
  - [✅ Real-Time Messaging](#-real-time-messaging)
  - [✅ Typing Indicators](#-typing-indicators)
  - [✅ Connection Status](#-connection-status)
  - [✅ Hybrid Architecture](#-hybrid-architecture)
- [🐛 Troubleshooting](#-troubleshooting)
  - [WebSocket Not Connecting](#websocket-not-connecting)
  - [Messages Not Received](#messages-not-received)
  - [Fallback to REST](#fallback-to-rest)
- [📈 Performance Monitoring](#-performance-monitoring)
  - [Check Connection Health](#check-connection-health)
  - [Monitor Active Connections](#monitor-active-connections)
- [🔐 Security](#-security)
  - [Authentication Flow](#authentication-flow)
  - [Best Practices](#best-practices)
- [📚 Additional Resources](#-additional-resources)
- [🎉 Next Steps](#-next-steps)

---

## 🚀 Quick Start

### 1. Start Backend Server

```bash
cd backend-node
npm run dev
```

You should see:
```
Server is running on port 5000
API Documentation available at http://localhost:5000/api-docs
Socket.IO enabled for real-time communication
[Socket.IO] Server initialized
[Chat Socket] Handlers initialized
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

### 3. Test the Chat

1. Open browser at `http://localhost:5173`
2. Log in to the application
3. Navigate to the chat interface
4. Look for connection status in chat header:
   - 🟢 Connected (WebSocket active)
   - 🔴 Disconnected (will fallback to REST)

### 4. Test WebSocket Features

**Real-time Messaging:**
- Type a message and press Send
- Watch for typing indicator animation
- Messages appear instantly without page refresh

**Connection Status:**
- Check header for connection indicator
- Close/reopen browser tab - should reconnect automatically

## 🔧 Configuration

### Enable/Disable WebSocket

**Via Environment Variable (Recommended):**

Edit `frontend/.env`:
```bash
# Enable WebSocket (default)
VITE_USE_WEBSOCKET=true

# Disable WebSocket, use REST API only
VITE_USE_WEBSOCKET=false
```

**Via Component Prop (Override):**
```tsx
// Use default from environment variable
<AssistantChat productId="va-service" />

// Force WebSocket regardless of env variable
<AssistantChat productId="va-service" useWebSocket={true} />

// Force REST API regardless of env variable
<AssistantChat productId="va-service" useWebSocket={false} />
```

### Environment Variables

**backend-node/.env:**
```bash
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-jwt-secret
JAVA_VA_URL=http://localhost:8136
NODE_ENV=development
```

**frontend/.env:**
```bash
VITE_API_URL=http://localhost:5000
VITE_USE_WEBSOCKET=true  # WebSocket enabled by default
```

## 🧪 Testing WebSocket Connection

### Browser Console Test

Open browser console and run:

```javascript
// Get token from cookies
const token = document.cookie
  .split('; ')
  .find(row => row.startsWith('token='))
  ?.split('=')[1];

// Connect to Socket.IO
const socket = io('http://localhost:5000', {
  auth: { token }
});

// Listen for connection
socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});

// Join a test session
socket.emit('chat:join-session', 'test-session-123');

// Send a test message
socket.emit('chat:send-message', {
  sessionId: 'test-session-123',
  message: 'Hello from console!'
});

// Listen for responses
socket.on('chat:message-received', (data) => {
  console.log('📨 Received:', data);
});
```

## 📊 What's Different?

### Before (REST Only)
```
User types → Click Send → HTTP POST → Wait → Response → UI Update
Latency: ~100-200ms
Overhead: ~500 bytes per request
```

### After (WebSocket)
```
User types → Click Send → WebSocket emit → Instant response → UI Update
Latency: ~10-50ms
Overhead: ~20 bytes per message
Features: + Typing indicators + Connection status + Real-time updates
```

## 🎯 Key Features Implemented

### ✅ Real-Time Messaging
- Instant bidirectional communication
- No polling required
- Lower latency than REST

### ✅ Typing Indicators
- Animated dots when assistant is processing
- Shows "Assistant is typing..." with smooth animation

### ✅ Connection Status
- Visual indicators in chat header
- Auto-reconnection on disconnect
- Fallback to REST if WebSocket unavailable

### ✅ Hybrid Architecture
- Session initialization via REST (reliable)
- Message exchange via WebSocket (fast)
- Automatic fallback if WebSocket fails

## 🐛 Troubleshooting

### WebSocket Not Connecting

**Check 1: Backend Running?**
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok","message":"Server is running"}
```

**Check 2: CORS Configuration**
- Verify `CLIENT_URL` in `.env` matches frontend URL
- Check browser console for CORS errors

**Check 3: Authentication**
- Ensure you're logged in
- Check if JWT token exists in cookies:
  ```javascript
  console.log(document.cookie);
  ```

### Messages Not Received

**Check 1: Session Joined?**
```javascript
// Must join session room before sending messages
socket.emit('chat:join-session', sessionId);
```

**Check 2: Event Listeners Active?**
```javascript
// Verify listener is registered
socket.listeners('chat:message-received');
```

**Check 3: Backend Logs**
```bash
# Look for these in backend console:
[Chat Socket] User connected: user@example.com
[Chat Socket] User joined session: abc123
[Chat Socket] Message received: ...
```

### Fallback to REST

If WebSocket fails, the app automatically falls back to REST:

```typescript
// This happens automatically in sendMessage()
if (useWebSocket && socket && isConnected) {
  // Use WebSocket
  socket.emit('chat:send-message', data);
} else {
  // Fallback to REST
  await axios.post('/api/chat/message', data);
}
```

## 📈 Performance Monitoring

### Check Connection Health

```javascript
// Ping test
socket.emit('ping');
socket.on('pong', (data) => {
  console.log('Latency:', Date.now() - data.timestamp, 'ms');
});
```

### Monitor Active Connections

Backend logs show:
```
[Socket.IO] Client connected: abc123 User: user@example.com
[Socket.IO] Client disconnected: abc123 Reason: transport close
```

## 🔐 Security

### Authentication Flow

1. User logs in → Receives JWT token
2. Token stored in httpOnly cookie
3. Frontend sends token in Socket.IO handshake
4. Backend verifies JWT before accepting connection
5. User assigned to specific rooms based on session

### Best Practices

- ✅ JWT tokens expire after 24 hours
- ✅ Tokens verified on every connection
- ✅ User-specific message routing
- ✅ Session-based access control

## 📚 Additional Resources

- **Full Documentation:** [WEBSOCKET_IMPLEMENTATION.md](WEBSOCKET_IMPLEMENTATION.md)
- **Socket.IO Docs:** https://socket.io/docs/
- **Troubleshooting:** Check backend logs and browser console

## 🎉 Next Steps

1. ✅ Test chat with WebSocket enabled
2. ✅ Monitor connection status indicators
3. ✅ Test typing indicators
4. ✅ Test automatic reconnection (close/reopen tab)
5. ⏭️ Implement voice streaming with WebSocket
6. ⏭️ Add file/image sharing support
7. ⏭️ Implement multi-user chat rooms

---

**Status:** ✅ Fully Implemented
**Version:** 1.0.0
**Last Updated:** January 14, 2026
