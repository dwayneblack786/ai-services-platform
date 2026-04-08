# React Hooks Conventions & Best Practices

## Overview

This document provides guidelines for writing custom React hooks, understanding hook rules, and implementing common hook patterns. It covers both built-in React hooks and custom hook development.

**Core Principles:**
- Hooks encapsulate stateful logic and side effects
- Custom hooks enable code reuse across components
- Hook names must start with `use`
- Hooks can only be called at the top level of functional components
- Hook dependencies must be explicitly declared

## Hook Rules

### Rule 1: Only Call Hooks at Top Level

**✅ Correct:**

```typescript
// In component root
const MyComponent: React.FC = () => {
  const [state, setState] = useState(null);
  const value = useContext(MyContext);

  return <div>{state}</div>;
};

// In custom hook
const useCustomHook = () => {
  const [state, setState] = useState(null);
  return state;
};
```

**❌ Incorrect:**

```typescript
// Don't call in conditions
if (condition) {
  const [state, setState] = useState(null); // ERROR!
}

// Don't call in loops
for (let i = 0; i < 10; i++) {
  const [state, setState] = useState(null); // ERROR!
}

// Don't call in nested functions
const handleClick = () => {
  const [state, setState] = useState(null); // ERROR!
};
```

**Why:** React relies on hook call order to maintain state. Conditional hooks break this order.

### Rule 2: Only Call Hooks from React Functions

**✅ Correct:**

```typescript
// Functional component
const MyComponent: React.FC = () => {
  const [state, setState] = useState(null);
  return <div>{state}</div>;
};

// Custom hook
const useMyHook = () => {
  const [state, setState] = useState(null);
  return state;
};
```

**❌ Incorrect:**

```typescript
// Regular JavaScript function
function regularFunction() {
  const [state, setState] = useState(null); // ERROR!
}

// Callback
const callback = () => {
  const [state, setState] = useState(null); // ERROR!
};
```

### Rule 3: Exhaustive Dependencies

**✅ Correct:**

```typescript
const MyComponent: React.FC<{ userId: string }> = ({ userId }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]); // userId included!

  return <div>{user?.name}</div>;
};
```

**❌ Incorrect:**

```typescript
useEffect(() => {
  fetchUser(userId).then(setUser);
}, []); // Missing userId! Will use stale value.

useEffect(() => {
  fetchUser(userId).then(setUser);
}, [userId, setUser]); // setUser shouldn't be here (unless it changes)
```

## Built-in Hooks Reference

### useState - State Management

```typescript
// Simple state
const [count, setCount] = useState<number>(0);

// State with initializer function (computed once)
const [state, setState] = useState<User | null>(() => {
  return loadFromLocalStorage('user');
});

// State update with previous value
setCount(prev => prev + 1);

// Multiple independent state values
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [email, setEmail] = useState('');
```

### useEffect - Side Effects

```typescript
// Run after every render
useEffect(() => {
  console.log('Component rendered');
});

// Run once on mount
useEffect(() => {
  console.log('Component mounted');
}, []);

// Run when dependencies change
const [searchTerm, setSearchTerm] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    searchAPI(searchTerm);
  }, 500);

  // Cleanup function
  return () => clearTimeout(timer);
}, [searchTerm]);

// Multiple effects for different concerns
useEffect(() => {
  // Subscribe to events
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

useEffect(() => {
  // Load data
  fetchData();
}, [id]);

useEffect(() => {
  // Update document title
  document.title = `Page: ${title}`;
}, [title]);
```

### useContext - Consume Context

```typescript
const MyComponent: React.FC = () => {
  // Get entire context value
  const { user, logout } = useAuth();

  // Get specific value from context
  const isDark = useContext(ThemeContext)?.isDark;

  return (
    <button onClick={logout}>
      Logout {user?.name}
    </button>
  );
};
```

### useRef - References

```typescript
// Reference to DOM element
const inputRef = useRef<HTMLInputElement>(null);

const focusInput = () => {
  inputRef.current?.focus();
};

return <input ref={inputRef} />;

// Store mutable value that doesn't trigger re-render
const countRef = useRef(0);

const handleClick = () => {
  countRef.current++;
  console.log('Clicked', countRef.current, 'times');
};
```

### useMemo - Memoize Values

```typescript
// Without useMemo - recalculates every render
const expensiveValue = calculateExpensiveValue(data);

// With useMemo - recalculates only when dependencies change
const memoizedValue = useMemo(() => {
  console.log('Recalculating...');
  return calculateExpensiveValue(data);
}, [data]);

// Memoize object creation
const config = useMemo(() => ({
  theme: isDark ? 'dark' : 'light',
  fontSize: size,
}), [isDark, size]);

// Memoize array creation
const sortedItems = useMemo(() => {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}, [items]);
```

