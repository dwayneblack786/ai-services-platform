# Service: ai-listing-agent

Context:

- Product workspace for ListingLift / PropPulse Studio.
- Frontend runs on port 5174 and backend runs on port 3002.
- Backend is the UI/API layer and delegates orchestration to `services-java/listing-service`.

Source file/path:

- `ai-listing-agent/CLAUDE.md`
- `ai-listing-agent/backend-node/package.json`

Last verified date:

- 2026-04-16

Verified commands:

- `cd ai-listing-agent/backend-node && npx tsc --noEmit -p tsconfig.json`
- `cd ai-listing-agent/backend-node && npm run build`
- `cd ai-listing-agent/backend-node && npm test`
- `cd ai-listing-agent/backend-node && npm run coverage`

Actionable notes:

- Keep backend route handlers thin and push business rules into `src/services`.
- Use `src/config/env.ts` for runtime configuration rather than direct environment access.
- Circuit breaker behavior now has automated tests in `src/services/circuitBreaker.test.ts`.