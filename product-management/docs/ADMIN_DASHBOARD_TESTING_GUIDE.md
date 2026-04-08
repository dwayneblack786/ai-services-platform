# Quick Testing Guide - Admin Dashboard Activity Tracking

## Prerequisites
- Backend server running on port 3000
- Frontend running on port 5173
- MongoDB connected
- Keycloak configured
- Admin user account available

## Testing Steps

### 1. Generate Activity Data

#### A. Create Some Login Activity
```bash
# Method 1: Manual login through UI
1. Open http://localhost:5173/login
2. Log in with different user accounts (3-5 users)
3. Log out and log in again to increment login counts
4. Switch between different browsers/incognito to vary IP/user agent

# Method 2: Verify Activity Tracking Endpoints
# (Replace <session-cookie> with actual session cookie from browser DevTools)
curl -X GET http://localhost:3000/api/admin/stats \
  --cookie "ai_platform.sid=<session-cookie>"
```

### 2. Access Admin Dashboard

#### A. Navigate to Dashboard
1. Open http://localhost:5173/admin
2. If redirected to login, log in with admin account
3. Should see updated admin dashboard with new tabs

#### B. Verify Overview Tab
- [ ] See "User Activity Metrics" section with:
  - Total Logins count
  - Unique Users Today
  - Logins This Week
  - Logins This Month
- [ ] See "Recent Logins" table below metrics
- [ ] Original registration metrics still visible

#### C. Verify User Activity Tab
- [ ] Click "User Activity" tab
- [ ] See "Top Users by Login Count" table
- [ ] See "Login Trend (Last 7 Days)" table
- [ ] See "User Activity Log" with paginated activities
- [ ] Pagination buttons work correctly

#### D. Verify Users Tab
- [ ] Click "Users" tab
- [ ] See user list with columns:
  - Email, Name, Role, Tenant ID
  - Login Count
  - Last Login
  - Last Activity (with event type and time)
- [ ] Pagination works

### 3. Verify Backend Endpoints

#### A. Test Stats Endpoint
```bash
# Get admin stats (should include activity metrics)
curl -X GET http://localhost:3000/api/admin/stats \
  -H "Cookie: ai_platform.sid=<session-cookie>" \
  | jq .

# Expected response structure:
# {
#   "success": true,
#   "data": {
#     "overview": { ... },
#     "trends": { ... },
#     "activity": {
#       "totalLogins": <number>,
#       "uniqueUsersToday": <number>,
#       "loginTrend": { ... },
#       "recentLogins": [ ... ]
#     },
#     "recentActivity": [ ... ]
#   }
# }
```

#### B. Test User Activity Endpoint
```bash
# Get user activities (paginated)
curl -X GET "http://localhost:3000/api/admin/activity/users?page=1&limit=10" \
  -H "Cookie: ai_platform.sid=<session-cookie>" \
  | jq .

# Expected response:
# {
#   "success": true,
#   "data": {
#     "activities": [ ... ],
#     "pagination": {
#       "total": <number>,
#       "page": 1,
#       "pages": <number>,
#       "limit": 10
#     }
#   }
# }
```

#### C. Test Login Stats Endpoint
```bash
# Get login statistics
curl -X GET http://localhost:3000/api/admin/activity/logins \
  -H "Cookie: ai_platform.sid=<session-cookie>" \
  | jq .

# Expected response:
# {
#   "success": true,
#   "data": {
#     "byTenant": [ ... ],
#     "trend": [ ... ],  # Last 7 days
#     "topUsers": [ ... ]
#   }
# }
```

#### D. Test User Details Endpoint
```bash
# Get user details with activity
curl -X GET "http://localhost:3000/api/admin/users/details?page=1&limit=10" \
  -H "Cookie: ai_platform.sid=<session-cookie>" \
  | jq .

# Expected response:
# {
#   "success": true,
#   "data": {
#     "users": [ ... ],
#     "pagination": { ... }
#   }
# }
```

### 4. Verify Database Records

#### A. Check UserActivity Collection
```javascript
// Connect to MongoDB
mongo

// Switch to your database
use ai_platform  // or your database name

// Query UserActivity collection
db.useractivities.find().limit(5).pretty()

// Should see documents like:
// {
//   "_id": ObjectId("..."),
//   "userId": ObjectId("..."),
//   "userEmail": "user@example.com",
//   "tenantId": "...",
//   "eventType": "login",
//   "eventName": "User Login",
//   "timestamp": ISODate("..."),
//   "ipAddress": "...",
//   "userAgent": "...",
//   "metadata": { ... }
// }

// Check login events specifically
db.useractivities.find({ eventType: "login" }).count()

// Check logout events
db.useractivities.find({ eventType: "logout" }).count()
```

#### B. Verify User Model Updates
```javascript
// Check users have lastLogin and loginCount
db.users.find({}, { email: 1, lastLogin: 1, loginCount: 1 }).pretty()

// Should see:
// {
//   "_id": ObjectId("..."),
//   "email": "user@example.com",
//   "lastLogin": ISODate("..."),
//   "loginCount": 3
// }
```

