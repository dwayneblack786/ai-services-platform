# Security Audit: React + TypeScript Frontend

## Purpose

Conduct a comprehensive security audit of React frontend changes to prevent XSS, protect authentication state, prevent secret exposure, and ensure client-side security.

## When to Use

- New React components or pages
- Changes to authentication state management
- Form handling or user input rendering
- Environment variable usage
- Dependency updates or new packages
- External API integration in UI

---

## Audit Checklist

### 1. XSS Prevention & Content Escaping

```typescript
// ❌ FAIL: Direct HTML rendering of user input
export function CommentDisplay({ comment }: any) {
  return <div>{comment.text}</div>; // If comment contains <script>, browser executes it
}

// ✅ PASS: React escapes by default; use dangerouslySetInnerHTML only for trusted content
export function CommentDisplay({ comment }: CommentProps) {
  return <div>{comment.text}</div>; // React escapes by default
}

// ✅ PASS: Sanitize if HTML needed
import DOMPurify from 'dompurify';
export function RichText({ html }: any) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}
```

**Checks:**
- [ ] No use of `dangerouslySetInnerHTML` without sanitization
- [ ] User input rendered as text, not HTML (React default)
- [ ] `innerHTML` not used; use JSX instead
- [ ] Links use `href` not `javascript:` protocol
- [ ] Event handlers don't use `eval()`
- [ ] Form inputs properly escaped before display
- [ ] SVG/script tags from user input are escaped or sanitized

**Verification:**
```bash
# Check for dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML" src/

# Check for innerHTML
grep -rn "\.innerHTML" src/
```

---

### 2. Authentication State Management

```typescript
// ❌ FAIL: Token stored in localStorage (XSS accessible)
localStorage.setItem('token', jwt);

// ✅ PASS: HTTP-only cookie (set by backend)
// Backend sets: res.cookie('auth', jwt, { httpOnly: true, secure: true })
// Frontend just checks: const isAuthenticated = !!document.cookie.includes('auth')

// ✅ PASS: Store in memory (cleared on refresh)
const [token, setToken] = useState<string | null>(null);
```

**Checks:**
- [ ] JWT tokens stored in HTTP-only cookies (set by backend)
- [ ] Not storing tokens in localStorage or sessionStorage
- [ ] Not storing sensitive data in state that persists to localStorage
- [ ] Auth state cleared on logout
- [ ] Protected routes verify auth before rendering
- [ ] Token expiration checked; redirect to login if expired
- [ ] No token passed in URLs or query parameters
- [ ] Refresh token (if used) also HTTP-only cookie

**Verification:**
```bash
# Check for localStorage/sessionStorage token storage
grep -rn "localStorage\|sessionStorage" src/ | grep -i "token\|auth\|secret"

# Check for auth state management
grep -rn "useAuthContext\|useAuth" src/ | head -20
```

---

### 3. Secrets in Environment Variables

```typescript
// ❌ FAIL: Secrets in source code
const API_KEY = 'sk_live_12345678';
const DATABASE_URL = 'postgres://user:password@host/db';

// ❌ FAIL: REACT_APP_SECRET exposed in build
process.env.REACT_APP_DATABASE_URL // This gets embedded in bundle!

// ✅ PASS: Public keys/URLs only
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN;
// Never expose secrets; backend calls backend-to-backend
```

**Checks:**
- [ ] No secrets in `REACT_APP_*` variables (all are public)
- [ ] Only URLs, keys for public APIs, feature flags in `REACT_APP_*`
- [ ] `.env`, `.env.local` not committed (in `.gitignore`)
- [ ] `.env.example` documents all public variables
- [ ] API secrets only used backend-to-backend (not in frontend)
- [ ] No credentials passed in request headers from client
- [ ] No GCP/AWS/Azure credentials in frontend code

**Verification:**
```bash
# Check for secrets in environment variables
grep -rn "REACT_APP_" src/ | grep -i "secret\|password\|key\|token"

# Check .gitignore
grep ".env" .gitignore

# Check .env.example
cat .env.example
```

---

### 4. External API Calls & Request Security

