# Rule 5: Tech Stack Standards By Tier

Purpose:

- Keep each tier on approved stack patterns and avoid accidental framework drift.

Approved stack:

- Frontend (`ai-listing-agent/frontend`): React 18 + TypeScript + Vite + React Router + Axios + Vitest.
- Backend (`ai-listing-agent/backend-node`): Node.js + Express + TypeScript + Passport + Redis session + MongoDB (Mongoose).
- Java (`services-java/listing-service`): Spring Boot 4.0.1 + Java 21 + Spring Data MongoDB + Spring AI (Anthropic) + gRPC.

Rules:

- Reuse existing platform packages before introducing alternatives.
- Any new framework-level dependency requires justification in PR notes:
  - Why existing stack is insufficient
  - Security impact
  - Ops/runtime impact
- Keep shared contracts/types compatible with platform services.
- Do not mix competing libraries without clear migration intent.

Dependency hygiene:

- Pin and upgrade dependencies intentionally.
- Remove unused dependencies in the same change when practical.
- Prefer stable ecosystem packages with maintenance history.