### useCallback - Memoize Functions

```typescript
// Without useCallback - new function every render
const handleClick = () => {
  console.log(id);
};

<ChildComponent onClick={handleClick} />; // Child re-renders even if id didn't change

// With useCallback - same function unless dependencies change
const handleClick = useCallback(() => {
  console.log(id);
}, [id]);

<ChildComponent onClick={handleClick} />; // Child only re-renders if id changes

// Memoized event handler
const handleAddItem = useCallback((item: Item) => {
  setItems(prev => [...prev, item]);
}, []);

// Passing as dependency to other hooks
useEffect(() => {
  const subscription = subscribe(handleAddItem);
  return () => subscription.unsubscribe();
}, [handleAddItem]);
```

### useReducer - Complex State

```typescript
interface State {
  count: number;
  error: string | null;
}

type Action = 
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1, error: null };
    case 'DECREMENT':
      return { ...state, count: state.count - 1, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const MyComponent: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, { count: 0, error: null });

  return (
    <>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>-</button>
      {state.error && <p>{state.error}</p>}
    </>
  );
};
```

## Custom Hooks

### Guidelines

1. **Hook Name:** Must start with `use`
2. **Stateful Logic:** Encapsulate reusable state/effect logic
3. **Return Hooks:** Can return hooks or computed values
4. **Documentation:** Include JSDoc with usage examples
5. **Dependencies:** List all external values in dependencies

### Pattern 1: Data Fetching Hook

```typescript
// src/hooks/useApi.ts
interface UseApiOptions {
  skip?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Fetch data from an API endpoint
 * 
 * @example
 * const { data, loading, error, refetch } = useApi<User>('/api/users/1');
 */
export function useApi<T>(
  url: string,
  options: UseApiOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<T>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options.skip) return;

    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(url, {
          signal: abortController.signal,
        });

        if (isMounted) {
          setData(response.data);
          setError(null);
          options.onSuccess?.(response.data);
        }
      } catch (err) {
        if (isMounted && !(err instanceof CancelledError)) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          setError(error);
          options.onError?.(error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    let intervalId: NodeJS.Timeout;
    if (options.refetchInterval) {
      intervalId = setInterval(fetchData, options.refetchInterval);
    }

    return () => {
      isMounted = false;
      abortController.abort();
      if (intervalId) clearInterval(intervalId);
    };
  }, [url, options.skip, options.refetchInterval]);

  const refetch = useCallback(async () => {
    const response = await axios.get(url);
    setData(response.data);
    return response.data;
  }, [url]);

  return { data, loading, error, refetch };
}
```

### Pattern 2: Form Hook

```typescript
// src/hooks/useForm.ts
interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
  validate?: (values: T) => Record<keyof T, string>;
}

/**
 * Manage form state, validation, and submission
 * 
 * @example
 * const form = useForm({
 *   initialValues: { email: '', password: '' },
 *   validate: (v) => ({ email: v.email ? '' : 'Required' }),
 *   onSubmit: async (v) => await api.login(v),
 * });
 */
export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
) {
  const [values, setValues] = useState<T>(options.initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.currentTarget;
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.currentTarget;
    setTouched(prev => ({ ...prev, [name]: true }));

    if (options.validate) {
      const allErrors = options.validate(values);
      setErrors(prev => ({ ...prev, [name]: allErrors[name as keyof T] }));
    }
  }, [values, options]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (options.validate) {
      const formErrors = options.validate(values);
      setErrors(formErrors);
      if (Object.values(formErrors).some(err => err)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await options.onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, options]);

  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const reset = useCallback(() => {
    setValues(options.initialValues);
    setErrors({});
    setTouched({});
  }, [options.initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    reset,
  };
}
```

### Pattern 3: Local Storage Hook

```typescript
// src/hooks/useLocalStorage.ts
/**
 * Synchronize state with browser localStorage
 * 
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [storedValue, key]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
```

### Pattern 4: Async Operation Hook

```typescript
// src/hooks/useAsync.ts
interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Handle async operations with loading/error states
 * 
 * @example
 * const { data, loading, error } = useAsync(
 *   () => fetchUser(userId),
 *   [userId]
 * );
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true,
  dependencies: any[] = []
): UseAsyncState<T> & { execute: () => Promise<T> } {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await asyncFunction();
      setState({ data: response, loading: false, error: null });
      return response;
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate, ...dependencies]);

  return { ...state, execute };
}
```

### Pattern 5: Debounced Value Hook

