# Skill: Web Quality Audits - Core Web Vitals, Accessibility, SEO

## Purpose

Review frontend changes for performance (Core Web Vitals), accessibility (WCAG), and SEO best practices to ensure production-grade, user-friendly React components and pages.

## When to Use

- Reviewing React component or page-level UI changes
- New page routing or navigation changes
- Image optimization or lazy-loading improvements
- Form submission or data-entry flows
- Styling changes that affect layout or readability
- Changes to meta tags, titles, or structured data

## Quality Audit Checklist

### Core Web Vitals (Performance)

**Largest Contentful Paint (LCP) — Target < 2.5s**

- [ ] Heavy images are lazy-loaded (`loading="lazy"`) or use `dynamic()` imports
- [ ] JavaScript bundles are code-split; not all code loads on first page view
- [ ] No render-blocking stylesheets; CSS is optimized
- [ ] Web fonts are optimized with `font-display: swap` or preloaded
- [ ] Third-party scripts (tracking, ads) are deferred or loaded async
- [ ] Critical CSS for above-the-fold content is inlined or prioritized

**First Input Delay (FID) / Interaction to Next Paint (INP) — Target < 100ms**

- [ ] Event handlers are not blocking; use `requestAnimationFrame` for animations
- [ ] No long-running JavaScript blocking the main thread
- [ ] React components don't have expensive operations in render
- [ ] List rendering uses React.memo or useMemo for stable components
- [ ] Form inputs respond instantly to user keystrokes

**Cumulative Layout Shift (CLS) — Target < 0.1**

- [ ] Images, videos, embed containers have fixed aspect ratios (width/height set)
- [ ] Font metrics are stable; no font swaps causing layout shifts
- [ ] Dynamic content (ads, notifications) has reserved space
- [ ] Modals and overlays don't shift page layout

### Accessibility (WCAG 2.1 AA)

**Semantic HTML & ARIA**

- [ ] Headings follow order (no skipping h1 → h3)
- [ ] Form inputs have associated `<label>` tags (not just placeholder)
- [ ] Buttons use `<button>` not div with onClick
- [ ] Links use `<a href>` not styled divs
- [ ] Images have descriptive `alt` text (or `alt=""` if decorative)
- [ ] ARIA roles are used correctly; not overridden arbitrarily
- [ ] Live regions use `aria-live="polite"` for dynamic updates

**Color & Contrast**

- [ ] Text contrast ratio ≥ 4.5:1 (16px+) or 3:1 (large text)
- [ ] Color alone is not used to convey information; icons/text supplement
- [ ] Focus states are visible (not removed with `outline: none`)

**Keyboard Navigation**

- [ ] All interactive elements are keyboard accessible (`Tab`, `Enter`, `Space`)
- [ ] Focus order makes sense (left-to-right, top-to-bottom)
- [ ] No keyboard traps; users can tab out of all sections
- [ ] Modals trap focus inside; closing returns focus to trigger

**Mobile & Responsive**

- [ ] Viewport meta tag is present: `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] Touch targets are ≥ 44×44 CSS pixels
- [ ] Text doesn't require horizontal scrolling at 320px width
- [ ] Form inputs don't auto-zoom on focus (font-size ≥ 16px disables zoom)

### SEO Best Practices

**Meta Tags & Structured Data**

- [ ] Page `<title>` is descriptive and unique (50-60 chars)
- [ ] `<meta name="description">` present and under 160 chars
- [ ] Open Graph tags set: `og:title`, `og:description`, `og:image`
- [ ] Twitter Card tags set if sharing on Twitter
- [ ] Structured data (JSON-LD) for rich search results (if applicable)

**URL & Routing**

- [ ] URLs are semantic and keyword-rich (not `/page123`)
- [ ] URLs don't change for the same content (stable canonical URLs)
- [ ] URL parameters are meaningful and indexable
- [ ] Pagination uses `rel="next"` and `rel="prev"`

**Content & Links**

- [ ] Headers use proper heading hierarchy (h1, h2, h3...)
- [ ] Internal links use descriptive anchor text (not "click here")
- [ ] External links that are not SEO-friendly use `rel="nofollow"`
- [ ] Images are properly indexed; SVGs and icons use `<title>` or `aria-label`

**Performance (SEO Signal)**

- [ ] Pages load quickly; Core Web Vitals are met
- [ ] Mobile experience is as good as desktop
- [ ] No 404 errors on linked pages
- [ ] Redirects are temporary or permanent as appropriate

---

## Lighthouse Audit Commands

```bash
# Frontend directory
cd ai-listing-agent/frontend

# Generate Lighthouse report (Chrome required)
npx lighthouse https://localhost:5173 --view --output=html --output-path=./lighthouse-report.html

# Headless mode (CI/CD)
npx lighthouse https://localhost:5173 --output=json --output-path=./lighthouse.json
```

## Manual Audit Checklist (Quick)

Before lighthouse run:

1. **Render** the component/page in development
2. **Check DevTools Performance tab** for long tasks (>50ms)
3. **Test keyboard navigation** - Tab through all interactive elements
4. **Test screen reader** - Use browser screen reader simulation
5. **Check mobile view** - Test at 375px and 768px widths
6. **Inspect meta tags** - Open page source, search for `meta name=`, `og:`, `twitter:`
7. **Color contrast** - Use WebAIM contrast checker or DevTools contrast picker

---

## Tier-Specific Guidance

### React Component Changes

```typescript
// ✅ Good: Lazy-loaded image with fixed aspect ratio
<Image 
  src={url} 
  width={800} 
  height={600} 
  loading="lazy" 
  alt="Product showcase"
/>

// ❌ Poor: No aspect ratio, high LCP impact
<img src={url} alt="" />
```

```typescript
// ✅ Good: Semantic form with labels
<label htmlFor="email">Email</label>
<input id="email" type="email" required />

// ❌ Poor: Placeholder instead of label
<input placeholder="Enter email" />
```

```typescript
// ✅ Good: Proper heading hierarchy
<h1>Main Title</h1>
<h2>Section Header</h2>
<h3>Subsection</h3>

// ❌ Poor: Skipped levels
<h1>Main</h1>
<h3>Subsection (missing h2)</h3>
```

### Next.js/Vite Specific

```typescript
// ✅ Good: Dynamic import with loading state
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
});

// ✅ Good: Preload critical fonts
<link rel="preload" href="/fonts/inter.woff2" as="font" crossOrigin="anonymous" />

// ✅ Good: Images with Next Image component
import Image from 'next/image';
<Image src={url} width={800} height={600} priority alt="above-fold" />
```

---

## Coverage Mapping

| Quality Area | Automated | Manual | Tool |
|---|---|---|---|
| LCP / FID / CLS | DevTools Perf Tab | Lighthouse | Chrome DevTools |
| Accessibility | axe-core (npm package) | Screen Reader | NVDA / JAWS / Safari VoiceOver |
| SEO | Manual | Lighthouse | Lighthouse / Google Search Console |
| Mobile responsive | @vitest/coverage | Mobile device | DevTools Device Emulation |

---

## Failure Criteria (Block Merge)

- [ ] Text contrast < 3:1 for large text or < 4.5:1 for normal text
- [ ] Core Web Vitals scores: Performance < 50, Accessibility < 75
- [ ] Interactive elements not keyboard accessible
- [ ] Missing `alt` tags on meaningful images
- [ ] Form inputs without associated labels
- [ ] LCP > 4s or CLS > 0.25

---

## References

- [Google Core Web Vitals](https://web.dev/vitals/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Rule 3: Coding Conventions By Tier
