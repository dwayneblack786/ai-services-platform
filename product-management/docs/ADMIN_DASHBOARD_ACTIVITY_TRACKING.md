# Admin Dashboard - User Activity Tracking Implementation

## Overview
This document describes the implementation of comprehensive user activity tracking and enhanced admin dashboard metrics for the AI Services Platform.

## Implementation Date
January 2025

## Features Implemented

### 1. User Activity Tracking

#### Backend Models
- **UserActivity Model** (`backend-node/src/models/UserActivity.ts`)
  - Tracks all user activities (login, logout, dashboard_view, etc.)
  - Stores user details, timestamps, IP addresses, user agents
  - Supports metadata for additional context
  - Indexed for efficient querying

- **User Model Updates** (`backend-node/src/models/User.ts`)
  - Added `lastLogin` field (Date)
  - Added `loginCount` field (Number)
  - Automatically updated on each login

#### Activity Tracking Middleware
- **Activity Tracking Middleware** (`backend-node/src/middleware/activityTracking.ts`)
  - Generic middleware for tracking any user activity
  - Pre-built functions:
    - `trackLogin` - Tracks user logins
    - `trackLogout` - Tracks user logouts
    - `trackApiCall` - Tracks specific API calls
    - `trackActivity` - Generic activity tracker
  - Automatically extracts IP address and user agent
  - Graceful error handling (doesn't fail requests)

#### Authentication Integration
- **Keycloak Authentication** (`backend-node/src/routes/keycloak-auth.ts`)
  - Login tracking in OAuth callback
  - Logout tracking before session destruction
  - Updates user's `lastLogin` and `loginCount`

- **Standard Authentication** (`backend-node/src/routes/auth.ts`)
  - Logout tracking for standard auth flow

### 2. Admin Dashboard API Enhancements

#### Enhanced Statistics Endpoint
- **GET /api/admin/stats**
  - **Overview Metrics:**
    - Total users, tenants, registrations
    - Active, completed, and failed registrations
    - Completion rate
  
  - **Trend Metrics:**
    - Registrations: last 24h, 7 days, 30 days
    - Users: last 24h, 7 days, 30 days
  
  - **Activity Metrics (NEW):**
    - Total logins
    - Unique users today
    - Login trend: last 24h, 7 days, 30 days
    - Recent logins with timestamps and IP addresses
  
  - **Recent Activity:**
    - Latest registration sessions
    - Session statuses and metadata

#### New Drill-Down Endpoints

1. **GET /api/admin/activity/users**
   - Paginated user activity log
   - Query parameters:
     - `page` (default: 1)
     - `limit` (default: 20)
     - `eventType` (optional filter)
     - `userId` (optional filter)
   - Returns:
     - Activity records with user details
     - Pagination metadata

2. **GET /api/admin/activity/logins**
   - Detailed login statistics
   - Returns:
     - Login count by tenant
     - 7-day login trend
     - Top users by login count
     - Recent login details

3. **GET /api/admin/users/details**
   - Comprehensive user details
   - Query parameters:
     - `page` (default: 1)
     - `limit` (default: 20)
   - Returns:
     - User profiles with activity summary
     - Login counts and last login times
     - Most recent activity for each user
     - Pagination metadata

### 3. Frontend Dashboard Updates

#### Enhanced UI Components
- **Admin Dashboard** (`frontend/src/pages/AdminDashboard.tsx`)

#### New Tabs
1. **Overview Tab** (Enhanced)
   - Original registration metrics
   - **NEW: User Activity Metrics section**
     - Total logins with daily trend
     - Unique users today
     - Weekly and monthly login counts
   - **NEW: Recent Logins table**
     - User email
     - Timestamp
     - IP address
   - Recent registration activity

2. **Registrations Tab** (Existing)
   - Paginated registration list
   - Session details and metadata

3. **User Activity Tab** (NEW)
   - **Top Users by Login Count**
     - User rankings
     - Login counts
     - Last login times
   - **Login Trend (Last 7 Days)**
     - Daily login counts
     - Historical view
   - **User Activity Log**
     - Paginated activity feed
     - Event types and details
     - IP addresses and timestamps

4. **Users Tab** (NEW)
   - Comprehensive user list
   - Columns:
     - Email and name
     - Role badge
     - Tenant ID
     - Login count
     - Last login time
     - Last activity (type and time)
   - Pagination

#### TypeScript Interfaces
- `DashboardStats` - Enhanced with activity metrics
- `UserActivity` - Activity log records
- `LoginStats` - Login analytics data
- `UserDetail` - User profile with activity summary

#### API Integration
- New API client calls for:
  - `/api/admin/activity/users`
  - `/api/admin/activity/logins`
  - `/api/admin/users/details`
- Automatic data refresh on tab changes
- Loading states and error handling

## Data Flow

### Login Flow
1. User authenticates via Keycloak
2. OAuth callback receives tokens
3. **User model updated:**
   - `lastLogin` set to current time
   - `loginCount` incremented
4. **UserActivity record created:**
   - Event type: `login`
   - User details captured
   - IP and user agent logged
5. Session established
6. User redirected to application

### Logout Flow
1. Logout request received
2. **UserActivity record created:**
   - Event type: `logout`
   - Complete session context
3. Session destroyed
4. User logged out

### Admin Dashboard Flow
1. Admin navigates to dashboard
2. **Overview tab:**
   - Loads `/api/admin/stats`
   - Displays all metrics including activity
3. **User Activity tab:**
   - Loads `/api/admin/activity/users` (paginated)
   - Loads `/api/admin/activity/logins` (summary)
4. **Users tab:**
   - Loads `/api/admin/users/details` (paginated)

## Database Schema

### UserActivity Collection
```typescript
{
  userId: ObjectId,          // Reference to User._id
  userEmail: String,         // For quick lookups
  tenantId: String,          // Tenant isolation
  eventType: String,         // 'login', 'logout', etc.
  eventName: String,         // Human-readable name
  timestamp: Date,           // When event occurred
  ipAddress: String,         // User's IP
  userAgent: String,         // Browser/client info
  metadata: Object           // Additional context
}

Indexes:
- userId, timestamp (desc)
- tenantId, timestamp (desc)
- eventType, timestamp (desc)
```

### User Model Updates
```typescript
{
  // ... existing fields ...
  lastLogin: Date,           // Last login timestamp
  loginCount: Number         // Total login count
}
```

## Security Considerations

1. **RBAC Protection:**
   - All admin endpoints protected by admin role requirement
   - Session-based authentication enforced

2. **Data Privacy:**
   - IP addresses stored for security auditing
   - User agents help identify suspicious activity
   - Admin-only access to activity logs

3. **Error Handling:**
   - Activity tracking failures don't affect user experience
   - Graceful degradation if tracking fails
   - All errors logged for debugging

## Performance Optimizations

1. **Database Indexes:**
   - Compound indexes for efficient queries
   - Optimized for time-based filtering

2. **Pagination:**
   - All large datasets paginated
   - Default limit of 20 items
   - Prevents memory issues

3. **Async Operations:**
   - Activity tracking runs asynchronously
   - Doesn't block authentication flow

## Testing Recommendations

### Backend Testing
```bash
# Start backend server
cd product-management/backend-node
npm start

# Test admin stats endpoint
curl -X GET http://localhost:3000/api/admin/stats \
  --cookie "ai_platform.sid=<session-cookie>"

# Test user activity endpoint
curl -X GET http://localhost:3000/api/admin/activity/users?page=1&limit=10 \
  --cookie "ai_platform.sid=<session-cookie>"

# Test login stats endpoint
curl -X GET http://localhost:3000/api/admin/activity/logins \
  --cookie "ai_platform.sid=<session-cookie>"

# Test user details endpoint
curl -X GET http://localhost:3000/api/admin/users/details?page=1&limit=10 \
  --cookie "ai_platform.sid=<session-cookie>"
```

### Frontend Testing
1. **Login as Admin:**
   - Navigate to http://localhost:5173/login
   - Complete authentication flow
   - Verify activity tracking

2. **Admin Dashboard:**
   - Navigate to http://localhost:5173/admin
   - Check Overview tab displays activity metrics
   - Switch to User Activity tab
   - Switch to Users tab
   - Verify pagination works

3. **Activity Recording:**
   - Perform multiple logins/logouts
   - Check activity appears in dashboard
   - Verify login counts increment

## Future Enhancements

### Potential Additions
1. **Real-time Updates:**
   - WebSocket integration for live activity feed
   - Real-time user count updates

2. **Advanced Analytics:**
   - User session duration tracking
   - Geographic distribution of users
   - Device and browser analytics
   - Peak usage time analysis

3. **Alerting:**
   - Suspicious activity detection
   - Failed login monitoring
   - Unusual access patterns

4. **Export Functionality:**
   - CSV export of activity logs
   - Report generation
   - Email summaries

5. **Filtering and Search:**
   - Date range filters
   - User-specific activity search
   - Event type filtering
   - Tenant-specific views

6. **Visualizations:**
   - Charts for login trends
   - Activity heatmaps
   - User engagement graphs

## Files Modified

### Backend
1. `backend-node/src/models/UserActivity.ts` - NEW
2. `backend-node/src/models/User.ts` - UPDATED
3. `backend-node/src/middleware/activityTracking.ts` - NEW
4. `backend-node/src/routes/admin.routes.ts` - UPDATED
5. `backend-node/src/routes/keycloak-auth.ts` - UPDATED
6. `backend-node/src/routes/auth.ts` - UPDATED

### Frontend
1. `frontend/src/pages/AdminDashboard.tsx` - UPDATED

### Documentation
1. `ADMIN_DASHBOARD_ACTIVITY_TRACKING.md` - NEW

## Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `MONGO_URI` - MongoDB connection
- `SESSION_SECRET` - Session encryption
- `CLIENT_URL` - Frontend URL for redirects

### MongoDB Indexes
Automatically created by Mongoose schema:
- UserActivity: userId + timestamp
- UserActivity: tenantId + timestamp
- UserActivity: eventType + timestamp

## Rollback Plan

If issues occur:
1. Remove activity tracking from auth routes
2. Revert User model to previous version
3. Keep UserActivity collection (no harm if unused)
4. Frontend will gracefully handle missing activity data

## Conclusion

This implementation provides comprehensive user activity tracking and admin visibility into:
- User login patterns and trends
- Individual user activity histories
- System-wide usage metrics
- Detailed drill-down capabilities

The solution is:
- Secure (admin-only access)
- Performant (indexed, paginated)
- Maintainable (well-structured code)
- Extensible (easy to add new event types)
- Production-ready (error handling, logging)
