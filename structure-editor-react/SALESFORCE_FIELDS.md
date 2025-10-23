# Salesforce Fields in Models Table

## Overview

Salesforce data (`sfMake` and `sfModel`) is stored **directly in the `models` table** as canonical reference data. Salesforce is **NOT** treated as an insurance provider.

## Why This Matters

### Salesforce vs Insurance Providers

| Aspect | Salesforce | Insurance Providers (IAT, Rokstone, Oraero) |
|--------|-----------|---------------------------------------------|
| **Purpose** | CRM system / canonical reference | Underwriters / insurance companies |
| **Data Location** | `models` table (columns: `sf_make`, `sf_model`) | `model_provider_mappings` table |
| **Relationship** | 1:1 with model (each model has one SF reference) | N:M with models (many-to-many) |
| **When Missing** | Empty string in JSON export | No mapping in `model_provider_mappings` |

## Database Schema

### `models` Table (Updated)

```sql
CREATE TABLE models (
  id BIGSERIAL PRIMARY KEY,
  make_id BIGINT NOT NULL REFERENCES makes(id),
  hash TEXT NOT NULL UNIQUE,
  label_make TEXT NOT NULL,
  label_model TEXT NOT NULL,
  year INTEGER,
  sf_make TEXT,              -- ✅ Salesforce make (canonical reference)
  sf_model TEXT,             -- ✅ Salesforce model (canonical reference)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_models_sf_make ON models(sf_make);
CREATE INDEX idx_models_sf_model ON models(sf_model);
```

### Insurance Providers (Separate)

```sql
-- Only insurance companies, NOT Salesforce
CREATE TABLE providers (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,  -- 'iat', 'rokstone', 'oraero' (NOT 'sf')
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ...
);

-- Maps models to insurance providers
CREATE TABLE model_provider_mappings (
  id BIGSERIAL PRIMARY KEY,
  model_id BIGINT NOT NULL REFERENCES models(id),
  provider_id BIGINT NOT NULL REFERENCES providers(id),
  provider_make TEXT NOT NULL,
  provider_model TEXT NOT NULL,
  ...
);
```

## JSON Export Format

### Example Output

```json
{
  "hash": "piper-pa28-181",
  "labelMake": "Piper",
  "labelModel": "PA-28-181",
  "year": 1980,
  "sfMake": "Piper",           // ✅ From models.sf_make
  "sfModel": "PA-28-181",      // ✅ From models.sf_model
  "iatMake": "Piper",          // From model_provider_mappings
  "iatModel": "PA-28-181 Archer II",
  "rokstoneMake": "Piper",     // From model_provider_mappings
  "rokstoneModel": "PA-28-181",
  "oraeroMake": "Piper",       // From model_provider_mappings
  "oraeroModel": "PA28-181",
  "providers": [               // From model_provider_mappings
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

**Note**: `sfMake` and `sfModel` come from the `models` table, while `iatMake`, `iatModel`, etc. come from the `model_provider_mappings` table.

## Migration & Upgrade

### For New Installations

If you're creating the schema from scratch, Salesforce fields are already included:

```bash
npm run db:schema:flexible
npm run db:migrate:flexible
```

### For Existing Installations

If you already have the flexible schema without Salesforce fields, run the upgrade:

```bash
npm run db:upgrade:models-sf
```

This script will:
1. ✅ Add `sf_make` and `sf_model` columns to `models` table
2. ✅ Create indexes for performance
3. ✅ Migrate data from `makemodels_items` (if it exists)
4. ✅ Update views to include Salesforce fields

## Querying Salesforce Data

### Get all models with Salesforce data

```sql
SELECT 
  mk.name AS make,
  m.label_model AS model,
  m.sf_make,
  m.sf_model
FROM models m
JOIN makes mk ON m.make_id = mk.id
WHERE m.sf_make IS NOT NULL 
  OR m.sf_model IS NOT NULL;
```

### Find models missing Salesforce data

```sql
SELECT 
  mk.name AS make,
  m.label_model AS model
FROM models m
JOIN makes mk ON m.make_id = mk.id
WHERE m.sf_make IS NULL 
  AND m.sf_model IS NULL;
