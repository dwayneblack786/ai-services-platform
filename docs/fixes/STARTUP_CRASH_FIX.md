# Startup Crash Fix - Variable Initialization Order

## Issue
Backend crashed on startup with error:
```
ReferenceError: httpServer is not defined
```

## Root Cause
The graceful shutdown signal handlers (`SIGTERM`, `SIGINT`) were registered **before** `httpServer` and `io` variables were initialized:

```typescript
// ❌ WRONG ORDER (causes crash)
async function gracefulShutdown(signal: string) {
  httpServer.close();  // ← httpServer not yet defined!
  io.emit('...');      // ← io not yet defined!
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));  // ← Registered too early
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ... later in file ...
const httpServer = createServer(app);  // ← Defined here
const io = initializeSocketIO(httpServer);  // ← Defined here
```

## Fix Applied
Moved signal handler registration to **after** server starts:

```typescript
// ✅ CORRECT ORDER
async function gracefulShutdown(signal: string) {
  httpServer.close();
  io.emit('...');
}

const httpServer = createServer(app);
const io = initializeSocketIO(httpServer);

httpServer.listen(PORT, () => {
  logger.info('Server started successfully');
  
  // Register handlers AFTER httpServer and io are initialized
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
});
```

## Prevention Strategy

### 1. Automatic Validation Script
Created `scripts/validate-startup.js` that checks:
- ✓ Variable initialization order
- ✓ Environment configuration
- ✓ Required dependencies
- ✓ Graceful shutdown implementation

**Usage:**
```bash
# Run manually
npm run validate:startup

# Automatically runs before dev server starts
npm run dev  # ← Now includes validation
```

### 2. NPM Script Integration
Updated `package.json`:
```json
{
  "scripts": {
    "dev": "node scripts/validate-startup.js && nodemon src/index.ts",
    "validate:startup": "node scripts/validate-startup.js"
  }
}
```

### 3. Best Practices

#### ✅ DO:
- Register signal handlers **after** all variables are initialized
- Place handler registration inside `httpServer.listen()` callback
- Use validation script before commits
- Document initialization order in comments

#### ❌ DON'T:
- Reference variables before they're declared
- Register signal handlers at module level (top of file)
- Skip validation when making initialization changes

## Testing the Fix

### Test 1: Normal Startup
```bash
npm run dev
# Should see: ✅ ALL CHECKS PASSED - Server is ready to start
# Should see: Server started successfully
# Should see: Graceful shutdown handlers registered
```

### Test 2: Graceful Shutdown
```bash
# Start server
npm run dev

# In another terminal, send SIGTERM
kill -TERM $(Get-Process -Name node | Where-Object {$_.MainWindowTitle -match "nodemon"} | Select-Object -ExpandProperty Id)

# Should see complete shutdown sequence in logs
```

### Test 3: Validation Catches Errors
```bash
# Run validation independently
npm run validate:startup
# Should pass all checks
```

## Related Files Modified

1. **backend-node/src/index.ts**
   - Moved shutdown handler registration to after `httpServer.listen()`
   - Lines changed: 163-164 (removed), 315-318 (added)

2. **backend-node/scripts/validate-startup.js** (NEW)
   - Validates initialization order
   - Checks for common startup issues
   - 160 lines

3. **backend-node/package.json**
   - Added `validate:startup` script
   - Updated `dev` script to run validation first

## Punycode Deprecation Warning

The `DEP0040` punycode warning is **harmless** and comes from dependencies (validator, tr46, whatwg-url). It won't affect functionality and will be resolved when those packages update.

To suppress the warning (optional):
```bash
# Add to your startup command
NODE_OPTIONS=--no-deprecation npm run dev
```

Or add to `.env`:
```bash
NODE_OPTIONS=--no-deprecation
```

## Future-Proofing

This fix pattern applies to any async initialization:

```typescript
// Pattern: Initialize → Start → Register Handlers
const resource1 = await initResource1();
const resource2 = await initResource2();

server.listen(PORT, () => {
  // All resources ready, safe to register handlers
  process.on('SIGTERM', () => cleanup(resource1, resource2));
});
```

## Checklist for Similar Changes

When adding code that runs on signals/events:
- [ ] Identify all variables the handler uses
- [ ] Find where those variables are initialized
- [ ] Register handler AFTER initialization completes
- [ ] Run `npm run validate:startup` to verify
- [ ] Test graceful shutdown manually

---

**Status:** ✅ Fixed and Validated  
**Prevention:** ✅ Automated Checks Added  
**Date:** January 22, 2026
