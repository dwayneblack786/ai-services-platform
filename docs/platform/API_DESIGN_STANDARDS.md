# API Design Standards

Standards, conventions, and best practices for designing and consuming APIs in the AI Services Platform.

## Table of Contents
1. [Overview](#overview)
2. [REST Conventions](#rest-conventions)
3. [Request/Response Format](#requestresponse-format)
4. [Error Handling](#error-handling)
5. [Pagination](#pagination)
6. [Filtering & Sorting](#filtering--sorting)
7. [Versioning](#versioning)
8. [Authentication & Authorization](#authentication--authorization)
9. [Rate Limiting](#rate-limiting)
10. [API Documentation](#api-documentation)

---

## Overview

### API Architecture

The platform exposes a **RESTful HTTP API** with the following characteristics:

- **Base URL**: `http://localhost:5000/api` (development)
- **Protocol**: HTTP/HTTPS with JSON payloads
- **Authentication**: OAuth2 + JWT tokens in httpOnly cookies
- **Content-Type**: `application/json`
- **Versioning**: URL-based versioning (v1, v2, etc.)
- **Documentation**: OpenAPI/Swagger at `/api-docs`

### Design Principles

1. **Resource-Oriented**: Model endpoints around resources (not actions)
2. **Stateless**: Each request contains all needed information
3. **Cacheable**: Use HTTP caching headers appropriately
4. **Consistent**: Follow same patterns across all endpoints
5. **Discoverable**: Use standard HTTP methods and status codes
6. **Secure**: Validate all inputs, enforce authentication/authorization

---

## REST Conventions

### HTTP Methods

| Method | Purpose | Idempotent | Example |
|--------|---------|------------|---------|
| **GET** | Retrieve resource(s) | ✅ Yes | `GET /api/v1/products` |
| **POST** | Create new resource | ❌ No | `POST /api/v1/products` |
| **PUT** | Replace entire resource | ✅ Yes | `PUT /api/v1/products/123` |
| **PATCH** | Partial update | ✅ Yes | `PATCH /api/v1/products/123` |
| **DELETE** | Remove resource | ✅ Yes | `DELETE /api/v1/products/123` |

**Guidelines**:
- Use **GET** for retrieving data (no body)
- Use **POST** for creating resources
- Use **PUT** for full replacement (rarely used)
- Use **PATCH** for partial updates (recommended)
- Use **DELETE** for removal
- POST/PUT/PATCH require body, GET/DELETE don't

### Resource Naming

**Rules**:
1. Use **plural nouns** for collections
2. Use **lowercase** with hyphens for multi-word names
3. Use **nesting** for relationships (max 3 levels)
4. Use **IDs** at the end for specific resources

**Examples**:
```
✅ Good
GET    /api/v1/products
GET    /api/v1/products/123
GET    /api/v1/products/123/configurations
POST   /api/v1/products
DELETE /api/v1/products/123

❌ Bad
GET    /api/v1/getProducts              (use GET method instead)
GET    /api/v1/Products                 (use lowercase)
POST   /api/v1/product-create           (use POST method instead)
GET    /api/v1/users/123/products/456/reviews  (too nested)
```

### Endpoint Structure

**Pattern**:
```
/api/v<VERSION>/<RESOURCE>[/<ID>][/<SUB-RESOURCE>]
```

**Examples**:
```
/api/v1/products
/api/v1/products/123
/api/v1/products/123/configurations
/api/v1/subscriptions
/api/v1/users/456/subscriptions
/api/v1/chat-sessions
/api/v1/chat-sessions/789/messages
```

---

## Request/Response Format

### Request Format

**Headers**:
```http
GET /api/v1/products HTTP/1.1
Host: localhost:5000
Content-Type: application/json
Authorization: Bearer <token>
```

**Body** (for POST/PUT/PATCH):
```json
{
  "name": "Virtual Assistant Pro",
  "description": "Advanced voice assistant",
  "price": 199.99,
  "currency": "USD"
}
```

### Response Format

**Success Response** (2xx):
```json
{
  "statusCode": 200,
  "statusMessage": "success",
  "data": {
    "id": "prod-123",
    "name": "Virtual Assistant Pro",
    "price": 199.99,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**List Response**:
```json
{
  "statusCode": 200,
  "statusMessage": "success",
  "data": [
    { "id": "prod-123", "name": "Product 1" },
    { "id": "prod-456", "name": "Product 2" }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 2,
    "hasMore": false
  }
}
```

**Response Field Definitions**:
- `statusCode`: HTTP status code (200, 201, 400, 401, 404, 500, etc.)
- `statusMessage`: Human-readable message (`success`, `error`, `validation_error`)
- `data`: Actual response payload (object or array)
- `pagination`: (Optional) For paginated responses
- `timestamp`: ISO 8601 timestamp for when response was created

### Timestamp Format

All timestamps must be **ISO 8601** format:
```
2024-01-15T10:30:45.123Z

Breakdown:
2024          - Year
01            - Month (01-12)
15            - Day (01-31)
T             - Separator
10:30:45      - Time (HH:MM:SS)
.123          - Milliseconds
Z             - UTC timezone indicator
```

**In JSON**:
```json
{
  "createdAt": "2024-01-15T10:30:45.123Z",
  "updatedAt": "2024-01-15T14:22:10.456Z"
}
```

### Null Handling

**Rules**:
1. Omit optional fields if null (preferred)
2. Or include as `null` (explicit)
3. Never use empty strings `""` for null values

**Examples**:
```json
// ✅ Preferred - omit null fields
{
  "id": "123",
  "name": "Product",
  "description": "Some description"
  // middleName is omitted (null)
}

// ✅ Also acceptable - explicit null
{
  "id": "123",
  "name": "Product",
  "description": "Some description",
  "middleName": null
}

// ❌ Wrong - empty string
{
  "id": "123",
  "name": "Product",
  "middleName": ""  // Don't do this
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|------------|
| **200** | OK | Request successful, returning data |
| **201** | Created | New resource created successfully |
| **204** | No Content | Successful operation with no response body |
| **400** | Bad Request | Invalid input/malformed request |
| **401** | Unauthorized | Missing/invalid authentication |
| **403** | Forbidden | Authenticated but not authorized |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Resource conflict (e.g., duplicate email) |
| **422** | Unprocessable Entity | Validation failed |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server error, not client's fault |
| **503** | Service Unavailable | Service temporarily down |

### Error Response Format

**Validation Error** (400):
```json
{
  "statusCode": 400,
  "statusMessage": "validation_error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "INVALID_EMAIL"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "code": "PASSWORD_TOO_SHORT"
    }
  ]
}
```

**Authentication Error** (401):
```json
{
  "statusCode": 401,
  "statusMessage": "unauthorized",
  "message": "Missing or invalid authentication token",
  "code": "INVALID_TOKEN"
}
```

**Authorization Error** (403):
```json
{
  "statusCode": 403,
  "statusMessage": "forbidden",
  "message": "You do not have permission to access this resource",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**Not Found Error** (404):
```json
{
  "statusCode": 404,
  "statusMessage": "not_found",
  "message": "Product with ID 'prod-999' not found",
  "code": "PRODUCT_NOT_FOUND"
}
```

**Server Error** (500):
```json
{
  "statusCode": 500,
  "statusMessage": "error",
  "message": "An unexpected error occurred",
  "code": "INTERNAL_SERVER_ERROR"
  // Note: Never expose internal details in production
}
```

### Error Code Naming

**Format**: `RESOURCE_ACTION_CONDITION`

**Examples**:
```
USER_NOT_FOUND
USER_ALREADY_EXISTS
PRODUCT_OUT_OF_STOCK
SUBSCRIPTION_EXPIRED
PAYMENT_FAILED
INVALID_TENANT_ID
INSUFFICIENT_BALANCE
```

---

## Pagination

### Query Parameters

```
GET /api/v1/products?page=2&pageSize=50&sort=name&order=asc
```

**Parameters**:
- `page`: Page number (1-indexed), default: 1
- `pageSize`: Items per page, default: 20, max: 100
- `sort`: Field to sort by
- `order`: `asc` or `desc` (default: asc)

### Paginated Response

```json
{
  "statusCode": 200,
  "statusMessage": "success",
  "data": [
    { "id": "1", "name": "Product 1" },
    { "id": "2", "name": "Product 2" }
  ],
  "pagination": {
    "page": 2,
    "pageSize": 20,
    "total": 145,
    "totalPages": 8,
    "hasMore": true,
    "hasPrevious": true
  }
}
```

**Pagination Fields**:
- `page`: Current page
- `pageSize`: Items per page
- `total`: Total items across all pages
- `totalPages`: Total number of pages
- `hasMore`: Is there a next page?
- `hasPrevious`: Is there a previous page?

### Pagination Examples

```typescript
// Frontend usage
async function getProducts(page: number = 1, pageSize: number = 20) {
  const response = await axios.get('/api/v1/products', {
    params: { page, pageSize, sort: 'name', order: 'asc' }
  });
  
  const { data, pagination } = response.data;
  
  if (pagination.hasMore) {
    // Load next page button
  }
}

// Backend implementation
router.get('/products', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
  const sort = req.query.sort || 'createdAt';
  const order = req.query.order === 'desc' ? -1 : 1;
  
  const skip = (page - 1) * pageSize;
  const total = await Product.countDocuments({ tenantId: req.tenantId });
  
  const data = await Product
    .find({ tenantId: req.tenantId })
    .sort({ [sort]: order })
    .skip(skip)
    .limit(pageSize);
  
  res.json({
    statusCode: 200,
    statusMessage: 'success',
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: skip + pageSize < total,
      hasPrevious: page > 1
    }
  });
});
```

---

## Filtering & Sorting

### Filtering

**Query Parameters for Filters**:
```
GET /api/v1/products?status=active&minPrice=10&maxPrice=100&category=electronics
```

**Common Filters**:
- `status`: Filter by status field
- `minPrice`: Minimum value
- `maxPrice`: Maximum value
- `category`: Filter by category
- `dateFrom`: Start date (ISO 8601)
- `dateTo`: End date (ISO 8601)
- `search`: Full-text search

**Implementation**:
```typescript
// Build query object
const filters: Record<string, any> = {};

if (req.query.status) {
  filters.status = req.query.status;
}

if (req.query.minPrice || req.query.maxPrice) {
  filters.price = {};
  if (req.query.minPrice) {
    filters.price.$gte = parseFloat(req.query.minPrice);
  }
  if (req.query.maxPrice) {
    filters.price.$lte = parseFloat(req.query.maxPrice);
  }
}

// Always add tenant filter
filters.tenantId = req.tenantId;

const results = await Product.find(filters);
```

### Sorting

**Syntax**:
```
GET /api/v1/products?sort=name,createdAt&order=asc,desc
```

**Rules**:
1. Default sort: by `createdAt` descending
2. Max 3 sort fields
3. Order must match sort fields

**Valid Examples**:
```
?sort=name
?sort=name&order=asc
?sort=createdAt&order=desc
?sort=name,price&order=asc,desc
```

---

## Versioning

### URL-Based Versioning

**Format**:
```
/api/v<VERSION>/<RESOURCE>
```

**Examples**:
```
/api/v1/products
/api/v2/products
/api/v3/users
```

### When to Version

**Create new version when**:
- Breaking change to request format
- Breaking change to response format
- Removing a field
- Changing field type
- Major feature overhaul

**Do NOT version for**:
- Adding optional fields
- Adding new endpoints
- Deprecating (use headers instead)
- Bug fixes

### Migration Path

```
Version 1: /api/v1/products
  ├─ Active (current)
  └─ Deprecated: Jan 2025

Version 2: /api/v2/products
  └─ Active (new default)
```

**Timeline**:
1. Release v2
2. Keep v1 operational for 6 months
3. Announce deprecation
4. Send migration guide to clients
5. Remove v1 after deprecation period

---

## Authentication & Authorization

### Authentication Header

```http
GET /api/v1/products HTTP/1.1
Authorization: Bearer <jwt_token>
```

**Token Sources** (in priority order):
1. `Authorization: Bearer <token>` header
2. httpOnly cookie (automatic)
3. Query parameter (only for WebSocket, not recommended)

**Example**:
```javascript
// Axios automatically includes cookies if:
axios.defaults.withCredentials = true;

// Or explicit header:
axios.get('/api/v1/products', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Role-Based Access Control

**Standard Endpoint Pattern**:
```typescript
// Public (no auth required)
GET /api/v1/products        // Browse products

// Authenticated (JWT required)
POST /api/v1/subscriptions  // Create subscription

// Role-based (specific role required)
GET /api/v1/tenants         // PROJECT_ADMIN only
GET /api/v1/reports         // PROJECT_ADMIN only
GET /api/v1/users           // TENANT_ADMIN+ (tenant-filtered)
```

**Tenant Isolation**:
```
All endpoints automatically filter by tenantId
User can only access their tenant's data
PROJECT_ADMIN can view multiple tenants
SUPER_ADMIN can view all data
```

---

## Rate Limiting

### Rate Limit Headers

**Response includes**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705363200
```

### Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 | 15 minutes |
| General API | 100 | 1 minute |
| Search | 50 | 1 minute |
| File Upload | 10 | 1 hour |

### Handling Rate Limits

```typescript
// Check remaining quota
const remaining = parseInt(response.headers['x-ratelimit-remaining']);
if (remaining < 10) {
  console.warn('Approaching rate limit');
}

// Handle 429 response
catch (error) {
  if (error.response.status === 429) {
    const retryAfter = parseInt(error.response.headers['retry-after']);
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    // Implement exponential backoff
  }
}
```

---

## API Documentation

### OpenAPI/Swagger

**Endpoint**: `http://localhost:5000/api-docs`

**Location**: `backend-node/openapi.yaml`

**Example Entry**:
```yaml
paths:
  /api/v1/products:
    get:
      summary: List all products
      description: Get paginated list of products for current tenant
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: pageSize
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductList'
        '401':
          description: Unauthorized
```

### Documenting Endpoints

**Template**:
```typescript
/**
 * GET /api/v1/products
 * 
 * Get paginated list of products for the current tenant.
 * 
 * @query {number} page - Page number (default: 1)
 * @query {number} pageSize - Items per page (default: 20)
 * @query {string} sort - Field to sort by (default: createdAt)
 * 
 * @returns {Object[]} data - Array of products
 * @returns {Object} pagination - Pagination metadata
 * @returns {number} statusCode - HTTP status code
 * 
 * @throws {401} Unauthorized - Missing/invalid token
 * @throws {403} Forbidden - Insufficient permissions
 * 
 * @example
 * GET /api/v1/products?page=1&pageSize=20
 * 
 * Response:
 * {
 *   "statusCode": 200,
 *   "statusMessage": "success",
 *   "data": [
 *     { "id": "123", "name": "Product" }
 *   ],
 *   "pagination": { "page": 1, "total": 100 }
 * }
 */
router.get('/products', async (req, res) => {
  // Implementation
});
```

---

## API Checklist

Use this checklist when designing new endpoints:

- [ ] Endpoint follows RESTful naming conventions
- [ ] Correct HTTP method chosen
- [ ] Authentication required (if sensitive)
- [ ] Authorization checks in place
- [ ] Input validation implemented
- [ ] TenantId filtering added
- [ ] Response format standardized
- [ ] Error handling implemented
- [ ] Rate limiting applied (if needed)
- [ ] Pagination implemented (for lists)
- [ ] Documented in OpenAPI
- [ ] Tests written
- [ ] Backward compatible or versioned

---

## Examples

### Creating a New Endpoint

**Requirement**: Create endpoint to search products by name

**Step 1: Design**
```
Method: GET
Path: /api/v1/products/search
Query: ?q=<search_term>&page=1&pageSize=20
Auth: Required
Response: Paginated product list
```

**Step 2: Implement**
```typescript
// routes/products-routes.ts
router.get('/search', authenticateToken, async (req, res) => {
  const { q, page = 1, pageSize = 20 } = req.query;
  
  // Validation
  if (!q || q.toString().trim().length < 3) {
    return res.status(400).json({
      statusCode: 400,
      statusMessage: 'validation_error',
      errors: [{ field: 'q', message: 'Query must be at least 3 characters' }]
    });
  }
  
  try {
    // Query with tenant filtering
    const total = await Product.countDocuments({
      tenantId: req.tenantId,
      name: { $regex: q, $options: 'i' }
    });
    
    const data = await Product
      .find({
        tenantId: req.tenantId,
        name: { $regex: q, $options: 'i' }
      })
      .limit(pageSize)
      .skip((page - 1) * pageSize);
    
    res.json({
      statusCode: 200,
      statusMessage: 'success',
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      statusMessage: 'error',
      message: 'Search failed'
    });
  }
});
```

**Step 3: Document**
```yaml
# openapi.yaml
/api/v1/products/search:
  get:
    summary: Search products
    parameters:
      - name: q
        in: query
        required: true
        schema:
          type: string
          minLength: 3
      - name: page
        in: query
        schema:
          type: integer
          default: 1
    responses:
      '200':
        description: Search results
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductList'
```

---

## Next Steps

1. ✅ Review this document
2. 📖 Check [openapi.yaml](../openapi.yaml) for existing endpoints
3. 🧪 Test endpoints with Postman/Thunder Client
4. 📝 Document new endpoints immediately
5. 🔍 Use `/api-docs` to verify OpenAPI spec

