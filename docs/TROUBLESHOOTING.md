# Troubleshooting Guide

Common issues and solutions for the AI Services Platform.

## Table of Contents
1. [Setup & Installation](#setup--installation)
2. [Authentication Issues](#authentication-issues)
3. [Database Issues](#database-issues)
4. [Service Connectivity](#service-connectivity)
5. [Frontend Issues](#frontend-issues)
6. [Backend Issues](#backend-issues)
7. [Performance Issues](#performance-issues)
8. [WebSocket Issues](#websocket-issues)
9. [Java Services Issues](#java-services-issues)
10. [Getting More Help](#getting-more-help)

---

## Setup & Installation

### Node.js Module Not Found

**Error**: `Cannot find module 'express'`

**Causes**:
- Dependencies not installed
- Wrong directory
- Node version mismatch

**Solutions**:
```bash
# 1. Install dependencies
cd backend-node
npm install

# 2. Verify node version
node --version    # Should be 16+

# 3. Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# 4. Check if module is in package.json
cat package.json | grep express
```

---

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Common on**: All services

**Solutions**:

```bash
# Find process using port (Windows)
netstat -ano | findstr :5000
# Returns: PID <number>
# Kill process
taskkill /PID <number> /F

# Find process (macOS/Linux)
lsof -i :5000
# Returns: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
# Kill process
kill -9 <PID>

# OR: Change port in .env
PORT=5001
```

---

### Java Not Installed

**Error**: `'java' is not recognized as an internal or external command`

**Solutions**:
```bash
# Check installation
java -version

# If not found:
# Windows: choco install openjdk17
# macOS: brew install openjdk@17
# Linux: sudo apt-get install openjdk-17-jdk

# After installation, add to PATH (if needed)
# Windows: setx JAVA_HOME "C:\Program Files\Java\jdk-17"
# Restart terminal
```

---

## Authentication Issues

### Google OAuth Not Working

**Error**: `Unauthorized redirect URI` or `No matching OAuth credentials`

**Causes**:
- Wrong Google OAuth credentials
- Redirect URI mismatch
- Browser cookies disabled

**Solutions**:

```bash
# 1. Verify .env has correct credentials
cat backend-node/.env | grep GOOGLE
# Should have:
# GOOGLE_CLIENT_ID=xxx
# GOOGLE_CLIENT_SECRET=xxx

# 2. Get correct credentials
# → Google Cloud Console
# → Create OAuth 2.0 Web Application credentials
# → Add redirect URI: http://localhost:5000/api/auth/google/callback

# 3. Check redirect URL in .env
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
# Must match exactly in Google console

# 4. Clear browser cookies
# DevTools → Application → Cookies → Delete all
```

---

### Login Stuck on Google Screen

**Symptoms**: Redirected to Google login but doesn't return

**Causes**:
- Backend not running
- CORS configuration issue
- Network connectivity

**Solutions**:
```bash
# 1. Verify backend is running
curl http://localhost:5000/api/health
# Should return: {"status":"ok"}

# 2. Check CORS configuration
# backend-node/src/index.ts should have:
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

# 3. Verify CLIENT_URL in .env
# frontend: VITE_API_URL=http://localhost:5000
# backend: CLIENT_URL=http://localhost:5173

# 4. Clear cookies and try again
# Chrome DevTools → Application → Cookies → Delete domain cookies
```

---

### "Invalid Token" Error

**Error**: `401 Unauthorized - Invalid token`

**Causes**:
- Token expired (24 hours)
- JWT_SECRET changed
- Token corrupted

**Solutions**:
```bash
# 1. Clear cookies
# DevTools → Application → Cookies → Delete 'token'

# 2. Login again
# Fresh token will be created

# 3. Check JWT_SECRET hasn't changed
cat backend-node/.env | grep JWT_SECRET
# Should be consistent

# 4. If token still fails after login:
# → Restart backend
npm run dev
```

---

### Session Lost After Refresh

**Symptoms**: Page refreshes → Logged out

**Causes**:
- Cookie not set correctly
- CORS credentials not included
- httpOnly cookie issue

**Solutions**:
```bash
# 1. Verify axios sends credentials
# frontend/src/main.tsx should have:
axios.defaults.withCredentials = true

# 2. Check backend cookie settings
// backend-node/src/routes/auth.ts
res.cookie('token', jwtToken, {
  httpOnly: true,
  secure: true,  // Only in production
  sameSite: 'strict'
});

# 3. In development, set secure: false
// Since we use http://localhost:5000
res.cookie('token', jwtToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
});

# 4. Clear all cookies and login again
```

---

## Database Issues

### MongoDB Connection Refused

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:27017`

**Causes**:
- MongoDB not running
- Wrong connection string
- Port mismatch

**Solutions**:
```bash
# 1. Check if MongoDB is running
mongosh
# If fails, start MongoDB:

# Windows (as service)
net start MongoDB
# Or run mongod.exe manually

# macOS
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Linux (without systemd)
mongod &

# 2. Verify connection
mongosh --eval "db.adminCommand('ping')"
# Should return: { ok: 1 }

# 3. Check MONGODB_URI in .env
cat backend-node/.env | grep MONGODB
# Should be: mongodb://localhost:27017/ai_platform

# 4. Test connection from backend
curl http://localhost:5000/api/health
# Should connect and return { status: 'ok' }
```

---

### "Cannot read collections" Error

**Error**: `Error: Cannot access database collections`

**Causes**:
- Database doesn't exist
- Collections not created
- Connection not established

**Solutions**:
```bash
# 1. Create database and collections
mongosh

# In mongosh shell:
use ai_platform

# Create collections with schema validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'tenantId'],
      properties: {
        email: { bsonType: 'string' },
        tenantId: { bsonType: 'objectId' }
      }
    }
  }
})

# 2. Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ tenantId: 1 })
db.products.createIndex({ tenantId: 1 })

# 3. Verify collections created
show collections
# Should list: users, products, etc.
```

---

### Slow Queries

**Symptoms**: API responses take 5+ seconds

**Causes**:
- Missing indexes
- Large collection scans
- Network latency

**Solutions**:
```bash
# 1. Check if indexes exist
mongosh
db.products.getIndexes()
# Should show indexes on tenantId, userId, etc.

# 2. Create missing indexes
db.products.createIndex({ tenantId: 1 })
db.products.createIndex({ tenantId: 1, productId: 1 })

# 3. Run explain on slow query
db.products.find({ tenantId: 'abc' }).explain('executionStats')
# If executionStage is COLLSCAN → missing index

# 4. Monitor MongoDB performance
# In local MongoDB, use:
db.currentOp()  # Shows running operations
```

---

### "Duplicate Key Error"

**Error**: `E11000 duplicate key error`

**Causes**:
- Unique index violated (e.g., email)
- Data migration issue

**Solutions**:
```bash
# 1. Check unique indexes
mongosh
db.users.getIndexes()
# Look for unique: true

# 2. Find duplicate
db.users.find({ email: 'duplicate@example.com' }).count()

# 3. Remove duplicate (if test data)
db.users.deleteOne({ _id: ObjectId('...') })

# 4. Or drop collection and reseed
db.users.drop()
# Then run: npm run seed:prompts
```

---

## Service Connectivity

### Backend Cannot Connect to Java Service

**Error**: `Error connecting to gRPC service localhost:8136`

**Causes**:
- Java service not running
- Port mismatch
- Firewall blocking

**Solutions**:
```bash
# 1. Verify Java service is running
curl http://localhost:8136/api/health
# Should return successful response

# 2. Start Java service if not running
cd services-java/va-service
./mvnw spring-boot:run

# 3. Check port configuration
# backend-node/.env should have:
JAVA_SERVICE_PORT=8136

# 4. Check firewall
# macOS: System Preferences → Security & Privacy
# Windows: Windows Defender Firewall → Allow apps
# Linux: sudo ufw allow 8136
```

---

### Frontend Cannot Connect to Backend

**Error**: `Error connecting to API: Network Error`

**Causes**:
- Backend not running
- Wrong API URL
- CORS issue

**Solutions**:
```bash
# 1. Verify backend is running
curl http://localhost:5000/api/health

# 2. Check VITE_API_URL in frontend/.env
cat frontend/.env
# Should be: VITE_API_URL=http://localhost:5000

# 3. Check backend CLIENT_URL
cat backend-node/.env
# Should be: CLIENT_URL=http://localhost:5173

# 4. Check CORS settings in backend
# src/index.ts should allow frontend origin:
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

# 5. Start services in correct order
# 1. mongod
# 2. npm run dev (backend)
# 3. npm run dev (frontend)
```

---

## Frontend Issues

### Blank Page or "Cannot GET /"

**Error**: Browser shows blank page or Cannot GET /

**Causes**:
- Frontend not running
- Vite not building
- TypeScript errors

**Solutions**:
```bash
# 1. Check frontend is running
npm run dev
# Should show: ➜  Local:   http://localhost:5173/

# 2. Check for TypeScript errors
npm run type-check
# Fix any reported errors

# 3. Clear cache and rebuild
rm -rf dist node_modules
npm install
npm run dev

# 4. Check browser console for errors
# Open DevTools (F12) → Console tab
# Look for red errors
```

---

### "AuthContext not found" Error

**Error**: `Error: useAuth must be used within an AuthProvider`

**Causes**:
- Component not wrapped in AuthProvider
- AuthProvider import missing

**Solutions**:
```typescript
// ❌ Wrong
function MyComponent() {
  const { user } = useAuth();  // Error!
}

// ✅ Correct - AuthProvider wraps entire app
function App() {
  return (
    <AuthProvider>
      <MyComponent />
    </AuthProvider>
  );
}

// Check App.tsx has AuthProvider:
// src/App.tsx → Should wrap Router with AuthProvider
```

---

### Form Not Submitting

**Symptoms**: Click submit button → Nothing happens

**Causes**:
- Event preventDefault not called
- Validation failing silently
- API call failing

**Solutions**:
```typescript
// Check form has onSubmit
<form onSubmit={handleSubmit}>
  {/* form fields */}
</form>

// Check handler prevents default
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();  // ← Critical
  // Submit logic
};

// Check for validation errors in console
// DevTools → Console → Look for validation messages
```

---

### Styles Not Applied

**Symptoms**: Component looks unstyled

**Causes**:
- Emotion CSS-in-JS not working
- Style file not imported
- CSS specificity issue

**Solutions**:
```typescript
// Check import
import styled from '@emotion/styled';

// Check style is applied
const Container = styled.div`
  padding: 20px;
  background: white;
`;

// Check element uses styled component
<Container>Content</Container>  // ✅ Correct

// If using separate style files
import { styles } from './MyComponent.styles';
<div style={styles.container}>Content</div>

// Check styles.ts file exists
// src/styles/MyComponent.styles.ts
```

---

## Backend Issues

### Express Route Not Found

**Error**: `404 Not Found` or `Cannot POST /api/endpoint`

**Causes**:
- Route not registered
- Wrong path
- Method mismatch (POST vs GET)

**Solutions**:
```typescript
// 1. Verify route is registered in src/index.ts
import myRoutes from './routes/my-routes';
app.use('/api', myRoutes);

// 2. Verify route path is correct
// routes/my-routes.ts should have:
router.post('/endpoint', handler);
// URL becomes: POST /api/endpoint

// 3. Check request method matches
curl -X POST http://localhost:5000/api/endpoint

// 4. Test with Postman or Thunder Client
// Set method: POST
// URL: http://localhost:5000/api/endpoint
```

---

### "Cannot read property 'tenantId' of undefined"

**Error**: `TypeError: Cannot read property 'tenantId' of undefined at req.tenantId`

**Causes**:
- Middleware not executed
- JWT not verified
- Request context lost

**Solutions**:
```typescript
// Check middleware order (auth before route)
app.use(authenticateToken);  // ← Must come first
app.use('/api', routes);     // ← Then routes

// Verify middleware sets tenantId
// middleware/auth.ts should have:
req.tenantId = decoded.tenantId;  // ← Sets it

// Check route handler receives it
router.get('/products', (req, res) => {
  console.log(req.tenantId);  // Should not be undefined
});

// If still undefined, check JWT structure
// The token payload should include tenantId
```

---

### Database Query Returns Empty

**Symptoms**: Query executes but returns no results

**Causes**:
- TenantId filter excludes results
- Document doesn't exist
- Query syntax error

**Solutions**:
```bash
# 1. Check data exists in MongoDB
mongosh
use ai_platform
db.products.find({ tenantId: 'your-tenant-id' })

# 2. If empty, insert test data
db.products.insertOne({
  tenantId: 'test-tenant',
  name: 'Test Product',
  price: 99.99
})

# 3. Check query syntax
// Correct: { tenantId: '123' }
// Wrong: { tenantId: { $eq: '123' } } (in simple cases)

# 4. Run seed script to populate data
cd backend-node
npm run seed:prompts
```

---

## Performance Issues

### API Response Time > 1 Second

**Symptoms**: Requests take 5+ seconds

**Causes**:
- Missing database indexes
- Large result sets
- N+1 query problem

**Solutions**:
```bash
# 1. Create missing indexes
mongosh
db.products.createIndex({ tenantId: 1 })

# 2. Check query using explain
db.products.find({ tenantId: 'abc' }).explain('executionStats')
# executionStage should be IXSCAN, not COLLSCAN

# 3. Limit result set
// ✅ Good
db.products.find().limit(100)

// ❌ Bad
db.products.find()  // Returns all documents

# 4. Avoid N+1 queries
// ❌ N+1 problem
const products = db.products.find();
products.forEach(p => {
  db.categories.findOne({ _id: p.categoryId });  // Query per product!
});

// ✅ Good
const categories = db.categories.find();
const categoryMap = new Map(categories.map(c => [c._id, c]));
products.forEach(p => {
  const category = categoryMap.get(p.categoryId);
});
```

---

### Memory Leak

**Symptoms**: Memory usage increases over time

**Causes**:
- Event listeners not removed
- Circular references
- Socket connections not closed

**Solutions**:
```typescript
// React hooks: Clean up effects
useEffect(() => {
  socket.on('message', handler);
  
  return () => {
    socket.off('message', handler);  // ← Clean up
  };
}, []);

// Node.js: Close connections
server.on('request', (req, res) => {
  // ...
  res.on('end', () => {
    socket.destroy();  // ← Close socket
  });
});

// Check for memory leaks
// Node.js: node --inspect-brk app.js
// Chrome DevTools: chrome://inspect
```

---

## WebSocket Issues

### WebSocket Connection Fails

**Error**: `WebSocket connection to 'ws://localhost:5000/socket.io' failed`

**Causes**:
- Socket.IO not initialized
- Port mismatch
- CORS issue

**Solutions**:
```bash
# 1. Verify backend initializes Socket.IO
# backend-node/src/index.ts should have:
import { initializeSocketIO } from './config/socket';
initializeSocketIO(server);

# 2. Check Socket.IO port
# Should use same port as backend (5000)

# 3. Check CORS config for WebSocket
// socket.ts should have:
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
});

# 4. Verify frontend connects
// frontend/src/hooks/useSocket.ts
const serverUrl = 'http://localhost:5000';
const socket = io(serverUrl, { withCredentials: true });
```

---

### Messages Not Being Received

**Symptoms**: Send message but don't receive response

**Causes**:
- Listener not registered
- Room not joined
- Event name mismatch

**Solutions**:
```typescript
// 1. Register listener before emitting
socket.on('message:received', (msg) => {
  console.log('Received:', msg);
});

// 2. Join room
socket.emit('chat:join-session', { sessionId: '123' });

// 3. Verify event names match
// Emit: socket.emit('chat:send-message', data)
// Listen: socket.on('chat:send-message', ...)  // ✅ Exact match

// 4. Check server handler exists
// backend/sockets/chat-socket.ts should have:
socket.on('chat:send-message', (data) => {
  // Handle message
});
```

---

## Java Services Issues

### Java Service Won't Start

**Error**: `Command failed: ./mvnw spring-boot:run`

**Causes**:
- Java not installed
- Port in use
- Build error

**Solutions**:
```bash
# 1. Verify Java installation
java -version  # Should show Java 17+

# 2. Check if port 8136 is in use
lsof -i :8136  # macOS/Linux
netstat -ano | findstr :8136  # Windows

# 3. Clean and rebuild
cd services-java/va-service
./mvnw clean install
./mvnw spring-boot:run

# 4. Check for build errors
./mvnw compile
# Fix any reported compilation errors
```

---

### Java Service Cannot Connect to MongoDB

**Error**: `Failed to initialize MongoDB connection`

**Causes**:
- MongoDB not running
- Connection string wrong
- Authentication failed

**Solutions**:
```bash
# 1. Verify MongoDB is running
mongosh
# If fails, start MongoDB

# 2. Check application.yaml in va-service
# src/main/resources/application.yaml should have:
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/ai_platform

# 3. Test connection from Java
// In Java code:
MongoClient client = MongoClients.create("mongodb://localhost:27017");
MongoDatabase db = client.getDatabase("ai_platform");
System.out.println(db.listCollectionNames());
```

---

## Getting More Help

### Check Application Logs

**Frontend**:
```
Chrome DevTools → Console tab (F12)
Look for red errors and warning messages
```

**Backend**:
```
Terminal output from: npm run dev
Look for [error] logs and stack traces
```

**Java Services**:
```
Terminal output from: ./mvnw spring-boot:run
Look for ERROR level logs
```

**MongoDB**:
```bash
# Windows service logs
Event Viewer → Windows Logs → Application

# Manual mongod logs
# Check terminal where mongod is running
```

---

### Enable Debug Logging

**Backend**:
```env
# .env
LOG_LEVEL=debug
```

**Frontend**:
```typescript
// React DevTools
// Get extension from Chrome Web Store
// Allows inspecting components and props
```

**Java**:
```xml
<!-- application.yaml -->
logging:
  level:
    root: DEBUG
    com.infero: DEBUG
```

---

### Still Stuck?

1. **Check Documentation**:
   - [DEVELOPER_SETUP.md](DEVELOPER_SETUP.md)
   - [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md)
   - [COMPONENT_INTEGRATION_GUIDE.md](../COMPONENT_INTEGRATION_GUIDE.md)

2. **Search Logs**: Look for error messages that mention:
   - File path
   - Function name
   - Error code

3. **Test in Isolation**:
   - Can you connect to MongoDB directly?
   - Can you call backend API with curl?
   - Can you start frontend independently?

4. **Ask for Help**: Include:
   - Full error message
   - Steps to reproduce
   - Output of: `node -v`, `npm -v`, `java -version`, `mongosh --version`
   - Last few lines of logs

