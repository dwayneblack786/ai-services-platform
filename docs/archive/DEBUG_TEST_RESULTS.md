# Debug Guide: Test Results Not Showing

**Issue:** Analysis ran on prompt `698361132d59c6b650f2fa1b` but results not visible in UI

---

## ✅ Verified Working

### 1. Backend API
**Endpoint:** `GET /api/pms/prompt-testing/698361132d59c6b650f2fa1b/test-results`

**Test:**
```bash
curl http://localhost:5000/api/pms/prompt-testing/698361132d59c6b650f2fa1b/test-results
```

**Result:** ✅ Returns test results correctly
```json
{
  "overallScore": 91,
  "passed": false,
  "criticalIssues": 1,
  "blocksPromotion": true,
  "blockingReasons": ["Compliance violations found"],
  "safetyTests": {
    "complianceViolations": [{
      "rule": "prohibited_topic_in_system_prompt",
      "severity": "medium",
      "description": "Prohibited topic \"Medical diagnosis\" referenced in system prompt"
    }]
  }
}
```

### 2. Frontend Component
**File:** [TestResultsViewer.tsx](../ai-product-management/frontend/src/components/TestResultsViewer.tsx)

**Logic:** ✅ Correctly fetches and renders results
- Fetches from `/api/pms/prompt-testing/${promptVersionId}/test-results`
- Displays score ring, quality/safety/performance tabs
- Shows compliance violations

---

## 🔍 Troubleshooting Steps

### Step 1: Check if Analysis Tab is Visible

