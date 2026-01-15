# MongoDB Scripts

This directory contains scripts for managing the MongoDB database for the AI Services Platform.

📑 **Table of Contents**
- [Scripts Overview](#scripts-overview)
  - [1. createIndexes.js](#1-createindexesjs)
  - [2. seedData.js](#2-seeddatajs)
  - [3. validateCollections.js](#3-validatecollectionsjs)
  - [4. seedPrompts.js](#4-seedpromptsjs)
  - [5. consolidate-databases.js](#5-consolidate-databasesjs)
  - [6. ERD.txt](#6-erdtxt)
- [Quick Setup](#quick-setup)
  - [For New Database](#for-new-database)
  - [For Existing Databases (Consolidation)](#for-existing-databases-consolidation)
- [Environment Variables](#environment-variables)
- [Collections Reference](#collections-reference)
  - [Core Collections (Required)](#core-collections-required)
  - [Optional Collections](#optional-collections)
- [Performance Tips](#performance-tips)
- [Troubleshooting](#troubleshooting)
  - ["Cannot connect to MongoDB"](#cannot-connect-to-mongodb)
  - ["Database not found"](#database-not-found)
  - ["Missing required collections"](#missing-required-collections)
  - ["Duplicate key error"](#duplicate-key-error)
- [Notes](#notes)
- [Related Documentation](#related-documentation)

---

## Scripts Overview

### 1. `createIndexes.js`
Creates all necessary indexes for optimal query performance across all collections.

**Usage:**
```bash
node createIndexes.js
```

**What it does:**
- Creates indexes on frequently queried fields
- Adds unique constraints where needed
- Optimizes compound indexes for date-based queries
- Ensures fast lookups for customer data, calls, chats, and billing

**Key indexes:**
- `assistant_channels`: customerId (unique), voice.phoneNumber (unique)
- `assistant_calls`: (customerId, startTime) compound index
- `assistant_chats`: (customerId, startTime) compound index
- `users`: email (unique)
- `api_keys`: key (unique)

---

### 2. `seedData.js`
Populates the database with test data for voice and chat assistant testing.

**Usage:**
```bash
node seedData.js
```

**What it creates:**
- Test customer: Acme Health (healthcare industry)
- Assistant channels: Voice + Chat enabled
- Products: Voice Assistant & Chat Assistant
- Active subscriptions for both products
- Sample voice call with transcript
- Sample chat session with messages
- Test user account

All test data is prefixed with `test_` for easy identification and cleanup.

---

### 3. `validateCollections.js`
Validates that all required collections exist in the database.

**Usage:**
```bash
node validateCollections.js
```

**What it checks:**
- ✅ All required collections are present
- 📊 Document counts for each collection
- ℹ️ Optional collections status
- ⚠️ Unexpected collections

**Exit codes:**
- `0`: All required collections exist
- `1`: Missing required collections or connection error

---

### 4. `seedPrompts.js`
Seeds the prompts collection with industry-specific default templates.

**Usage:**
```bash
node seedPrompts.js
```

**What it creates:**
- Default prompt templates for realtor industry
- Default prompt templates for healthcare industry
- Voice and chat configurations for each
- Indexes on industry, isDefault, and customerId

---

### 5. `consolidate-databases.js`
Consolidates multiple MongoDB databases into a single `ai_platform` database.

**Usage:**
```bash
node consolidate-databases.js
```

**What it does:**
- Merges data from `ai-services` and `ai-services-platform` into `ai_platform`
- Preserves all documents and indexes
- Handles duplicate documents intelligently
- Provides detailed migration report
- Safe to run multiple times (idempotent)

**Migration Process:**
1. Lists all databases and their sizes
2. Shows current collections in target database
3. For each source database:
   - Copies all documents (inserts new, updates changed, skips duplicates)
   - Migrates all indexes
4. Validates final state
5. Shows cleanup commands for old databases

**After running:**
- Verify data in `ai_platform`
- Test your application
- Manually drop old databases when satisfied

---

### 6. `ERD.txt`
Entity Relationship Diagram showing the complete database schema.

**Contains:**
- ASCII art diagram of all collections
- Relationships between entities
- Index information
- Field descriptions

---

## Quick Setup

### For New Database

To set up a new database from scratch:

```bash
# 1. Create indexes
node createIndexes.js

# 2. Validate setup
node validateCollections.js

# 3. Seed prompts
node seedPrompts.js

# 4. Add test data (optional)
node seedData.js

# 5. Validate again
node validateCollections.js
```

### For Existing Databases (Consolidation)

If you have existing `ai-services` or `ai-services-platform` databases:

```bash
# 1. Run consolidation script
node consolidate-databases.js

# 2. Review the migration report

# 3. Test your application with ai_platform

# 4. Once verified, drop old databases:
mongosh mongodb://localhost:27017/ai-services --eval "db.dropDatabase()"
mongosh mongodb://localhost:27017/ai-services-platform --eval "db.dropDatabase()"
```

---

## Environment Variables

All scripts support these environment variables:

```bash
MONGODB_URI=mongodb://localhost:27017    # MongoDB connection string (no database name)
DB_NAME=ai_platform                      # Database name (default: ai_platform)
```

- `prompts` - Industry-specific prompt templates
**Example with custom settings:**
```bash
MONGODB_URI=mongodb://user:pass@localhost:27017/ DB_NAME=production node createIndexes.js
```

**Important:** All scripts now use `ai_platform` as the default database name. The old databases (`ai-services` and `ai-services-platform`) should be consolidated using `consolidate-databases.js`.

---

## Collections Reference

### Core Collections (Required)
- `customers` - Customer accounts and billing info
- `assistant_channels` - Voice/chat channel configurations
- `assistant_calls` - Voice call logs and transcripts
- `assistant_chats` - Chat session logs and messages
- `subscriptions` - Product subscriptions
- `products` - Available AI products/services
- `invoices` - Billing invoices
- `usage_events` - Usage tracking events
- `users` - User accounts
- `api_keys` - API authentication keys

### Optional Collections
- `payment_methods` - Stored payment methods
- `transactions` - Payment transactions
- `tenants` - Multi-tenant support

---

## Performance Tips

1. **Always create indexes before loading large datasets**
   ```bash
   node createIndexes.js
   ```

2. **Run validation after schema changes**
   ```bash
   node validateCollections.js
   ```

3. **Use compound indexes for date range queries**
   - `(customerId, startTime)` for call logs
   - `(customerId, createdAt)` for invoices

4. **Monitor index usage**
   ```javascript
   db.collection.aggregate([{ $indexStats: {} }])
   ```

---

## Troubleshooting

### "Cannot connect to MongoDB"
- Verify MongoDB_URI` environment variable
- Ensure firewall allows port 27017

### "Database not found"
- Run `consolidate-databases.js` if migrating from old databases
- Check `DB_NAME` environment variable (should be `ai_platform`)iable
- Ensure firewall allows port 27017

### "Missing required collections"
1. Run `createIndexes.js` first
2. Collections are created on first insert
3. Use `seedData.js` to populate collections

### "Duplicate key error"
- Unique index violation
- Check if data already exists
- Clear test data: `db.getCollectionNames().forEach(c => db[c].deleteMany({_id: /^test_/}))`

---

## Notes

- All scripts use async/await for better error handling
- Scripts can be imported as modules: `require('./createIndexes')`
- Test data is prefixed with `test_` for easy cleanup
- Indexes are created with `sparse: true` for optional fields

---

## Related Documentation

- [Main README](../../../README.md)
- [Project Overview](../../../docs/PROJECT_OVERVIEW.md)
- [ERD Diagram](./ERD.txt)
