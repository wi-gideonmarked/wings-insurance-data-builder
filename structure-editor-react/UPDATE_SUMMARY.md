# ✅ Salesforce Fields Update - Complete

## What Was Changed

Salesforce data (`sfMake`, `sfModel`) is now stored **in the `models` table** as canonical reference data, **NOT** as an insurance provider.

## Why?

- **Salesforce = CRM system** (canonical reference data)
- **IAT/Rokstone/Oraero = Insurance providers** (underwriters with varying naming)
- Different purposes require different storage strategies

## Files Updated

### Core Scripts (4 files modified + 1 new)
1. ✅ `scripts/create-flexible-schema.mjs` - Added sf_make, sf_model columns
2. ✅ `scripts/migrate-to-flexible-schema.mjs` - Migrates SF data to models table
3. ✅ `scripts/export-from-flexible-schema.mjs` - Exports sfMake, sfModel from models
4. ✅ `scripts/upgrade-models-sf-fields.mjs` - **NEW** upgrade script
5. ✅ `package.json` - Added upgrade script

### Documentation (3 new files)
6. ✅ `SALESFORCE_FIELDS.md` - Comprehensive guide
7. ✅ `CHANGELOG_SALESFORCE.md` - Detailed change log
8. ✅ `UPDATE_SUMMARY.md` - This file

## How to Use

### For New Installations (from JSON)
```bash
npm run db:schema:flexible    # Create schema (SF fields included)
npm run db:import:json        # Import from makes-models.json (preserves case)
npm run db:export:flexible    # Export JSON (includes sfMake, sfModel)
```

### For New Installations (from Old Schema)
```bash
npm run db:schema:flexible    # Create schema (SF fields included)
npm run db:migrate:flexible   # Migrate data from makemodels_items
npm run db:export:flexible    # Export JSON (includes sfMake, sfModel)
```

### For Existing Installations
```bash
npm run db:upgrade:models-sf  # Add SF columns to existing database
npm run db:export:flexible    # Re-export with SF fields
```

### If Salesforce is in Providers Table
```bash
npm run db:remove:salesforce   # Remove SF from providers
npm run db:upgrade:models-sf   # Add SF to models table
```

### Reset Schema (Development/Testing)
```bash
npm run db:schema:reset       # ⚠️ Drops ALL tables and recreates with new structure
npm run db:migrate:flexible   # Then migrate data
```
**⚠️ Warning**: This deletes all data! See `RESET_SCHEMA_GUIDE.md` for details.

## Verification

```bash
# Check that SF fields exist in models
npm run db:view:models-with-providers

# Verify SF is NOT a provider
npm run db:list:providers

# Export and check JSON files
npm run db:export:flexible
cat public/separated/piper.json | head -20
```

## Expected JSON Output

```json
{
  "hash": "piper-pa28-181",
  "labelMake": "Piper",
  "labelModel": "PA-28-181",
  "year": 1980,
  "sfMake": "Piper",           // ✅ From models.sf_make
  "sfModel": "PA-28-181",      // ✅ From models.sf_model
  "iatMake": "Piper",          // From providers
  "iatModel": "PA-28-181 Archer II",
  "rokstoneMake": "Piper",
  "rokstoneModel": "PA-28-181",
  "oraeroMake": "Piper",
  "oraeroModel": "PA28-181",
  "providers": [...]
}
```

## Database Schema Change

```sql
-- Added to models table:
ALTER TABLE models
ADD COLUMN sf_make TEXT,
ADD COLUMN sf_model TEXT;

-- Indexes:
CREATE INDEX idx_models_sf_make ON models(sf_make);
CREATE INDEX idx_models_sf_model ON models(sf_model);
```

## Benefits

✅ Correct data model (SF = canonical reference, not provider)  
✅ Better performance (direct column vs JOIN)  
✅ Clearer code intent  
✅ Easier queries  
✅ Backward compatible  

## Need More Info?

- **Quick Guide**: See `SALESFORCE_FIELDS.md`
- **Detailed Changes**: See `CHANGELOG_SALESFORCE.md`
- **Schema Docs**: See `SCHEMA_VISUAL.md`, `FLEXIBLE_SCHEMA_GUIDE.md`

## Quick Test

```bash
# 1. Add SF fields (if not already done)
npm run db:upgrade:models-sf

# 2. Export data
npm run db:export:flexible

# 3. Check first model in piper.json
cat public/separated/piper.json | grep -A 10 '"hash"' | head -15
```

You should see `sfMake` and `sfModel` fields in the output.

---

**Status**: ✅ Complete  
**Backward Compatible**: ✅ Yes  
**Breaking Changes**: ❌ None