**Location:** [PromptEditor.tsx:1167](../ai-product-management/frontend/src/pages/PromptEditor.tsx#L1167)

**Code:**
```typescript
{/* Tab shows only if prompt._id exists */}
{(prompt._id
  ? ['configuration', 'preview', 'analysis']
  : ['configuration', 'preview']
).map((tab) => (
  <button onClick={() => setActiveTab(tab)}>
    {tab === 'analysis' ? '🔍 Analysis' : tab}
  </button>
))}
```

**Check:**
1. Open browser DevTools (F12)
2. Navigate to: `http://localhost:5173/prompts/edit/698361132d59c6b650f2fa1b?productId=69728bdb0959e1a2da517684`
3. Look for "🔍 Analysis" tab button
4. If not visible → Prompt not loaded (`prompt._id` is null)

**Fix if prompt not loading:**
```typescript
// Check console for errors
// Check Network tab for failed /api/pms/prompts/698361132d59c6b650f2fa1b request
```

### Step 2: Click Analysis Tab

**Manual Test:**
1. Go to: `http://localhost:5173/prompts/edit/698361132d59c6b650f2fa1b?productId=69728bdb0959e1a2da517684`
2. Wait for prompt to load
3. Click "🔍 Analysis" tab
4. Should see test results

**Expected:**
- Score ring showing 91%
- "Needs Attention" badge
- "Blocks Promotion" warning
- Compliance violation: "Medical diagnosis"

### Step 3: Check Network Request

**Open DevTools → Network Tab:**
1. Click Analysis tab
2. Look for request to: `/api/pms/prompt-testing/698361132d59c6b650f2fa1b/test-results`
3. Check if request succeeds (200 OK)
4. Check response contains test results

**If request fails:**
- Check CORS errors
- Check authentication (cookies/session)
- Check backend logs

### Step 4: Check Console Errors

**Open DevTools → Console:**
Look for errors like:
- `Failed to fetch test results`
- Network errors
- CORS errors
- Authentication errors

---

## 🐛 Common Issues

### Issue 1: Analysis Tab Not Showing
**Symptom:** Only see "Configuration" and "Preview" tabs

**Cause:** `prompt._id` is null (prompt not loaded)

**Debug:**
```javascript
// In browser console
console.log(window.location.href);
// Should be: http://localhost:5173/prompts/edit/698361132d59c6b650f2fa1b?productId=...

// Check React DevTools
// Find PromptEditor component
// Check props.id
// Check state.prompt._id
```

**Fix:**
1. Check if backend is running: `curl http://localhost:5000/api/pms/prompts/698361132d59c6b650f2fa1b`
2. Check if prompt exists in database
3. Check authentication (logged in?)

### Issue 2: Tab Exists But Shows "No analysis results yet"
**Symptom:** Analysis tab visible, but says "No analysis results yet"

**Cause:** Frontend fetching wrong prompt ID or results not in database

**Debug:**
```javascript
// In browser console
// Check Network tab for the actual request URL
// Should be: /api/pms/prompt-testing/698361132d59c6b650f2fa1b/test-results

// Check response
// Should contain array with test result objects
```

**Fix:**
```bash
# Verify results exist in database
curl http://localhost:5000/api/pms/prompt-testing/698361132d59c6b650f2fa1b/test-results

# If empty [], run analysis again
curl -X POST http://localhost:5000/api/pms/prompt-testing/698361132d59c6b650f2fa1b/test
```

### Issue 3: CORS or Authentication Error
**Symptom:** Network request fails with 401 or CORS error

**Cause:** Not authenticated or CORS misconfiguration

**Debug:**
```javascript
// Check cookies in DevTools → Application → Cookies
// Should have session cookie

// Check Network tab → Headers
// Should have Cookie header
```

**Fix:**
1. Make sure you're logged in
2. Try refreshing the page
3. Check backend CORS configuration

---

## 🔧 Quick Fix Commands

### Re-run Analysis
```bash
# Trigger new analysis
curl -X POST http://localhost:5000/api/pms/prompt-testing/698361132d59c6b650f2fa1b/test \
  -H "Content-Type: application/json"
```

### Check if Prompt Exists
```bash
curl http://localhost:5000/api/pms/prompts/698361132d59c6b650f2fa1b
```

### Check Test Results
```bash
curl http://localhost:5000/api/pms/prompt-testing/698361132d59c6b650f2fa1b/test-results | jq
```

---

## ✅ Success Indicators

When working correctly, you should see:

1. **Three tabs:** Configuration | Preview | 🔍 Analysis
2. **Analysis tab shows:**
   - "Run Analysis" button
   - Score ring (91%)
   - "Needs Attention" badge
   - "Blocks Promotion" warning
   - Three sub-tabs: Quality | Safety | Performance
3. **Safety tab shows:**
   - ✅ No toxicity detected
   - ✅ No bias detected
   - ✅ No PII leakage
   - ⚠️ 1 compliance violation
     - Rule: prohibited_topic_in_system_prompt
     - Severity: medium
     - Description: "Medical diagnosis" in system prompt

---

## 📞 Still Not Working?

### Collect Debug Info

```javascript
// Run in browser console on the editor page
console.log({
  url: window.location.href,
  promptId: document.querySelector('[data-prompt-id]')?.textContent,
  tabs: Array.from(document.querySelectorAll('button')).map(b => b.textContent),
  activeTab: localStorage.getItem('activeTab') // if using localStorage
});
```

### Check Backend Logs

```bash
# Watch backend logs
tail -f ai-product-management/backend-node/logs/app.log

# Or if using console logging
# Check terminal where backend is running
```

### Verify Frontend Build

```bash
# Make sure latest code is running
cd ai-product-management/frontend
npm run build  # if in production
# Or restart dev server
npm run dev
```

---

## 📝 Expected Behavior

**URL:** `http://localhost:5173/prompts/edit/698361132d59c6b650f2fa1b?productId=69728bdb0959e1a2da517684`

**Flow:**
1. Page loads → Fetches prompt from backend
2. `prompt._id` populated → Analysis tab appears
3. Click Analysis tab → `activeTab` becomes 'analysis'
4. TestResultsViewer mounts → Fetches test results
5. Results display → Shows score 91%, compliance violation

**If any step fails, check that step specifically.**

