# Salesforce Fields Update - Change Log

## Summary

Salesforce data (`sfMake`, `sfModel`) has been moved from the `providers` table to the `models` table as canonical reference data. Salesforce is now treated as a CRM reference system, not as an insurance provider.

## What Changed

### 1. Database Schema ✅

#### `models` Table - Added Columns
```sql
ALTER TABLE models
ADD COLUMN sf_make TEXT,
ADD COLUMN sf_model TEXT;

CREATE INDEX idx_models_sf_make ON models(sf_make);
CREATE INDEX idx_models_sf_model ON models(sf_model);
```

**Impact**: Salesforce data is now stored directly with each model (1:1 relationship) instead of through provider mappings (N:M relationship).

#### Views Updated
- ✅ `v_models_complete` - Now includes `sf_make` and `sf_model` columns
- ✅ `v_models_with_providers` - Now includes `sf_make` and `sf_model` columns

### 2. Migration Scripts ✅

#### `create-flexible-schema.mjs`
- Added `sf_make` and `sf_model` columns to models table definition
- Added indexes for the new columns
- Updated both views to include the new columns

#### `migrate-to-flexible-schema.mjs`
- Updated model insertion to include `sf_make` and `sf_model` from source data
- Migrates Salesforce data from `makemodels_items.sf_make` and `makemodels_items.sf_model` to `models.sf_make` and `models.sf_model`
- Comment clarified: "excluding Salesforce - it's not an underwriter"

### 3. Export Script ✅

#### `export-from-flexible-schema.mjs`
- Updated SQL query to select `sf_make` and `sf_model` from models table
- Added `sfMake` and `sfModel` to JSON output (with empty string defaults)
- Output order: `hash`, `labelMake`, `labelModel`, `year`, `sfMake`, `sfModel`, then provider-specific fields

### 4. New Upgrade Script ✅

#### `scripts/upgrade-models-sf-fields.mjs` (NEW)
Purpose: Add Salesforce columns to existing databases that already have the flexible schema.

Steps performed:
1. Add `sf_make` and `sf_model` columns to models table
2. Create indexes
3. Migrate data from `makemodels_items` (if exists)
4. Update views to include the new columns

Usage:
```bash
npm run db:upgrade:models-sf
```

### 5. Package.json ✅

Added new script:
```json
{
  "db:upgrade:models-sf": "node ./scripts/upgrade-models-sf-fields.mjs"
}
```

### 6. Documentation ✅

#### New Files
- ✅ `SALESFORCE_FIELDS.md` - Comprehensive guide on Salesforce field handling
- ✅ `CHANGELOG_SALESFORCE.md` - This file

## JSON Output Format

### Before
```json
{
  "hash": "abc123",
  "labelMake": "Piper",
  "labelModel": "PA-28-181",
  "year": 1980,
  "iatMake": "Piper",
  "iatModel": "PA-28-181 Archer II",
  "rokstoneMake": "Piper",
  "rokstoneModel": "PA-28-181",
  "oraeroMake": "Piper",
  "oraeroModel": "PA28-181",
  "sfMake": "Piper",          // ❌ Missing or from providers
  "sfModel": "PA-28-181"      // ❌ Missing or from providers
}
```

### After ✅
```json
{
  "hash": "abc123",
  "labelMake": "Piper",
  "labelModel": "PA-28-181",
  "year": 1980,
  "sfMake": "Piper",          // ✅ From models.sf_make
  "sfModel": "PA-28-181",     // ✅ From models.sf_model
  "iatMake": "Piper",
  "iatModel": "PA-28-181 Archer II",
  "rokstoneMake": "Piper",
  "rokstoneModel": "PA-28-181",
  "oraeroMake": "Piper",
  "oraeroModel": "PA28-181",
  "providers": [
    {
      "providerId": 1,
      "providerCode": "iat",
      "providerName": "IAT Insurance",
      "providerMake": "Piper",
      "providerModel": "PA-28-181 Archer II",
      "isActive": true
    }
  ]
}
```

## Migration Path

