# Security & Monitoring Implementation Guide

## Overview

This guide covers the installation and configuration of:
1. **CSP Headers** - Content Security Policy for XSS protection
2. **Application Insights** - Azure monitoring and telemetry
3. **Sentry** - Error tracking and performance monitoring  
4. **Admin Dashboard** - Registration management interface

---

## 1. Install Required Packages

### Backend Dependencies

```bash
cd ai-product-management/backend-node
npm install --save helmet @sentry/node @sentry/profiling-node applicationinsights
```

**Packages installed:**
- `helmet` - Security headers middleware (CSP, HSTS, etc.)
- `@sentry/node` - Error tracking for Node.js
- `@sentry/profiling-node` - Performance profiling
- `applicationinsights` - Azure Application Insights SDK

### Frontend Dependencies

```bash
cd ai-product-management/frontend
npm install --save @sentry/react
```

**Packages installed:**
- `@sentry/react` - Error tracking and performance monitoring for React

**Optional packages:**
```bash
npm install --save @sentry/replay  # For session replay feature
```

---

## 2. Environment Configuration

### Backend (.env)

Add these variables to `ai-product-management/backend-node/.env`:

```env
# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
# Get from: https://sentry.io/settings/your-org/projects/your-project/keys/

# Application Insights Configuration
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=your-key;IngestionEndpoint=https://region.applicationinsights.azure.com/
# Get from: Azure Portal -> Application Insights -> Properties -> Connection String

# Security Configuration (optional overrides)
SESSION_COOKIE_SECURE=true  # Set to true in production with HTTPS
SESSION_COOKIE_MAX_AGE=86400000  # 24 hours in milliseconds
SESSION_SECRET=your-very-secure-random-string-here

# Keycloak (if not already configured)
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KEYCLOAK_MASTER_REALM=master
```

### Frontend (.env)

Add these variables to `ai-product-management/frontend/.env`:

```env
# Sentry Configuration
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
# Get from: https://sentry.io/settings/your-org/projects/your-project/keys/

# API Configuration (if not already set)
VITE_API_BASE_URL=http://localhost:5000

# App Version (for release tracking)
VITE_APP_VERSION=1.0.0
```

---

## 3. Sentry Setup

### Create Sentry Projects