```typescript
// src/hooks/useDebounce.ts
/**
 * Debounce a value to delay updates
 * 
 * @example
 * const searchTerm = useDebounce(input, 500);
 * useEffect(() => {
 *   search(searchTerm);
 * }, [searchTerm]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

### Pattern 6: Previous Value Hook

```typescript
// src/hooks/usePrevious.ts
/**
 * Track previous value of a variable
 * 
 * @example
 * const prevCount = usePrevious(count);
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
```

### Pattern 7: Event Listener Hook

```typescript
// src/hooks/useEventListener.ts
/**
 * Add/remove event listener with cleanup
 * 
 * @example
 * useEventListener('resize', handleResize);
 */
export function useEventListener(
  eventName: keyof WindowEventMap,
  handler: EventListener,
  element: EventTarget = window,
  dependencies: any[] = []
) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const isSupported = element && element.addEventListener;
    if (!isSupported) return;

    const eventListener = (event: Event) => handlerRef.current(event);

    element.addEventListener(eventName, eventListener);

    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element, ...dependencies]);
}

// Usage
useEventListener('resize', () => {
  console.log('Window resized');
});
```

### Pattern 8: Toggle Hook

```typescript
// src/hooks/useToggle.ts
/**
 * Toggle boolean state
 * 
 * @example
 * const [isOpen, toggleOpen] = useToggle(false);
 */
export function useToggle(initialValue: boolean = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  return [value, toggle];
}
```

## Hook Dependencies Best Practices

### Understanding Dependency Arrays

```typescript
// No dependencies: Runs every render
useEffect(() => {
  console.log('Every render');
});

// Empty dependencies: Runs once on mount
useEffect(() => {
  console.log('Mounted');
}, []);

// With dependencies: Runs when dependencies change
useEffect(() => {
  console.log('Dependencies changed');
}, [dep1, dep2]);
```

### Common Dependency Issues

```typescript
// ❌ Missing dependency
const userId = props.userId;
useEffect(() => {
  fetchUser(userId);
}, []); // userId missing!

// ✅ Include dependency
useEffect(() => {
  fetchUser(userId);
}, [userId]);

// ❌ Function in dependency
const handleSave = () => { };
useEffect(() => {
  subscribe(handleSave);
}, [handleSave]); // Creates infinite loop

// ✅ Memoize callback
const handleSave = useCallback(() => { }, []);
useEffect(() => {
  subscribe(handleSave);
}, [handleSave]);
```

## Anti-Patterns to Avoid

### 1. Creating Custom Hooks Unnecessarily

```typescript
// ❌ Excessive abstraction
const useCount = () => {
  const [count, setCount] = useState(0);
  return { count, setCount };
};

// ✅ Simple state in component
const MyComponent: React.FC = () => {
  const [count, setCount] = useState(0);
  // ...
};
```

### 2. Side Effects Without Cleanup

```typescript
// ❌ Memory leak risk
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  // Missing cleanup!
}, []);

// ✅ Proper cleanup
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [handleScroll]);
```

### 3. Infinite Loops

```typescript
// ❌ Infinite loop: dependency changes in effect
useEffect(() => {
  const newArray = [1, 2, 3]; // New array every render
  setArray(newArray);
}, [array]); // array in dependency, but array changes in effect!

// ✅ Proper dependency management
useEffect(() => {
  setArray([1, 2, 3]);
}, []); // Run once, not dependent on array
```

## Testing Hooks

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApi } from '../hooks/useApi';

describe('useApi', () => {
  it('should fetch data', async () => {
    const { result } = renderHook(() => useApi<User>('/api/users/1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ id: '1', name: 'John' });
  });

  it('should handle errors', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useApi('/api/users/1'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it('should refetch data', async () => {
    const { result } = renderHook(() => useApi('/api/users/1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
```

## Performance Considerations

### When to Use useCallback

**Use when:**
- Function is a dependency of useEffect
- Function is passed as prop to memoized component
- Function is expensive to recreate

**Don't use when:**
- Function is only used locally
- Function is passed to non-optimized components

### When to Use useMemo

**Use when:**
- Expensive calculation (sorting, filtering large arrays)
- Object/array is a dependency of other hooks
- Component is memoized with React.memo

**Don't use when:**
- Simple calculation
- Value is primitive
- Not causing performance issues

## Related Documentation

- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Component design patterns
- [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - Context API patterns
- [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) - Performance tuning
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing components and hooks

## Quick Reference

**Hook Checklist:**

- [ ] Hook name starts with `use`
- [ ] Only called at top level
- [ ] All dependencies declared
- [ ] Cleanup function when needed
- [ ] No unnecessary re-renders
- [ ] Proper error handling
- [ ] TypeScript types correct
- [ ] Tests cover happy/error paths

**Common Hooks Needed:**

| Need | Hook |
|------|------|
| State | useState |
| Side effects | useEffect |
| Context | useContext |
| Memoization | useMemo, useCallback |
| Form data | useForm (custom) |
| API data | useApi (custom) |
| Local storage | useLocalStorage (custom) |
| Debouncing | useDebounce (custom) |

