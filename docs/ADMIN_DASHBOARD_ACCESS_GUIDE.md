# Admin Dashboard Access Guide

## ✅ Security Fixed & Access Configured

### What Was Fixed

1. **✅ Role-Based Access Control (Frontend)**
   - Changed from `ProtectedRoute` (authentication only) to `RoleProtectedRoute` (role-based)
   - Only users with `ADMIN` or `PROJECT_ADMIN` roles can access

2. **✅ Backend Authorization**
   - All `/api/admin/*` routes now require `ADMIN` or `PROJECT_ADMIN` role
   - Middleware applies to entire admin router for consistent protection

3. **✅ Navigation Menu**
   - Admin dashboard link automatically appears for admins in sidebar
   - Shows as "🔒 Admin Dashboard" with lock icon
   - Hidden for non-admin users

---

## 🔐 Who Can Access Admin Dashboard?

### Authorized Roles

| Role | Can Access? | Permissions |
|------|-------------|-------------|
| **ADMIN** | ✅ Yes | Full access to all tenants and registrations |
| **PROJECT_ADMIN** | ✅ Yes | Full access to all tenants and registrations |
| **ANALYST** | ❌ No | Access denied - shown error page |
| **DEVELOPER** | ❌ No | Access denied - shown error page |
| **CLIENT** | ❌ No | Access denied - shown error page |

### First User is Always Admin

When a company completes registration:
- **First user** automatically receives `ADMIN` role
- Subsequent users get roles assigned by admins
- First user becomes the tenant administrator

---

## 🚀 How to Access Admin Dashboard

### For Admins (ADMIN or PROJECT_ADMIN role)

#### Method 1: Using Navigation Menu (Recommended)

1. **Log in** to the platform:
   ```
   http://localhost:5173/login
   ```

2. **Look at the sidebar menu** (left side)
   - You'll see: "🔒 Admin Dashboard" at the bottom of the menu
   - This link **only appears if you're an admin**

3. **Click** the "🔒 Admin Dashboard" link

4. **View** the admin dashboard with:
   - Registration statistics
   - User/tenant counts
   - Recent activity
   - All registration sessions

#### Method 2: Direct URL

Alternatively, navigate directly:
```
http://localhost:5173/admin/dashboard
```

**What happens:**
- If you're logged in as ADMIN/PROJECT_ADMIN → Dashboard loads
- If you're logged in as another role → "Access Denied" page
- If you're not logged in → Redirects to login page

---

## 📊 Admin Dashboard Features

### Overview Tab

**Statistics Cards:**
- Total Users
- Total Tenants
- Active Registrations (in progress)
- Completed Registrations
- Completion Rate (%)
- Failed Registrations

**Trends:**
- Users added (last 24h, 7 days, 30 days)
- Registrations started (last 24h, 7 days, 30 days)

**Recent Activity Table:**
- Last 10 registration sessions
- Shows: Email, Company, Status, Created Date

### Registrations Tab

**Full Registration List:**
- All registration sessions with pagination
- Filters: Status, Search (email/phone/company)
- Details per row:
  - Session ID
  - Email
  - Phone number
  - User name
  - Company name
  - Current status
  - Creation timestamp

**Pagination:**
- 20 registrations per page
- Navigate between pages
- Shows total page count

---

## 🔧 Backend API Endpoints

All admin endpoints require authentication + ADMIN/PROJECT_ADMIN role:

### GET `/api/admin/stats`
**Returns:** Dashboard overview statistics

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 45,
      "totalTenants": 12,
      "totalRegistrations": 67,
      "activeRegistrations": 8,
      "completedRegistrations": 52,
      "failedRegistrations": 7,
      "completionRate": 77.61
    },
    "trends": {
      "registrations": {
        "last24Hours": 3,
        "last7Days": 15,
        "last30Days": 42
      },
      "users": {
        "last24Hours": 2,
        "last7Days": 12,
        "last30Days": 35
      }
    },
    "recentActivity": [...]
  }
}
```

### GET `/api/admin/registrations`
**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20, max: 100) - Results per page
- `status` - Filter by registration step
- `search` - Search email/phone/company

**Returns:** Paginated list of registration sessions

```json
{
  "success": true,
  "data": {
    "registrations": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 67,
      "pages": 4
    },
    "statistics": {
      "complete": 52,
      "initiated": 5,
      "phone-verified": 3,
      ...
    }
  }
}
```

### GET `/api/admin/registrations/:sessionId`
**Returns:** Detailed registration session with user and tenant data

```json
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "abc123...",
      "email": "user@example.com",
      "phoneNumber": "+15551234567",
      "currentStep": "complete",
      "metadata": {...},
      ...
    },
    "user": {...},
    "tenant": {...}
  }
}
```

### DELETE `/api/admin/registrations/:sessionId`
**Action:** Delete a registration session (e.g., abandoned/test registrations)

```json
{
  "success": true,
  "message": "Registration session deleted successfully"
}
```

---

## 🔒 Security Implementation Details

### Frontend Protection

**File:** [frontend/src/App.tsx](ai-product-management/frontend/src/App.tsx#L61-L69)

```tsx
<Route
  path="/admin/dashboard"
  element={
    <RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_ADMIN']}>
      <Layout>
        <AdminDashboard />
      </Layout>
    </RoleProtectedRoute>
  }
