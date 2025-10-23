# Import from makes-models.json Guide

## Overview

The `import-makes-models-json` script imports aircraft data from `makes-models.json` into the RDS database with the flexible schema structure.

## Key Features

✅ **Preserves Case Sensitivity**: Maintains exact case from JSON (lowercase, Title Case, UPPERCASE)  
✅ **Salesforce Fields**: Imports `sfMake` and `sfModel` into `models` table  
✅ **Provider Mappings**: Creates mappings for IAT, Rokstone, and Oraero  
✅ **Smart Filtering**: Only creates mappings when both make AND model are present  
✅ **Idempotent**: Safe to run multiple times (uses UPSERT)  
✅ **Progress Tracking**: Shows progress during import  

## JSON File Format

Expected structure (array of objects):

```json
[
  {
    "hash": "unique-id",
    "labelMake": "Piper",              // Display make name (exact case preserved)
    "labelModel": "PA-28-181",         // Display model name (exact case preserved)
    "year": 1980,                      // Model year
    "sfMake": "Piper",                 // Salesforce make → goes to models.sf_make
    "sfModel": "PA-28-181",            // Salesforce model → goes to models.sf_model
    "iatMake": "Piper",                // IAT make → creates provider mapping
    "iatModel": "PA-28-181 Archer II", // IAT model → creates provider mapping
    "rokstoneMake": "Piper",           // Rokstone make
    "rokstoneModel": "PA-28-181",      // Rokstone model
    "oraeroMake": "Piper",             // Oraero make
    "oraeroModel": "PA28-181"          // Oraero model (note: no dash)
  }
]
```

## Usage

### Basic Import (Default File)

```bash
npm run db:import:json
```

Imports from `makes-models.json` in the current directory.

### Custom JSON File

```bash
JSON_FILE=/path/to/custom.json npm run db:import:json
```

### Complete Workflow (Fresh Database)

```bash
# 1. Reset schema (drops all tables)
npm run db:schema:reset

# 2. Import from makes-models.json
npm run db:import:json

# 3. Verify import
npm run db:list:providers
npm run db:view:models-with-providers

# 4. Export to separated JSON files
npm run db:export:flexible
```

## What It Does

### Step 1: Create Providers
Creates 3 insurance provider records:
- **IAT Insurance** (code: `iat`)
- **Rokstone** (code: `rokstone`)
- **Oraero** (code: `oraero`)

**Note**: Salesforce is NOT created as a provider (it goes to models table).

### Step 2: Create Makes
- Groups models by `labelMake` (case-sensitive)
- Creates one `makes` record per unique make
- Generates `slug` from make name (lowercase, kebab-case)
- Preserves exact case in `name` field

**Example**:
```sql
INSERT INTO makes (slug, name, label)
VALUES ('piper', 'Piper', 'Piper');
```

### Step 3: Create Models with Salesforce Fields
For each item in JSON:
- Creates `models` record
- Stores `labelMake` and `labelModel` (exact case)
- Stores `sfMake` and `sfModel` in dedicated columns
- Links to `makes` via `make_id`

**Example**:
```sql
INSERT INTO models (
  make_id, hash, label_make, label_model, year,
  sf_make, sf_model
)
VALUES (
  1, 'piper-pa28-181', 'Piper', 'PA-28-181', 1980,
  'Piper', 'PA-28-181'
);
```

### Step 4: Create Provider Mappings
For each provider (IAT, Rokstone, Oraero):
- Checks if BOTH `{provider}Make` AND `{provider}Model` are non-empty
- Creates mapping in `model_provider_mappings` table
- Preserves exact case from JSON

**Example**:
```sql
INSERT INTO model_provider_mappings (
  model_id, provider_id, provider_make, provider_model
)
VALUES (
  123, 1, 'Piper', 'PA-28-181 Archer II'
);
```

### Step 5: Verify Counts
Shows summary:
- Total makes
- Total models
- Total providers
- Total mappings
- Breakdown by provider

## Case Sensitivity

### ✅ Case is Preserved For:

| Field | Stored In | Example |
|-------|-----------|---------|
| `labelMake` | `models.label_make` | "Piper", "CESSNA", "deHavilland" |
| `labelModel` | `models.label_model` | "PA-28-181", "172N", "DHC-6" |
| `sfMake` | `models.sf_make` | Exact from JSON |
| `sfModel` | `models.sf_model` | Exact from JSON |
| `iatMake` | `model_provider_mappings.provider_make` | Exact from JSON |
| `iatModel` | `model_provider_mappings.provider_model` | Exact from JSON |
| `rokstoneMake` | `model_provider_mappings.provider_make` | Exact from JSON |
| `rokstoneModel` | `model_provider_mappings.provider_model` | Exact from JSON |
| `oraeroMake` | `model_provider_mappings.provider_make` | Exact from JSON |
| `oraeroModel` | `model_provider_mappings.provider_model` | Exact from JSON |

### 📝 Note: Slug Generation

The `makes.slug` field is generated as lowercase kebab-case:
- "Piper" → `"piper"`
- "De Havilland" → `"de-havilland"`
- "Beechcraft" → `"beechcraft"`

This is for URL-safety and consistency, but the `makes.name` preserves exact case.

## Handling Empty Fields

### Salesforce Fields
- Empty string (`""`) → Stored as `NULL` in database
- `NULL` → Stored as `NULL` in database
- Present value → Stored as-is (preserving case)

### Provider Mappings
Mappings are **only created** when BOTH make AND model are present:

