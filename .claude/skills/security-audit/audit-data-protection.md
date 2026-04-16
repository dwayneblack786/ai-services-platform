# Security Audit: Data Protection & Database Security

## Purpose

Conduct a comprehensive security audit of database and data-layer changes to ensure proper encryption, access control, tenant isolation, and protection of sensitive data.

## When to Use

- New database schema or table
- Changes to data access queries
- Encryption or key management changes
- Backup or retention policy changes
- Data migration or import operations
- Changes to sensitive data handling (PII, payment data)

---

## Audit Checklist

### 1. SQL Injection Prevention

```typescript
// ❌ FAIL: SQL Injection risk
const email = req.body.email;
const query = `SELECT * FROM users WHERE email = '${email}'`;
const user = await db.query(query);

// ✅ PASS: Parameterized query
const email = req.body.email;
const user = await db.query('SELECT * FROM users WHERE email = ?', [email]);

// ✅ PASS: ORM (safest)
const user = await User.findOne({ where: { email } });
```

**Checks:**
- [ ] All database queries use parameterized values or ORM
- [ ] No string interpolation in SQL
- [ ] No stored procedures with dynamic SQL
- [ ] User input validated before queries (defense in depth)
- [ ] LIKE queries escaped (e.g., `%` becomes `\%`)
- [ ] ORDER BY columns whitelisted (not from user input)

**Verification:**
```bash
# Check for string interpolation
grep -rn "\`.*\${.*}\`\|'.*\+.*'" src/ | grep -i "select\|insert\|update"

# Check for ORM usage
grep -rn "findOne\|find(\|where(" src/services/*
```

---

### 2. No SQL Injection Prevention

```typescript
// ❌ FAIL: MongoDB Injection
db.users.find({ username: req.query.user }); // If user = {$ne: null}

// ✅ PASS: Schema validation first
const { error, value } = userSchema.validate(req.query);
if (error) throw new BadRequestError();
db.users.find({ username: value.user });

// ✅ PASS: Type checking
if (typeof req.query.user !== 'string') throw new BadRequestError();
db.users.find({ username: req.query.user });
```

**Checks:**
- [ ] MongoDB queries validate input types
- [ ] Query operators (`$ne`, `$gt`, etc.) not exposed to user input
- [ ] Schema validation enforces expected types
- [ ] NoSQL injection patterns blocked

---

### 3. Encryption at Rest

```java
// ❌ FAIL: No encryption
@Column
private String socialSecurityNumber;

@Column
private String creditCardNumber;

// ✅ PASS: Data encrypted at rest
@Column(columnDefinition = "VARBINARY(MAX)")
@Convert(converter = SSNEncryptor.class)
private String socialSecurityNumber;

// ✅ PASS: Database-level encryption (Transparent Data Encryption)
CREATE TABLE users (
  id INT PRIMARY KEY,
  email NVARCHAR(255) NOT NULL
) WITH (ENCRYPTION = ON);
```

**Checks:**
- [ ] Sensitive data (SSN, credit cards, API keys) encrypted at rest
- [ ] Encryption keys rotated regularly (at least annually)
- [ ] Encryption keys stored separately from data
- [ ] Encryption algorithm is strong (AES-256)
- [ ] Key management system (HSM, AWS KMS, Vault) used
- [ ] Backup encryption same as production

**Verification:**
```bash
# Check for encrypted fields
grep -rn "@Convert\|@Encrypt\|ColumnEncryption" src/main/java/

# Check encryption configuration
grep -rn "encryption\|ENCRYPT\|AES" src/main/java/ application.yml
```

---

### 4. Encryption in Transit

```typescript
// ❌ FAIL: No encryption
const db = mongoose.connect('mongodb://localhost:27017');

// ✅ PASS: TLS encryption
const db = mongoose.connect('mongodb://localhost:27017?tls=true&tlsCAFile=/path/to/ca.pem');

// ✅ PASS: HTTPS for APIs
const options = {
  key: fs.readFileSync(process.env.TLS_KEY),
  cert: fs.readFileSync(process.env.TLS_CERT)
};
https.createServer(options, app).listen(443);
```

**Checks:**
- [ ] Database connections use TLS/SSL
- [ ] APIs use HTTPS (TLS 1.2+)
- [ ] Certificates are valid and not expired
- [ ] Certificate pinning if possible
- [ ] Minimum TLS 1.2 required
- [ ] Weak ciphers disabled

**Verification:**
```bash
# Check database connection config
grep -rn "mongodb\|postgres\|mysql" src/ | grep -v "tls\|ssl"

# Check HTTPS config
grep -rn "https\|tls\|cert\|key" src/index.ts
```

---

### 5. Sensitive Data Handling

