# Product Configuration System - Per-Product Configuration

## Overview

The product configuration system allows each tenant to maintain **separate configurations for each product**. This means a tenant can have different settings for their Healthcare Assistant, Real Estate Assistant, IDP service, and Computer Vision service.

## Architecture

### Database Structure

**Collection**: `product_configurations`

**Schema**:
```typescript
interface ProductConfiguration {
  _id: string;                      // MongoDB ObjectId
  tenantId: string;                 // Tenant identifier
  productId: string;                // Product identifier (links to products collection)
  userId: string;                   // User who created/updated the config
  configuration: Record<string, any>; // Product-specific key-value pairs
  createdAt: Date;                  // Creation timestamp
  updatedAt: Date;                  // Last update timestamp
  status: 'active' | 'inactive';    // Configuration status
}
```

**Indexes**:
- **Unique**: `(tenantId, productId, status)` - Ensures one active config per tenant per product
- `tenantId` - Fast tenant lookups
- `productId` - Fast product lookups
- `createdAt` - Sorting by creation date

### API Endpoints

#### Get All Configurations for Tenant
```
GET /api/product-configurations
Authorization: Bearer <token>
```
Returns all active product configurations for the authenticated tenant.

#### Get Configuration for Specific Product
```
GET /api/product-configurations/:productId
Authorization: Bearer <token>
```
Returns configuration for a specific product. Returns 404 if not configured.

#### Create/Update Configuration
```
POST /api/product-configurations
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "69667c560e03d4f31472dbd3",
  "configuration": {
    "apiKey": "xxx",
    "endpoint": "https://api.example.com",
    "webhookUrl": "https://myapp.com/webhook",
    "enableNotifications": true,
    "maxRequests": 1000
  }
}
```
Creates new configuration or updates existing one for the specified product.

#### Delete Configuration
```
DELETE /api/product-configurations/:productId
Authorization: Bearer <token>
```
Soft deletes (marks as inactive) the configuration. Admin only.

## Frontend Implementation

### VirtualAssistantConfig.tsx
```typescript
// Fetch product-specific configuration
const fetchConfiguration = async () => {
  const response = await axios.get(
    `/api/product-configurations/${productId}`,
    { withCredentials: true }
  );
  if (response.data.success) {
    setConfiguration(response.data.configuration.configuration);
  }
};

// Save product-specific configuration
const handleSave = async () => {
  const response = await axios.post(
    '/api/product-configurations',
    { productId, configuration },
    { withCredentials: true }
  );
};
```

### IdpConfig.tsx & ComputerVisionConfig.tsx
Same pattern - each product page fetches and saves its own configuration.

## Key Features

### ✓ Product Isolation
Each product maintains separate configuration:
- Healthcare Assistant: Different API keys, prompts, settings
- Real Estate Assistant: Different API keys, prompts, settings
- IDP Service: OCR settings, document templates
- Computer Vision: Model settings, detection thresholds

### ✓ Tenant Isolation
Each tenant's configurations are completely isolated:
- Tenant A's Healthcare config ≠ Tenant B's Healthcare config
- No cross-tenant data leakage

### ✓ Configuration Versioning
- Soft delete preserves history
- `updatedAt` tracks last modification
- Can implement audit trail if needed

### ✓ Flexible Schema
`configuration` field is a flexible object that can store any product-specific settings:
```json
{
  "configuration": {
    "voice": {
      "language": "en-US",
      "voiceId": "alloy",
      "speechRate": 1.0
    },
    "chat": {
      "maxTurns": 20,
      "typingIndicator": true
    },
    "apiSettings": {
      "apiKey": "sk-...",
      "endpoint": "https://api.example.com"
    }
  }
}
```

## Example Use Cases

### Healthcare Product Configuration
```json
{
  "tenantId": "ten-splendor-florida-33064",
  "productId": "69667c560e03d4f31472dbd3",
  "configuration": {
    "hipaaCompliant": true,
    "apiKey": "healthcare-api-key",
    "endpoint": "https://healthcare-api.example.com",
    "webhookUrl": "https://hospital.com/webhook",
    "maxConcurrentCalls": 50,
    "recordingEnabled": true,
    "dataRetentionDays": 30
  }
}
```

### Real Estate Product Configuration
```json
{
  "tenantId": "ten-splendor-florida-33064",
  "productId": "69667c560e03d4f31472dbd4",
  "configuration": {
    "apiKey": "realestate-api-key",
    "endpoint": "https://realestate-api.example.com",
    "webhookUrl": "https://realtor.com/webhook",
    "leadCapture": true,
    "crmIntegration": "salesforce",
    "businessHours": {
      "timezone": "America/New_York",
      "monday": { "open": "09:00", "close": "18:00" }
    }
  }
}
```

## Migration Notes

### ✓ Already Implemented
The system is **already fully configured** for product-specific configurations:
- Backend routes support `productId` parameter
- Database schema includes `productId` field
- Unique indexes ensure data integrity
- Frontend passes `productId` in all requests

### ✓ Database Indexes Created
Run the index creation script to ensure optimal performance:
```bash
cd backend-node
node scripts/create-product-config-indexes.js
```

### ✓ Verification
Verify the setup:
```bash
cd backend-node
node scripts/verify-product-config-setup.js
```

## Benefits

1. **Scalability**: Easy to add new products without changing schema
2. **Flexibility**: Each product can have completely different configuration needs
3. **Isolation**: Tenant and product boundaries are enforced at database level
4. **Performance**: Unique indexes ensure fast lookups
5. **Maintainability**: Clear separation of concerns per product

## API Documentation

Full API documentation available at:
```
http://localhost:5000/api-docs
```

Look for the "Products" section to see all product configuration endpoints.
