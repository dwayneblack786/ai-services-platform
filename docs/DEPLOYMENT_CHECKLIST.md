# Deployment Checklist - Prompt Management UI/UX Improvements

## Pre-Deployment Verification

### ✅ Code Quality
- [ ] All TypeScript compilation errors resolved
- [ ] No console errors in browser
- [ ] No eslint warnings
- [ ] Code follows project style guide
- [ ] All TODO comments addressed or documented

### ✅ Testing
- [ ] Backend API endpoints tested with curl/Postman
- [ ] Frontend UI tested in Chrome
- [ ] Frontend UI tested in Firefox
- [ ] Frontend UI tested in Safari (if applicable)
- [ ] Mobile responsive design verified
- [ ] Version workflow tested end-to-end
- [ ] Promotion workflow tested (draft → testing → production)
- [ ] Edge cases handled (errors, invalid states, etc.)

### ✅ Database
- [ ] MongoDB connection successful
- [ ] All required collections exist
- [ ] Indexes created and optimized
- [ ] Sample data loaded for testing
- [ ] Backup created before deployment

### ✅ Documentation
- [ ] API documentation complete
- [ ] User guide updated
- [ ] Admin guide updated
- [ ] Code comments added
- [ ] README files updated

---

## Deployment Steps

### Step 1: Backup

```bash
# Backup MongoDB
mongodump --db ai-services --out ./backup-$(date +%Y%m%d-%H%M%S)

# Backup current codebase
git tag -a pre-ui-improvements-deployment -m "Backup before UI improvements deployment"
git push --tags
```

**Verification:**
- [ ] Backup file created successfully
- [ ] Backup file size is reasonable
- [ ] Git tag pushed to remote

---

### Step 2: Backend Deployment

```bash
cd ai-product-management/backend-node

# Install dependencies (if any new ones)
npm install

# Build TypeScript
npm run build

# Run tests (if available)
npm test

# Start production server
npm run start
```

**Verification:**
- [ ] Build completes without errors
- [ ] Server starts on port 5000
- [ ] All routes registered successfully
- [ ] MongoDB connection established
- [ ] No critical errors in logs

**Health Check:**
```bash
curl http://localhost:5000/health
# Expected: { "status": "ok", ... }
```

---

### Step 3: Frontend Deployment

```bash
cd ai-product-management/frontend

# Install dependencies (if any new ones)
npm install

# Build production bundle
npm run build

# Verify build output
ls -lh dist/
```

**Verification:**
- [ ] Build completes without errors
- [ ] dist/ folder created
- [ ] Bundle size is reasonable (< 1MB)
- [ ] No console warnings during build

**Serve Production Build:**
```bash
# Preview production build
npm run preview

# Or serve with your web server (nginx, Apache, etc.)
```

---

### Step 4: Environment Configuration

**Backend .env:**
```env
# Verify these are set correctly
MONGODB_URI=mongodb://your-production-db:27017/ai-services
NODE_ENV=production
PORT=5000
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

**Frontend Environment:**
```env
# Verify API URL points to production
VITE_API_URL=https://your-production-api.com
```

**Verification:**
- [ ] All required env vars set
- [ ] API URL points to correct backend
- [ ] Database credentials correct
- [ ] Redis connection configured

---

### Step 5: Database Migrations (If Needed)

**Check if migrations are needed:**
```javascript
// MongoDB shell
use ai-services

// Verify collections exist
show collections

// Check TenantPromptBinding has currentDraftId field
db.tenant_prompt_bindings.findOne()

// Check PromptVersion schema
db.promptversions.findOne()
```

**No migrations required for this deployment!**
- ✅ All schema changes are additive
- ✅ Existing data remains valid
- ✅ New fields are optional

**Verification:**
- [ ] All collections accessible
- [ ] Sample queries return expected results
- [ ] Indexes are active

---

### Step 6: API Testing

**Test New Endpoints:**

```bash
# 1. Test promotion endpoint
curl -X POST http://your-api/api/pms/prompts/{id}/promote \
  -H "Content-Type: application/json" \
  -d '{"targetState": "testing"}'