/>
```

**RoleProtectedRoute Logic:**
1. Checks if user is authenticated
2. Checks if user has one of the allowed roles
3. If not authorized → Shows "Access Denied" page
4. If authorized → Renders the component

### Backend Protection

**File:** [backend-node/src/routes/admin.routes.ts](ai-product-management/backend-node/src/routes/admin.routes.ts#L1-L13)

```typescript
import { requireRole } from '../middleware/rbac';
import { UserRole } from '../../../shared/types';

const router = Router();

// Apply admin role requirement to ALL routes in this router
router.use(requireRole(UserRole.ADMIN, UserRole.PROJECT_ADMIN));
```

**Middleware Logic:**
1. Checks JWT token from cookies
2. Verifies user exists
3. Checks if user.role matches one of the required roles
4. If not authorized → Returns 403 Forbidden
5. If authorized → Proceeds to route handler

### Navigation Protection

**File:** [frontend/src/components/Sidebar.tsx](ai-product-management/frontend/src/components/Sidebar.tsx#L5-L25)

```tsx
const { user, hasAnyRole } = useAuth();

// Check if user is admin or project admin
const isAdminUser = hasAnyRole('ADMIN', 'PROJECT_ADMIN');

// Admin-only menu items
const adminMenuItems = [
  { path: '/admin/dashboard', label: '🔒 Admin Dashboard', icon: '⚙' },
];

// Combine menu items based on role
const menuItems = isAdminUser 
  ? [...coreMenuItems, ...adminMenuItems]
  : coreMenuItems;
```

**Benefits:**
- Link only rendered for authorized users
- No visibility of admin features to non-admins
- Cleaner UI for regular users

---

## 🧪 Testing Access Control

### Test as Admin

1. **Complete registration** as first user of a new company
2. **Verify role** in database or via API:
   ```bash
   # In backend dev tools console
   User.findOne({ email: 'your-email@example.com' })
   ```
3. **Check sidebar** - Should see "🔒 Admin Dashboard" link
4. **Click link** - Dashboard loads successfully
5. **Try direct URL** - `http://localhost:5173/admin/dashboard` works

### Test as Non-Admin

1. **Create second user** after admin (via invite or self-registration)
2. **Assign non-admin role** (ANALYST, DEVELOPER, CLIENT)
3. **Log in** as this user
4. **Check sidebar** - Should NOT see admin dashboard link
5. **Try direct URL** - Shows "Access Denied" page with redirect button

### Test Unauthenticated

1. **Log out** completely
2. **Clear cookies** (optional - simulates fresh browser)
3. **Try direct URL** - Redirects to login page
4. **After login** - Returns to admin dashboard (if authorized)

---

## 🔨 Role Assignment

### For First User (Automatic)

When company registration completes:
```typescript
// In registration.service.ts
user.role = UserRole.ADMIN; // First user is always admin
await user.save();
```

### For Additional Users (Manual)

**Option 1: Direct Database Update**
```javascript
// MongoDB shell or script
db.users.updateOne(
  { email: 'user@example.com' },
  { $set: { role: 'ADMIN' } }
);
```

**Option 2: Admin API (Future Feature)**
```
POST /api/admin/users/:userId/role
{
  "role": "ADMIN"
}
```

**Option 3: Keycloak Admin Console**
1. Log into Keycloak admin console
2. Navigate to tenant realm
3. Find user
4. Manage role mappings
5. Assign `admin` role

---

## 📝 Monitoring Admin Activity

All admin actions are tracked via Application Insights:

**Events Tracked:**
- `AdminViewedDashboard` - Admin opened dashboard
- `AdminViewedRegistrations` - Admin viewed registrations list
- `AdminViewedRegistrationDetail` - Admin viewed specific session
- `AdminDeletedRegistration` - Admin deleted a session

