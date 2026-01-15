# Customer to Tenant Migration

## Summary

Removed all customer-related UI components and routes since **tenant** and **customer** represent the same concept. The platform now uses **tenant** consistently throughout.

## Changes Made

### Frontend Changes

1. **Removed Files:**
   - `frontend/src/pages/Customers.tsx` - Customers page component
   - `frontend/src/styles/Customers.styles.ts` - Customers page styles

2. **Updated Files:**
   - `frontend/src/App.tsx` - Removed `/customers` route and Customers import
   - `frontend/src/components/SettingsDropdown.tsx` - Removed "Customers" button
   - `frontend/src/pages/Dashboard.tsx` - Removed "Customers" navigation button

### Backend Changes

1. **Database:**
   - Dropped `customers` collection from MongoDB (contained only test data)
   - Kept `tenants` collection as the single source of truth

2. **API Routes:**
   - Removed `GET /api/usage/customer/:customerId/summary` endpoint
   - Updated `backend-node/src/routes/usage-routes.ts` to remove customer summary route

3. **OpenAPI Documentation:**
   - Removed `/api/usage/customer/{customerId}/summary` endpoint from openapi.yaml

4. **Type Definitions:**
   - Added `@deprecated` comments to `customerId` fields in:
     - `backend-node/src/types/assistant-channels.types.ts`
     - `backend-node/src/types/prompt.types.ts`
     - `backend-node/src/routes/usage-routes.ts`
     - `backend-node/src/routes/voice-routes.ts`

5. **Documentation:**
   - Updated `README.md` to remove customer references
   - Changed filter documentation from `customerId` to `tenantId`

## Backward Compatibility

The `customerId` field is kept in some database documents and TypeScript interfaces for backward compatibility with existing data:

- Users may still have a `customerId` field that maps to their `tenantId`
- AssistantChannel documents may have `customerId` (marked as deprecated)
- Usage tracking may receive `customerId` from legacy systems

All these fields are now marked with `@deprecated` comments and should use `tenantId` going forward.

## Migration Notes

- **No data loss**: Existing data with `customerId` fields continues to work
- **New code**: Should use `tenantId` exclusively
- **UI**: No customer-related pages or navigation items remain
- **API**: Customer-specific endpoints removed, use tenant endpoints instead

## User Impact

- PROJECT_ADMIN users now see only "Tenants" in the settings dropdown, not "Customers"
- Dashboard no longer shows "Customers" navigation button
- All tenant management should be done through the `/tenants` route

## Testing Completed

- ✅ Frontend TypeScript compilation successful (no customer-related errors)
- ✅ Backend TypeScript compilation successful
- ✅ MongoDB customers collection removed successfully
- ✅ Updated user role to PROJECT_ADMIN for testing tenant
