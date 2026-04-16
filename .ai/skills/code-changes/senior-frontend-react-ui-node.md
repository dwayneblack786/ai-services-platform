# Skill: Senior Frontend Changes (React UI + Node Integration)

## Purpose

Implement high-quality frontend changes with expert UI design judgment in React and reliable integration with Node APIs.

## When to use

- New screens, major UI refactors, workflow redesigns, or API-driven state flows in `ai-listing-agent/frontend`.

## Expertise expectations

- Expert in React composition, state patterns, and accessibility.
- Expert in practical UI design quality: hierarchy, spacing rhythm, typography, interaction clarity, and responsive behavior.
- Strong Node API integration practices: request lifecycle, error mapping, auth/session-aware calls, and optimistic updates when safe.

## Build standards

- Keep components focused and composable; avoid monolithic page logic.
- Use TypeScript strictly; avoid `any` unless justified and localized.
- Keep API access inside service modules, not scattered across UI layers.
- Handle loading, empty, success, and failure states explicitly.
- Keep forms resilient (validation, disabled states, retry behavior).
- Preserve tenant-aware/auth-aware behavior across navigation and API calls.

## UI quality checklist

- Clear visual hierarchy and consistent spacing scale.
- Mobile and desktop layouts both deliberate and usable.
- Keyboard accessibility and meaningful focus states.
- Destructive actions include safe confirmation patterns.
- Error messages are actionable and user-safe.

## Validation commands

- Syntax: `cd ai-listing-agent/frontend && npx tsc --noEmit -p tsconfig.json`
- Build: `cd ai-listing-agent/frontend && npm run build`
- Tests: `cd ai-listing-agent/frontend && npm test`

## Delivery requirements

- Include or update tests for changed user-visible behavior.
- If backend contract assumptions changed, reference the related backend change.

## Output format

- Summarize implemented UI decisions and API integration strategy.
- List risks, mitigations, and remaining UX debt items.
