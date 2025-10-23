# Flexible Schema Design for Insurance Providers

## Overview

This document describes the new flexible database schema that allows unlimited insurance providers to be added dynamically without modifying the database structure.

## Problem with Old Schema

The previous schema had **hardcoded columns** for each insurance provider:

```sql
-- ❌ OLD SCHEMA (inflexible)
CREATE TABLE makemodels_items (
  hash text PRIMARY KEY,
  label_make text,
  label_model text,
  iat_make text,           -- Hardcoded for IAT
  iat_model text,
  rokstone_make text,      -- Hardcoded for Rokstone
  rokstone_model text,
  oraero_make text,        -- Hardcoded for Oraero
  oraero_model text,
  sf_make text,            -- Hardcoded for Salesforce
  sf_model text,
  year integer
);
```

**Problems:**
- ❌ Adding a new provider requires schema migration
- ❌ Empty columns for models not mapped to certain providers
- ❌ Not scalable for many providers
- ❌ Difficult to query "all providers for a model"

## New Schema Design

### Entity Relationship Diagram

```
┌─────────────┐
│   makes     │
│─────────────│
│ id (PK)     │
│ name        │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────┐
│   models    │
│─────────────│
│ id (PK)     │
│ make_id(FK) │
│ hash        │
│ label_make  │
│ label_model │
│ year        │
└──────┬──────┘
       │
       │ N:M
       │
┌──────▼──────────────────┐     ┌──────────────┐
│ model_provider_mappings │────▶│  providers   │
│─────────────────────────│     │──────────────│
│ id (PK)                 │  N:1│ id (PK)      │
│ model_id (FK)           │     │ code         │
│ provider_id (FK)        │     │ name         │
│ provider_make           │     │ is_active    │
│ provider_model          │     │ metadata     │
│ is_active               │     └──────────────┘
└─────────────────────────┘
```

### Table Descriptions

#### 1. `makes` - Aircraft Manufacturers
Stores unique aircraft make names (e.g., Piper, Cessna, Beechcraft)

