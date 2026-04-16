# Runbook: MongoDB Operations — Connection Failures, Slow Queries, and Index Maintenance

Context:

- MongoDB 7.0 runs in Podman. Internal port 27017, host-exposed port 27018.
- Podman compose file: `podman-compose.yml` at workspace root.
- Database name: `ai_platform`.
- ODM: Mongoose (Node.js tiers); Spring Data MongoDB (Java tiers).

Source file/path:

- `podman-compose.yml`
- `product-management/backend-node/`
- `ai-listing-agent/backend-node/`
- `services-java/listing-service/`
- `.ai/skills/code-changes/senior-data-engineer-database.md`
- `.ai/skills/code-changes/senior-devops-infra.md`

Last verified date:

- 2026-04-16

---

## 1. Connection Failure Diagnosis

### Symptoms

- Application logs: `MongoServerSelectionError`, `ECONNREFUSED 127.0.0.1:27018`, or `MongoNetworkError`
- Spring boot: `Unable to connect to MongoDB instance` at startup

### Steps

1. **Check Podman container status:**
   ```powershell
   podman ps --filter name=mongo
   ```
   Expected: container running and healthy. If absent or exited, continue to step 2.

2. **Start or restart the infra stack:**
   ```powershell
   Set-Location "C:/Users/Owner/Documents/ai-services-platform"
   podman-compose up -d
   ```

3. **Verify MongoDB is accepting connections:**
   ```powershell
   podman exec -it <mongo-container-name> mongosh --eval "db.adminCommand({ ping: 1 })"
   ```
   Expected: `{ ok: 1 }`

4. **Check exposed port mapping:**
   ```powershell
   podman port <mongo-container-name>
   ```
   Expected: `27017/tcp -> 0.0.0.0:27018`

5. **Verify application connection string:**
   - Node.js tiers: check `MONGO_URI` env var — should be `mongodb://localhost:27018/ai_platform`
   - Java tiers: check `spring.data.mongodb.uri` in `application.yml` or environment override

6. **Check container logs for startup errors:**
   ```powershell
   podman logs <mongo-container-name> --tail 50
   ```

### Escalate when

- Container restarts in a loop (OOM or disk full)
- `mongosh ping` fails even when container is running (corrupt data volume)
- Port 27018 is bound by another process (`netstat -ano | findstr 27018`)

---

## 2. Slow Query Investigation

### Symptoms

- API endpoints with noticeable latency on data-heavy routes
- Mongoose operations timing out under moderate load
- Spring Data `MongoQueryException` with timeout

### Steps

1. **Enable profiler for slow operations (> 100ms) on the ai_platform database:**
   ```powershell
   podman exec -it <mongo-container-name> mongosh ai_platform --eval "db.setProfilingLevel(1, { slowms: 100 })"
   ```

2. **Retrieve recent slow operation log:**
   ```powershell
   podman exec -it <mongo-container-name> mongosh ai_platform --eval "db.system.profile.find({}, {op:1, ns:1, millis:1, query:1}).sort({ts:-1}).limit(10)"
   ```

3. **Run `explain()` on the suspect query from application code:**
   ```js
   // Mongoose example
   const result = await MyModel.find({ tenantId: 'abc', status: 'active' }).explain('executionStats');
   console.log(JSON.stringify(result.executionStats, null, 2));
   ```
   Look for: `COLLSCAN` (missing index), high `totalDocsExamined` relative to `nReturned`.

4. **Check existing indexes on the collection:**
   ```powershell
   podman exec -it <mongo-container-name> mongosh ai_platform --eval "db.<collectionName>.getIndexes()"
   ```

5. **Add missing index if identified:**
   - Prefer adding via Mongoose schema index definition in application code, not ad hoc shell.
   - For emergency production fix, use:
     ```powershell
     podman exec -it <mongo-container-name> mongosh ai_platform --eval "db.<collectionName>.createIndex({ tenantId: 1, status: 1 }, { background: true })"
     ```
   - Follow up with a code-side schema index addition and remove the ad hoc index artifact.

6. **Disable profiler after investigation:**
   ```powershell
   podman exec -it <mongo-container-name> mongosh ai_platform --eval "db.setProfilingLevel(0)"
   ```

---

## 3. Index Rebuild / Maintenance

### When needed

- Index flagged as corrupt in MongoDB logs
- Performance regression after large data import
- New compound index needed to replace a narrower one

### Steps

1. **List current indexes:**
   ```powershell
   podman exec -it <mongo-container-name> mongosh ai_platform --eval "db.<collectionName>.getIndexes()"
   ```

2. **Rebuild a specific index (background — non-blocking on MongoDB 7.0+):**
   ```powershell
   podman exec -it <mongo-container-name> mongosh ai_platform --eval "db.runCommand({ reIndex: '<collectionName>' })"
   ```
   Note: `reIndex` in MongoDB 7.0 runs in the foreground on standalone. For large collections, prefer dropping and rebuilding the specific index:
   ```powershell
   podman exec -it <mongo-container-name> mongosh ai_platform --eval "db.<collectionName>.dropIndex('<indexName>')"
   podman exec -it <mongo-container-name> mongosh ai_platform --eval "db.<collectionName>.createIndex({ field: 1 }, { background: true })"
   ```

3. **Verify index build completed:**
   ```powershell
   podman exec -it <mongo-container-name> mongosh ai_platform --eval "db.currentOp({ 'command.createIndexes': { \$exists: true } })"
   ```
   Empty result = build complete.

4. **For schema-driven index adds** (preferred path):
   - Add index declaration to the Mongoose schema in application code.
   - Deploy application — Mongoose `ensureIndexes` will build missing indexes on startup.
   - Verify with `getIndexes()` after deployment.

---

## 4. Volume and Data Safety

- MongoDB data is stored in a named Podman volume. **Do not run `podman-compose down -v`** unless you intend to delete all data.
- Safe restart (preserves data): `podman-compose down` then `podman-compose up -d`
- Backup before destructive ops:
  ```powershell
  podman exec <mongo-container-name> mongodump --db ai_platform --out /tmp/backup
  podman cp <mongo-container-name>:/tmp/backup ./mongo-backup-$(Get-Date -Format 'yyyyMMdd')
  ```

---

## Related Skills

- `.ai/skills/code-changes/senior-data-engineer-database.md`
- `.ai/skills/code-changes/senior-devops-infra.md`
- `.ai/skills/code-review/review-database-data-layer.md`
