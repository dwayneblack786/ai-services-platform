# Graceful Shutdown & Deployment Guide

This guide documents the graceful shutdown and zero-downtime deployment features implemented for the AI Services Platform.

## Table of Contents

1. [Overview](#overview)
2. [Features Implemented](#features-implemented)
3. [Configuration](#configuration)
4. [Deployment Procedures](#deployment-procedures)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The platform implements comprehensive graceful shutdown mechanisms to ensure:
- **Zero downtime** during deployments
- **Seamless user experience** during maintenance
- **Data integrity** with proper connection cleanup
- **Automatic reconnection** for WebSocket clients

### Architecture Components

- **Node.js Backend** (Express + Socket.IO)
- **Java VA Service** (Spring Boot + gRPC)
- **Frontend** (React with Socket.IO client)
- **Health Checks** (Kubernetes-ready readiness/liveness probes)

---

## Features Implemented

### 1. Node Backend Graceful Shutdown

**Location:** `backend-node/src/index.ts`

The backend implements a comprehensive shutdown sequence:

```typescript
async function gracefulShutdown(signal: string) {
  // 1. Mark server as draining
  serverState = 'draining';
  
  // 2. Notify WebSocket clients (30s warning)
  io.emit('server:maintenance', {
    message: 'Server is shutting down for maintenance',
    reconnectIn: 30000
  });
  
  // 3. Stop accepting new connections
  httpServer.close();
  
  // 4. Wait for active connections to drain (max 30s)
  // ... connection draining logic
  
  // 5. Close Socket.IO connections
  io.close();
  
  // 6. Close MongoDB connection
  await mongoose.connection.close();
  
  // 7. Close Redis connection
  await redisClient.quit();
  
  // 8. Exit process
  process.exit(0);
}
```

**Key Features:**
- 30-second graceful period for active requests
- WebSocket client notification before shutdown
- Proper cleanup of all connections (MongoDB, Redis, Socket.IO)
- Timeout protection to prevent hung processes

**Triggered by:** `SIGTERM` or `SIGINT` signals

---

### 2. Maintenance Mode Middleware

**Location:** `backend-node/src/middleware/maintenance.ts`

Enables planned maintenance windows without deploying code:

```typescript
// Enable maintenance mode
export MAINTENANCE_MODE=true
export MAINTENANCE_END_TIME="2024-12-15T10:00:00Z"

// Restart server
npm run dev
```

**Behavior:**
- Returns `503 Service Unavailable` for all non-health-check requests
- Includes `Retry-After` header with estimated maintenance end time
- Health check endpoints continue functioning (for Kubernetes)
- Automatically calculates retry-after seconds from `MAINTENANCE_END_TIME`

**Response Example:**
```json
{
  "error": "Service Unavailable",
  "message": "Server is currently under maintenance. Please try again later.",
  "maintenanceEndTime": "2024-12-15T10:00:00Z",
  "retryAfter": 3600
}
```

---

### 3. Enhanced Health Checks

**Location:** `backend-node/src/routes/health-routes.ts`

Kubernetes-compatible health endpoints:

#### `/api/health` - Basic Health
Simple check that server is responding.

#### `/api/health/liveness` - Liveness Probe
Determines if container should be restarted.
- Returns `200` if server process is alive

#### `/api/health/readiness` - Readiness Probe
Determines if container should receive traffic.
- Returns `200` if ready to handle requests
- Returns `503` if:
  - Server state is `draining` or `shutdown`
  - MongoDB connection is down

**Kubernetes Configuration:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health/liveness
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  
readinessProbe:
  httpGet:
    path: /api/health/readiness
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
```

---

### 4. Java VA Service Graceful Shutdown

**Location:** `services-java/va-service/src/main/resources/application.yaml`

Spring Boot graceful shutdown configuration:

```yaml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

**Behavior:**
- Waits up to 30 seconds for active requests to complete
- Stops accepting new requests immediately on shutdown signal
- Automatically coordinated with Kubernetes during pod termination

**Custom Cleanup (Optional):**
Add `@PreDestroy` methods for service-specific cleanup:
```java
@PreDestroy
public void onShutdown() {
    logger.info("VA Service shutting down - cleaning up resources");
    // Close gRPC connections, file handles, etc.
}
```

---

### 5. Frontend WebSocket Reconnection

**Location:** `frontend/src/hooks/useSocket.ts`

Enhanced Socket.IO client with maintenance handling:

**Features:**
- **Automatic reconnection** with exponential backoff
- **10 retry attempts** (increased from 5)
- **Maintenance notifications** with countdown timer
- **Auto-reconnect** after maintenance window
- **Visual feedback** via `MaintenanceNotification` component

**Server Maintenance Event:**
```typescript
socket.on('server:maintenance', (data) => {
  // data.message: "Server is shutting down for maintenance"
  // data.reconnectIn: 30000 (milliseconds)
  // data.timestamp: ISO timestamp
  
  // Show notification to user
  // Auto-reconnect after specified delay
});
```

**Component Integration:**
```tsx
const { isReconnecting } = useSocket({
  autoConnect: true,
  onMaintenance: (data) => {
    // Show notification to user
    showNotification(data.message);
  }
});
```

---

### 6. Maintenance Notification UI

**Location:** `frontend/src/components/MaintenanceNotification.tsx`

User-friendly notification component:

**Features:**
- Fixed position (top-right corner)
- Warning severity styling
- Countdown timer display
- Reconnection spinner
- Auto-dismiss on successful reconnection

**Display States:**
1. **Maintenance Warning**: "Server is shutting down for maintenance" + countdown
2. **Reconnecting**: "Reconnecting..." with spinner
3. **Auto-dismiss**: Clears 2 seconds after successful reconnection

---

## Configuration

### Environment Variables

#### Node Backend (`backend-node/.env`)

```bash
# Maintenance Mode
MAINTENANCE_MODE=false
MAINTENANCE_END_TIME=2024-12-15T10:00:00Z

# Session Configuration
SESSION_SECRET=your-secret-key
SESSION_COOKIE_SECURE=true  # Set false in development
SESSION_COOKIE_MAX_AGE=86400000  # 24 hours

# Database
MONGODB_URI=mongodb://localhost:27017/ai_platform
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
NODE_ENV=production
```

#### Frontend (`frontend/.env`)

```bash
VITE_API_URL=http://localhost:3001
VITE_USE_WEBSOCKET=true  # Enable WebSocket by default
```

#### Java VA Service (`services-java/va-service/.env`)

```bash
SERVER_PORT=8136
SPRING_PROFILES_ACTIVE=prod
MONGODB_URI=mongodb://localhost:27017/ai_platform
```

---

## Deployment Procedures

### Rolling Update (Kubernetes)

**Best for:** Zero-downtime production deployments

```bash
# 1. Update container image
kubectl set image deployment/backend-node backend-node=myregistry/backend-node:v1.2.0

# 2. Watch rollout status
kubectl rollout status deployment/backend-node

# 3. Verify health checks
kubectl get pods -l app=backend-node
```

**Kubernetes Deployment Configuration:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-node
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # Keep 2/3 pods running
      maxSurge: 1         # Max 4 pods during update
  template:
    spec:
      containers:
      - name: backend-node
        image: myregistry/backend-node:v1.2.0
        ports:
        - containerPort: 3001
        livenessProbe:
          httpGet:
            path: /api/health/liveness
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/readiness
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              # Grace period before SIGTERM
              command: ["/bin/sh", "-c", "sleep 10"]
      terminationGracePeriodSeconds: 40  # 10s preStop + 30s shutdown
```

**Timeline:**
1. **T+0s**: New pod starts, health checks begin
2. **T+5s**: Readiness probe succeeds, pod receives traffic
3. **T+5s**: Old pod receives SIGTERM (via preStop hook)
4. **T+15s**: Old pod begins graceful shutdown (10s preStop + 5s)
5. **T+15s**: WebSocket clients notified of maintenance
6. **T+45s**: Old pod terminates (30s drain + 15s prep)

---

### Blue-Green Deployment

**Best for:** Risk-averse production changes, easy rollback

```bash
# 1. Deploy green environment (v2)
kubectl apply -f deployment-green-v2.yaml

# 2. Verify green health
kubectl get pods -l version=green

# 3. Switch traffic to green
kubectl patch service backend-node -p '{"spec":{"selector":{"version":"green"}}}'

# 4. Monitor for issues (5-10 minutes)
# If issues detected:
kubectl patch service backend-node -p '{"spec":{"selector":{"version":"blue"}}}'

# 5. Clean up old blue environment
kubectl delete deployment backend-node-blue
```

---

### Maintenance Mode Deployment

**Best for:** Database migrations, schema changes

```bash
# 1. Enable maintenance mode
kubectl set env deployment/backend-node MAINTENANCE_MODE=true
kubectl set env deployment/backend-node MAINTENANCE_END_TIME=2024-12-15T10:00:00Z

# 2. Restart pods to apply env vars
kubectl rollout restart deployment/backend-node

# 3. Perform maintenance (DB migrations, etc.)
npm run migrate:up

# 4. Deploy new version
kubectl set image deployment/backend-node backend-node=myregistry/backend-node:v2.0.0

# 5. Disable maintenance mode
kubectl set env deployment/backend-node MAINTENANCE_MODE=false
kubectl rollout restart deployment/backend-node
```

---

### Local Development Deployment

**Best for:** Testing graceful shutdown locally

```bash
# Terminal 1: Start backend
cd backend-node
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Trigger graceful shutdown
# Press Ctrl+C in Terminal 1
# OR send SIGTERM:
kill -TERM $(pgrep -f "node.*index.ts")

# Observe:
# - Frontend shows "Reconnecting..." notification
# - Backend logs show shutdown sequence
# - All connections properly closed
```

---

## Monitoring

### Key Metrics to Track

#### Server State
```typescript
// Check server state via health endpoint
GET /api/health/detailed

{
  "status": "healthy",  // or "draining", "shutdown"
  "services": {
    "mongodb": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

#### WebSocket Connections
```bash
# Monitor active Socket.IO connections
# Check backend logs for:
[Socket.IO] Client connected: <socket-id>
[Socket.IO] Client disconnected: <socket-id>
```

#### Graceful Shutdown Logs
```bash
# Backend shutdown sequence logs:
SIGTERM signal received - initiating graceful shutdown
Notifying WebSocket clients of maintenance...
Stopping acceptance of new connections...
Connection draining complete. Active: 0, Elapsed: 2543ms
Closing Socket.IO connections...
Closing MongoDB connection...
Closing Redis connection...
Graceful shutdown completed in 5231ms
```

### Prometheus Metrics (Optional)

Add metrics for monitoring:
```typescript
// backend-node/src/metrics.ts
import { Counter, Gauge, Histogram } from 'prom-client';

export const shutdownDuration = new Histogram({
  name: 'shutdown_duration_seconds',
  help: 'Time taken for graceful shutdown'
});

export const activeConnections = new Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections'
});
```

---

## Troubleshooting

### Issue: Shutdown Takes Too Long

**Symptoms:**
- Shutdown exceeds 30-second timeout
- Process killed forcefully by Kubernetes

**Solutions:**
1. Check for stuck connections:
   ```bash
   # During shutdown, check active connections
   netstat -an | grep :3001
   ```

2. Reduce drain timeout:
   ```typescript
   // backend-node/src/index.ts
   const drainTimeout = 15000; // Reduce from 30s to 15s
   ```

3. Force close stuck connections:
   ```typescript
   // Add to graceful shutdown:
   activeConnections.forEach(conn => conn.destroy());
   ```

---

### Issue: WebSocket Clients Not Reconnecting

**Symptoms:**
- Frontend shows "Reconnecting..." indefinitely
- No `server:maintenance` event received

**Solutions:**
1. Verify event emission:
   ```typescript
   // backend-node/src/index.ts
   console.log('Emitting maintenance event to', io.sockets.sockets.size, 'clients');
   io.emit('server:maintenance', { ... });
   ```

2. Check CORS configuration:
   ```typescript
   // backend-node/src/config/socket.ts
   cors: {
     origin: process.env.CLIENT_URL,
     credentials: true  // Must be true
   }
   ```

3. Increase reconnection attempts:
   ```typescript
   // frontend/src/hooks/useSocket.ts
   reconnectionAttempts: 20, // Increase from 10
   reconnectionDelayMax: 10000 // Max 10s delay
   ```

---

### Issue: Health Checks Failing During Deployment

**Symptoms:**
- Readiness probe fails immediately
- Pods not receiving traffic

**Solutions:**
1. Increase `initialDelaySeconds`:
   ```yaml
   readinessProbe:
     initialDelaySeconds: 10  # Increase from 5
   ```

2. Check MongoDB connection:
   ```typescript
   // Verify MongoDB is ready before server starts
   await connectDB();
   await mongoose.connection.db.admin().ping();
   ```

3. Add startup probe for slow starts:
   ```yaml
   startupProbe:
     httpGet:
       path: /api/health/readiness
       port: 3001
     failureThreshold: 30
     periodSeconds: 10
   ```

---

### Issue: Maintenance Mode Not Activating

**Symptoms:**
- `MAINTENANCE_MODE=true` but requests still succeed
- No 503 responses

**Solutions:**
1. Verify environment variable:
   ```bash
   # Check if env var is set
   kubectl exec -it <pod-name> -- env | grep MAINTENANCE_MODE
   ```

2. Restart deployment to apply env vars:
   ```bash
   kubectl rollout restart deployment/backend-node
   ```

3. Check middleware order:
   ```typescript
   // backend-node/src/index.ts
   app.use(correlationIdMiddleware);
   app.use(requestLoggerMiddleware);
   app.use(maintenanceMode);  // MUST be before routes
   app.use('/api/auth', authRoutes);
   ```

---

### Issue: Java VA Service Not Shutting Down Gracefully

**Symptoms:**
- Java service killed immediately on SIGTERM
- gRPC connections not closed properly

**Solutions:**
1. Verify graceful shutdown config:
   ```yaml
   # application.yaml
   server:
     shutdown: graceful  # Must be set
   spring:
     lifecycle:
       timeout-per-shutdown-phase: 30s
   ```

2. Add custom cleanup:
   ```java
   @PreDestroy
   public void cleanup() {
       logger.info("Closing gRPC connections...");
       grpcServer.shutdown();
       grpcServer.awaitTermination(30, TimeUnit.SECONDS);
   }
   ```

3. Increase Kubernetes termination grace period:
   ```yaml
   terminationGracePeriodSeconds: 45  # Give Java more time
   ```

---

## Best Practices

### 1. Always Test Graceful Shutdown Locally

```bash
# Start backend and frontend
npm run dev

# Send SIGTERM and observe logs
kill -TERM $(pgrep -f "node.*index.ts")

# Verify:
# ✓ Frontend shows maintenance notification
# ✓ Backend completes shutdown in <5s
# ✓ No database errors in logs
```

### 2. Monitor Shutdown Duration

Track shutdown times in production:
```typescript
const shutdownStart = Date.now();
// ... shutdown logic ...
const shutdownTime = Date.now() - shutdownStart;
logger.info(`Shutdown completed in ${shutdownTime}ms`);
```

### 3. Use Health Checks in Deployment Pipelines

```yaml
# .github/workflows/deploy.yml
- name: Wait for deployment
  run: |
    kubectl rollout status deployment/backend-node
    kubectl wait --for=condition=ready pod -l app=backend-node --timeout=120s
```

### 4. Document Maintenance Windows

Create calendar invites with:
- Maintenance start/end times
- Expected impact (WebSocket reconnections)
- Rollback procedure
- On-call contact

### 5. Implement Circuit Breakers

Already implemented in the platform:
```typescript
// backend-node/src/services/circuitBreaker.ts
const javaVACircuit = new CircuitBreaker(javaVAClient, {
  timeout: 5000,
  errorThreshold: 50,
  resetTimeout: 30000
});
```

---

## Related Documentation

- [README.md](../README.md) - Project overview and setup
- [backend-node/README.md](../backend-node/README.md) - Backend API documentation
- [services-java/va-service/README.md](../services-java/va-service/README.md) - Java VA service docs
- [Kubernetes Deployment Guide](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

---

## Support

For issues or questions:
1. Check logs: `kubectl logs -f <pod-name>`
2. Check health endpoint: `GET /api/health/detailed`
3. Review shutdown sequence in backend logs
4. Contact DevOps team for infrastructure issues

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Author:** AI Services Platform Team
