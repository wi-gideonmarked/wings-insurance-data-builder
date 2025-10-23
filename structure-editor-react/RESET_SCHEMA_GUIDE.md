# Schema Reset Guide

## Overview

The `reset-schema` script **drops all existing tables** and recreates them with the correct structure, including Salesforce fields (`sf_make`, `sf_model`) in the `models` table.

## ⚠️ Warning

**This script will DELETE ALL DATA in the following tables:**
- `makes`
- `models`
- `providers`
- `model_provider_mappings`

**This action CANNOT be undone!**

## When to Use This

### ✅ Good Use Cases
- **Development/Testing**: Clean slate for testing
- **Schema Migration**: Switching from old to new schema
- **Corrupted Data**: Starting fresh after data issues
- **Initial Setup**: First-time database initialization

### ❌ Don't Use For
- **Production Databases**: Never run this on production!
- **Live Data**: You'll lose all aircraft/provider data
- **Schema Updates**: Use upgrade scripts instead (`db:upgrade:*`)

## Usage

### Interactive Mode (Safe - Asks for Confirmation)

```bash
npm run db:schema:reset
```

You'll see:
```
⚠️  WARNING: This will DELETE the following tables and ALL their data:
   - makes
   - model_provider_mappings
   - models
   - providers

⚠️  This action CANNOT be undone!

Are you sure you want to continue? (yes/no):
```

Type `yes` or `y` to proceed, anything else to cancel.

### Force Mode (Dangerous - No Confirmation)

```bash
FORCE=true npm run db:schema:reset
```

⚠️ **Use with extreme caution!** Skips confirmation prompt.

## What It Does

### Step 1: Drop Tables
Drops existing tables in correct order (respects foreign keys):
1. Views: `v_models_with_providers`, `v_models_complete`
2. Tables: `model_provider_mappings`, `models`, `providers`, `makes`

### Step 2: Create Tables
Creates new tables with correct structure:

```sql
-- Aircraft manufacturers
CREATE TABLE makes (
  id, slug, name, label, timestamps
);

-- Aircraft models with Salesforce fields
CREATE TABLE models (
  id, make_id, hash,
  label_make, label_model, year,
  sf_make, sf_model,          -- ✅ Salesforce canonical reference
  timestamps
);

-- Insurance providers (NOT Salesforce)
CREATE TABLE providers (
  id, code, name, is_active, metadata, timestamps
);

-- Model-to-provider mappings
CREATE TABLE model_provider_mappings (
  id, model_id, provider_id,
  provider_make, provider_model,
  is_active, notes, timestamps
);
```

### Step 3: Create Views
- `v_models_complete` - Denormalized view with all fields
- `v_models_with_providers` - JSON aggregated view

## Complete Workflow

### Scenario 1: Fresh Start from Old Data

```bash
# 1. Reset schema (drops old tables, creates new ones)
npm run db:schema:reset

# 2. Migrate data from makemodels_items
npm run db:migrate:flexible

# 3. Verify
npm run db:list:providers

# 4. Export
npm run db:export:flexible
```

### Scenario 2: Development Testing

```bash
# Reset and start clean
npm run db:schema:reset

# Manually add test data or import test datasets
# ...
```

### Scenario 3: Fix Corrupted Schema

```bash
# Backup data first (if possible)
npm run db:export:flexible  # Export current data to JSON

# Reset schema
npm run db:schema:reset

# Re-import data
npm run db:migrate:flexible
# or import from JSON backup
```

## After Reset

The database will be **empty** but with the correct structure. You need to:

### Option A: Migrate from Old Schema
If you have `makemodels_items` table:
```bash
npm run db:migrate:flexible
```

### Option B: Import from JSON
If you have JSON backups in `separated/`:
```bash
npm run db:import-separated
```

