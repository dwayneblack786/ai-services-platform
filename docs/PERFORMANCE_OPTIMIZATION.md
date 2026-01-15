# Frontend Performance Optimization Guide

## Overview

This document provides comprehensive strategies for optimizing React application performance, including code splitting, memoization, bundle analysis, rendering optimization, and network optimization.

**Key Metrics:**
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1
- Time to Interactive (TTI) < 3.5s

## Bundle Optimization

### Code Splitting Strategy

**Route-Based Code Splitting:**

```typescript
import { lazy, Suspense } from 'react';

// Lazy load route components
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AssistantsPage = lazy(() => import('./pages/AssistantsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/assistants" element={<AssistantsPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
};
```

**Component-Based Code Splitting:**

```typescript
// Split large features into separate chunks
const ChatAssistant = lazy(() => import('./components/features/ChatAssistant'));
const ChatHistory = lazy(() => import('./components/features/ChatHistory'));

<Suspense fallback={<ComponentSkeleton />}>
  <ChatAssistant />
</Suspense>
```

**Dynamic Imports for Heavy Libraries:**

```typescript
// Defer loading heavy libraries until needed
const loadPdfLibrary = async () => {
  const pdfModule = await import('pdf-lib');
  return pdfModule;
};

const handleExportPdf = async () => {
  const pdfLib = await loadPdfLibrary();
  // Use PDF library
};
```

### Bundle Analysis

**Setup Bundle Analyzer:**

```bash
npm install --save-dev vite-plugin-visualizer
```

**Vite Configuration:**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

**Build and Analyze:**

```bash
npm run build
# Bundle visualization opens automatically
```

### Dependency Optimization

**Identify Large Dependencies:**

```bash
npm list --depth=0 | grep -E 'node_modules|dependencies'
```

**Tree-Shaking:**

```typescript
// ✅ Good: Tree-shakeable import
import { Button } from '@mui/material';

// ❌ Bad: Non-tree-shakeable import
import Button from '@mui/material';
```

**Replace Heavy Libraries:**

| Heavy | Alternative | Size Reduction |
|-------|-------------|-----------------|
| moment | date-fns, day.js | ~97% |
| lodash | lodash-es | ~90% |
| axios | fetch API | ~85% |
| jquery | vanilla JS | ~100% |

## Runtime Performance

### Memoization Strategy

**React.memo for Presentational Components:**

```typescript
// Without memo - re-renders on parent update
const UserCard: React.FC<{ user: User }> = ({ user }) => {
  console.log('UserCard render');
  return <div>{user.name}</div>;
};

// With memo - only re-renders if user prop changes
const MemoizedUserCard = React.memo(
  ({ user }: { user: User }) => {
    console.log('UserCard render');
    return <div>{user.name}</div>;
  },
  (prevProps, nextProps) => {
    // Custom equality check
    return prevProps.user.id === nextProps.user.id;
  }
);
```

**useMemo for Expensive Calculations:**

```typescript
// Without useMemo - recalculates every render
const sortedMessages = messages
  .filter(m => m.visible)
  .sort((a, b) => b.timestamp - a.timestamp);

// With useMemo - recalculates only when dependencies change
const sortedMessages = useMemo(() => {
  console.log('Calculating sorted messages');
  return messages
    .filter(m => m.visible)
    .sort((a, b) => b.timestamp - a.timestamp);
}, [messages]);
```

**useCallback for Stable Function References:**

```typescript
// Without useCallback - new function every render
const handleAddMessage = (content: string) => {
  setMessages(prev => [...prev, { id: uuid(), content }]);
};

// With useCallback - same function unless dependencies change
const handleAddMessage = useCallback((content: string) => {
  setMessages(prev => [...prev, { id: uuid(), content }]);
}, []);

// Pass to memoized component
<MemoizedMessageInput onAddMessage={handleAddMessage} />
```

### Virtual Scrolling for Large Lists

**Using react-window:**

```bash
npm install react-window react-window-auto-sizer
```

