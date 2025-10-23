# Quick Start: Flexible Provider Schema

## TL;DR

Your current database has **hardcoded columns** for each insurance provider (IAT, Rokstone, Oraero). I've created a **flexible schema** that lets you add unlimited providers without changing the database structure.

## What Changed?

### Before (❌ Inflexible)
```
One table with columns: iat_make, iat_model, rokstone_make, rokstone_model, oraero_make, oraero_model...
```
- Adding a new provider = modifying database schema
- Lots of NULL values
- Hard to maintain

### After (✅ Flexible)
```
4 tables:
- makes (aircraft manufacturers)
- models (aircraft models)  
- providers (insurance companies - add unlimited!)
- model_provider_mappings (links models to providers)
```
- Adding a new provider = one INSERT statement
- No NULL values
- Easy to maintain

## Quick Setup (3 Commands)

### Option A: Import from JSON (Recommended)

```bash
cd wings-insurance-data-builder/structure-editor-react

# 1. Create the new schema
npm run db:schema:flexible

# 2. Import from makes-models.json (preserves exact case)
npm run db:import:json

# 3. Verify it worked
npm run db:list:providers
```

Done! Your data is now in the flexible schema with case preserved.

### Option B: Migrate from Old Schema

```bash
cd wings-insurance-data-builder/structure-editor-react

# 1. Create the new schema
npm run db:schema:flexible

# 2. Migrate your existing data from makemodels_items table
npm run db:migrate:flexible

# 3. Verify it worked
npm run db:list:providers
```

Done! Your data is now in the flexible schema.

### Alternative: Reset Schema (Development Only)

If you want to **start completely fresh** (⚠️ deletes all data):

```bash
# Drop all tables and recreate with new structure
npm run db:schema:reset

# Then migrate data
npm run db:migrate:flexible
```

See `RESET_SCHEMA_GUIDE.md` for details.

## Adding a New Provider (30 seconds)

```bash
# Add the provider
PROVIDER_CODE=newinsurer PROVIDER_NAME="New Insurance Company" npm run db:add:provider

# That's it! The provider is ready to use.
```

Now you can map aircraft models to this new provider via UI or scripts.

## Viewing Data

```bash
# List all providers
npm run db:list:providers

# View models with their provider mappings
npm run db:view:models-with-providers

# View specific make
MAKE_NAME=Piper npm run db:view:models-with-providers

# Show first 50 results
LIMIT=50 npm run db:view:models-with-providers
```

## Exporting Data

The new export script maintains backward compatibility:

```bash
# Export to JSON (same format as before, plus new 'providers' array)
npm run db:export:flexible
```

## Example: What the Data Looks Like Now

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
  "providers": [
    {
      "providerCode": "iat",
      "providerName": "IAT Insurance",
      "providerMake": "Piper",
      "providerModel": "PA-28-181 Archer II",
      "isActive": true
    },
    {
      "providerCode": "rokstone",
      "providerName": "Rokstone",
      "providerMake": "Piper",
      "providerModel": "PA-28-181",
      "isActive": true
    }
  ]
}
```

Old fields still work! Plus you get a clean `providers` array for new code.

## Benefits

✅ Add new providers in **seconds** (not hours)  
✅ No database schema changes  
✅ No deployment needed  
✅ Backward compatible  
✅ More efficient storage  
✅ Easier to query  
✅ Future-proof  

## Available Commands

| Command | What It Does |
|---------|--------------|
| `npm run db:schema:flexible` | Create new database tables |
| `npm run db:migrate:flexible` | Move old data to new structure |
| `npm run db:list:providers` | Show all insurance providers |
| `npm run db:add:provider` | Add a new provider |
| `npm run db:view:models-with-providers` | View models with mappings |
| `npm run db:export:flexible` | Export to JSON files |

## Need More Details?

- **Full Guide**: See `FLEXIBLE_SCHEMA_GUIDE.md` for complete documentation
- **Schema Comparison**: See `SCHEMA_COMPARISON.md` for old vs new comparison
- **Scripts Location**: `scripts/` directory

## Sample Workflow

### Scenario: Adding "Global Aviation Insurance"

```bash
# 1. Add the provider
PROVIDER_CODE=global PROVIDER_NAME="Global Aviation Insurance" npm run db:add:provider

# 2. Map some models to it (example SQL)
# Connect to your database and run:
psql $DATABASE_URL -c "
  INSERT INTO model_provider_mappings (model_id, provider_id, provider_make, provider_model)
  SELECT 
    m.id,
    (SELECT id FROM providers WHERE code = 'global'),
    m.label_make,
    m.label_model
  FROM models m
  JOIN makes mk ON m.make_id = mk.id
  WHERE mk.name IN ('Piper', 'Cessna')
  LIMIT 100;
"

# 3. Export updated data
npm run db:export:flexible

# 4. Deploy - your app now has access to Global Aviation Insurance!
```

Total time: **2 minutes**

## Questions?

Read the full documentation:
- `FLEXIBLE_SCHEMA_GUIDE.md` - Complete guide
- `SCHEMA_COMPARISON.md` - Detailed comparison

Or just try it:
```bash
npm run db:schema:flexible
npm run db:migrate:flexible
npm run db:list:providers
```