### 5. Test Activity Recording

#### A. Login/Logout Cycle
1. Log in to the application
2. Check backend console for: `✅ Login activity tracked`
3. Check UserActivity collection for new login record
4. Check User model - `loginCount` should increment
5. Log out
6. Check backend console for: `✅ Logout activity tracked`
7. Check UserActivity collection for new logout record

#### B. Verify in Dashboard
1. Log in as admin
2. Go to Admin Dashboard > User Activity tab
3. Should see your login/logout events in the activity log
4. Go to Users tab
5. Find your user - login count should match

### 6. Error Scenarios

#### A. Non-Admin Access
```bash
# Try accessing admin endpoints without admin role
curl -X GET http://localhost:3000/api/admin/stats \
  -H "Cookie: ai_platform.sid=<non-admin-session-cookie>"

# Expected: 403 Forbidden
# { "error": "access_denied", "message": "Admin role required" }
```

#### B. Unauthenticated Access
```bash
# Try accessing without session
curl -X GET http://localhost:3000/api/admin/stats

# Expected: 401 Unauthorized
```

#### C. Invalid Pagination
```bash
# Try invalid page number
curl -X GET "http://localhost:3000/api/admin/activity/users?page=-1" \
  -H "Cookie: ai_platform.sid=<session-cookie>"

# Should handle gracefully, default to page 1
```

## Expected Console Output

### Backend Console (during login)
```
🎫 KEYCLOAK CALLBACK - Prompt Management
📅 Time: 2025-01-...
🎲 State: ...
🎫 Code: Present
...
✅ Token exchange successful
✅ User 65abc... authenticated (user@example.com)
✅ Login activity tracked
🔙 Redirecting to: http://localhost:5173
```

### Backend Console (during logout)
```
🚪 Logging out from Keycloak
✅ Logout activity tracked
   Realm: tenant-123
   Redirect to: http://localhost:8080/realms/tenant-123/protocol/openid-connect/logout
```

## Troubleshooting

### Issue: Activity metrics not showing in dashboard
**Solution:**
1. Check backend console for errors during stats API call
2. Verify UserActivity collection has records: `db.useractivities.countDocuments()`
3. Check browser DevTools Network tab for API errors
4. Ensure admin user is logged in (check session)

### Issue: Login count not incrementing
**Solution:**
1. Check backend console for "Login activity tracked" message
2. Verify User model has `lastLogin` and `loginCount` fields
3. Check MongoDB for user updates: `db.users.findOne({ email: "test@example.com" })`
4. Review keycloak-auth.ts for activity tracking code

### Issue: 403 Forbidden on admin endpoints
**Solution:**
1. Verify user has admin role: `db.users.findOne({ email: "admin@example.com" })`
2. Check session in backend console
3. Ensure RBAC middleware is using session auth
4. Try logging out and logging back in

### Issue: Empty activity logs
**Solution:**
1. Generate activity by logging in/out a few times
2. Check UserActivity collection exists: `db.useractivities.countDocuments()`
3. Verify activity tracking middleware is being called
4. Check for errors in backend console

### Issue: Pagination not working
**Solution:**
1. Check total records: `db.useractivities.countDocuments()`
2. Verify page parameter in URL
3. Check backend logs for query errors
4. Try resetting to page 1

## Success Criteria

✅ All endpoints return 200 OK with admin session
✅ Overview tab shows activity metrics
✅ User Activity tab displays login stats and activity log
✅ Users tab shows user details with login counts
✅ Login/logout events appear in activity log
✅ User loginCount increments on each login
✅ Pagination works on all tabs
✅ Non-admin users cannot access admin endpoints
✅ Activity tracking doesn't break authentication flow
✅ Database has UserActivity records

## Performance Check

```bash
# Check response times (should be < 500ms for dashboard stats)
time curl -X GET http://localhost:3000/api/admin/stats \
  -H "Cookie: ai_platform.sid=<session-cookie>"

# Check database query performance
# In MongoDB shell:
db.useractivities.find({ eventType: "login" }).explain("executionStats")

# Should use index, executionTimeMillis should be low
```

## Next Steps After Successful Testing

1. Deploy to staging environment
2. Monitor performance with real user load
3. Set up alerts for unusual activity patterns
4. Consider adding more event types (API calls, settings changes, etc.)
5. Implement data retention policy (archive old activity logs)
6. Add CSV export functionality
7. Create scheduled reports for administrators

## Support

If issues persist:
1. Check [ADMIN_DASHBOARD_ACTIVITY_TRACKING.md](./ADMIN_DASHBOARD_ACTIVITY_TRACKING.md) for implementation details
2. Review backend logs: `npm run dev` output
3. Check MongoDB logs for database errors
4. Verify Keycloak configuration
5. Test with a fresh database/test data
