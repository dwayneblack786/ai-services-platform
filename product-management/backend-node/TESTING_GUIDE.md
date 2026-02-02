# Dashboard API Testing Guide

## Overview
This guide helps you test all refactored dashboard endpoints to ensure Mongoose integration is working correctly and tenant isolation is maintained.

## Prerequisites
1. Backend server is running: `npm run dev` or `npm start`
2. You are logged in and have a valid session cookie
3. You know your tenant ID

## Base URL
```
http://localhost:3000/api
```

## Authentication
All requests require:
- Valid session cookie (automatically sent by browser after login)
- User must be authenticated via Keycloak SSO

## Dashboard Endpoints to Test

### 1. Subscriptions API (`/api/subscriptions`)

#### Get Active Subscriptions
```http
GET /api/subscriptions/active
```
**Expected Response:**
```json
{
  "subscriptions": [...],
  "products": [...],
  "virtualAssistantProducts": [...],
  "hasVirtualAssistant": true/false
}
```
**Validates:**
- ✅ Tenant-scoped data retrieval
- ✅ Virtual assistant product detection
- ✅ Product enrichment with details

#### Get Virtual Assistant Subscriptions
```http
GET /api/subscriptions/virtual-assistant
```
**Expected Response:**
```json
{
  "products": [
    {
      "_id": "...",
      "name": "...",
      "category": "Virtual Assistant",
      "hasVoice": true,
      "hasChat": true,
      "subscription": {...},
      "channelConfig": {...}
    }
  ]
}
```
**Validates:**
- ✅ Virtual assistant filtering
- ✅ Channel configuration loading
- ✅ Subscription association

#### Get All Subscriptions
```http
GET /api/subscriptions
```
**Expected Response:**
```json
{
  "success": true,
  "subscriptions": [...]
}
```

#### Create Subscription
```http
POST /api/subscriptions/create
Content-Type: application/json

{
  "productId": "product_id_here",
  "paymentMethodId": "payment_method_id_here",
  "pricingTier": "Professional"
}
```
**Expected Response:**
```json
{
  "success": true,
  "subscription": {...},
  "transaction": {...},
  "userProduct": {...},
  "redirectUrl": "/products/{productId}/configure"
}
```
**Validates:**
- ✅ Payment method verification
- ✅ Product existence check
- ✅ Subscription creation with tenant isolation
- ✅ Transaction recording
- ✅ User-product access grant

### 2. Products API (`/api/products`)

#### Get All Products
```http
GET /api/products
```
**Expected Response:**
```json
{
  "success": true,
  "products": [...]
}
```

#### Get Product by ID
```http
GET /api/products/{productId}
```
**Expected Response:**
```json
{
  "success": true,
  "product": {...}
}
```

#### Create Product (Admin Only)
```http
POST /api/products
Content-Type: application/json

{
  "name": "Test Product",
  "category": "Virtual Assistant",
  "description": "Test description",
  "pricing": {
    "model": "subscription",
    "currency": "USD",
    "tiers": [
      {
        "name": "Basic",
        "price": 9.99,
        "features": []
      }
    ]
  },
  "status": "active"
}
```

### 3. Payment Methods API (`/api/payment-methods`)

#### Get All Payment Methods
```http
GET /api/payment-methods
```
**Expected Response:**
```json
{
  "success": true,
  "paymentMethods": [
    {
      "_id": "...",
      "cardBrand": "visa",
      "cardLast4": "4242",
      "isDefault": true,
      "status": "active"
    }
  ]
}
```
**Validates:**
- ✅ Tenant-scoped payment methods
- ✅ Sensitive data sanitization (no Stripe IDs exposed)

#### Add Payment Method
```http
POST /api/payment-methods
Content-Type: application/json

{
  "cardBrand": "visa",
  "cardLast4": "4242",
  "cardExpMonth": 12,
  "cardExpYear": 2025,
  "billingName": "John Doe",
  "billingEmail": "john@example.com",
  "securityCode": "123",
  "setAsDefault": true
}
```

### 4. Product Configuration API (`/api/product-configuration`)

#### Get Configuration by Product ID
```http
GET /api/product-configuration/{productId}
```
**Expected Response:**
```json
{
  "success": true,
  "config": {
    "productId": "...",
    "tenantId": "...",
    "settings": {...}
  }
}
```
**Validates:**
- ✅ Tenant-scoped configuration retrieval

### 5. Analytics API (`/api/analytics`)

