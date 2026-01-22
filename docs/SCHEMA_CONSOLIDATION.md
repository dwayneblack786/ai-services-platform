# Schema Consolidation: Subscriptions Collections

## Overview
This document tracks the consolidation from dual subscription collections (`subscriptions` and `product_subscriptions`) to a single production-ready schema (`product_subscriptions`).

## Background
The platform previously had two subscription collections:
- **Legacy Collection**: `subscriptions` (customerId-based)
- **Production Collection**: `product_subscriptions` (userId-based)

This dual-collection architecture caused authorization failures when middleware queried the wrong collection.

## Changes Completed

### Backend Routes Updated (3 files)

#### 1. authorization.ts (Middleware)
- **Updated**: `requireVirtualAssistantSubscription()` function
- **Updated**: `requireProductAccess()` function
- **Changes**: 
  - Changed `db.collection('subscriptions')` → `db.collection('product_subscriptions')`
  - Removed legacy `customerId` fallback logic
  - Now uses only `tenantId` and `userId` for queries

#### 2. subscriptions-routes.ts
- **Updated**: `/api/subscriptions/active` route (line 23)
- **Updated**: `/api/subscriptions/virtual-assistant` route (line 96)
- **Changes**: 
  - Changed `db.collection('subscriptions')` → `db.collection('product_subscriptions')`
  - Queries use `tenantId` instead of `customerId`

#### 3. usage-routes.ts
- **Updated**: `/api/usage/assistant-call` POST endpoint (line 66)
- **Changes**:
  - Changed `db.collection('subscriptions')` → `db.collection('product_subscriptions')`
  - Query changed from `customerId` to `tenantId`
  - Updated log message to reference `tenantId` instead of `customer`

### Verification
✅ No TypeScript errors in updated files  
✅ No remaining references to `db.collection('subscriptions')` in backend code  
✅ All 15 backend references now point to `product_subscriptions`  
✅ Frontend only uses API endpoints (no direct collection references)

## Schema Comparison

### Legacy Schema (subscriptions)
```javascript
{
  _id: ObjectId,
  customerId: string,        // ❌ Legacy field
  productId: ObjectId,
  status: string,
  billingCycle: string,
  usage: {                   // ❌ Flat structure
    sttSeconds: number,
    ttsCharacters: number,
    llmTokensIn: number,
    llmTokensOut: number,
    totalCost: number,
    lastUpdated: Date
  },
  nextBillingDate: Date
}
```

### Production Schema (product_subscriptions)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // ✅ Proper user reference
  tenantId: string,          // ✅ Multi-tenant support
  productId: ObjectId,
  status: string,
  amount: number,            // ✅ Billing details
  currency: string,          // ✅ Multi-currency
  pricingTier: string,       // ✅ Tiered pricing
  autoRenew: boolean,        // ✅ Subscription management
  startDate: Date,           // ✅ Subscription lifecycle
  renewalDate: Date,
  usage: {                   // ✅ Same usage tracking
    sttSeconds: number,
    ttsCharacters: number,
    llmTokensIn: number,
    llmTokensOut: number,
    totalCost: number,
    lastUpdated: Date
  }
}
```

## Data Migration Status

### Current State
- **Legacy Collection (`subscriptions`)**: 3 records
  - 2 test records (tenant-test-001, tenant-test-002)
  - 1 production record (ten-splendor-florida-33064)
- **Production Collection (`product_subscriptions`)**: 1 record
  - Production tenant: ten-splendor-florida-33064
  - User: Dwayne Black (6952bf9a6b897da7649318b2)
  - Product: Healthcare VA (69728bdb0959e1a2da517684)

### Migration Plan
1. ✅ Update all backend routes to use `product_subscriptions`
2. ⏳ **NEXT**: Migrate remaining data from `subscriptions` to `product_subscriptions`
3. ⏳ Backup legacy `subscriptions` collection
4. ⏳ Drop or rename legacy `subscriptions` collection
5. ⏳ Update MongoDB indexes if needed

## Testing Checklist
- [ ] Test `/api/subscriptions/active` endpoint
- [ ] Test `/api/subscriptions/virtual-assistant` endpoint
- [ ] Test `/api/usage/assistant-call` POST endpoint
- [ ] Verify authorization middleware works correctly
- [ ] Login as dwayneblack876@gmail.com
- [ ] Navigate to assistant-channels tab
- [ ] Verify no 403 Forbidden errors
- [ ] Check subscription data displays correctly

## Next Steps
1. **Data Migration Script**: Create script to migrate remaining data
2. **Backup**: Export legacy `subscriptions` collection
3. **Cleanup**: Drop legacy collection after verification
4. **Documentation**: Update PROJECT_OVERVIEW.md with final schema
5. **Monitoring**: Watch for any errors after deployment

## Related Documents
- [Project Overview](PROJECT_OVERVIEW.md)
- [Repository Structure](RepositoryStrucutre.md)
- [Maven CLI Guide](MAVEN_CLI_GUIDE.md)

## Change Log
- **2024**: Legacy `subscriptions` collection created
- **2024**: Production `product_subscriptions` collection added
- **2024-01-XX**: Consolidated all backend routes to use `product_subscriptions`
- **Future**: Complete data migration and drop legacy collection
