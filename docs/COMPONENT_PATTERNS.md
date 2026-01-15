# Frontend Component Patterns & Best Practices

## Overview

This document provides guidelines and examples for building React components following best practices, including common patterns, anti-patterns, and architectural considerations.

## Component Patterns

### 1. Controlled vs Uncontrolled Components

**Controlled Components** - React state manages the input value:

```typescript
// ✅ Good for forms, complex logic
const ControlledInput: React.FC = () => {
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.currentTarget.value);
  };

  return (
    <input 
      value={value} 
      onChange={handleChange} 
      placeholder="Enter text..."
    />
  );
};
```

**Uncontrolled Components** - DOM manages the input value:

```typescript
// ✅ Good for simple cases, integrating with non-React code
const UncontrolledInput: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    console.log('Value:', inputRef.current?.value);
  };

  return (
    <>
      <input ref={inputRef} placeholder="Enter text..." />
      <button onClick={handleSubmit}>Submit</button>
    </>
  );
};
```

**When to use:**
- **Controlled:** Forms with validation, dependent fields, complex state
- **Uncontrolled:** Simple text inputs, file uploads, integrations

### 2. Container/Presentational Pattern

**Container Component** - Handles logic and data:

```typescript
// src/components/features/ChatContainer.tsx
interface ChatContainerProps {
  assistantId: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ assistantId }) => {
  const { data: messages, loading, error } = useApi(`/api/assistants/${assistantId}/messages`);
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const handleSendMessage = async (content: string) => {
    try {
      await axios.post(`/api/assistants/${assistantId}/messages`, { content });
      // Refetch messages
    } catch (err) {
      addNotification({ type: 'error', message: 'Failed to send message' });
    }
  };

  return (
    <ChatPresentation 
      messages={messages}
      loading={loading}
      error={error}
      user={user}
      onSendMessage={handleSendMessage}
    />
  );
};
```

**Presentational Component** - Handles UI rendering:

```typescript
// src/components/features/ChatPresentation.tsx
interface ChatPresentationProps {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  user: User;
  onSendMessage: (content: string) => Promise<void>;
}

const ChatPresentation: React.FC<ChatPresentationProps> = ({
  messages,
  loading,
  error,
  user,
  onSendMessage,
}) => {
  const [input, setInput] = useState('');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ChatWrapper>
      <MessageList messages={messages} currentUserId={user.id} />
      <ChatInputBar 
        value={input}
        onChange={setInput}
        onSend={() => onSendMessage(input).then(() => setInput(''))}
      />
    </ChatWrapper>
  );
};
```

**Benefits:**
- Separation of concerns
- Easier testing
- Reusable presentational components
- Clear data flow

### 3. Compound Components Pattern

Create flexible, composable components:

```typescript
// src/components/common/Form.tsx
const Form = ({ children, onSubmit }: React.HTMLAttributes<HTMLFormElement> & { onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = useState({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const FormContextValue = { formData, setFormData };

  return (
    <form onSubmit={handleSubmit}>
      <FormContext.Provider value={FormContextValue}>
        {children}
      </FormContext.Provider>
    </form>
  );
};

const FormField: React.FC<{ name: string; label: string }> = ({ name, label }) => {
  const { formData, setFormData } = useContext(FormContext);

  return (
    <div>
      <label>{label}</label>
      <input
        type="text"
        name={name}
        value={formData[name] || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, [name]: e.target.value }))}
      />
    </div>
  );
};

const FormSubmit: React.FC<{ label: string }> = ({ label }) => {
  return <button type="submit">{label}</button>;
};

// Usage
<Form onSubmit={handleSubmit}>
  <FormField name="email" label="Email" />
  <FormField name="password" label="Password" />
  <FormSubmit label="Login" />
</Form>
```

**Benefits:**
- Flexible composition
- Implicit state sharing through context
- API feels natural to users

### 4. Render Props Pattern

Pass rendering logic as a prop:

```typescript
// src/components/hooks/DataFetcher.tsx
interface DataFetcherProps<T> {
  url: string;
  children: (state: {
    data: T | null;
    loading: boolean;
    error: Error | null;
  }) => React.ReactNode;
}

const DataFetcher = <T,>({ url, children }: DataFetcherProps<T>) => {
  const { data, loading, error } = useApi<T>(url);

  return <>{children({ data, loading, error })}</>;
};

// Usage
<DataFetcher<Assistant[]> url="/api/assistants">
  {({ data: assistants, loading, error }) => (
    <>
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {assistants && (
        <ul>
          {assistants.map(assistant => (
            <li key={assistant.id}>{assistant.name}</li>
          ))}
        </ul>
      )}
    </>
  )}
</DataFetcher>
```

**Modern Alternative (Hooks):**

```typescript
// Hooks are generally preferred over render props
const AssistantList: React.FC = () => {
  const { data: assistants, loading, error } = useApi<Assistant[]>('/api/assistants');
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <ul>
      {assistants?.map(assistant => (
        <li key={assistant.id}>{assistant.name}</li>
      ))}
    </ul>
  );
};
```