# Expected: Prompt with state="testing"

# 2. Test version creation
curl -X PUT http://your-api/api/pms/prompts/{production-id} \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated"}'

# Expected: { "prompt": {...}, "isNewVersion": true }

# 3. Test tenant promotion
curl -X POST http://your-api/api/pms/tenant-prompts/{product}/voice/promote \
  -H "Content-Type: application/json" \
  -d '{"promptVersionId": "{id}", "targetState": "testing"}'

# Expected: { "prompt": {...}, "binding": {...} }
```

**Verification:**
- [ ] All new endpoints respond correctly
- [ ] Response format matches documentation
- [ ] Error handling works (try invalid requests)
- [ ] Old endpoints still work

---

### Step 7: Frontend Testing

**Navigate to Production URL:**
```
https://your-frontend-url/prompts
```

**Test Checklist:**
- [ ] Page loads without errors
- [ ] Dashboard view displays cards correctly
- [ ] VersionStatus badges show proper colors
- [ ] AnalyticsCard displays (or shows "pending")
- [ ] Click "Edit" on production prompt
- [ ] Warning appears: "First save will create draft"
- [ ] Save creates new version
- [ ] Button changes to "Update Draft"
- [ ] Further saves don't create versions
- [ ] "Promote to Testing" button appears
- [ ] Promotion workflow works
- [ ] Redirects after production promotion

**Tenant Prompts Page:**
```
https://your-frontend-url/tenant-prompts?productId={id}
```

**Test Checklist:**
- [ ] Page loads with gradient header
- [ ] VersionStatus integrated
- [ ] AnalyticsCard shows data
- [ ] Action buttons have hover effects
- [ ] Empty state displays correctly (if no prompts)
- [ ] "Edit Prompt" navigates to editor
- [ ] Same version workflow as project admin

---

### Step 8: Performance Verification

**Backend Performance:**
```bash
# Test response times
time curl http://your-api/api/pms/prompts/{id}

# Should be < 200ms

# Test under load (optional)
ab -n 1000 -c 10 http://your-api/api/pms/prompts/{id}
```

**Frontend Performance:**
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No layout shifts (CLS < 0.1)

**Database Performance:**
```javascript
// Check query performance
db.promptversions.find({
  promptId: ObjectId("...")
}).explain("executionStats")

// Ensure indexes are used
// executionStats.totalDocsExamined should be low
```

**Verification:**
- [ ] API responses fast (< 500ms)
- [ ] Frontend loads quickly
- [ ] No performance regressions
- [ ] Database queries optimized

---

### Step 9: Security Verification

**Authentication:**
- [ ] All endpoints require authentication (if configured)
- [ ] Unauthenticated requests rejected
- [ ] Session management works

**Authorization:**
- [ ] Tenant isolation enforced
- [ ] Project admin can access project routes
- [ ] Tenant admin can access tenant routes
- [ ] Cross-tenant access blocked

**Input Validation:**
- [ ] Invalid state transitions rejected
- [ ] SQL injection protected (not applicable - MongoDB)
- [ ] XSS protection active
- [ ] CSRF tokens validated (if configured)

**Audit Logging:**
```javascript
// Verify audit logs are created
db.promptauditlogs.find().sort({ timestamp: -1 }).limit(10)

// Check for:
// - version_created_from_edit
// - promoted
// - archived
```

**Verification:**
- [ ] All actions logged
- [ ] Actor information captured
- [ ] No sensitive data exposed
- [ ] HTTPS enforced (production only)

---

### Step 10: Monitoring Setup

**Application Monitoring:**
- [ ] Error tracking enabled (Sentry, etc.)
- [ ] Application Insights configured
- [ ] Log aggregation active
- [ ] Alerts configured

**Metrics to Monitor:**
- API response times
- Error rates
- Version creation frequency
- Promotion success rates
- Database query performance
- Memory usage
- CPU usage

**Dashboard:**
- [ ] Create monitoring dashboard
- [ ] Set up alerts for critical metrics
- [ ] Configure on-call rotation (if applicable)

---

### Step 11: Rollback Plan

**If Issues Arise:**

```bash
# 1. Rollback Git
git revert HEAD
git push