```typescript
// ❌ FAIL: Sensitive data cached/logged
async function processPayment(creditCard: string) {
  logger.info(`Processing payment for card: ${creditCard}`);
  cache.set('last_card', creditCard);
  return await paymentService.charge(creditCard);
}

// ✅ PASS: Sensitive data not cached or logged
async function processPayment(tokenId: string) {
  logger.info(`Processing payment with token: ${tokenId.slice(0, 4)}...`);
  // Don't cache tokens or cards
  return await paymentService.chargeToken(tokenId);
}

// ✅ PASS: Mask sensitive data in logs
logger.info('payment_processed', {
  tokenId: token.slice(0, 4) + '...',
  amount: amount,
  timestamp: new Date()
});
```

**Checks:**
- [ ] Sensitive data (passwords, SSN, cards) not logged
- [ ] Sensitive data not cached
- [ ] Sensitive data not exposed in error messages
- [ ] Sensitive data masked if must be logged (last 4 chars only)
- [ ] Sensitive data fields have TTL/retention policy
- [ ] Sensitive file uploads scanned for malware
- [ ] Temporary files deleted after processing

**Verification:**
```bash
# Check for sensitive data in logs
grep -rn "logger\." src/ | grep -i "password\|card\|ssn\|token"

# Check for cache usage with sensitive data
grep -rn "cache.*password\|cache.*token\|cache.*card" src/
```

---

### 6. Tenant Data Isolation

```typescript
// ❌ FAIL: No tenant filtering
async function getListings() {
  return await Listing.find();
}

// ✅ PASS: Tenant-scoped queries
async function getListings(tenantId: string) {
  return await Listing.find({ tenantId });
}

// ✅ PASS: Base repository enforces tenant filtering
class BaseRepository {
  find(query: any) {
    return db.find({ ...query, tenantId: this.currentTenantId });
  }
}
```

**Checks:**
- [ ] All queries filter by tenant ID
- [ ] Tenant ID cannot be overridden (from session/token, not request)
- [ ] Database constraints enforce tenant boundaries
- [ ] Unique indexes include tenant ID (e.g., `UNIQUE(tenant_id, email)`)
- [ ] Backup/restore respects tenant boundaries
- [ ] Cross-tenant queries only for admin operations
- [ ] Audit logs include tenant context

**Verification:**
```bash
# Check for tenant filtering
grep -rn "tenantId\|find({ where:" src/services/ | head -20

# Check database schema
cat scripts/schema.sql | grep "UNIQUE\|tenant"
```

---

### 7. Data Retention & Deletion

```java
// ❌ FAIL: No retention policy
// Data kept indefinitely; GDPR right-to-be-forgotten not implemented
@Entity
public class UserData {
  private String email;
  private String personalInfo;
}

// ✅ PASS: Retention policy with auto-deletion
@Entity
public class UserData {
  private String email;
  private String personalInfo;
  
  @Column(name = "created_at")
  private LocalDateTime createdAt;
  
  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;
  
  // Soft delete; purge after 90 days
}

// Scheduled job
@Scheduled(cron = "0 0 2 * * *") // Daily at 2 AM
public void purgeDeletedData() {
  LocalDateTime cutoff = LocalDateTime.now().minus(90, DAYS);
  dataRepository.deleteWhereLessThan(deletedAt, cutoff);
}
```

**Checks:**
- [ ] Data retention policy documented (GDPR, CCPA compliant)
- [ ] User data deletion possible (right-to-be-forgotten)
- [ ] Soft-delete pattern used (mark deleted, then purge after TTL)
- [ ] Scheduled jobs purge expired data
- [ ] Audit logs retained longer than operational data
- [ ] Backups include retention/deletion metadata
- [ ] PII data purged after retention period expires

**Verification:**
```bash
# Check for retention policies
grep -rn "retention\|deleted_at\|purge" src/

# Check scheduled jobs
grep -rn "@Scheduled\|cron" src/main/java/
```

---

### 8. Database Access Control

```sql
-- ❌ FAIL: Database user with full privileges
CREATE USER app_user IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON . TO 'app_user'@'%';

-- ✅ PASS: Least privilege (read-only for reports)
CREATE USER app_user;
GRANT SELECT ON app_db.* TO 'app_user'@'localhost';

-- ✅ PASS: Separate roles for operations
CREATE ROLE app_reader;
GRANT SELECT ON app_db.* TO app_reader;

CREATE ROLE app_writer;
GRANT SELECT, INSERT, UPDATE ON app_db.* TO app_writer;
GRANT DELETE ON app_db.logs TO app_writer; -- Can delete logs, not user data

CREATE USER app_service IDENTIFIED BY 'strong_password';
GRANT app_writer TO app_service;
```