| `iatMake` | `iatModel` | Result |
|-----------|-----------|--------|
| "Piper" | "PA-28-181" | ✅ Mapping created |
| "Piper" | "" | ❌ No mapping |
| "" | "PA-28-181" | ❌ No mapping |
| "" | "" | ❌ No mapping |

## Progress Output

During import, you'll see:

```
[import-makes-models-json] Starting import...
[import-makes-models-json] Reading: /path/to/makes-models.json
[import-makes-models-json] Found 150000 records

[Step 1/5] Creating insurance providers...
  ✓ IAT Insurance (iat) - ID: 1
  ✓ Rokstone (rokstone) - ID: 2
  ✓ Oraero (oraero) - ID: 3

[Step 2/5] Creating makes...
  ✓ Created 10/119 makes
  ✓ Created 20/119 makes
  ...
  ✓ Created 119/119 makes

[Step 3/5] Creating models...
  ✓ Created 1000/150000 models
  ✓ Created 2000/150000 models
  ...
  ✓ Created 150000 models total

[Step 4/5] Creating provider mappings...
  ✓ Created 5000 mappings
  ✓ Created 10000 mappings
  ...
  ✓ Created 300000 provider mappings total

[Step 5/5] Verifying import...
  ✓ Makes: 119
  ✓ Models: 150000
  ✓ Providers: 3
  ✓ Mappings: 300000

  Provider Breakdown:
    IAT Insurance (iat): 100000 mappings
    Rokstone (rokstone): 120000 mappings
    Oraero (oraero): 80000 mappings

  Sample models with Salesforce fields:
    Piper PA-28-181 (1980)
      SF: Piper / PA-28-181
    Cessna 172N (1981)
      SF: Cessna / 172N

✅ Import completed successfully!
```

## Performance

For large JSON files (100K+ records):
- Uses batch progress logging (every 1000 models, every 5000 mappings)
- Single transaction (all-or-nothing)
- Efficient UPSERT operations
- Expected time: ~2-5 minutes for 150K records

## Error Handling

### Rollback on Error
Uses PostgreSQL transactions - if ANY error occurs, ALL changes are rolled back.

### Duplicate Handling
Uses `ON CONFLICT DO UPDATE`:
- Duplicate `hash` → Updates existing model
- Duplicate `make slug` → Updates existing make
- Duplicate `model_id + provider_id` → Updates existing mapping

### Skipped Records
Logs warnings for:
- Models with missing make
- Models that fail validation
- Mappings that fail creation

## Verification

### Check Import Success

```bash
# View provider counts
npm run db:list:providers

# View sample models
npm run db:view:models-with-providers

# Check for models with SF fields
LIMIT=10 npm run db:view:models-with-providers
```

### SQL Verification

```sql
-- Check total counts
SELECT
  (SELECT COUNT(*) FROM makes) as makes,
  (SELECT COUNT(*) FROM models) as models,
  (SELECT COUNT(*) FROM providers) as providers,
  (SELECT COUNT(*) FROM model_provider_mappings) as mappings;

-- Check case preservation
SELECT label_make, label_model, sf_make, sf_model
FROM models
LIMIT 10;

-- Check provider mappings with case
SELECT 
  m.label_make,
  m.label_model,
  p.code,
  mpm.provider_make,
  mpm.provider_model
FROM model_provider_mappings mpm
JOIN models m ON mpm.model_id = m.id
JOIN providers p ON mpm.provider_id = p.id
LIMIT 10;
```

## Common Issues

### Issue: "Cannot read file"
**Solution**: Ensure `makes-models.json` exists in current directory or provide `JSON_FILE` path.

```bash
# Check file exists
ls -lh makes-models.json

# Provide explicit path
JSON_FILE=./makes-models.json npm run db:import:json
```

### Issue: "Table does not exist"
**Solution**: Create schema first.

```bash
npm run db:schema:reset
npm run db:import:json
```

### Issue: Case not preserved
**Solution**: Check JSON source file - script preserves exactly what's in JSON.

```bash
# Check JSON structure
head -50 makes-models.json
```

## Comparison with Other Import Methods

| Method | Source | Case Preserved? | SF Fields? |
|--------|--------|----------------|------------|
| `db:import:json` | `makes-models.json` | ✅ Yes | ✅ Yes |
| `db:migrate:flexible` | `makemodels_items` table | ✅ Yes | ✅ Yes |
| `db:import-separated` | `separated/*.json` files | ✅ Yes | Depends on files |

## Complete Example

```bash
# 1. Ensure you have makes-models.json
ls -lh makes-models.json

# 2. Reset database (optional, if starting fresh)
npm run db:schema:reset

# 3. Import data
npm run db:import:json

# 4. Verify
npm run db:list:providers
MAKE_NAME=Piper LIMIT=5 npm run db:view:models-with-providers

# 5. Export to separated JSON files
npm run db:export:flexible

# 6. Check output
ls -lh public/separated/
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JSON_FILE` | No | `./makes-models.json` | Path to JSON file |
| `PGHOST` | Yes | - | Database host |
| `PGPORT` | No | `5432` | Database port |
| `PGUSER` | Yes | - | Database user |
| `PGPASSWORD` | Yes | - | Database password |
| `PGDATABASE` | Yes | - | Database name |
| `PGSSL` | No | `false` | Enable SSL (`true`/`false`) |

## Related Documentation

- **Schema Details**: See `SCHEMA_VISUAL.md`
- **Salesforce Fields**: See `SALESFORCE_FIELDS.md`
- **All Scripts**: See `SCRIPTS_REFERENCE.md`
- **Quick Start**: See `QUICK_START.md`

---

**Pro Tip**: Run with a small test JSON file first to verify behavior before importing full dataset!