### 5. Higher-Order Components (HOC) Pattern

```typescript
// src/components/hoc/withAuth.tsx
interface WithAuthProps {
  user: User;
}

function withAuth<P extends WithAuthProps>(
  Component: React.ComponentType<P>
): React.FC<Omit<P, 'user'>> {
  return (props) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
      return <LoginPrompt />;
    }

    return <Component {...(props as P)} user={user} />;
  };
}

// Usage
const ProtectedDashboard: React.FC<{ user: User }> = ({ user }) => {
  return <div>Welcome, {user.email}</div>;
};

export default withAuth(ProtectedDashboard);
```

**Modern Alternative (Hooks):**

```typescript
// Custom hook approach is simpler
const ProtectedDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <LoginPrompt />;

  return <div>Welcome, {user.email}</div>;
};
```

## Form Handling Patterns

### 1. Simple Form with Local State

```typescript
// src/components/forms/LoginForm.tsx
interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { addNotification } = useNotification();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(formData.email, formData.password);
      addNotification({ type: 'success', message: 'Logged in successfully!' });
      // Navigation handled by Auth guard
    } catch (error) {
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Login failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormGroup>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          disabled={isSubmitting}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <ErrorMessage id="email-error">{errors.email}</ErrorMessage>
        )}
      </FormGroup>

      <FormGroup>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          disabled={isSubmitting}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <ErrorMessage id="password-error">{errors.password}</ErrorMessage>
        )}
      </FormGroup>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

### 2. Complex Form with Hook Pattern

```typescript
// src/hooks/useForm.ts
interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
  validate?: (values: T) => Record<string, string>;
}

export function useForm<T>({ initialValues, onSubmit, validate }: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.currentTarget;
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.currentTarget;
    setTouched(prev => ({ ...prev, [name]: true }));

    if (validate) {
      const fieldErrors = validate(values);
      setErrors(prev => ({ ...prev, [name]: fieldErrors[name] || '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validate) {
      const formErrors = validate(values);
      setErrors(formErrors);
      if (Object.keys(formErrors).length > 0) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue: (name: string, value: any) => setValues(prev => ({ ...prev, [name]: value })),
    reset,
  };
}

// Usage
const SettingsForm: React.FC = () => {
  const form = useForm({
    initialValues: { displayName: '', email: '' },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.displayName) errors.displayName = 'Required';
      if (!values.email) errors.email = 'Required';
      return errors;
    },
    onSubmit: async (values) => {
      await axios.put('/api/settings', values);
    },
  });

  return (
    <form onSubmit={form.handleSubmit}>
      <input
        name="displayName"
        value={form.values.displayName}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
      />
      {form.touched.displayName && form.errors.displayName && (
        <span>{form.errors.displayName}</span>
      )}
      {/* More fields... */}
      <button type="submit" disabled={form.isSubmitting}>Save</button>
    </form>
  );
};
```

## List & Iteration Patterns

### 1. Rendering Lists

```typescript
// ✅ Good: Key is unique identifier
const MessageList: React.FC<{ messages: Message[] }> = ({ messages }) => (
  <ul>
    {messages.map(message => (
      <li key={message.id}>{message.content}</li>
    ))}
  </ul>
);

// ❌ Bad: Using array index as key
const MessageListBad: React.FC<{ messages: Message[] }> = ({ messages }) => (
  <ul>
    {messages.map((message, index) => (
      <li key={index}>{message.content}</li>
    ))}
  </ul>
);
```

### 2. Filtering and Sorting

```typescript
interface MessageListProps {
  messages: Message[];
  filter?: 'all' | 'user' | 'assistant';
  sortBy?: 'newest' | 'oldest';
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  filter = 'all',
  sortBy = 'newest',
}) => {
  // Memoize filtered/sorted messages to avoid recalculating on every render
  const processedMessages = useMemo(() => {
    let result = [...messages];

    // Filter
    if (filter !== 'all') {
      result = result.filter(m => m.sender === filter);
    }

    // Sort
    result.sort((a, b) => {
      const comparison = a.timestamp - b.timestamp;
      return sortBy === 'newest' ? -comparison : comparison;
    });

    return result;
  }, [messages, filter, sortBy]);

  return (
    <ul>
      {processedMessages.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}
    </ul>
  );
};
```

### 3. Pagination Pattern

```typescript
interface PaginatedListProps {
  items: any[];
  itemsPerPage?: number;
  renderItem: (item: any) => React.ReactNode;
}