**查看 Events:**
```kql
// Application Insights query
customEvents
| where name startsWith "Admin"
| project timestamp, name, customDimensions
| order by timestamp desc
```

---

## 🚨 Security Best Practices

### ✅ Implemented

1. **Role-Based Access Control (RBAC)** - Frontend and backend
2. **JWT Token Validation** - All API requests
3. **Middleware Protection** - Entire admin router protected
4. **UI Visibility Control** - Admin links hidden from non-admins
5. **Audit Logging** - All admin actions tracked
6. **Session Management** - Secure session cookies with HttpOnly

### 🔐 Additional Recommendations

1. **Rate Limiting** - Limit admin API requests per minute
2. **IP Whitelisting** - Restrict admin access to trusted IPs (production)
3. **Two-Factor Authentication** - Require 2FA for admin accounts
4. **Admin Audit Trail** - Store all admin actions in database
5. **Automated Alerts** - Notify on suspicious admin activity

---

## 🐛 Troubleshooting

### "Access Denied" Page Shows for Admin User

**Check:**
1. User role in database:
   ```javascript
   db.users.findOne({ email: 'admin@example.com' })
   // Should show: { role: 'ADMIN' } or { role: 'PROJECT_ADMIN' }
   ```

2. JWT token contains correct role:
   ```javascript
   // In browser console
   document.cookie
   // Decode JWT token to verify role claim
   ```

3. AuthContext properly loads user:
   ```javascript
   // In browser console
   localStorage.getItem('user')
   ```

**Fix:**
```javascript
// Update user role manually
db.users.updateOne(
  { email: 'admin@example.com' },
  { $set: { role: 'ADMIN' } }
);
// Log out and log back in to refresh token
```

### Admin Dashboard Link Not Showing in Sidebar

**Check:**
1. `hasAnyRole` function in AuthContext
2. User object has role property
3. Role value matches 'ADMIN' or 'PROJECT_ADMIN' exactly

**Fix:**
```javascript
// In browser dev tools console
localStorage.getItem('user')
// Verify role property exists and has correct value
```

### Backend Returns 403 Forbidden

**Check:**
1. Request includes session cookie
2. JWT token is valid and not expired
3. User exists in system
4. User has correct role

**Fix:**
```bash
# Check backend logs
npm run dev
# Look for "requireRole middleware" logs
# Verify role check logic
```

---

## 📖 Related Documentation

- [Authentication Architecture](AUTHENTICATION_ARCHITECTURE.md)
- [Registration System](LOCAL_TESTING_AND_OAUTH.md)
- [RBAC Middleware](ai-product-management/backend-node/src/middleware/rbac.ts)
- [Admin Routes](ai-product-management/backend-node/src/routes/admin.routes.ts)
- [Admin Dashboard Component](ai-product-management/frontend/src/pages/AdminDashboard.tsx)

---

## 🎯 Quick Reference

### Access URLs
| Resource | URL |
|----------|-----|
| Login | `http://localhost:5173/login` |
| Admin Dashboard | `http://localhost:5173/admin/dashboard` |
| Regular Dashboard | `http://localhost:5173/dashboard` |
| Admin API | `http://localhost:5000/api/admin/*` |

### Required Roles
| Feature | ADMIN | PROJECT_ADMIN | ANALYST | DEVELOPER | CLIENT |
|---------|-------|---------------|---------|-----------|--------|
| View Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Registrations | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Sessions | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Statistics | ✅ | ✅ | ❌ | ❌ | ❌ |

### Status Codes
| Code | Meaning | Reason |
|------|---------|--------|
| 200 | Success | Authorized and data returned |
| 401 | Unauthorized | Not authenticated (no/invalid token) |
| 403 | Forbidden | Authenticated but wrong role |
| 404 | Not Found | Resource doesn't exist |

---

## ✅ Summary

**Admin dashboard is now properly secured with:**

1. ✅ **Frontend role-based routing** - `RoleProtectedRoute` with ADMIN/PROJECT_ADMIN requirement
2. ✅ **Backend middleware protection** - All `/api/admin/*` routes check roles
3. ✅ **Navigation visibility control** - Admin link only visible to authorized users
4. ✅ **Proper error handling** - Clear "Access Denied" pages for unauthorized users
5. ✅ **Audit logging** - All admin actions tracked via Application Insights

**Access method:**
- Users with ADMIN or PROJECT_ADMIN role see "🔒 Admin Dashboard" in sidebar
- Click to access full admin interface
- Non-admin users cannot see or access the dashboard

**First user of each tenant automatically becomes ADMIN** with full access to the admin dashboard.

