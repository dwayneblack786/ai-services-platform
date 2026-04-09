# Backend Debugging Strategies

📚 **Quick Reference Guide for Common Backend Issues**

## Table of Contents
- [Server Startup Issues](#server-startup-issues)
- [Database Connection Problems](#database-connection-problems)
- [Port Binding Errors](#port-binding-errors)
- [Environment Variable Issues](#environment-variable-issues)
- [Memory Leaks and Performance](#memory-leaks-and-performance)
- [Debugging Tools and Techniques](#debugging-tools-and-techniques)

---

## Server Startup Issues

### Problem: Node Backend Crashes on Startup

**Symptoms:**
```
[nodemon] restarting due to changes...
[nodemon] restarting due to changes...
[nodemon] app crashed - waiting for file changes before starting...
```

**Root Causes:**
1. **Uncaught exceptions** not being handled
2. **Port already in use** from previous instance
3. **Nodemon restart loop** from files being modified during startup
4. **Database connection failures** causing silent crashes

**Solution:**

#### 1. Add Global Error Handlers (REQUIRED)

Always add these handlers at the top of your entry file (`src/index.ts`):

```typescript
// Global error handlers - MUST be set before any async operations
process.on('uncaughtException', (error: Error) => {
  logger.error('💥 UNCAUGHT EXCEPTION - Server will shut down', {
    error: error.message,
    stack: error.stack,
    name: error.name
  });
  console.error('\n💥 UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('💥 UNHANDLED REJECTION - Server will shut down', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });
  console.error('\n💥 UNHANDLED REJECTION:', reason);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received - initiating graceful shutdown');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received - initiating graceful shutdown');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
```

#### 2. Add Server Listen Error Handler

Wrap your `server.listen()` call with error handling:

```typescript
httpServer.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV
  });
}).on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use.`, {
      error: error.message,
      port: PORT
    });
    console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
    console.error('   Solutions:');
    console.error(`   1. Kill process: Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force`);
    console.error('   2. Change PORT in .env file');
    console.error('   3. Wait and retry\n');
    process.exit(1);
  } else {
    logger.error('Failed to start server', { 
      error: error.message, 
      code: error.code 
    });
    console.error('\n❌ Server startup failed:', error);
    process.exit(1);
  }
});
```

#### 3. Configure Nodemon Properly

Update `nodemon.json` to prevent restart loops:

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": [
    "src/**/*.spec.ts", 
    "src/**/*.test.ts", 
    "logs/**", 
    "*.log"
  ],
  "exec": "ts-node --transpile-only src/index.ts",
  "delay": 1000,
  "env": {
    "NODE_ENV": "development"
  }
}
```

**Key settings:**
- `delay: 1000` - Wait 1 second before restarting (prevents rapid restarts)
- `ignore: ["logs/**", "*.log"]` - Ignore log files that change during runtime

---

## Port Binding Errors

### Problem: EADDRINUSE Error

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Diagnosis:**

Check which process is using the port:

```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
Get-Process -Id <PID> | Select-Object Name, Id, Path
```

**Solutions:**

**Option 1: Kill the process**
```powershell
# Kill by port
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force

# Kill all node processes
Get-Process node | Stop-Process -Force
```

**Option 2: Change the port**
```bash
# .env file
PORT=5001  # Use a different port
```

**Option 3: Wait for graceful shutdown**
Sometimes the previous instance is shutting down. Wait 5-10 seconds and try again.

---

## Database Connection Problems

### Problem: MongoDB Connection Fails

**Symptoms:**
```
MongoServerError: connect ECONNREFUSED 127.0.0.1:27017
```

**Diagnosis Checklist:**

1. **Is MongoDB running?**
```powershell
# Check MongoDB service
Get-Service MongoDB

# Or check if port 27017 is listening
Get-NetTCPConnection -LocalPort 27017
```

2. **Is the connection string correct?**
```bash
# .env file
MONGODB_URI=mongodb://localhost:27017/ai_platform
```

3. **Check MongoDB logs**
```powershell
# MongoDB log location (adjust path)
Get-Content "C:\Program Files\MongoDB\Server\7.0\log\mongod.log" -Tail 50
```

**Solutions:**

1. **Start MongoDB service:**
```powershell
# Windows
Start-Service MongoDB

# Or use mongod command
mongod --dbpath "C:\data\db"
```

2. **Verify connection with mongo shell:**
```bash
mongosh mongodb://localhost:27017
```

3. **Add retry logic to connection:**
```typescript
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(env.MONGODB_URI);
      logger.info('✓ MongoDB connected');
      return;
    } catch (error) {
      logger.warn(`MongoDB connection attempt ${i + 1}/${retries} failed`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
```

---

## Environment Variable Issues

### Problem: Missing or Invalid Environment Variables

**Symptoms:**
```
❌ Environment validation failed:
   - Missing required environment variable: SESSION_SECRET
```

**Solution:**

1. **Ensure .env file exists:**
```bash
# Check if .env exists
ls .env

# Copy from example if needed
cp .env.example .env
```

2. **Verify all required variables:**

Required variables for backend:
```bash
# .env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai_platform
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-secret-key-min-32-chars-long-for-security
JWT_SECRET=your-jwt-secret-min-32-chars-long
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:5173
```

3. **Generate secure secrets:**
```powershell
# Generate random 64-character secret
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

---

## Memory Leaks and Performance

### Problem: Server Becomes Slow or Crashes Over Time

**Diagnosis:**

1. **Monitor memory usage:**
```typescript
// Add to index.ts
setInterval(() => {
  const usage = process.memoryUsage();
  logger.debug('Memory usage', {
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
    rss: `${Math.round(usage.rss / 1024 / 1024)} MB`
  });
}, 60000); // Every minute
```

2. **Check for event listener leaks:**
```typescript
// Increase limit if needed, but investigate why
require('events').EventEmitter.defaultMaxListeners = 15;

// Log warnings
process.on('warning', (warning) => {
  logger.warn('Process warning', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack
  });
});
```

**Common Causes:**
- Unclosed database connections
- WebSocket connections not cleaned up
- Event listeners not removed
- Large objects not garbage collected
- Circular references

**Solutions:**
- Always close connections in error handlers
- Use `once()` instead of `on()` for one-time events
- Clean up timers with `clearInterval()`
- Remove event listeners when components unmount

---

## Debugging Tools and Techniques

### VS Code Debugging Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Useful Debugging Commands

**Check running processes:**
```powershell
# All node processes
Get-Process node | Format-Table Id, ProcessName, CPU, WS -AutoSize

# With full command line
Get-WmiObject Win32_Process -Filter "name='node.exe'" | Select-Object ProcessId, CommandLine
```

**Monitor port usage:**
```powershell
# Watch port in real-time
while($true) { 
  Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
  Start-Sleep 2
  Clear-Host
}
```

**Test API endpoints:**
```powershell
# Health check
Invoke-RestMethod http://localhost:5000/api/health

# With headers
Invoke-RestMethod http://localhost:5000/api/user `
  -Headers @{ "Authorization" = "Bearer $token" }
```

### Enhanced Logging

Add detailed logging for debugging:

```typescript
// src/middleware/requestLogger.ts
import { v4 as uuidv4 } from 'uuid';

export const correlationIdMiddleware = (req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
};

export const requestLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http('HTTP Request', {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent']
    });
  });
  
  next();
};
```

---

## Quick Troubleshooting Checklist

When backend won't start, check in this order:

1. ✅ **Are global error handlers present?** (`uncaughtException`, `unhandledRejection`)
2. ✅ **Is the port available?** (Check with `Get-NetTCPConnection`)
3. ✅ **Is MongoDB running?** (Check service status)
4. ✅ **Is Redis running?** (Optional in dev, required in prod)
5. ✅ **Are environment variables set?** (Check `.env` file)
6. ✅ **Is nodemon configured correctly?** (Check `nodemon.json`)
7. ✅ **Are dependencies installed?** (`npm install`)
8. ✅ **Check the actual error in logs** (Now it will be visible!)

---

## Related Documentation

- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Frontend error handling strategies
- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) - Backend architecture overview
- [DEVELOPER_SETUP.md](DEVELOPER_SETUP.md) - Initial development setup
- [WEBSOCKET_QUICK_START.md](WEBSOCKET_QUICK_START.md) - WebSocket debugging

---

**Last Updated:** January 22, 2026
**Maintainer:** Development Team