const PaginatedList: React.FC<PaginatedListProps> = ({
  items,
  itemsPerPage = 10,
  renderItem,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  return (
    <>
      <ul>
        {currentItems.map((item, index) => (
          <li key={startIndex + index}>{renderItem(item)}</li>
        ))}
      </ul>

      <Pagination>
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </Pagination>
    </>
  );
};
```

## Conditional Rendering Patterns

### 1. Using Early Returns

```typescript
// ✅ Good: Early returns for clarity
const UserProfile: React.FC<{ userId?: string }> = ({ userId }) => {
  const { user, loading, error } = useApi(`/api/users/${userId}`);

  if (!userId) {
    return <p>No user ID provided</p>;
  }

  if (loading) {
    return <Skeleton />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <ProfileCard user={user} />
  );
};
```

### 2. Ternary for Simple Conditions

```typescript
// ✅ Good: Simple binary choice
const UserBadge: React.FC<{ user: User }> = ({ user }) => (
  <Badge color={user.roles.includes('ADMIN') ? 'red' : 'blue'}>
    {user.roles.includes('ADMIN') ? 'Admin' : 'User'}
  </Badge>
);

// ❌ Avoid complex nested ternaries
const BadExample = user.premium ? 
  user.trial ? 
    <TrialBadge /> : 
    <PremiumBadge /> : 
  user.free ? 
    <FreeBadge /> : 
    <NoAccountBadge />;
```

### 3. Logical AND for Optional Rendering

```typescript
// ✅ Good: Show element only if condition is true
const ChatHistory: React.FC<{ messages?: Message[] }> = ({ messages }) => (
  <div>
    {messages && messages.length > 0 && (
      <div>
        <h3>Chat History</h3>
        {/* render messages */}
      </div>
    )}
  </div>
);

// ⚠️ Be careful with falsy values
// This will render "0" if count is 0:
{count && <p>You have {count} messages</p>}

// Better:
{count > 0 && <p>You have {count} messages</p>}
```

## Styling Patterns

### 1. CSS-in-JS with Emotion

```typescript
import { css } from '@emotion/react';
import styled from '@emotion/styled';

// Function-based styles (recomputed on each render)
const ButtonStyles = css`
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StyledButton = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  background-color: ${props => props.primary ? '#007bff' : '#6c757d'};
  color: white;

  &:hover {
    opacity: 0.9;
  }
`;

// Usage
<button css={ButtonStyles}>Click me</button>
<StyledButton primary>Click me</StyledButton>
```

### 2. Theme-aware Styles

```typescript
import { useTheme } from '../context/ThemeContext';

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();

  return (
    <div css={css`
      background-color: ${colors.background};
      color: ${colors.text};
      border: 1px solid ${colors.border};
      padding: 16px;
      border-radius: 8px;
    `}>
      {children}
    </div>
  );
};
```

## Anti-Patterns to Avoid

### 1. Creating Functions in Render

```typescript
// ❌ Bad: New function on every render
<button onClick={() => handleClick(item.id)}>Delete</button>

// ✅ Good: Pre-bound function
const handleDeleteClick = useCallback((id: string) => {
  handleClick(id);
}, [handleClick]);

<button onClick={() => handleDeleteClick(item.id)}>Delete</button>
```

### 2. Object/Array Literals as Props

```typescript
// ❌ Bad: New object on every render
<ChildComponent config={{ theme: 'dark', size: 'large' }} />

// ✅ Good: Memoized object
const config = useMemo(() => ({ theme: 'dark', size: 'large' }), []);
<ChildComponent config={config} />
```

### 3. Directly Mutating State

```typescript
// ❌ Bad: Mutating state
const handleAddItem = (item: Item) => {
  items.push(item); // Don't mutate!
  setItems(items);
};

// ✅ Good: Creating new array
const handleAddItem = (item: Item) => {
  setItems(prev => [...prev, item]);
};
```

### 4. Missing Dependencies in Hooks

```typescript
// ❌ Bad: Missing dependency
useEffect(() => {
  fetchData(searchTerm);
}, []); // searchTerm missing!

// ✅ Good: All dependencies included
useEffect(() => {
  fetchData(searchTerm);
}, [searchTerm]);
```

## Related Documentation

- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) - Project architecture overview
- [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - Context API and state patterns
- [HOOKS_CONVENTIONS.md](HOOKS_CONVENTIONS.md) - Custom hooks guidelines
- [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) - Performance techniques
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing React components

## Quick Reference

**Component Type Selection:**

| Use Case | Pattern | Example |
|----------|---------|---------|
| Simple UI | Functional | Button, Badge, Card |
| Data fetching | Container | ChatContainer, UserContainer |
| UI only | Presentational | ChatMessage, UserCard |
| Flexible composition | Compound | Form, Tabs, Dialog |
| Complex logic | Custom Hook | useForm, useApi, useAuth |
| Reuse everywhere | HOC/Hook | withAuth, useAuth |

**Best Practices Checklist:**
- [ ] Components have single responsibility
- [ ] Props are properly typed with TypeScript
- [ ] Re-renders are optimized (memo, useMemo, useCallback)
- [ ] Side effects are in useEffect with proper dependencies
- [ ] Error boundaries wrap feature sections
- [ ] Loading and error states are handled
- [ ] Accessibility attributes are present (aria-*)
- [ ] Components are tested with React Testing Library

