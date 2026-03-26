# Database Migration: Real Estate Focus

## Overview

This migration transforms the platform from horizontal (multi-industry) to vertical (real estate only).

## What This Does

### ✅ Keeps
- All existing real estate-focused products
- Real estate-related user data and subscriptions

### ➕ Adds
7 new real estate products from strategy document:
1. **ListingLift** - AI virtual staging and listing content production
2. **PropBrief** - Hyperlocal market intelligence reports  
3. **ComplianceGuard** - Fair Housing compliance monitoring
4. **DealDesk** - CRE document intelligence
5. **FieldVoice** - AI voice receptionist for real estate
6. **TenantLoop** - Property manager communication layer
7. **DealFlow CRE** - CRE underwriting and deal marketing

### ❌ Removes
- Healthcare products
- Customer Service products
- Restaurant/Hospitality products
- Any other non-real-estate products
- Orphaned product relations (subscriptions, orders, etc.)

## Running the Migration

### Prerequisites

```bash
# Ensure environment variables are set
# MONGODB_URI and DB_NAME in .env file
```

### Backup First! (Recommended)

```bash
# Backup your database before running
mongodump --uri="mongodb://localhost:27017/ai_platform" --out=./backup-before-real-estate-migration
```

### Run Migration

```bash
cd product-management/backend-node/scripts/mongo
node migrate-to-real-estate-only.js
```

### Expected Output

```
Connected to MongoDB

Found 5 existing products

Identified 1 existing real estate products to keep:
  - Real Estate Voice & Chat Assistant

Identified 4 non-real-estate products to remove:
  - Healthcare Voice & Chat Assistant (Virtual Assistant)
  - Customer Service Voice & Chat Assistant (Virtual Assistant)
  - Restaurant Reservation Voice & Chat Assistant (Virtual Assistant)
  ...

✓ Removed 4 non-real-estate products
  ✓ Cleaned up 12 orphaned records from subscriptions
  ✓ Cleaned up 8 orphaned records from orders

7 new real estate products to add:
  - ListingLift
  - PropBrief
  - ComplianceGuard
  - DealDesk
  - FieldVoice
  - TenantLoop
  - DealFlow CRE

✓ Added 7 new real estate products

======================================================================
Migration Complete!
======================================================================
Total products in database: 8
  - Kept: 1 existing real estate products
  - Added: 7 new real estate products
  - Removed: 4 non-real-estate products

Platform is now focused exclusively on real estate! 🏠
```

## Verification

After migration, verify the products:

```bash
# Connect to MongoDB and check products
mongo ai_platform
db.products.find({}, { name: 1, category: 1, subCategory: 1 }).pretty()
```

Expected products:
- Real Estate Voice & Chat Assistant (existing)
- ListingLift
- PropBrief
- ComplianceGuard
- DealDesk
- FieldVoice
- TenantLoop
- DealFlow CRE

## Rollback

If you need to rollback:

```bash
# Restore from backup
mongorestore --uri="mongodb://localhost:27017/ai_platform" --drop ./backup-before-real-estate-migration/ai_platform
```

## Product Details

### Build Order (from strategy)

Products should be built/launched in this order:

1. **ListingLift** (low complexity) - Fastest path to revenue
2. **ComplianceGuard** (low-medium) - Fear-driven, high conversion
3. **PropBrief** (medium) - Builds data pipeline infrastructure
4. **FieldVoice** (medium-high) - New voice domain
5. **TenantLoop** (medium-high) - Reuses voice infrastructure
6. **DealDesk** (high) - High accuracy requirements
7. **DealFlow CRE** (high) - Most complex, build last

### Pricing Models

- **ListingLift**: $49/listing (pay-as-you-go) or $199/month (unlimited)
- **PropBrief**: $79/month (agent) or $299/month (brokerage)
- **ComplianceGuard**: $79/month (agent) or $249/month (brokerage)
- **DealDesk**: $79/month (50 docs) or $149/month (unlimited)
- **FieldVoice**: $149/month (200 calls) or $249/month (unlimited)
- **TenantLoop**: $149/month (50 units) or $249/month (150 units)
- **DealFlow CRE**: $299/month (professional)

### Technology Stack

Common technologies across products:
- **LLM**: Claude API (Sonnet-4 for production, Haiku-4 for simple tasks)
- **Voice**: Vapi.ai + Twilio
- **Document Processing**: Docling + PyMuPDF
- **RAG**: LlamaIndex + pgvector (Supabase)
- **Image Generation**: Flux.1 via Replicate API
- **Vision**: PropVision (DINOv2) for photo classification
- **Backend**: FastAPI (Python) + Node.js/Express
- **Frontend**: React + TypeScript
- **Database**: MongoDB + Supabase (Postgres)

## Impact on Existing Data

### User Data
- Users with real estate product subscriptions: **Unchanged**
- Users with non-real-estate subscriptions: **Subscriptions removed, user accounts preserved**

### Frontend/Backend Updates Needed

After running this migration, update:

1. **Frontend product pages** - Remove non-real-estate product references
2. **Navigation menus** - Update to show only real estate products
3. **Marketing copy** - Update to "Real Estate AI Platform"
4. **Pricing pages** - Update with new products and pricing
5. **API routes** - May need to handle removed product references gracefully

## Post-Migration Tasks

- [ ] Update homepage copy to emphasize real estate focus
- [ ] Update product catalog UI to show 8 real estate products
- [ ] Create product detail pages for 7 new products
- [ ] Update pricing page with new tiers
- [ ] Test subscription flows for new products
- [ ] Update documentation and API docs
- [ ] Notify existing users of platform focus change
- [ ] Update SEO/metadata for real estate keywords

## Questions?

See the full strategy document:
`C:\Users\Owner\Documents\realestate-plan\ai-smb-realestate-strategy-v1.0.md`

Section 5: Product Catalog — The 7 Modules
Section 6: Recommended Build Order
Section 7: Technology Stack Reference