1. **Sign up at [sentry.io](https://sentry.io)**

2. **Create two projects:**
   - Project 1: `ai-platform-backend` (Node.js/Express)
   - Project 2: `ai-platform-frontend` (React)

3. **Get DSN keys:**
   - Navigate to Settings → Projects → [Your Project] → Client Keys (DSN)
   - Copy the DSN for each project

4. **Enable Session Replay (Frontend):**
   - Go to Settings → Projects → ai-platform-frontend
   - Enable "Session Replay" feature
   - Adjust sample rates as needed

### Configure Alerts

1. **Backend Alerts:**
   - Settings → Alerts → New Alert Rule
   - Condition: Error count > 10 in 5 minutes
   - Actions: Email, Slack notification

2. **Frontend Alerts:**
   - Settings → Alerts → New Alert Rule
   - Condition: JavaScript error rate > 5% in 1 hour
   - Actions: Email, Slack notification

---

## 4. Azure Application Insights Setup

### Create Application Insights Resource

1. **Login to Azure Portal**

2. **Create new Application Insights:**
   ```
   Resource Group: your-resource-group
   Name: ai-platform-monitoring
   Region: East US (or your preferred region)
   Resource Mode: Workspace-based
   ```

3. **Get Connection String:**
   - Go to Application Insights → Properties
   - Copy "Connection String"
   - Add to backend `.env` file

### Configure Dashboards

1. **Create custom dashboard:**
   - Application Insights → Dashboards → New Dashboard
   - Add tiles:
     - Server response time
     - Failed requests
     - Server requests
     - Custom events (registrations)

2. **Set up Application Map:**
   - Application Insights → Application Map
   - View dependencies and performance

3. **Configure Availability Tests:**
   - Application Insights → Availability
   - Add URL ping test for health endpoint

---

## 5. Content Security Policy (CSP)

### Verify CSP Headers

The security middleware is now active. To verify:

```bash
# Test CSP headers
curl -I http://localhost:5000/api/health

# Should see headers like:
# Content-Security-Policy: default-src 'self'; ...
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
```

### Customize CSP (if needed)

Edit `backend-node/src/middleware/security.middleware.ts`:

```typescript
// Add trusted domains
connectSrc: [
  "'self'",
  'http://localhost:*',
  'https://yourdomain.com', // Add your domains
],
```

### Production Configuration

For production, ensure:
- `HTTPS` is enabled
- Remove `'unsafe-inline'` and `'unsafe-eval'` from scriptSrc
- Enable `upgradeInsecureRequests`
- Configure `HSTS` with long max-age

---

## 6. Admin Dashboard Access

### Routes Created

**Backend API:**
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/registrations` - List registrations (paginated)
- `GET /api/admin/registrations/:sessionId` - Get registration details
- `DELETE /api/admin/registrations/:sessionId` - Delete registration

**Frontend:**
- `/admin/dashboard` - Admin dashboard page (protected route)

### Access the Dashboard

1. **Start the application:**
   ```bash
   # Terminal 1 - Backend
   cd ai-product-management/backend-node
   npm run dev

   # Terminal 2 - Frontend
   cd ai-product-management/frontend
   npm run dev
   ```

2. **Navigate to:**
   ```
   http://localhost:5173/admin/dashboard
   ```

3. **Features:**
   - Overview statistics (users, tenants, registrations)
   - Trends (24h, 7d, 30d)
   - Recent activity log
   - Full registration list with search/filter
   - Pagination support

### Add Authentication (Recommended)

Currently, the admin routes are **not protected**. Add authentication middleware:

```typescript
// In backend-node/src/routes/admin.routes.ts

import { requireAdmin } from '../middleware/auth.middleware';

// Apply to all admin routes
router.use(requireAdmin);
```

Create `auth.middleware.ts`:
```typescript
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
```

---

## 7. Testing the Implementation

### Test CSP Headers

```bash
# Check security headers
curl -I http://localhost:5000/api/health

# Expected headers:
# - Content-Security-Policy
# - X-Frame-Options: SAMEORIGIN
# - X-Content-Type-Options: nosniff
# - X-XSS-Protection: 1; mode=block
```

### Test Sentry Error Tracking

**Backend test:**
```bash
# Trigger an error
curl http://localhost:5000/api/test-error
```

Check Sentry dashboard for the error.

**Frontend test:**
```javascript
// In browser console
throw new Error('Test error from frontend');
```

Check Sentry dashboard for the error.

### Test Application Insights

1. **Generate traffic:**
   - Make API requests
   - Navigate through frontend

2. **View in Azure Portal:**
   - Application Insights → Live Metrics
   - Should see real-time requests
   - Check response times and dependencies

3. **Query logs:**
   ```kql
   requests
   | where timestamp > ago(1h)
   | summarize count() by name
   | order by count_ desc
   ```

### Test Admin Dashboard

1. **Create test registrations:**
   - Go to `/register/initiate`
   - Create a few test registrations

2. **View in dashboard:**
   - Navigate to `/admin/dashboard`
   - Check statistics
   - View registration list
   - Test pagination

---

## 8. Monitoring & Alerting

### Sentry Dashboards

**Create custom dashboards:**
1. Go to Sentry → Dashboards → Create Dashboard
2. Add widgets:
   - Error rate by endpoint
   - Most common errors
   - Error distribution by browser/OS
   - Performance metrics

**Set up alerts:**
- High error rate
- New error types
- Performance degradation
- Release tracking

### Application Insights Alerts

**Create alert rules:**
1. Application Insights → Alerts → New Alert Rule
2. Configure:
   - **Condition:** Failed requests > 10 in 5 minutes
   - **Action:** Email to ops team
   - **Severity:** Error

**Additional alerts:**
- Server response time > 2 seconds
- Availability < 99%
- Exception rate > 5%
- Low disk space

### Custom Events Tracking

**Backend - Track business events:**
```typescript
import { trackEvent, trackMetric } from './middleware/appInsights.middleware';

// Track registration completion
trackEvent('RegistrationCompleted', {
  companyName: 'Acme Corp',
  industry: 'Technology'
});

// Track custom metrics
trackMetric('RegistrationDuration', 45000, {
  stage: 'provisioning'
});
```

**Frontend - Track user actions:**
```typescript
import { addBreadcrumb, captureMessage } from './utils/sentry';

// Track user navigation
addBreadcrumb('User navigated to setup company', 'navigation', {
  from: '/register/setup-account',
  to: '/register/setup-company'
});

// Track important events
captureMessage('User completed registration', 'info', {
  userId: user.id,
  tenantId: tenant.id
});
```

---

## 9. Performance Optimization

### Application Insights Performance

**View performance data:**
- Application Insights → Performance
- Analyze slow requests
- Identify bottlenecks

**Optimize based on data:**
- Add caching for slow endpoints
- Optimize database queries
- Add CDN for static assets

### Sentry Performance Monitoring

**View transaction traces:**
- Sentry → Performance
- Analyze slow transactions
- Identify slow API calls

**Set performance budgets:**
- Target: 95th percentile < 500ms
- Alert on degradation

---

## 10. Production Checklist

Before deploying to production:

### Security
- [ ] CSP configured without `'unsafe-inline'` or `'unsafe-eval'`
- [ ] HTTPS enforced
- [ ] HSTS enabled with long max-age
- [ ] All secrets in Azure Key Vault
- [ ] Admin routes protected with authentication
- [ ] Rate limiting enabled
- [ ] CORS properly configured

### Monitoring
- [ ] Sentry DSN configured
- [ ] Application Insights connection string configured
- [ ] Alerts configured for critical errors
- [ ] Dashboard created for monitoring
- [ ] Log retention configured

### Performance
- [ ] Sample rates configured (10% for traces)
- [ ] Session replay sampling at 10%
- [ ] Database connection pooling enabled
- [ ] Caching strategy implemented

### Testing
- [ ] Security headers verified
- [ ] Error tracking tested
- [ ] Performance monitoring tested
- [ ] Admin dashboard accessible
- [ ] Alerts triggered successfully

---

## 11. Maintenance

### Regular Tasks

**Daily:**
- Review Sentry errors
- Check Application Insights for anomalies
- Monitor admin dashboard for failed registrations

**Weekly:**
- Review performance trends
- Analyze slow endpoints
- Check for new security vulnerabilities

**Monthly:**
- Review and update CSP policy
- Analyze costs (Sentry, Azure)
- Update dependencies
- Review alert thresholds

### Troubleshooting

**Sentry not capturing errors:**
1. Check DSN is correct
2. Verify environment variable loaded
3. Check network connectivity
4. Review Sentry project settings

**Application Insights not showing data:**
1. Verify connection string
2. Check Azure portal for resource status
3. Review firewall rules
4. Check sample rates

**Admin dashboard not loading:**
1. Check backend logs for errors
2. Verify MongoDB connection
3. Check CORS configuration
4. Review browser console for errors

---

## 12. Cost Management

### Sentry Pricing

**Free tier:**
- 5,000 errors/month
- 10,000 performance units/month
- 30-day retention

**Paid tiers:**
- Team: $26/month
- Business: $80/month
- Enterprise: Custom

**Optimization:**
- Use error grouping
- Filter out common non-critical errors
- Adjust sample rates

### Azure Application Insights

**Pricing:**
- $2.30 per GB ingested
- First 5 GB/month free

**Cost optimization:**
- Adjust sample rates (10% recommended)
- Filter out verbose logs
- Use daily cap
- Enable adaptive sampling

**Estimate costs:**
```
Average request size: 1 KB
Requests per month: 1M
Data ingested: 1 GB
Cost: Free tier (< 5 GB)
```

---

## 13. Additional Resources

### Documentation
- [Helmet.js](https://helmetjs.github.io/)
- [Sentry Node.js](https://docs.sentry.io/platforms/node/)
- [Sentry React](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Application Insights](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

### Support
- Sentry Support: support@sentry.io
- Azure Support: Azure Portal → Support
- Community: Stack Overflow, GitHub Issues

---

## Summary

✅ **Implemented:**
- CSP headers with Helmet.js
- Sentry error tracking (backend + frontend)
- Azure Application Insights monitoring
- Admin dashboard for registration management
- Security headers (X-Frame-Options, HSTS, etc.)

✅ **Next Steps:**
1. Configure Sentry projects and get DSNs
2. Create Azure Application Insights resource
3. Update environment variables
4. Install npm packages
5. Test implementation
6. Deploy to staging
7. Set up production monitoring

**Total Implementation Time:** ~2 hours
**Ongoing Maintenance:** ~1 hour/week
**Estimated Monthly Cost:** $0-50 (depending on usage)

