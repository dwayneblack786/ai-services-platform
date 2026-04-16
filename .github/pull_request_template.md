### Summary

Describe the change, affected tiers, and any rollout or migration considerations.

### Verification

List the commands you ran and any manual verification evidence.

### Rule Compliance Checklist

- [ ] Syntax checks passed for affected tiers
  - Frontend: `cd ai-listing-agent/frontend && npx tsc --noEmit -p tsconfig.json`
  - Backend: `cd ai-listing-agent/backend-node && npx tsc --noEmit -p tsconfig.json`
  - Java: `cd services-java/listing-service && ./mvnw -q -DskipTests compile`
- [ ] Compile/build checks passed for affected tiers
  - Frontend: `cd ai-listing-agent/frontend && npm run build`
  - Backend: `cd ai-listing-agent/backend-node && npm run build`
  - Java: `cd services-java/listing-service && ./mvnw clean install -DskipTests`
- [ ] Tests run and passed for affected tiers
  - Frontend: `cd ai-listing-agent/frontend && npm test`
  - Backend: `cd ai-listing-agent/backend-node && npm test`
  - Java: `cd services-java/listing-service && ./mvnw test`
- [ ] Coverage requirement satisfied for changed logic paths
  - Backend coverage: `cd ai-listing-agent/backend-node && npm run coverage`
- [ ] Security checklist reviewed (auth, tenant boundaries, input validation, sensitive logging)
- [ ] Tech stack and conventions followed for touched tier(s)
- [ ] Plan output format followed (if plan was requested)
- [ ] AI wiki/knowledge docs updated if behavior or architecture changed

### Risks And Follow-Ups

Call out remaining risk, test gaps, or tracked follow-up work.