### For New Installations
```bash
# 1. Create schema (includes Salesforce fields)
npm run db:schema:flexible

# 2. Migrate data (includes Salesforce data)
npm run db:migrate:flexible

# 3. Verify
npm run db:view:models-with-providers
```

### For Existing Installations (Already Using Flexible Schema)
```bash
# 1. Add Salesforce columns to existing schema
npm run db:upgrade:models-sf

# 2. Verify
npm run db:view:models-with-providers

# 3. Re-export data
npm run db:export:flexible
```

### For Databases with Salesforce as a Provider
```bash
# 1. Remove Salesforce from providers table
npm run db:remove:salesforce

# 2. Add Salesforce columns to models table
npm run db:upgrade:models-sf

# 3. Verify
npm run db:list:providers  # Should NOT show Salesforce
npm run db:view:models-with-providers  # Should show sf_make, sf_model
```

## Files Modified

| File | Type | Changes |
|------|------|---------|
| `scripts/create-flexible-schema.mjs` | Modified | Added sf_make, sf_model to models table + indexes + views |
| `scripts/migrate-to-flexible-schema.mjs` | Modified | Migrate SF data to models table (not providers) |
| `scripts/export-from-flexible-schema.mjs` | Modified | Export sfMake, sfModel from models table |
| `scripts/upgrade-models-sf-fields.mjs` | **NEW** | Upgrade script for existing databases |
| `package.json` | Modified | Added `db:upgrade:models-sf` script |
| `SALESFORCE_FIELDS.md` | **NEW** | Comprehensive documentation |
| `CHANGELOG_SALESFORCE.md` | **NEW** | This change log |

## Breaking Changes

### None ✅

This update is **backward compatible**:
- Existing JSON format is preserved
- New installations get the correct schema automatically
- Existing installations can upgrade with one command
- Export script works with or without Salesforce data

## Testing Checklist

- [ ] Create fresh schema: `npm run db:schema:flexible`
- [ ] Migrate old data: `npm run db:migrate:flexible`
- [ ] Verify Salesforce fields in models: `npm run db:view:models-with-providers`
- [ ] Export JSON: `npm run db:export:flexible`
- [ ] Check JSON files include `sfMake` and `sfModel` fields
- [ ] Verify Salesforce is NOT in providers: `npm run db:list:providers`
- [ ] Test upgrade script on existing DB: `npm run db:upgrade:models-sf`

## Benefits

✅ **Correct Data Model**: Salesforce as canonical reference, not provider  
✅ **1:1 Relationship**: Each model has one Salesforce reference  
✅ **Better Performance**: Direct column access vs. JOIN through mappings  
✅ **Clearer Intent**: Code explicitly shows SF is different from providers  
✅ **Easier Queries**: Simple `SELECT sf_make, sf_model FROM models`  
✅ **Backward Compatible**: Existing JSON format preserved  

## Architecture Decision

### Why This Way?

**Salesforce is a CRM system**, not an insurance underwriter. The data represents:
- Canonical/authoritative aircraft naming in your system
- Reference data for synchronization
- Master data management

**Insurance providers (IAT, Rokstone, Oraero)** are actual underwriters with:
- Provider-specific aircraft naming conventions
- Different model classifications
- Many-to-many relationships with aircraft models

**Conclusion**: Different data types require different storage strategies.

## Rollback (If Needed)

If you need to rollback:

```sql
-- Remove the columns
ALTER TABLE models
DROP COLUMN IF EXISTS sf_make,
DROP COLUMN IF EXISTS sf_model;

-- Drop the indexes
DROP INDEX IF EXISTS idx_models_sf_make;
DROP INDEX IF EXISTS idx_models_sf_model;

-- Recreate old views without SF fields
-- (See old version of create-flexible-schema.mjs)
```

## Questions?

See `SALESFORCE_FIELDS.md` for detailed documentation including:
- Schema diagrams
- Query examples
- Common use cases
- FAQ

---

**Date**: 2025-01-21  
**Version**: Flexible Schema v2.0 (Salesforce Fields Update)  
**Status**: ✅ Complete

