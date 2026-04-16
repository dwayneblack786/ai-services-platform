# Emotion Component Selector Fix

## Overview
Fixed Emotion styled-components error when navigating to prompts page from Assistant Channel component.

**Status:** ✅ Complete
**Date:** 2026-02-06

---

## Error Description

### Error Message
```
Error: Component selectors can only be used in conjunction with @emotion/babel-plugin,
the swc Emotion plugin, or another Emotion-aware compiler transform.
    at handleInterpolation
    at serializeStyles
```

### Root Cause
The `VersionStatus.tsx` component was using Emotion component selectors (`${TooltipContainer}:hover &`) which require the Emotion Babel plugin to be configured in Vite. Without this plugin, component selectors fail at runtime.

**Problematic Code:**
```typescript
const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const Tooltip = styled.div`
  // ... styles ...

  ${TooltipContainer}:hover & {  // ❌ Component selector - requires Babel plugin
    opacity: 1;
  }
`;
```

---

## Solution

### Approach
Instead of using component selectors (which require Babel plugin configuration), use standard CSS class selectors with className attribute. This approach:
- Works without additional Babel configuration
- Maintains same functionality
- Follows standard CSS practices
- More predictable and debuggable

### Implementation

**File:** `ai-product-management/frontend/src/components/VersionStatus.tsx`

#### Before (Broken)
```typescript
const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  font-size: 12px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 1000;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
  }

  ${TooltipContainer}:hover & {  // ❌ Component selector
    opacity: 1;
  }
`;

// JSX
<TooltipContainer>
  <StatusBadge state={state}>{state}</StatusBadge>
  <Tooltip>{getStateDescription(state)}</Tooltip>
</TooltipContainer>
```

#### After (Fixed)
```typescript
const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;

  &:hover .tooltip {  // ✅ CSS class selector
    opacity: 1;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  font-size: 12px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 1000;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
  }
`;

// JSX - added className
<TooltipContainer>
  <StatusBadge state={state}>{state}</StatusBadge>
  <Tooltip className="tooltip">{getStateDescription(state)}</Tooltip>
</TooltipContainer>
```

---

## Changes Made

### 1. Updated TooltipContainer Styling
- **Line 45-53:** Changed from component selector to CSS class selector
- **Before:** `${TooltipContainer}:hover & { opacity: 1; }`
- **After:** `&:hover .tooltip { opacity: 1; }`

### 2. Removed Component Selector from Tooltip
- **Line 55-81:** Removed the problematic component selector reference
- Kept all other styles intact

### 3. Added className to JSX
- **Line 135:** Added `className="tooltip"` to the Tooltip component
- This allows the parent's hover selector to target it

---

## Technical Details

### Why Component Selectors Failed
1. Emotion's component selectors (`${Component}`) require compile-time transformation
2. The Babel plugin serializes component references into unique class names
3. Without the plugin, Emotion can't resolve component references at runtime
4. Vite config doesn't include `@emotion/babel-plugin`

### Why CSS Class Selectors Work
1. Standard CSS class selectors work without transformation
2. Emotion applies className to styled components automatically
3. Parent can target child with `.tooltip` selector
4. No build-time configuration needed

### Alternative Solutions Considered

#### Option 1: Add Emotion Babel Plugin (Rejected)
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    })
  ]
});
```

**Why Rejected:**
- Adds build complexity
- Increases bundle size
- Not needed for simple use case
- CSS class selectors are simpler

#### Option 2: Use React State for Hover (Rejected)
```typescript
const [isHovered, setIsHovered] = useState(false);

<TooltipContainer
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  <Tooltip style={{ opacity: isHovered ? 1 : 0 }}>
```

**Why Rejected:**
- Overkill for simple hover effect
- Adds unnecessary state management
- Less performant than CSS
- More complex code

---

## Testing

### Manual Test Steps
1. ✅ Navigate to Assistant Channels page
2. ✅ Click on "Prompts" or navigate to `/prompts`
3. ✅ Verify no console errors
4. ✅ Hover over status badges to see tooltips
5. ✅ Verify tooltip appears on hover
6. ✅ Verify tooltip disappears on mouse leave

### Visual Verification
- Status badges display correctly with colors
- Tooltips appear on hover with smooth transition
- Tooltip arrow points to badge correctly
- No layout shifts or visual glitches

---

## Files Modified

1. **ai-product-management/frontend/src/components/VersionStatus.tsx**
   - Lines 45-53: Updated TooltipContainer with CSS class selector
   - Lines 55-81: Removed component selector from Tooltip
   - Line 135: Added className="tooltip" to JSX

---

## Benefits

### 1. No Build Configuration Required
- Works with existing Vite setup
- No additional Babel plugins needed
- Simpler build process

### 2. Better Performance
- CSS-only hover detection
- No JavaScript state management
- Hardware-accelerated transitions

### 3. Easier to Debug
- Standard CSS selectors in DevTools
- No magic component references
- Clear parent-child relationship

### 4. More Maintainable
- Follows CSS best practices
- Easy to understand for new developers
- No special Emotion knowledge required

---

## Best Practices Going Forward

### When to Use Component Selectors
- When Emotion Babel plugin is configured
- When targeting dynamic styled components
- When component identity matters

### When to Use CSS Class Selectors
- For simple parent-child relationships
- For hover, focus, active states
- When targeting specific elements
- When avoiding build complexity

### Recommendation
**Use CSS class selectors for most use cases** unless you have specific need for component selectors and are willing to configure the Babel plugin.

---

## Related Issues

### Other Files Checked
Searched entire frontend codebase for similar patterns:
- ✅ No other component selectors found in `/pages`
- ✅ No other component selectors found in `/components`
- ✅ Only instance was in `VersionStatus.tsx`

### Prevention
To prevent this issue in future:
1. Prefer CSS class selectors over component selectors
2. Add ESLint rule to warn about component selectors
3. Document this pattern in developer guidelines
4. Code review checklist item

---

## Summary

✅ **Fixed Emotion component selector error**
- Replaced `${TooltipContainer}:hover &` with `&:hover .tooltip`
- Added `className="tooltip"` to Tooltip component
- Maintains exact same functionality
- No build configuration changes needed
- All tests passing

The fix is simple, performant, and follows CSS best practices while avoiding the need for additional Babel plugin configuration.

