# Phase 1 Testing Checklist

## Prerequisites

### 1. Redis Running
```powershell
# Start Redis (from start-app.ps1)
redis-server --port 6379

# Verify Redis is running
redis-cli ping
# Expected: PONG
```

### 2. MongoDB Running
```powershell
# Verify MongoDB connection
# Should already be running from your normal setup
```

### 3. Server Running
```bash
cd product-management/backend-node
npm run dev
```

### 4. Get Authentication Token
```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Save the token from response
export JWT_TOKEN="eyJhbGc..."
```

---

## Test Scenarios

### ✅ Test 1: Create Signup Session

**Request**:
```bash
curl -X POST http://localhost:3000/api/product-signup/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "productId": "69728bdb0959e1a2da517685",
    "selectedTier": "small"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "sessionId": "sess_1234567890_abc123...",
  "resumeToken": "def456...xyz789",
  "expiresAt": "2026-02-16T21:00:00.000Z",
  "product": {
    "_id": "69728bdb0959e1a2da517685",
    "name": "Healthcare Virtual Assistant",
    "description": "..."
  }
}
```

**Verify in Redis**:
```bash
redis-cli KEYS "signup-session:*"
# Should show: signup-session:sess_1234567890_abc123...

redis-cli GET "signup-session:sess_1234567890_abc123..."
# Should show session JSON with userId, productId, etc.

redis-cli TTL "signup-session:sess_1234567890_abc123..."
# Should show ~3600 seconds (1 hour)
```

**Verify in MongoDB**:
```javascript
db.product_signup_sessions.find({}).sort({createdAt:-1}).limit(1).pretty()
// Should show the session with correct data
```

**Save sessionId for next tests**:
```bash
export SESSION_ID="sess_1234567890_abc123..."
export RESUME_TOKEN="def456...xyz789"
```

---

### ✅ Test 2: Get Session State

**Request**:
```bash
curl -X GET "http://localhost:3000/api/product-signup/session/$SESSION_ID" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "session": {
    "sessionId": "sess_...",
    "userId": "...",
    "tenantId": "...",
    "productId": "...",
    "currentStep": "initiated",
    "lockedPrice": 99.99,
    "currency": "USD",
    "expiresAt": "..."
  },
  "product": { /* product details */ }
}
```

---

### ✅ Test 3: Update to Payment Validated Step

**Request**:
```bash
curl -X PATCH "http://localhost:3000/api/product-signup/session/$SESSION_ID/step" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "step": "payment-validated",
    "data": {
      "paymentMethodId": "pm_test_12345",
      "termsAccepted": true
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "session": {
    "currentStep": "payment-validated",
    "paymentMethodId": "pm_test_12345",
    "termsAccepted": true,
    "lastAccessedAt": "..."
  }
}
```

**Verify in MongoDB** (should be persisted since step=payment-validated):
```javascript
db.product_signup_sessions.findOne({sessionId: "sess_..."})
// Should show currentStep: "payment-validated"
```

---

### ✅ Test 4: Resume Token Validation

**Request**:
```bash
curl -X GET "http://localhost:3000/api/product-signup/resume/$RESUME_TOKEN"
```

**Expected Response (First Use)**:
```json
{
  "success": true,
  "session": { /* session data */ },
  "redirectUrl": "/products/.../signup?session=...&step=payment-validated",
  "product": { "_id": "...", "name": "..." }
}
```

**Verify Token Marked as Used**:
```bash
redis-cli GET "resume-token:$RESUME_TOKEN"
# Should be empty (deleted after use)
```

**Request (Second Use - Should Fail)**:
```bash
curl -X GET "http://localhost:3000/api/product-signup/resume/$RESUME_TOKEN"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Resume token expired or already used",
  "startOver": true
}
```

---

### ✅ Test 5: Payment Replay Protection

**Request (First Attempt)**:
```bash
# Note: This is tested indirectly via the complete endpoint
# We'll test it in Test 7
```

---

### ✅ Test 6: Rate Limiting

**Create 5 Sessions**:
```bash
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/product-signup/initiate \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{"productId":"69728bdb0959e1a2da517685","selectedTier":"small"}'
  sleep 1
done
```

**6th Session Should Fail**:
```bash
curl -X POST http://localhost:3000/api/product-signup/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"productId":"69728bdb0959e1a2da517685","selectedTier":"small"}'
```

**Expected Response**:
```json
{
  "error": "Rate limit exceeded. Maximum 5 sessions per hour."
}
```

**Verify in Redis**:
```bash
redis-cli GET "session-rate-limit:YOUR_USER_ID"
# Should show: 6

redis-cli TTL "session-rate-limit:YOUR_USER_ID"
# Should show remaining seconds until reset
```

---

### ✅ Test 7: Complete Signup (Full Flow)

**Prerequisites**:
1. Create a fresh session
2. Update to payment-validated step
3. Ensure you have a payment method in your account

**Request**:
```bash
curl -X POST "http://localhost:3000/api/product-signup/session/$SESSION_ID/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "subscription": {
    "_id": "sub_123...",
    "status": "active",
    "amount": 99.99,
    "billingCycle": "monthly",
    "nextBillingDate": "2026-03-16",
    "signupSessionId": "sess_..."
  },
  "transaction": {
    "transactionId": "TXN-...",
    "status": "success",
    "amount": 99.99
  },
  "userProduct": {
    "accessLevel": "full",
    "status": "active"
  },
  "provisionedPrompts": {
    "newCount": 2,
    "templates": [
      { "channelType": "voice", "promptId": "...", "name": "..." },
      { "channelType": "chat", "promptId": "...", "name": "..." }
    ]
  },
  "redirectUrl": "/products/69728bdb0959e1a2da517685/configure"
}
```