```typescript
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-window-auto-sizer';

interface MessageListProps {
  messages: Message[];
}

const VirtualMessageList: React.FC<MessageListProps> = ({ messages }) => {
  const Row: React.FC<{ index: number; style: React.CSSProperties }> = ({
    index,
    style,
  }) => (
    <div style={style}>
      <MessageItem message={messages[index]} />
    </div>
  );

  return (
    <AutoSizer>
      {({ height, width }) => (
        <FixedSizeList
          height={height}
          itemCount={messages.length}
          itemSize={80}
          width={width}
        >
          {Row}
        </FixedSizeList>
      )}
    </AutoSizer>
  );
};
```

### Infinite Scrolling with Pagination

```typescript
interface InfiniteScrollProps {
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  children: React.ReactNode;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  loadMore,
  hasMore,
  isLoading,
  children,
}) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  return (
    <>
      {children}
      {hasMore && <div ref={observerTarget} className="loading-indicator" />}
    </>
  );
};
```

## Image Optimization

### Responsive Images

```typescript
const ResponsiveImage: React.FC<{ src: string; alt: string }> = ({
  src,
  alt,
}) => {
  return (
    <picture>
      <source srcSet={`${src}-small.webp 480w, ${src}-medium.webp 768w`} type="image/webp" />
      <source srcSet={`${src}-small.jpg 480w, ${src}-medium.jpg 768w`} type="image/jpeg" />
      <img src={`${src}-medium.jpg`} alt={alt} loading="lazy" decoding="async" />
    </picture>
  );
};
```

### Image Lazy Loading

```typescript
// Native lazy loading
<img src="/avatar.jpg" alt="User" loading="lazy" />

// With Intersection Observer for more control
const LazyImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.unobserve(entry.target);
        }
      });
    });

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return <img ref={imgRef} src={imageSrc || ''} alt={alt} />;
};
```

### Image Formats and Compression

**Image Optimization Pipeline:**

```bash
# Install image optimization tools
npm install --save-dev imagemin imagemin-webp imagemin-mozjpeg

# Compress and convert images
imagemin 'src/assets/images/*.{jpg,png}' --out-dir=public/images
```

