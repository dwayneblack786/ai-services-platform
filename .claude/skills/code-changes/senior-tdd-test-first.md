# Skill: Test-Driven Development (TDD) - Red-Green-Refactor

## Purpose

Implement the Test-Driven Development cycle to ensure backend features, frontend components, and service logic are tested before or during implementation, not after.

## When to Use

- Implementing new business logic in Node backend services
- Adding new React components or page-level features
- Implementing Spring Boot service methods or orchestration logic
- Refactoring existing untested code to add coverage
- Adding new endpoints or API handlers

## TDD Cycle

### Phase 1: Red (Write Failing Test)

1. **Understand the requirement** - Know exactly what behavior you're implementing
2. **Write the test first** - Test file created *before* implementation
3. **Test should fail** - The code doesn't exist yet; test proves it
4. **Keep the test focused** - One assertion per test case where practical

#### Test File Placement

- **Node/TypeScript**: `src/services/*.test.ts` or `src/routes/*.test.ts`
- **React/Frontend**: `src/components/*.test.tsx` or `src/pages/*.test.tsx`
- **Java/Spring**: `src/test/java/.../<ClassName>Test.java`

#### Test File Template (Node - Vitest)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyService } from './myService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it('should do X when given Y', () => {
    const result = service.someMethod('input');
    expect(result).toBe('expected');
  });

  it('should handle error when Z', () => {
    expect(() => service.failingMethod()).toThrow('expected error');
  });
});
```

#### Test File Template (React - Vitest + Testing Library)

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render title text', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should call callback when clicked', async () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

#### Test File Template (Java - JUnit Spring Boot Test)

```java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;

public class MyServiceTest {
  private MyService service;

  @BeforeEach
  public void setUp() {
    service = new MyService();
  }

  @Test
  public void shouldDoXWhenGivenY() {
    String result = service.someMethod("input");
    assertEquals("expected", result);
  }

  @Test
  public void shouldThrowWhenInvalid() {
    assertThrows(IllegalArgumentException.class, () -> {
      service.invalidMethod();
    });
  }
}
```

---

### Phase 2: Green (Write Minimal Implementation)

1. **Write the simplest code** that makes the test pass
2. **No over-engineering** - Don't add features the test doesn't verify
3. **All tests must pass** - Run the test suite to confirm
4. **Don't refactor yet** - Add only what's needed to pass

#### Minimal Implementation Rule

```typescript
// ❌ Don't do this yet (over-engineered)
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return false;
  // ... more validation logic
  return true;
}

// ✅ Do this first (minimal pass)
export function validateEmail(email: string): boolean {
  return email.includes('@');
}
// Make all tests pass with this simple version first
```

#### Run Tests

```bash
# Node/TypeScript
cd ai-listing-agent/backend-node && npm test

# React/Frontend
cd ai-listing-agent/frontend && npm test

# Java/Spring
cd services-java/<service> && ./mvnw test
```

---

### Phase 3: Refactor (Improve Without Breaking Tests)

1. **Tests stay the same** - No test changes in this phase
2. **Improve implementation** - Extract functions, remove duplication, optimize
3. **Run tests after each improvement** - Ensure nothing breaks
4. **Add edge-case tests** if gaps are found

#### Refactor Example

```typescript
// Starting point (passes all tests)
export function validateEmail(email: string): boolean {
  return email.includes('@');
}

// Refactor to improve quality (tests still pass)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email);
}

// If refactor breaks a test, roll back and fix the test first
```

---

## TDD Checkpoints

Before marking work complete:

- [ ] Test file created with at least 2 test cases (success path + 1 edge/error)
- [ ] All tests run with `npm test` or `./mvnw test`
- [ ] All tests pass (green phase complete)
- [ ] Implementation is minimal and readable
- [ ] Coverage meets Rule 7 minimum (success + edge path)
- [ ] No skipped tests (`it.skip`, `xit`)
- [ ] Test names describe behavior, not implementation

## Multi-Path Testing (Important)

Each feature should test:

1. **Happy path** - Normal, expected input → correct output
2. **At least one edge/error case** - Null input, empty list, invalid state, exception thrown
3. **Boundary case** (where applicable) - Off-by-one, max value, min value

##### Example: Batch Processing Service

```typescript
// Happy path: normal batch
it('should process all items in batch', () => {
  const batch = [{ id: 1 }, { id: 2 }];
  const result = service.processBatch(batch);
  expect(result).toHaveLength(2);
});

// Edge case: empty batch
it('should handle empty batch', () => {
  const result = service.processBatch([]);
  expect(result).toHaveLength(0);
});

// Error case: null input
it('should throw on null batch', () => {
  expect(() => service.processBatch(null)).toThrow('batch required');
});
```

## TDD Anti-Patterns (Avoid)

| Don't | Why | Do Instead |
|---|---|---|
| Write tests after code | Defeats TDD purpose; easier to skip tests | Write test first, then code |
| Test implementation details | Tests break when refactoring | Test behavior and outcomes |
| Create long test files (>300 lines) | Hard to maintain; confusing | Split into focused test suites |
| Skip error cases | False confidence in code quality | Always add error/edge path tests |
| Use `any` types in tests | Loses type safety benefits | Use real types or test doubles |

## Tier-Specific Guidelines

### Backend (Node/Express + TypeScript)

- Mock external services (database, APIs, Redis) using test doubles
- Use `vi.fn()` for spies and `vi.mock()` for module mocking
- Test both sync and async flows; await promises
- Keep database tests in-memory or use transaction rollback

### Frontend (React + TypeScript)

- Render components in tests; avoid snapshot tests
- Test user interactions with `@testing-library/user-event`
- Mock API calls; don't hit real endpoints in tests
- Test accessibility: use `screen.getByRole()` over `getByTestId()`

### Java (Spring Boot)

- Use `@SpringBootTest` for integration tests
- Use `@MockBean` and `@Mock` for dependency injection in tests
- Test transaction behavior and rollback scenarios
- Keep test data builders simple; avoid complex fixtures

## Verification

```bash
# Node
cd ai-listing-agent/backend-node && npm test

# Frontend
cd ai-listing-agent/frontend && npm test

# Java
cd services-java/<service> && ./mvnw test
```

All tests must pass and coverage must meet Rule 7 (success + at least one edge case covered).

## References

- Rule 6: Testing Standards By Tier (`.claude/rules/06-testing-standards-by-tier.md`)
- Rule 7: Coverage Gates (`.claude/rules/07-test-coverage-gates.md`)
- circuitBreaker.test.ts (example test in production codebase)