**Verify Subscription Created**:
```javascript
db.product_subscriptions.findOne({signupSessionId: "sess_..."})
```

**Verify Transaction Created**:
```javascript
db.transactions.findOne({"metadata.sessionId": "sess_..."})
```

**Verify User Product Access**:
```javascript
db.user_products.findOne({userId: ObjectId("YOUR_USER_ID"), productId: ObjectId("69728bdb0959e1a2da517685")})
```

**Verify Prompts Provisioned**:
```javascript
db.prompt_versions.find({tenantId: "YOUR_TENANT_ID", productId: ObjectId("69728bdb0959e1a2da517685"), isTemplate: false})
// Should show 2 prompts: voice + chat
```

**Verify Session Marked Complete**:
```bash
redis-cli GET "signup-session:$SESSION_ID"
# Should show completedSubscriptionId field
```

---

### ✅ Test 8: Idempotency (Complete Twice)

**Request (Second Complete Call)**:
```bash
curl -X POST "http://localhost:3000/api/product-signup/session/$SESSION_ID/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "alreadyCompleted": true,
  "subscription": { /* same subscription as before */ },
  "redirectUrl": "/products/.../configure"
}
```

**Verify No Duplicate Subscription**:
```javascript
db.product_subscriptions.count({userId: ObjectId("YOUR_USER_ID"), productId: ObjectId("69728bdb0959e1a2da517685"), status: "active"})
// Should show: 1 (not 2!)
```

---

### ✅ Test 9: Cancel Session

**Create New Session**:
```bash
# First create a new session (see Test 1)
export NEW_SESSION_ID="sess_new..."
```

**Cancel It**:
```bash
curl -X POST "http://localhost:3000/api/product-signup/session/$NEW_SESSION_ID/cancel" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Signup cancelled successfully"
}
```

**Verify Cancellation**:
```bash
redis-cli GET "signup-session:$NEW_SESSION_ID"
# Should show cancelledAt timestamp
```

---

### ✅ Test 10: Check Active Session

**Request**:
```bash
curl -X GET "http://localhost:3000/api/product-signup/active/69728bdb0959e1a2da517685" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response (If Active Session Exists)**:
```json
{
  "success": true,
  "hasActiveSession": true,
  "session": { /* session data */ }
}
```

**Expected Response (No Active Session)**:
```json
{
  "success": true,
  "hasActiveSession": false
}
```

---

## Edge Cases to Test

### ❌ Test 11: Unauthorized Session Access

**Try to access another user's session**:
```bash
# This requires knowing another user's session ID
# Expected: 403 Forbidden
```

### ❌ Test 12: Invalid Product ID

**Request**:
```bash
curl -X POST http://localhost:3000/api/product-signup/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"productId":"invalid-id","selectedTier":"small"}'
```

**Expected**: Error about product not found

### ❌ Test 13: Inactive Product

**Request**:
```bash
# Use a product with status !== 'active'
# Expected: Error about product not being active
```

### ❌ Test 14: Invalid Pricing Tier

**Request**:
```bash
curl -X POST http://localhost:3000/api/product-signup/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"productId":"69728bdb0959e1a2da517685","selectedTier":"invalid-tier"}'
```

**Expected**: Error about invalid pricing tier

### ❌ Test 15: Session Expiration

**Create Session and Wait 61 Minutes**:
```bash
# Not practical for manual testing
# Use Redis CLI to manually expire:
redis-cli EXPIRE "signup-session:$SESSION_ID" 1
sleep 2

# Now try to complete the session
curl -X POST "http://localhost:3000/api/product-signup/session/$SESSION_ID/complete" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected**: Error about session expired

---

## Cleanup After Testing

**Clear Redis Test Data**:
```bash
redis-cli KEYS "signup-session:*" | xargs redis-cli DEL
redis-cli KEYS "resume-token:*" | xargs redis-cli DEL
redis-cli KEYS "session-rate-limit:*" | xargs redis-cli DEL
```

**Clear MongoDB Test Data**:
```javascript
// Only if these were test sessions
db.product_signup_sessions.deleteMany({tenantId: "your-test-tenant"})
db.product_subscriptions.deleteMany({tenantId: "your-test-tenant"})
db.transactions.deleteMany({tenantId: "your-test-tenant"})
db.user_products.deleteMany({tenantId: "your-test-tenant"})
```

---

## Success Criteria

✅ All positive tests pass
✅ All edge case tests return appropriate errors
✅ Redis keys have correct TTLs
✅ MongoDB persisted data is accurate
✅ No duplicate subscriptions created
✅ Prompts provisioned correctly
✅ Security features working (rate limit, ownership, replay protection)

---

## If Tests Fail

1. **Check Server Logs**:
   ```bash
   # Look for errors in console output
   ```

2. **Check Redis Connection**:
   ```bash
   redis-cli ping
   ```

3. **Check MongoDB Connection**:
   ```bash
   # Verify MongoDB is running
   ```

4. **Verify Authentication**:
   ```bash
   # Make sure JWT token is valid and not expired
   ```

5. **Check Product Exists**:
   ```javascript
   db.products.findOne({_id: ObjectId("69728bdb0959e1a2da517685")})
   ```

---

**Ready for Manual Testing!**

Start with Test 1 and work through sequentially. Each test builds on the previous one.
