# Rule 13: Dependency Audit

Scope:

- `ai-listing-agent/frontend/package.json`
- `ai-listing-agent/backend-node/package.json`
- `ai-product-management/frontend/package.json`
- `ai-product-management/backend-node/package.json`
- `services-java/listing-service/pom.xml`

Mandatory trigger:

- Any addition, removal, or version change of a dependency or devDependency in `package.json`.
- Any addition, removal, or version change of a dependency in `pom.xml`.
- Quarterly review (even without changes) to check for newly disclosed vulnerabilities.

Required commands:

- Node.js tiers (run in the affected package directory):
  - `npm audit --audit-level=high`
  - Acceptable output: no high or critical vulnerabilities. Moderate findings must be reviewed and accepted or scheduled.

- Java tier:
  - `Set-Location services-java/listing-service; ./mvnw dependency:check` (if OWASP plugin is configured)
  - Manual review of new `pom.xml` dependencies via Maven Central security advisories if plugin is not yet configured.

Standards:

- Do not add a dependency that has known high or critical CVEs without a documented exception and a remediation timeline.
- Pin versions intentionally; avoid `latest`, `*`, or open ranges in `package.json`.
- Remove unused dependencies in the same change when practical.
- Prefer packages with active maintenance history and a clear security disclosure process.
- Any new framework-level or security-sensitive dependency (auth, crypto, session, file upload, HTTP client) requires explicit justification in the PR notes:
  - Why the existing stack is insufficient.
  - Security impact assessment.
  - Ops/runtime impact assessment.

Pass criteria:

- `npm audit --audit-level=high` exits 0 (no high/critical findings) in the affected tier.
- No new dependency added without a version pin.
- New security-sensitive dependencies explicitly justified.

Fail handling:

- Do not merge a `package.json` or `pom.xml` change that introduces a high or critical CVE without a documented exception.
- If an existing high CVE is surfaced unrelated to the current change, file a tracked follow-up before merge — do not silently accept it.