```typescript
// ❌ FAIL: No CORS security or missing auth
fetch('https://api.example.com/user').then(r => r.json());

// ✅ PASS: Auth header and error handling
const response = await fetch('https://api.example.com/user', {
  method: 'GET',
  credentials: 'include', // Send cookies
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
if (!response.ok) throw new Error('API call failed');
```

**Checks:**
- [ ] API calls include authentication (Bearer token or session)
- [ ] CORS requests respect server's CORS policy
- [ ] No sensitive data in query parameters (use POST body)
- [ ] API responses validated before use
- [ ] Error responses don't leak internal details
- [ ] Timeouts on fetch calls
- [ ] No direct API calls to unrestricted endpoints

**Verification:**
```bash
# Check for fetch calls
grep -rn "fetch(" src/

# Check for proper auth headers
grep -rn "Authorization\|Bearer" src/
```

---

### 5. Form Handling & Input Validation

```typescript
// ❌ FAIL: No input validation, not escaped
const [email, setEmail] = useState('');
<input value={email} onChange={(e) => setEmail(e.target.value)} />
<button onClick={() => { callAPI(email); }}>Submit</button>

// ✅ PASS: Validation and sanitization
const [email, setEmail] = useState('');
const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
<input 
  type="email" 
  value={email} 
  onChange={(e) => setEmail(e.target.value)} 
/>
<button disabled={!isValidEmail} onClick={() => { callAPI(email); }}>Submit</button>
```

**Checks:**
- [ ] Input fields have appropriate `type` attributes (email, password, number)
- [ ] Client-side validation before submission
- [ ] Server validates again (never trust client)
- [ ] Password fields use `type="password"`
- [ ] Form doesn't submit sensitive data via GET
- [ ] No auto-fill on sensitive fields (password, SSN, etc.)
- [ ] Sensitive data cleared from form after submission

**Verification:**
```bash
# Check for form input types
grep -rn "type=\"text\"" src/ | grep -i "password\|email\|phone"

# Check for validation
grep -rn "validate\|pattern\|required" src/
```

---

### 6. Dependency & Supply Chain Security

```bash
# ❌ FAIL: Vulnerable dependency
npm install http-string-parser@0.0.5 # CVE-2022-24919

# ✅ PASS: Check before installing
npm audit
npm view package-name
npm install package-name && npm audit
```

**Checks:**
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] `package-lock.json` committed and up-to-date
- [ ] Dependencies from trusted sources (npm registry)
- [ ] No suspicious packages with few downloads
- [ ] Version pinned (not `*` or `latest`)
- [ ] Build output doesn't include source maps in production
- [ ] No credentials in version control history

**Verification:**
```bash
# Check vulnerabilities
npm audit

# Check outdated packages
npm outdated

# Check for source maps in production
ls -la build/ | grep ".map"
```

---

### 7. Session & Cookie Security

```typescript
// ❌ FAIL: Session stored as JWT in localStorage
const token = JWT.sign({ userId: user.id }, 'secret'); // Accessible to XSS!
localStorage.setItem('auth', token);

// ✅ PASS: HTTP-only cookie (backend sets, frontend just connects)
// Backend sets: res.cookie('auth', sessionId, { 
//   httpOnly: true, 
//   secure: true, 
//   sameSite: 'Strict' 
// });
```

**Checks:**
- [ ] Session cookies set by backend (not frontend)
- [ ] Cookies marked `httpOnly` (not accessible to JavaScript)
- [ ] Cookies marked `secure` in production (HTTPS only)
- [ ] Cookies marked `sameSite` (prevent CSRF)
- [ ] No sensitive data in cookies (except sessionId)
- [ ] Logout clears session cookie

**Verification:**
```bash
# Check backend cookie setup
grep -rn "cookie(" ../backend-node/src/

# Check frontend cookie access
grep -rn "document.cookie" src/
```

---

### 8. CSRF Token Handling

```typescript
// ❌ FAIL: State-changing operation without CSRF token
async function deleteAccount() {
  await fetch('/api/account', { method: 'DELETE' });
}

// ✅ PASS: CSRF token included
async function deleteAccount() {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  await fetch('/api/account', { 
    method: 'DELETE',
    headers: { 'X-CSRF-Token': csrfToken }
  });
}
```

