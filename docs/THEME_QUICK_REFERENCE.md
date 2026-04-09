# Real Estate Theme - Quick Reference

## Import Theme

```typescript
import { realEstateTheme, getCategoryStyle } from '../theme/realEstateTheme';
import { getProductIcon, featureIcons } from '../theme/icons';
import { Home, Building, TrendingUp, Shield } from 'lucide-react';
```

## Colors

### Primary (Blue - Trust)
```typescript
realEstateTheme.colors.primary.main     // #2563EB
realEstateTheme.colors.primary.light    // #3B82F6
realEstateTheme.colors.primary.dark     // #1E40AF
realEstateTheme.colors.primary.lighter  // #DBEAFE
```

### Secondary (Amber - Warmth)
```typescript
realEstateTheme.colors.secondary.main   // #F59E0B
realEstateTheme.colors.secondary.light  // #FCD34D
realEstateTheme.colors.secondary.dark   // #D97706
```

### Accent (Green - Success)
```typescript
realEstateTheme.colors.accent.main      // #10B981
realEstateTheme.colors.accent.dark      // #059669
```

### Neutrals
```typescript
realEstateTheme.colors.neutral.white    // #FFFFFF
realEstateTheme.colors.neutral.lightest // #F9FAFB
realEstateTheme.colors.neutral.darkest  // #1F2937
realEstateTheme.colors.neutral.black    // #111827
```

## Typography

### Font Families
```typescript
fontFamily: realEstateTheme.typography.fontFamily.primary  // 'Inter', sans-serif
```

### Font Sizes
```typescript
fontSize: realEstateTheme.typography.fontSize.xs   // 0.75rem (12px)
fontSize: realEstateTheme.typography.fontSize.sm   // 0.875rem (14px)
fontSize: realEstateTheme.typography.fontSize.base // 1rem (16px)
fontSize: realEstateTheme.typography.fontSize.xl   // 1.25rem (20px)
fontSize: realEstateTheme.typography.fontSize['2xl'] // 1.5rem (24px)
fontSize: realEstateTheme.typography.fontSize['4xl'] // 2.25rem (36px)
```

### Font Weights
```typescript
fontWeight: realEstateTheme.typography.fontWeight.normal    // 400
fontWeight: realEstateTheme.typography.fontWeight.medium    // 500
fontWeight: realEstateTheme.typography.fontWeight.semibold  // 600
fontWeight: realEstateTheme.typography.fontWeight.bold      // 700
```

## Spacing (8px base unit)

```typescript
padding: realEstateTheme.spacing.xs   // 0.25rem (4px)
padding: realEstateTheme.spacing.sm   // 0.5rem (8px)
padding: realEstateTheme.spacing.md   // 1rem (16px)
padding: realEstateTheme.spacing.lg   // 1.5rem (24px)
padding: realEstateTheme.spacing.xl   // 2rem (32px)
padding: realEstateTheme.spacing['2xl'] // 2.5rem (40px)
padding: realEstateTheme.spacing['3xl'] // 3rem (48px)
```

## Border Radius

```typescript
borderRadius: realEstateTheme.borderRadius.sm   // 0.25rem (4px)
borderRadius: realEstateTheme.borderRadius.md   // 0.5rem (8px)
borderRadius: realEstateTheme.borderRadius.lg   // 0.75rem (12px)
borderRadius: realEstateTheme.borderRadius.xl   // 1rem (16px)
borderRadius: realEstateTheme.borderRadius.full // 9999px (pill shape)
```

## Shadows

```typescript
boxShadow: realEstateTheme.shadows.sm        // Subtle
boxShadow: realEstateTheme.shadows.md        // Medium
boxShadow: realEstateTheme.shadows.lg        // Large
boxShadow: realEstateTheme.shadows.xl        // Extra large
boxShadow: realEstateTheme.shadows.card      // Card default
boxShadow: realEstateTheme.shadows.cardHover // Card hover state
```

## Transitions

```typescript
transition: realEstateTheme.transitions.fast   // 150ms
transition: realEstateTheme.transitions.normal // 300ms
transition: realEstateTheme.transitions.slow   // 500ms
```

## Icons

### Render Icon
```typescript
import { Building } from 'lucide-react';

<Building 
  size={24} 
  color={realEstateTheme.colors.primary.main} 
  strokeWidth={2} 
/>
```

