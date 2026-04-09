# Fix: Missing ProductId in TenantPrompts URL

**Issue:** TenantPrompts page shows `productId=undefined` in URL, preventing proper display

---

## Root Cause

The URL `http://localhost:5173/tenant-prompts?channel=voice` is **missing the `productId` parameter**.

TenantPrompts requires `productId` to fetch bindings and display prompts.

---

## Quick Fix: Use Correct URL

**Current (broken):**
```
http://localhost:5173/tenant-prompts?channel=voice
```

**Correct:**
```
http://localhost:5173/tenant-prompts?productId=69728bdb0959e1a2da517684&channel=voice
```

### Get ProductId from Prompt

The prompt `698361132d59c6b650f2fa1b` has:
- `productId`: `69728bdb0959e1a2da517684`
- `tenantId`: `tenant-default`
- `channelType`: `voice`

---

## Verify Data Script

Run the verification script to check data integrity:

```bash
cd product-management/backend-node

# Run verification script
npx ts-node src/scripts/verifyPromptData.ts
```

**The script will:**
1. Check prompts with tenantId but no productId
2. Update binding lastScore from latest test results
3. Verify the specific prompt `698361132d59c6b650f2fa1b`
4. Create binding if missing
5. Show test results

---

## Expected Output

After using correct URL, you should see:

**TenantPrompts Dashboard:**
- Score ring showing **91%**
- "Blocks Promotion" warning
- Compliance violation details

**PromptEditor:**
- Full prompt details
- Analysis tab with test results
- ProductId properly passed in URL

---

## Navigation Fix

If you're navigating from another page, ensure the link includes productId:

```typescript
// Good
navigate(`/tenant-prompts?productId=${productId}&channel=voice`);

// Bad
navigate(`/tenant-prompts?channel=voice`);
```

---

## Verification Steps

1. **Check prompt has productId:**
   ```bash
   curl http://localhost:5000/api/pms/prompts/698361132d59c6b650f2fa1b | grep productId
   ```

2. **Check binding exists:**
   ```bash
   npx ts-node src/scripts/verifyPromptData.ts
   ```

3. **Use correct URL:**
   ```
   http://localhost:5173/tenant-prompts?productId=69728bdb0959e1a2da517684&channel=voice
   ```

4. **Verify analysis shows:**
   - Click on prompt card or "Edit Draft" from menu
   - URL should be: `/prompts/edit/698361132d59c6b650f2fa1b?productId=69728bdb0959e1a2da517684`
   - Click "🔍 Analysis" tab
   - See score: 91%, compliance violation

---

## Summary

**Problem:** Missing `productId` in URL
**Solution:** Use `?productId=69728bdb0959e1a2da517684&channel=voice`
**Script:** Run `verifyPromptData.ts` to check/fix data