**Checks:**
- [ ] Database user has minimal required privileges (least privilege)
- [ ] Passwords are strong (20+ chars, mixed case, numbers, symbols)
- [ ] Read-only users for reporting/analytics
- [ ] Separate accounts for different application components
- [ ] Direct database access from users is blocked (use app only)
- [ ] Database user cannot access OS
- [ ] Service account passwords rotated regularly

**Verification:**
```bash
# Check database user permissions
mysql -u root -p -e "SHOW GRANTS FOR 'app_user'@'localhost';"

# Check connection strings
grep -rn "DATABASE_URL\|db.*password" src/ | grep -v "process.env"
```

---

### 9. Backup & Recovery Security

```bash
# ❌ FAIL: No encryption, no access control
mysqldump app_db > backup.sql
# Stored on shared drive, unencrypted

# ✅ PASS: Encrypted, access-controlled backups
mysqldump app_db \
  | openssl enc -aes-256-cbc -salt -out backup.sql.enc -pass file:/dev/stdin \
  < encryption_key.txt

# Upload to S3 with encryption
aws s3 cp backup.sql.enc s3://secure-backups/ \
  --sse AES256 \
  --acl private

# Test restore process
mysqldump app_db > backup.sql && mysql app_db_restore < backup.sql
```

**Checks:**
- [ ] Backups are encrypted (at rest and in transit)
- [ ] Backups stored separately from production
- [ ] Backup access restricted to authorized personnel
- [ ] Backups include full data (not just schema)
- [ ] Backups regularly tested for restore capability
- [ ] Recovery Time Objective (RTO) met
- [ ] Point-in-time recovery capability available
- [ ] Old backups securely deleted (shredded)

**Verification:**
```bash
# Check backup schedule
crontab -l | grep -i backup

# Check backup encryption
ls -la /backups/ | grep -i encrypt
```

---

### 10. Audit & Compliance Logging

```java
// ❌ FAIL: No audit trail
@PutMapping("/api/listings/{id}")
public void updateListing(@PathVariable Long id, @RequestBody ListingDTO dto) {
  listingService.update(id, dto);
}

// ✅ PASS: Audit trail recorded
@PutMapping("/api/listings/{id}")
@Audited // Hibernate Envers annotation
public void updateListing(@PathVariable Long id, @RequestBody ListingDTO dto) {
  Listing listing = listingService.update(id, dto);
  auditLogger.log(new AuditEvent(
    action: "LISTING_UPDATED",
    entityId: id,
    changes: listingService.getChanges(listing),
    userId: currentUser.getId(),
    timestamp: System.currentTimeMillis(),
    ipAddress: request.getRemoteAddr(),
    userAgent: request.getHeader("User-Agent")
  ));
}
```

**Checks:**
- [ ] All data modifications logged (CREATE, UPDATE, DELETE)
- [ ] Admin functions logged
- [ ] User actions include timestamp, user ID, IP
- [ ] Changed fields recorded (before/after values)
- [ ] Logs immutable (append-only, no modification)
- [ ] Logs retained for 7+ years (regulatory requirements)
- [ ] Access to audit logs restricted (read-only)

**Verification:**
```bash
# Check for audit logging
grep -rn "AuditEvent\|auditLogger\|@Audited" src/main/java/

# Check retention policy
cat application.yml | grep -i "audit.*retention\|log.*retention"
```

---

## Manual Verification Steps

1. **Test parameterized queries:**
   ```bash
   # Try SQL injection
   curl "http://localhost:3000/api/users?id=1 OR 1=1"
   # Should not return all users
   ```

2. **Verify sensitive data:**
   ```bash
   curl -X GET "http://localhost:3000/api/user/123"
   # Check response; no passwords, cards, SSNs
   ```

3. **Test tenant isolation:**
   ```bash
   # User A logs in, gets their listings
   # Change tenant ID in query/token
   # Verify 403 or original data returned
   ```

4. **Check backups:**
   ```bash
   # Verify backup process
   ls -la /backups/
   # Check encryption
   file /backups/latest.sql.enc
   ```

---

## Failure Criteria (Block Merge)

- [ ] SQL or NoSQL injection vulnerability
- [ ] Sensitive data (passwords, cards, SSN) not encrypted at rest
- [ ] Database connections not using TLS
- [ ] Tenant boundary not enforced
- [ ] Sensitive data logged or cached
- [ ] Database user has excessive privileges
- [ ] No audit trail for sensitive operations
- [ ] Passwords stored plaintext
- [ ] No data retention/deletion policy
- [ ] Backups not encrypted or tested

---

## References

- Rule 4: Security Standards (`.ai/rules/04-security-standards.md`)
- OWASP SQL Injection: https://owasp.org/www-community/attacks/SQL_Injection
- GDPR Article 17: https://gdpr-info.eu/art-17-gdpr/
- CIS Database Benchmarks: https://www.cisecurity.org/cis-benchmarks/