### Option C: Manual Data Entry
Use the UI or SQL to add data:
```sql
-- Add a make
INSERT INTO makes (slug, name) VALUES ('piper', 'Piper');

-- Add a model
INSERT INTO models (make_id, hash, label_make, label_model, year, sf_make, sf_model)
VALUES (1, 'piper-pa28-181', 'Piper', 'PA-28-181', 1980, 'Piper', 'PA-28-181');

-- Add a provider
INSERT INTO providers (code, name) VALUES ('iat', 'IAT Insurance');

-- Add a mapping
INSERT INTO model_provider_mappings (model_id, provider_id, provider_make, provider_model)
VALUES (1, 1, 'Piper', 'PA-28-181 Archer II');
```

## Verification

After resetting and migrating:

```bash
# Check tables exist
npm run db:list:tables

# Check providers (should be 3: iat, rokstone, oraero)
npm run db:list:providers

# Check models
npm run db:view:models-with-providers

# Verify Salesforce fields
psql $DATABASE_URL -c "SELECT hash, sf_make, sf_model FROM models LIMIT 5;"
```

## Safety Checklist

Before running `db:schema:reset`:

- [ ] **Backup data**: Export current data to JSON
- [ ] **Verify environment**: Double-check you're not on production
- [ ] **Check database name**: `echo $PGDATABASE`
- [ ] **Have migration plan**: Know how you'll restore data
- [ ] **Test on dev first**: Try on development database first
- [ ] **Team notification**: Inform team if shared database

## Alternatives to Reset

If you **don't** want to drop everything:

### Just Add Missing Columns
```bash
npm run db:upgrade:models-sf
```
Adds `sf_make` and `sf_model` without dropping tables.

### Create Schema Only (Don't Drop)
```bash
npm run db:schema:flexible
```
Creates tables if they don't exist (won't drop existing).

### Selective Cleanup
```sql
-- Delete specific data without dropping tables
DELETE FROM model_provider_mappings;
DELETE FROM models;
DELETE FROM makes;
DELETE FROM providers;
```

## Error Handling

### If Reset Fails Mid-Process
The script uses transactions (`BEGIN`/`COMMIT`). If it fails, changes are rolled back.

### If Tables Already Don't Exist
Script will skip confirmation and just create tables:
```
ℹ No existing tables found. Creating new schema...
```

### Permission Errors
You need `DROP` and `CREATE` privileges:
```bash
# Check permissions
psql $DATABASE_URL -c "SELECT has_table_privilege('models', 'DROP');"
```

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `FORCE` | Skip confirmation | `FORCE=true` |
| `PGHOST` | Database host | `your-db.amazonaws.com` |
| `PGDATABASE` | Database name | `wings_insurance` |
| `PGUSER` | Database user | `postgres` |
| `PGPASSWORD` | Database password | `****` |

## Quick Commands Reference

```bash
# Safe reset (asks confirmation)
npm run db:schema:reset

# Force reset (no confirmation)
FORCE=true npm run db:schema:reset

# Reset + migrate
npm run db:schema:reset && npm run db:migrate:flexible

# Reset + verify
npm run db:schema:reset && npm run db:list:tables
```

## Comparison with Other Scripts

| Script | Drops Tables? | Creates Tables? | Migrates Data? | Safe for Production? |
|--------|--------------|----------------|----------------|---------------------|
| `db:schema:reset` | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| `db:schema:flexible` | ❌ No | ✅ If not exist | ❌ No | ✅ Yes |
| `db:migrate:flexible` | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| `db:upgrade:models-sf` | ❌ No | ❌ No | ✅ Yes | ✅ Yes |

## Related Documentation

- **Schema Details**: See `SCHEMA_VISUAL.md`
- **Salesforce Fields**: See `SALESFORCE_FIELDS.md`
- **Migration Guide**: See `FLEXIBLE_SCHEMA_GUIDE.md`
- **Quick Start**: See `QUICK_START.md`

---

**Remember**: Always backup before running destructive operations! 💾