**Checks:**
- [ ] CSRF token available from meta tag or API call
- [ ] CSRF token included in state-changing requests (POST, PUT, DELETE)
- [ ] CSRF token validated server-side
- [ ] CSRF token rotated after login
- [ ] CSRF token different for each user

**Verification:**
```bash
# Check for CSRF token meta tag
grep -rn "csrf-token" src/

# Check for CSRF header in requests
grep -rn "X-CSRF\|csrf" src/
```

---

### 9. Content Security Policy (CSP)

```html
<!-- ❌ FAIL: No CSP header -->
<head>
  <script src="untrusted.js"></script>
</head>

<!-- ✅ PASS: CSP header set by backend -->
<!-- Backend sets: Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' -->
<!-- Or: Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.trusted.com -->
<head>
  <script src="trusted.js"></script>
</head>
```

**Checks:**
- [ ] CSP header sent by backend
- [ ] CSP restricts script sources (not `'unsafe-inline'` if possible)
- [ ] CSP blocks third-party resources except approved CDNs
- [ ] Inline scripts use nonce from CSP header
- [ ] No eval() or new Function() usage

**Verification:**
```bash
# Check backend CSP header
grep -rn "Content-Security-Policy" ../backend-node/src/

# Check for inline scripts
grep -rn "<script>" src/ | grep -v "src="
```

---

### 10. Error Handling & Sensitive Logging

```typescript
// ❌ FAIL: Exposure of error details to user
.catch(err => {
  console.log(err); // May contain API keys, paths
  alert(err.message); // Shows to user
});

// ✅ PASS: Safe error handling
.catch(err => {
  logger.error('api_error', { err: err.message }); // Secrets filtered
  setError('An error occurred. Please try again.');
  // Only log safe details to console
});
```

**Checks:**
- [ ] Error messages shown to user are generic (not stack traces)
- [ ] Stack traces never logged to frontend console in production
- [ ] API error responses handled safely
- [ ] Sensitive data not in console.log statements
- [ ] Application monitoring (Sentry, etc.) filters secrets

**Verification:**
```bash
# Check for console.log in production code
grep -rn "console\\.log\|console\\.error" src/ | grep -v "// eslint"

# Check error handling
grep -rn "catch" src/ | head -20
```

---

## Manual Verification Steps

1. **Browser DevTools Inspection:**
   - [ ] Open DevTools → Application → Cookies
   - [ ] Auth cookie is `HttpOnly`, `Secure`, `SameSite`
   - [ ] No sensitive data in localStorage/sessionStorage
   - [ ] No API keys in Network tab (check request headers)

2. **XSS Test:**
   - [ ] Try to submit `<script>alert('XSS')</script>` in a form
   - [ ] Verify it renders as text, not executed
   - [ ] Check that user input is properly escaped

3. **Authentication Test:**
   - [ ] Logout and verify session cleared
   - [ ] Delete auth cookie manually; verify redirected to login
   - [ ] Modify token in DevTools; verify 401 or redirected

4. **CORS Test:**
   - [ ] Test API call from different origin (use mock server)
   - [ ] Verify backend CORS policy enforces restrictions
   - [ ] Check that credentials only sent to same origin

5. **Dependency Audit:**
   ```bash
   npm audit
   npm audit fix
   ```

---

## Failure Criteria (Block Merge)

- [ ] XSS vulnerability found (unsanitized HTML rendering)
- [ ] Secrets in `REACT_APP_*` variables or source code
- [ ] Tokens stored in localStorage without HTTP-only protection
- [ ] No input validation on sensitive forms
- [ ] npm audit shows high/critical vulnerabilities
- [ ] Authentication state improperly managed
- [ ] CSRF tokens missing on state-changing operations
- [ ] dangerouslySetInnerHTML used without sanitization
- [ ] Sensitive data logged to console in production
- [ ] Source maps exposed in production build

---

## References

- Rule 4: Security Standards (`.claude/rules/04-security-standards.md`)
- OWASP Top 10 for React: `code-review/review-security-scanning-pentesting.md`
- React Security: https://react.dev/learn/security
- MDN Web Security: https://developer.mozilla.org/en-US/docs/Web/Security
