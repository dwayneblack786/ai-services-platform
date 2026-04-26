# Security Audit Skills Index

This directory contains tier-specific security audit skills to ensure all changes meet security standards and protect customers from vulnerabilities.

## Skills

1. **audit-node-backend.md** — Express + TypeScript backend security
   - Authentication/session management
   - Input validation and rate limiting
   - Error handling and logging
   - Secret management

2. **audit-react-frontend.md** — React + TypeScript frontend security
   - XSS prevention and content escaping
   - Authentication state management
   - Secrets in environment variables
   - Dependency vulnerabilities

3. **audit-java-spring.md** — Spring Boot service security
   - Spring Security configuration
   - Authorization and method protection
   - Input validation and serialization
   - Logging and audit trails

4. **audit-api-contracts.md** — API/gRPC endpoint security
   - Authentication on endpoints
   - Rate limiting and throttling
   - Request/response validation
   - Breaking changes affecting security

5. **audit-data-protection.md** — Database and data layer security
   - SQL injection prevention
   - Encryption at rest and in transit
   - Tenant boundary enforcement
   - Sensitive data handling

6. **audit-ai-llm-systems.md** — AI, LLM, RAG, and agentic workflow security
   - Prompt injection and context isolation
   - Tool-calling safety and loop bounds
   - Tenant-safe retrieval and grounded generation
   - Secret, PII, and model-output protection

## Quick Selector

| Change Type | Tier | Audit Skill |
|---|---|---|
| Node endpoint, handler, middleware | Backend | `audit-node-backend.md` |
| React component with auth state | Frontend | `audit-react-frontend.md` |
| Spring service, controller | Java | `audit-java-spring.md` |
| New API endpoint, gRPC method | Any | `audit-api-contracts.md` |
| Database query, ORM operation | Any | `audit-data-protection.md` |
| LLM integration, RAG, tool calling, agent loop | Any | `audit-ai-llm-systems.md` |

## Recommended Usage Flow

1. Identify the tier(s) being modified (backend, frontend, Java, API)
2. Select one or more relevant security audit skills
3. Run the security audit checklist for each skill
4. Document any findings or mitigations
5. Always verify with `code-review/review-security-auth-tenant.md` afterward

## Security Standards Reference

These skills enforce requirements from:
- Rule 4: Security Standards (`.ai/rules/04-security-standards.md`)
- OWASP Top 10: `code-review/review-security-scanning-pentesting.md`
- Customer protection baseline: zero secrets leaked, zero authentication bypasses, zero injection vulnerabilities

## Mandatory Audit Trigger

Run a security audit when changes affect:
- Authentication, authorization, or session management
- External input handling (API payloads, file uploads, user input)
- Database queries or data storage
- Secrets or configuration management
- Error handling or logging
- API endpoints or gRPC methods
- New dependencies
- AI prompts, tool-calling, retrieval, model routing, or agentic workflows

## Failure Criteria (Block Merge)

- [ ] Secrets or credentials found in code, logs, or responses
- [ ] Authentication or authorization bypass possible
- [ ] SQL injection or command injection vulnerability
- [ ] Missing rate limiting on sensitive endpoints
- [ ] Input validation gaps
- [ ] Tenant boundary not enforced on data access
- [ ] Error messages expose system internals
- [ ] Sensitive data logged or cached insecurely