**Vite Configuration for Image Optimization:**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    assetsInlineLimit: 4096, // Inline assets < 4KB
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[ext]/[name]-[hash][extname]',
      },
    },
  },
});
```

## Network Optimization

### API Request Optimization

**Request Deduplication:**

```typescript
// src/services/api/deduplication.ts
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicatedFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const key = `${url}:${JSON.stringify(options)}`;

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetch(url, options)
    .then(res => res.json())
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, promise);
  return promise;
}
```

**Response Caching:**

```typescript
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function cachedFetch<T>(url: string): Promise<T> {
  const cached = cache.get(url);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const data = await fetch(url).then(res => res.json());
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

**Request Batching:**

```typescript
// Batch multiple API calls into a single request
const batchQueue: Array<{ id: string; url: string; resolve: Function }> = [];
let batchTimeout: NodeJS.Timeout;

const BATCH_DELAY = 50; // ms

function enqueueBatch(id: string, url: string): Promise<any> {
  return new Promise(resolve => {
    batchQueue.push({ id, url, resolve });

    clearTimeout(batchTimeout);
    batchTimeout = setTimeout(() => {
      executeBatch();
    }, BATCH_DELAY);
  });
}

async function executeBatch() {
  const batch = [...batchQueue];
  batchQueue.length = 0;

  const response = await fetch('/api/batch', {
    method: 'POST',
    body: JSON.stringify({ requests: batch.map(b => ({ id: b.id, url: b.url })) }),
  }).then(res => res.json());

  batch.forEach(item => {
    const result = response.results.find((r: any) => r.id === item.id);
    item.resolve(result.data);
  });
}
```

### Prefetching and Preloading

```typescript
// Prefetch route components
const prefetchRoute = (path: string) => {
  import(`./pages/${path}Page.tsx`);
};

// In router change handler
const handleRouteChange = (newPath: string) => {
  // Prefetch adjacent routes
  prefetchRoute(newPath);
};

// Preload critical images and fonts
const preloadAssets = () => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = '/critical-image.png';
  document.head.appendChild(link);

  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.as = 'font';
  fontLink.href = '/fonts/inter-regular.woff2';
  fontLink.type = 'font/woff2';
  fontLink.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink);
};

// Call on app init
useEffect(() => {
  preloadAssets();
}, []);
```

## Core Web Vitals Optimization

### Cumulative Layout Shift (CLS) Prevention

**Reserve Space for Dynamic Content:**

```typescript
// ✅ Good: Reserve space for images
<div style={{ width: '100%', paddingBottom: '66.67%', position: 'relative' }}>
  <img
    src="/image.jpg"
    style={{ position: 'absolute', width: '100%', height: '100%' }}
    alt="Content"
  />
</div>

// ❌ Bad: No space reserved, layout shifts when image loads
<img src="/image.jpg" alt="Content" />
```

**Web Fonts Optimization:**

```typescript
// Use font-display: swap to prevent FOIT
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap; // Show fallback immediately
}
```

### First Input Delay (FID) and Interaction to Next Paint (INP)

**Long Task Handling:**

```typescript
// Break long tasks into smaller chunks
const processLargeDataset = async (data: any[]) => {
  const chunkSize = 50;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    processChunk(chunk);
    
    // Yield to browser
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};

// Use requestIdleCallback for non-critical work
const scheduleIdleTask = (callback: () => void) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
};
```

## Rendering Performance

### Avoiding Unnecessary Re-renders

**Use Key Prop Correctly:**

```typescript
// ❌ Bad: Index as key (causes re-renders)
{items.map((item, index) => (
  <Item key={index} item={item} />
))}

// ✅ Good: Unique identifier as key
{items.map(item => (
  <Item key={item.id} item={item} />
))}
```

**Batched State Updates:**

```typescript
// ✅ Good: React 18 batches updates automatically
const handleMultipleUpdates = () => {
  setCount(c => c + 1);
  setName('John');
  setEmail('john@example.com');
  // All updates batched into single render
};

// For non-React events, use flushSync if needed
import { flushSync } from 'react-dom';

const handleClick = () => {
  flushSync(() => setCount(c => c + 1));
  // Render happens immediately before next code
};
```

**Preventing Context Rerenders:**

```typescript
// Split contexts by frequency of change
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const UserPreferencesContext = createContext<PreferencesValue | undefined>(undefined);

// Only wrap components that need auth changes
<AuthProvider>
  <AuthConsumer>
    <UserPreferencesProvider>
      {/* Components using preferences */}
    </UserPreferencesProvider>
  </AuthConsumer>
</AuthProvider>
```

## Performance Monitoring

### Core Web Vitals Measurement

```typescript
// src/utils/vitals.ts
export const reportWebVitals = () => {
  // Largest Contentful Paint
  new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      console.log('LCP:', entry.renderTime || entry.loadTime);
    });
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay
  new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      console.log('FID:', entry.processingDuration);
    });
  }).observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift
  let clsValue = 0;
  new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        console.log('CLS:', clsValue);
      }
    });
  }).observe({ entryTypes: ['layout-shift'] });
};

// Call on app load
useEffect(() => {
  reportWebVitals();
}, []);
```

### Performance Profiling

**React DevTools Profiler:**

```typescript
// Profile component renders
import { Profiler } from 'react';

const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
};

<Profiler id="Dashboard" onRender={onRenderCallback}>
  <Dashboard />
</Profiler>
```

## Performance Checklist

- [ ] Code splitting implemented for all major routes
- [ ] Bundle size analyzed and optimized
- [ ] Unused dependencies removed
- [ ] Images optimized (WebP, lazy loading, responsive)
- [ ] Memoization applied to expensive components
- [ ] Virtual scrolling for large lists
- [ ] API requests deduplicated and cached
- [ ] Core Web Vitals monitored
- [ ] Long tasks broken into smaller chunks
- [ ] Context providers optimized to prevent unnecessary re-renders
- [ ] Performance baseline established
- [ ] Lighthouse score >= 90

## Related Documentation

- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Component optimization
- [HOOKS_CONVENTIONS.md](HOOKS_CONVENTIONS.md) - Hook performance patterns
- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) - Architecture decisions
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Performance testing