### Get Product Icon
```typescript
import { getProductIcon } from '../theme/icons';

const Icon = getProductIcon(product);
<Icon size={64} color="#2563EB" strokeWidth={1.5} />
```

### Available Product Icons
- `Home` - Listing Production
- `TrendingUp` - Market Intelligence
- `Shield` - Legal Compliance
- `FileText` - Document Intelligence
- `Phone` - Voice Receptionist
- `Building2` - Property Management
- `Calculator` - Underwriting

### Feature Icons
```typescript
import { featureIcons } from '../theme/icons';

const SpeedIcon = featureIcons.fast;    // Zap
const SecureIcon = featureIcons.secure; // Lock
const TargetIcon = featureIcons.custom; // Target
```

## Category Styles

```typescript
import { getCategoryStyle } from '../theme/realEstateTheme';

const style = getCategoryStyle('Listing Production');
// Returns: { icon: 'Home', gradient: '...', color: '#F59E0B', bg: '#FEF3C7' }

// Use in component:
<div style={{ background: style.gradient }}>
  <Icon color={style.color} />
</div>
```

## Common Patterns

### Button
```typescript
<button style={{
  padding: `${realEstateTheme.spacing.sm} ${realEstateTheme.spacing.xl}`,
  backgroundColor: realEstateTheme.colors.primary.main,
  color: 'white',
  border: 'none',
  borderRadius: realEstateTheme.borderRadius.md,
  fontSize: realEstateTheme.typography.fontSize.base,
  fontWeight: realEstateTheme.typography.fontWeight.semibold,
  boxShadow: realEstateTheme.shadows.sm,
  transition: realEstateTheme.transitions.normal,
  cursor: 'pointer',
}}>
  Click Me
</button>
```

### Card
```typescript
<div style={{
  backgroundColor: realEstateTheme.colors.background.card,
  borderRadius: realEstateTheme.borderRadius.xl,
  padding: realEstateTheme.spacing['2xl'],
  boxShadow: realEstateTheme.shadows.card,
  border: `1px solid ${realEstateTheme.colors.neutral.light}`,
}}>
  Card Content
</div>
```

### Gradient Background
```typescript
<section style={{
  background: realEstateTheme.colors.background.hero,
  color: 'white',
  padding: `100px ${realEstateTheme.spacing['3xl']}`,
}}>
  Hero Content
</section>
```

## Responsive Breakpoints

```typescript
// In media queries:
@media (max-width: 768px) {  // Mobile
  padding: ${realEstateTheme.spacing.lg};
}

@media (min-width: 1024px) {  // Desktop
  padding: ${realEstateTheme.spacing['4xl']};
}
```

## Tips

1. **Always use theme values** instead of hardcoded colors/spacing
2. **Use semantic color names** (primary, secondary, accent) not hex codes
3. **Maintain 8px spacing grid** for visual consistency
4. **Use provided shadow system** for depth hierarchy
5. **Import icons from lucide-react** for professional look
6. **Apply transitions** to interactive elements for polish

## Example Component

```typescript
import { Building } from 'lucide-react';
import { realEstateTheme } from '../theme/realEstateTheme';

const FeatureCard = ({ title, description }) => (
  <div style={{
    backgroundColor: realEstateTheme.colors.background.card,
    borderRadius: realEstateTheme.borderRadius.xl,
    padding: realEstateTheme.spacing['2xl'],
    boxShadow: realEstateTheme.shadows.card,
    transition: realEstateTheme.transitions.normal,
    cursor: 'pointer',
  }}>
    <div style={{
      width: '80px',
      height: '80px',
      backgroundColor: realEstateTheme.colors.primary.lighter,
      borderRadius: realEstateTheme.borderRadius.xl,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: realEstateTheme.spacing.lg,
    }}>
      <Building 
        size={36} 
        color={realEstateTheme.colors.primary.main} 
        strokeWidth={2}
      />
    </div>
    <h3 style={{
      fontSize: realEstateTheme.typography.fontSize.xl,
      fontWeight: realEstateTheme.typography.fontWeight.semibold,
      color: realEstateTheme.colors.neutral.darkest,
      marginBottom: realEstateTheme.spacing.sm,
    }}>
      {title}
    </h3>
    <p style={{
      fontSize: realEstateTheme.typography.fontSize.base,
      color: realEstateTheme.colors.neutral.dark,
      lineHeight: realEstateTheme.typography.lineHeight.relaxed,
    }}>
      {description}
    </p>
  </div>
);
```