```sql
CREATE TABLE makes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2. `models` - Aircraft Models
Stores aircraft models with display labels

```sql
CREATE TABLE models (
  id BIGSERIAL PRIMARY KEY,
  make_id BIGINT NOT NULL REFERENCES makes(id) ON DELETE CASCADE,
  hash TEXT NOT NULL UNIQUE,
  label_make TEXT NOT NULL,
  label_model TEXT NOT NULL,
  year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 3. `providers` - Insurance Providers
Dynamically stores all insurance providers

```sql
CREATE TABLE providers (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,        -- e.g., 'iat', 'rokstone', 'newprovider'
  name TEXT NOT NULL,               -- e.g., 'IAT Insurance'
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,                   -- Additional config (optional)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 4. `model_provider_mappings` - Model-to-Provider Mappings
Junction table that maps models to providers with provider-specific names

```sql
CREATE TABLE model_provider_mappings (
  id BIGSERIAL PRIMARY KEY,
  model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  provider_make TEXT NOT NULL,      -- Provider's name for the make
  provider_model TEXT NOT NULL,     -- Provider's name for the model
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(model_id, provider_id)    -- One mapping per model-provider pair
);
```

### Views for Easy Querying

#### `v_models_with_providers`
Returns models with all provider mappings in JSON format

```sql
SELECT * FROM v_models_with_providers WHERE make_name = 'Piper' LIMIT 5;
```

Returns:
```json
{
  "model_id": 123,
  "hash": "abc123",
  "make_name": "Piper",
  "label_make": "Piper",
  "label_model": "PA-28-181",
  "year": 1980,
  "provider_mappings": [
    {
      "providerId": 1,
      "providerCode": "iat",
      "providerName": "IAT Insurance",
      "providerMake": "Piper",
      "providerModel": "PA-28-181 Archer II",
      "isActive": true
    },
    {
      "providerId": 2,
      "providerCode": "rokstone",
      "providerName": "Rokstone",
      "providerMake": "Piper",
      "providerModel": "PA-28-181",
      "isActive": true
    }
  ]
}
```

## Migration Guide

### Step 1: Create New Schema

```bash
npm run db:schema:flexible
```

This creates the four new tables (`makes`, `models`, `providers`, `model_provider_mappings`) and views.

### Step 2: Migrate Existing Data

```bash
npm run db:migrate:flexible
```

This script:
- ✓ Creates provider records (IAT, Rokstone, Oraero, Salesforce)
- ✓ Migrates data from `makemodels_items` to normalized tables
- ✓ Creates mappings for all existing provider data
- ✓ Preserves all existing data

### Step 3: Verify Migration

```bash
# View all providers
npm run db:list:providers

# View models with provider mappings
npm run db:view:models-with-providers

# View specific make
MAKE_NAME=Piper npm run db:view:models-with-providers
```

### Step 4: Update Export Scripts

Switch to the new export script:

```bash
npm run db:export:flexible
```

Or update `package.json` to use it in build:

```json
{
  "scripts": {
    "prebuild": "node ./scripts/export-from-flexible-schema.mjs && npm run sync:public"
  }
}
```

## Adding New Providers

### Add a New Provider

```bash
PROVIDER_CODE=newinsurer PROVIDER_NAME="New Insurance Co" npm run db:add:provider
```

**That's it!** No schema changes needed. The new provider is immediately available.

### Map Models to New Provider

You can:
1. Use the UI to map models
2. Import mappings via SQL:

```sql
-- Example: Bulk map all Piper models to new provider
INSERT INTO model_provider_mappings (model_id, provider_id, provider_make, provider_model)
SELECT 
  m.id,
  (SELECT id FROM providers WHERE code = 'newinsurer'),
  m.label_make,
  m.label_model
FROM models m
JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Piper';
```

3. Create a custom import script for bulk operations

## Query Examples

### Get all models for a provider

```sql
SELECT 
  mk.name as make,
  m.label_model as model,
  mpm.provider_make,
  mpm.provider_model
FROM models m
JOIN makes mk ON m.make_id = mk.id
JOIN model_provider_mappings mpm ON m.id = mpm.model_id
JOIN providers p ON mpm.provider_id = p.id
WHERE p.code = 'rokstone'
ORDER BY mk.name, m.label_model;
```

### Get all providers for a specific model

```sql
SELECT 
  p.name as provider,
  mpm.provider_make,
  mpm.provider_model
FROM model_provider_mappings mpm
JOIN providers p ON mpm.provider_id = p.id
WHERE mpm.model_id = 123
  AND mpm.is_active = true;
```

### Find models without mapping to a provider

```sql
SELECT 
  mk.name as make,
  m.label_model as model
FROM models m
JOIN makes mk ON m.make_id = mk.id
WHERE NOT EXISTS (
  SELECT 1 FROM model_provider_mappings mpm
  JOIN providers p ON mpm.provider_id = p.id
  WHERE mpm.model_id = m.id
    AND p.code = 'rokstone'
);
```

### Get provider coverage statistics

```sql
SELECT 
  p.name as provider,
  COUNT(DISTINCT m.make_id) as makes_count,
  COUNT(m.id) as models_count,
  ROUND(100.0 * COUNT(m.id) / (SELECT COUNT(*) FROM models), 2) as coverage_pct
FROM providers p
LEFT JOIN model_provider_mappings mpm ON p.id = mpm.provider_id
LEFT JOIN models m ON mpm.model_id = m.id
GROUP BY p.id, p.name
ORDER BY models_count DESC;
```

## Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run db:schema:flexible` | Create flexible schema tables |
| `npm run db:migrate:flexible` | Migrate old data to new schema |
| `npm run db:list:providers` | List all providers with stats |
| `npm run db:add:provider` | Add a new provider |
| `npm run db:view:models-with-providers` | View models with provider mappings |
| `npm run db:export:flexible` | Export to JSON using new schema |

## Benefits

✅ **Scalable**: Add unlimited providers without schema changes  
✅ **Flexible**: Each provider can have different naming conventions  
✅ **Queryable**: Easy to find providers for models and vice versa  
✅ **Clean**: No null columns, normalized structure  
✅ **Maintainable**: Clear separation of concerns  
✅ **Future-proof**: Ready for additional provider metadata  
✅ **Backward Compatible**: Export script maintains old JSON format  

## Backward Compatibility

The export script (`export-from-flexible-schema.mjs`) generates JSON files that are **backward compatible** with the old format:

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
  "providers": [
    {
      "providerCode": "iat",
      "providerName": "IAT Insurance",
      "providerMake": "Piper",
      "providerModel": "PA-28-181 Archer II"
    }
  ]
}
```

This ensures existing code continues to work while new code can use the `providers` array.

## Next Steps

1. ✅ Create schema: `npm run db:schema:flexible`
2. ✅ Migrate data: `npm run db:migrate:flexible`
3. ✅ Verify migration: `npm run db:list:providers`
4. ✅ Test queries: `npm run db:view:models-with-providers`
5. 🔄 Update frontend to use new structure
6. 🔄 Add UI for managing provider mappings
7. 🔄 Switch to flexible export script
8. ⏳ Drop old `makemodels_items` table (after thorough testing)