#### Get Analytics Dashboard Data
```http
GET /api/analytics
```
**Expected Response:**
```json
{
  "success": true,
  "summary": {
    "totalRevenue": 0,
    "totalSubscriptions": 0,
    "activeUsers": 0,
    "totalApiCalls": 0
  },
  "revenue": [...],
  "subscriptions": [...],
  "productUsage": [...]
}
```
**Validates:**
- ✅ Tenant-scoped analytics aggregation
- ✅ Multi-collection queries via Mongoose

## Testing Checklist

### Functional Testing
- [ ] All GET endpoints return 200 with expected data structure
- [ ] All POST endpoints create records successfully
- [ ] All PATCH endpoints update records correctly
- [ ] All DELETE endpoints remove records properly
- [ ] Error responses return appropriate status codes (401, 403, 404, 500)

### Security Testing
- [ ] Unauthenticated requests return 401
- [ ] Users can only access their tenant's data
- [ ] Sensitive data (e.g., Stripe IDs) is not exposed in responses
- [ ] Admin-only routes reject non-admin users

### Data Integrity Testing
- [ ] Created subscriptions link to correct products
- [ ] Payment methods are associated with correct tenant
- [ ] Virtual assistant products are correctly identified
- [ ] Analytics calculations are accurate

### Error Handling Testing
- [ ] Missing required fields return 400 Bad Request
- [ ] Invalid IDs return 404 Not Found
- [ ] Database connection issues return 500 Internal Server Error
- [ ] No "Database not initialized" errors occur

## Testing with curl

### Example: Get Active Subscriptions
```bash
curl -X GET \
  'http://localhost:3000/api/subscriptions/active' \
  -H 'Cookie: connect.sid=YOUR_SESSION_COOKIE' \
  -H 'Content-Type: application/json'
```

### Example: Create Subscription
```bash
curl -X POST \
  'http://localhost:3000/api/subscriptions/create' \
  -H 'Cookie: connect.sid=YOUR_SESSION_COOKIE' \
  -H 'Content-Type: application/json' \
  -d '{
    "productId": "product_id_here",
    "paymentMethodId": "payment_method_id_here",
    "pricingTier": "Professional"
  }'
```

## Testing with Postman

1. **Import Collection**: Create a new Postman collection with all endpoints
2. **Set Environment Variables**:
   - `baseUrl`: `http://localhost:3000/api`
   - `sessionCookie`: Your session cookie value
3. **Configure Authentication**: Add session cookie to all requests
4. **Run Collection**: Execute all requests and verify responses

## Common Issues & Solutions

### Issue: "Database not initialized"
**Solution**: This error should no longer occur after Mongoose refactoring. If it does:
1. Verify Mongoose is connected in `index.ts`
2. Check MongoDB connection string in `.env`
3. Restart the server

### Issue: 401 Unauthorized
**Solution**:
1. Ensure you're logged in via Keycloak
2. Verify session cookie is being sent
3. Check session store (Redis) is running

### Issue: Empty data arrays
**Solution**:
1. Verify you have data in MongoDB for your tenant
2. Check tenant ID is correctly extracted from session
3. Ensure seed data script has run

### Issue: 404 Not Found
**Solution**:
1. Verify route is registered in `index.ts`
2. Check URL path matches route definition
3. Ensure route file is imported

## Performance Testing

### Load Testing
Test with multiple concurrent requests to ensure:
- Connection pooling works correctly
- No memory leaks from database connections
- Response times are acceptable (< 500ms for most endpoints)

### Database Query Optimization
- Monitor slow queries in MongoDB logs
- Add indexes for frequently queried fields:
  - `tenantId` (all collections)
  - `productId` (subscriptions, configurations)
  - `userId` (user-specific queries)

## Success Criteria

✅ All dashboard endpoints respond within 500ms
✅ No "Database not initialized" errors
✅ All tenant data is properly isolated
✅ Frontend dashboard displays all data correctly
✅ No TypeScript compilation errors
✅ No MongoDB connection errors in logs

## Next Steps After Testing

1. **Monitor Application Logs**: Watch for any database errors or warnings
2. **Check MongoDB Performance**: Review slow queries and add indexes if needed
3. **Update Frontend**: Ensure frontend components handle response formats correctly
4. **Deploy to Staging**: Test in a production-like environment
5. **Load Testing**: Verify performance under realistic load

---

**Generated**: ${new Date().toISOString()}
**Backend Version**: Mongoose-based (refactored)