```

### Compare Salesforce vs Provider naming

```sql
SELECT 
  m.label_make,
  m.label_model,
  m.sf_make,
  m.sf_model,
  p.name AS provider,
  mpm.provider_make,
  mpm.provider_model
FROM models m
JOIN makes mk ON m.make_id = mk.id
LEFT JOIN model_provider_mappings mpm ON m.id = mpm.model_id
LEFT JOIN providers p ON mpm.provider_id = p.id
WHERE m.sf_make IS NOT NULL
ORDER BY m.label_make, m.label_model, p.name;
```

## Updating Salesforce Data

### Via SQL

```sql
-- Update a single model
UPDATE models
SET 
  sf_make = 'Piper',
  sf_model = 'PA-28-181',
  updated_at = now()
WHERE hash = 'piper-pa28-181';

-- Bulk update from external data
UPDATE models m
SET 
  sf_make = source.salesforce_make,
  sf_model = source.salesforce_model,
  updated_at = now()
FROM external_salesforce_data source
WHERE m.hash = source.hash;
```

### Via Export/Import

1. Export current data: `npm run db:export:flexible`
2. Edit JSON files (update `sfMake` and `sfModel` fields)
3. Re-import using appropriate script

## Common Questions

### Q: Why not make Salesforce a provider like IAT/Rokstone?

**A:** Salesforce is a CRM system, not an insurance underwriter. The data represents canonical/reference naming in your system, not provider-specific variations. Treating it as model-level data (1:1 relationship) is more accurate than treating it as a provider (N:M relationship).

### Q: What if a model doesn't have Salesforce data?

**A:** The fields will be `NULL` in the database and export as empty strings (`""`) in JSON. This is perfectly normal and doesn't affect functionality.

### Q: Can I add more reference systems like Salesforce?

**A:** Yes! Simply add columns to the `models` table:

```sql
ALTER TABLE models
ADD COLUMN another_system_make TEXT,
ADD COLUMN another_system_model TEXT;
```

Then update export scripts to include these fields.

### Q: Should I remove Salesforce from the providers table?

**A:** Yes, if it's there. Run:

```bash
npm run db:remove:salesforce
```

This script removes Salesforce from the `providers` table and cleans up any mappings.

## Summary

✅ **Salesforce data lives in `models` table** (sf_make, sf_model columns)  
✅ **Insurance providers live in `providers` table** (IAT, Rokstone, Oraero)  
✅ **Exports include both** - sfMake/sfModel from models, provider fields from mappings  
✅ **1:1 relationship** - Each model has at most one Salesforce reference  
✅ **Canonical reference** - Use for authoritative aircraft naming  

## Related Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:schema:flexible` | Create schema with Salesforce fields |
| `npm run db:migrate:flexible` | Migrate old data (includes SF fields) |
| `npm run db:upgrade:models-sf` | Add SF fields to existing schema |
| `npm run db:remove:salesforce` | Remove SF from providers table |
| `npm run db:export:flexible` | Export with SF fields included |
| `npm run db:view:models-with-providers` | View models with SF + providers |

## Files Modified

- ✅ `scripts/create-flexible-schema.mjs` - Schema includes sf_make, sf_model
- ✅ `scripts/migrate-to-flexible-schema.mjs` - Migrates SF data to models table
- ✅ `scripts/export-from-flexible-schema.mjs` - Exports sfMake, sfModel
- ✅ `scripts/upgrade-models-sf-fields.mjs` - **NEW** - Adds SF fields to existing schema
- ✅ `package.json` - Added `db:upgrade:models-sf` script

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         models Table                            │
├─────────────────────────────────────────────────────────────────┤
│  • label_make, label_model          (Display names)            │
│  • sf_make, sf_model               (Salesforce reference) ✅   │
│  • year                            (Model year)                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Links to providers via junction table
                         │
                         ▼
┌────────────────────────────────────┐     ┌─────────────────────┐
│  model_provider_mappings           │────▶│     providers       │
├────────────────────────────────────┤     ├─────────────────────┤
│  • provider_make                   │     │  • code (iat)       │
│  • provider_model                  │     │  • code (rokstone)  │
│  (Insurance-specific names)        │     │  • code (oraero)    │
└────────────────────────────────────┘     └─────────────────────┘
                                             (NOT 'sf' ❌)
```

---

**Last Updated**: Based on flexible schema with Salesforce fields separated from providers