# 2. Restore Database (if needed)
mongorestore --db ai-services ./backup-YYYYMMDD-HHMMSS/ai-services

# 3. Redeploy Previous Version
git checkout {previous-tag}
npm run build
npm run start

# 4. Clear CDN cache (if applicable)
# ... specific to your CDN
```

**Rollback Triggers:**
- Critical errors in logs
- Error rate > 5%
- API response time > 2s
- Database connection issues
- User-reported critical bugs

**Verification:**
- [ ] Rollback procedure documented
- [ ] Backup accessible
- [ ] Team knows rollback steps

---

### Step 12: Post-Deployment Verification

**Smoke Tests (5 minutes):**
- [ ] Homepage loads
- [ ] Login works
- [ ] Dashboard displays
- [ ] Create new prompt works
- [ ] Edit prompt works
- [ ] Version creation works
- [ ] Promotion works

**Full Regression (30 minutes):**
- [ ] All existing features work
- [ ] New features work as expected
- [ ] No console errors
- [ ] No visual glitches
- [ ] Performance acceptable

**User Acceptance:**
- [ ] Notify stakeholders of deployment
- [ ] Gather initial feedback
- [ ] Address any immediate concerns

---

## Post-Deployment

### Day 1

**Monitor Closely:**
- Check logs every hour
- Review error rates
- Monitor performance metrics
- Respond to user feedback

**Checklist:**
- [ ] No critical errors in logs
- [ ] Error rate < 1%
- [ ] Performance within targets
- [ ] No user complaints

### Week 1

**Ongoing Monitoring:**
- Daily log review
- Weekly metrics report
- User feedback collection
- Performance optimization

**Checklist:**
- [ ] Create metrics report
- [ ] Document any issues
- [ ] Plan optimizations
- [ ] Update documentation based on feedback

### Month 1

**Retrospective:**
- What went well?
- What could be improved?
- Any unexpected issues?
- Lessons learned?

**Checklist:**
- [ ] Conduct team retrospective
- [ ] Document lessons learned
- [ ] Plan future improvements
- [ ] Celebrate success! 🎉

---

## Emergency Contacts

**On-Call Rotation:**
- Primary: [Name] - [Phone]
- Secondary: [Name] - [Phone]
- Escalation: [Manager] - [Phone]

**Key Resources:**
- Monitoring Dashboard: [URL]
- Log Aggregation: [URL]
- Runbook: [Link]
- Slack Channel: #incidents

---

## Success Criteria

### Deployment is Successful When:

✅ **Functionality:**
- All new features work as designed
- No existing features broken
- Version workflow operates correctly
- Promotion workflow completes successfully

✅ **Performance:**
- API response times < 500ms (95th percentile)
- Frontend loads < 3s
- No performance regressions
- Database queries optimized

✅ **Stability:**
- Error rate < 1%
- No critical errors
- Uptime > 99.9%
- Rollback not needed

✅ **User Experience:**
- Positive user feedback
- UI is intuitive
- No UX regressions
- Professional appearance maintained

✅ **Business Impact:**
- Reduces version spam (validation TBD)
- Improves admin efficiency (validation TBD)
- Enhances user satisfaction (validation TBD)

---

## Sign-Off

**Deployment Approved By:**
- [ ] Tech Lead: _____________ Date: _______
- [ ] QA Lead: _____________ Date: _______
- [ ] Product Owner: _____________ Date: _______
- [ ] DevOps: _____________ Date: _______

**Deployment Date:** __________________

**Deployed By:** __________________

**Verification Completed:** __________________

---

## Additional Notes

**Special Considerations:**
- This is a UI/UX improvement with no breaking changes
- Database migrations not required
- Backward compatible with existing data
- Can be deployed during business hours (low risk)

**Recommended Deployment Window:**
- Off-peak hours for minimal user impact
- Have team available for monitoring
- Allow 2-4 hours for full deployment

**Communication:**
- [ ] Notify users of new features
- [ ] Update release notes
- [ ] Post in company chat
- [ ] Update status page

