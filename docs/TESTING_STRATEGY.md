# Frontend Testing Strategy & Guide

📑 **Table of Contents**
- [Overview](#overview)
- [Testing Setup](#testing-setup)
  - [Dependencies](#dependencies)
  - [Vitest Configuration](#vitest-configuration)
  - [Test Setup File](#test-setup-file)
- [Unit Testing](#unit-testing)
  - [Testing Utilities](#testing-utilities)
  - [Testing Hooks](#testing-hooks)
- [Component Testing](#component-testing)
  - [Testing Presentational Components](#testing-presentational-components)
  - [Testing Form Components](#testing-form-components)
- [Integration Testing](#integration-testing)
  - [Testing Component Composition](#testing-component-composition)
- [Testing with Context](#testing-with-context)
- [E2E Testing](#e2e-testing)
  - [Setup Playwright](#setup-playwright)
  - [E2E Test Example](#e2e-test-example)
- [Mocking Strategies](#mocking-strategies)
  - [Mocking API Calls](#mocking-api-calls)
  - [Mocking Hooks](#mocking-hooks)
  - [Mocking Window APIs](#mocking-window-apis)
- [Testing Best Practices](#testing-best-practices)
  - [1. Use Semantic Queries](#1-use-semantic-queries)
  - [2. Arrange-Act-Assert Pattern](#2-arrange-act-assert-pattern)
  - [3. Test User Behavior, Not Implementation](#3-test-user-behavior-not-implementation)
  - [4. Avoid Testing Internal Library Details](#4-avoid-testing-internal-library-details)
- [Test Coverage](#test-coverage)
  - [Generate Coverage Report](#generate-coverage-report)
  - [Coverage Configuration](#coverage-configuration)
- [Testing Checklist](#testing-checklist)
- [Related Documentation](#related-documentation)

---

## Overview

This document provides comprehensive testing strategies for React TypeScript applications, including unit tests, integration tests, component tests, and end-to-end tests.

**Testing Pyramid:**
- Unit Tests (70%) - Individual functions, utilities, hooks
- Integration Tests (20%) - Multiple components working together
- E2E Tests (10%) - Complete user workflows

## Testing Setup

### Dependencies

```bash
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  vitest \
  jsdom
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
});
```

### Test Setup File

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

## Unit Testing

### Testing Utilities

```typescript
// src/utils/formatting.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, truncateString } from './formatting';

describe('Formatting utilities', () => {
  describe('formatCurrency', () => {
    it('should format USD currency correctly', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-50, 'USD')).toBe('-$50.00');
    });
  });

  describe('formatDate', () => {
    it('should format date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date, 'ISO')).toBe('2024-01-15');
    });

    it('should format date with time', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date, 'FULL')).toBe('January 15, 2024 10:30 AM');
    });
  });

  describe('truncateString', () => {
    it('should truncate string to specified length', () => {
      expect(truncateString('Hello World', 5)).toBe('He...');
    });

    it('should not truncate if string is shorter', () => {
      expect(truncateString('Hi', 5)).toBe('Hi');
    });
  });
});
```

### Testing Hooks

```typescript
// src/hooks/useForm.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useForm } from './useForm';

describe('useForm hook', () => {
  const mockOnSubmit = vi.fn();

  it('should initialize with initial values', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { email: '', password: '' },
        onSubmit: mockOnSubmit,
      })
    );

    expect(result.current.values).toEqual({ email: '', password: '' });
  });

  it('should update field values on change', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { email: '', password: '' },
        onSubmit: mockOnSubmit,
      })
    );

    act(() => {
      result.current.handleChange({
        currentTarget: { name: 'email', value: 'test@example.com' },
      } as any);
    });

    expect(result.current.values.email).toBe('test@example.com');
  });

  it('should validate form on submit', async () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { email: '', password: '' },
        validate: values => ({
          email: !values.email ? 'Email required' : '',
          password: !values.password ? 'Password required' : '',
        }),
        onSubmit: mockOnSubmit,
      })
    );

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: () => {},
      } as any);
    });

    expect(result.current.errors.email).toBe('Email required');
    expect(result.current.errors.password).toBe('Password required');
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit when validation passes', async () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { email: 'test@example.com', password: 'password123' },
        validate: () => ({}),
        onSubmit: mockOnSubmit,
      })
    );

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: () => {},
      } as any);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
```

## Component Testing

### Testing Presentational Components

```typescript
// src/components/common/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should show loading state', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <Button className="custom-class">Click me</Button>
    );
    expect(container.querySelector('button')).toHaveClass('custom-class');
  });
});
```

### Testing Form Components

```typescript
// src/components/forms/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from './LoginForm';
import { useAuth } from '../../hooks/useAuth';

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('LoginForm Component', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      logout: vi.fn(),
      // ... other required methods
    } as any);
  });

  it('should render form fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid credentials', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123');
    });
  });

  it('should display error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

## Integration Testing

### Testing Component Composition

```typescript
// src/components/features/ChatWindow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ChatWindow } from './ChatWindow';
import axios from 'axios';

vi.mock('axios');

describe('ChatWindow Integration', () => {
  it('should load messages and send new message', async () => {
    const mockMessages = [
      { id: '1', content: 'Hello', timestamp: new Date(), userId: 'user1' },
    ];
    const mockAxios = vi.mocked(axios);

    mockAxios.get.mockResolvedValue({ data: mockMessages });
    mockAxios.post.mockResolvedValue({ data: { id: '2', content: 'Hi' } });

    render(<ChatWindow assistantId="assistant1" />);

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    // Send new message
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/type message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Hi');
    await user.click(sendButton);

    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith(
        '/api/assistants/assistant1/messages',
        expect.objectContaining({ content: 'Hi' })
      );
    });
  });
});
```

## Testing with Context

```typescript
// src/components/DashboardPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { AuthProvider } from '../context/AuthContext';

const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  tenantId: 'tenant1',
  roles: ['USER'],
};

// Test wrapper with contexts
const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>{component}</AuthProvider>,
    // Mock useAuth to return mockUser
  );
};

describe('DashboardPage', () => {
  it('should display user greeting', () => {
    renderWithAuth(<DashboardPage />);
    expect(screen.getByText(/welcome john/i)).toBeInTheDocument();
  });
});
```

## E2E Testing

### Setup Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### E2E Test Example

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check redirect to dashboard
    await expect(page).toHaveURL('http://localhost:5173/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    const error = page.locator('text=Invalid credentials');
    await expect(error).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    const error = page.locator('text=Invalid email');
    await expect(error).toBeVisible();
  });
});
```

## Mocking Strategies

### Mocking API Calls

```typescript
// Setup mocking in test file
import { vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');

const mockAxios = vi.mocked(axios);

// Mock successful response
mockAxios.get.mockResolvedValue({
  data: { id: '1', name: 'Test User' },
});

// Mock error response
mockAxios.post.mockRejectedValue(new Error('API Error'));
```

### Mocking Hooks

```typescript
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '1', email: 'test@example.com' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));
```

### Mocking Window APIs

```typescript
// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: 'test' }),
  })
);
```

## Testing Best Practices

### 1. Use Semantic Queries

```typescript
// ✅ Good: Query by role (most accessible)
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email/i);

// ⚠️ Acceptable: Query by text
screen.getByText(/success message/i);

// ❌ Avoid: Query by test ID
screen.getByTestId('submit-button');
```

### 2. Arrange-Act-Assert Pattern

```typescript
it('should update count when button clicked', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<Counter initialValue={0} />);
  const button = screen.getByRole('button', { name: /increment/i });

  // Act
  await user.click(button);

  // Assert
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### 3. Test User Behavior, Not Implementation

```typescript
// ❌ Bad: Testing implementation details
expect(component.state.isOpen).toBe(true);

// ✅ Good: Testing user-visible behavior
expect(screen.getByText(/modal content/i)).toBeVisible();
```

### 4. Avoid Testing Internal Library Details

```typescript
// ❌ Bad: Testing React internals
expect(mockSetState).toHaveBeenCalled();

// ✅ Good: Testing user outcomes
expect(screen.getByText(/updated value/i)).toBeInTheDocument();
```

## Test Coverage

### Generate Coverage Report

```bash
npm run test -- --coverage
```

### Coverage Configuration

```typescript
// vitest.config.ts
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'json'],
    exclude: [
      'node_modules/',
      'src/test/',
      '**/*.d.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80,
  },
}
```

## Testing Checklist

- [ ] Unit tests for utilities (80%+ coverage)
- [ ] Unit tests for hooks
- [ ] Component tests for all components
- [ ] Integration tests for major features
- [ ] E2E tests for critical user flows
- [ ] Error states tested
- [ ] Loading states tested
- [ ] Edge cases covered
- [ ] Accessibility tested (a11y)
- [ ] Mobile viewport tested
- [ ] Performance testing included

## Related Documentation

- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Component structure for testability
- [HOOKS_CONVENTIONS.md](HOOKS_CONVENTIONS.md) - Hook testing examples
- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Testing error scenarios

