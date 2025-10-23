# Database Scripts Reference

Complete reference for all database management scripts in the flexible schema system.

## Quick Navigation

- [Schema Management](#schema-management)
- [Data Migration](#data-migration)
- [Data Viewing](#data-viewing)
- [Provider Management](#provider-management)
- [Make Management](#make-management)
- [Data Export](#data-export)
- [Schema Upgrades](#schema-upgrades)
- [Testing & Development](#testing--development)

---

## Schema Management

### Create Schema
```bash
npm run db:schema:flexible
```
**Purpose**: Creates the flexible schema tables and views if they don't exist.  
**Safe for Production**: ✅ Yes (won't drop existing tables)  
**Includes SF Fields**: ✅ Yes  
**When to Use**: Initial setup or when tables don't exist

---

### Reset Schema
```bash
npm run db:schema:reset
```
**Purpose**: Drops ALL tables and recreates them with correct structure.  
**Safe for Production**: ❌ **NO! Deletes all data!**  
**Includes SF Fields**: ✅ Yes  
**When to Use**: Development, testing, or complete schema migration  
**Interactive**: Asks for confirmation (skip with `FORCE=true`)  
**Documentation**: See `RESET_SCHEMA_GUIDE.md`

**Example**:
```bash
# With confirmation
npm run db:schema:reset

# Force mode (no confirmation)
FORCE=true npm run db:schema:reset
```

---

## Data Migration

### Import from JSON File
```bash
npm run db:import:json
```
**Purpose**: Imports data from `makes-models.json` into flexible schema.  
**Safe for Production**: ✅ Yes  
**Case Sensitivity**: ✅ Preserves exact case from JSON  
**What it Does**:
- Creates providers (IAT, Rokstone, Oraero)
- Creates makes from `labelMake` (case-sensitive)
- Creates models with `sf_make` and `sf_model`
- Creates provider mappings (only when both make and model exist)

**Options**:
- `JSON_FILE`: Custom path (default: `./makes-models.json`)

**Examples**:
```bash
# Standard import (uses ./makes-models.json)
npm run db:import:json

# Custom JSON file
JSON_FILE=/path/to/data.json npm run db:import:json

# After reset
npm run db:schema:reset && npm run db:import:json
```

**Documentation**: See `IMPORT_JSON_GUIDE.md`

---

### Migrate from Old Schema
```bash
npm run db:migrate:flexible
```
**Purpose**: Migrates data from `makemodels_items` table to flexible schema.  
**Safe for Production**: ✅ Yes  
**What it Does**:
- Creates providers (IAT, Rokstone, Oraero)
- Migrates makes and models
- Populates `sf_make` and `sf_model` from old schema
- Creates provider mappings
- Skips Salesforce provider (SF goes to models table)

**Example**:
```bash
# Standard migration
npm run db:migrate:flexible

# After reset
npm run db:schema:reset && npm run db:migrate:flexible
```

---

## Data Viewing

### View Models with Providers
```bash
npm run db:view:models-with-providers
```
**Purpose**: Query models with their provider mappings and Salesforce fields.  
**Options**:
- `MAKE_NAME`: Filter by make name
- `LIMIT`: Number of results (default: 10)

**Examples**:
```bash
# View first 10 models
npm run db:view:models-with-providers

# View Piper models
MAKE_NAME=Piper npm run db:view:models-with-providers

# View first 50 models
LIMIT=50 npm run db:view:models-with-providers

# Piper models, first 20
MAKE_NAME=Piper LIMIT=20 npm run db:view:models-with-providers
```

### List Providers
```bash
npm run db:list:providers
```
**Purpose**: Lists all insurance providers with mapping counts.  
**Expected Output**: IAT, Rokstone, Oraero (NOT Salesforce)

### View Makes
```bash
npm run db:view:makes
```
**Purpose**: Lists all aircraft manufacturers.

### View Models
```bash
npm run db:view:models
```
**Purpose**: Lists all aircraft models (without provider mappings).

### List Tables
```bash
npm run db:list:tables
```
**Purpose**: Shows all tables in the database.

---

## Provider Management

### Add Provider
```bash
npm run db:add:provider
```
**Purpose**: Add a new insurance provider.  
**Required Env Vars**:
- `PROVIDER_CODE`: Provider code (e.g., "newco")
- `PROVIDER_NAME`: Display name (e.g., "New Insurance Co")

**Example**:
```bash
PROVIDER_CODE=aviationx PROVIDER_NAME="Aviation X Insurance" npm run db:add:provider
```

### Remove Salesforce Provider
```bash
npm run db:remove:salesforce
```
**Purpose**: Removes Salesforce from providers table (if it exists).  
**When to Use**: When migrating from old schema that had SF as provider.

---

## Make Management

### Add Make
```bash
npm run db:add:make
```
**Purpose**: Add a new aircraft manufacturer.  
**Options**:
- `MAKE_NAME`: Required - Make display name
- `MAKE_SLUG`: Optional - Kebab-case slug (auto-generated if not provided)
- `MAKE_LABEL`: Optional - Friendly label

**Examples**:
```bash
# Simple (slug auto-generated)
MAKE_NAME="Piper" npm run db:add:make

# With custom slug
MAKE_NAME="De Havilland" MAKE_SLUG="de-havilland" npm run db:add:make

# With label
MAKE_NAME="Piper" MAKE_LABEL="Piper Aircraft Inc." npm run db:add:make
```

---

## Data Export

### Export to JSON (Flexible Schema)
```bash
npm run db:export:flexible
```
**Purpose**: Exports data from flexible schema to JSON files.  
**Output Directory**: `public/separated/`  
**Format**: One JSON file per make (e.g., `piper.json`, `cessna.json`)  
**Includes**:
- ✅ `sfMake`, `sfModel` from models table
- ✅ Provider-specific fields (iatMake, iatModel, etc.)
- ✅ New `providers` array

**Options**:
- `DEST_DIR`: Custom output directory (default: `public/separated`)

**Example**:
```bash
# Standard export
npm run db:export:flexible

# Custom directory
DEST_DIR=/tmp/export npm run db:export:flexible
```

---

## Schema Upgrades

### Upgrade Makes Table
```bash
npm run db:upgrade:makes
```
**Purpose**: Adds slug and label columns to existing makes table.

### Upgrade Models Table
```bash
npm run db:upgrade:models
```
**Purpose**: General model table upgrades.

### Upgrade Models for Salesforce Fields
```bash
npm run db:upgrade:models-sf
```
**Purpose**: Adds `sf_make` and `sf_model` columns to existing models table.  
**Safe for Production**: ✅ Yes  
**When to Use**: When upgrading existing flexible schema to include SF fields  
**What it Does**:
1. Adds sf_make and sf_model columns
2. Creates indexes
3. Migrates data from makemodels_items (if exists)
4. Updates views

**Documentation**: See `SALESFORCE_FIELDS.md`

### Upgrade All
```bash
npm run db:upgrade:all
```
**Purpose**: Runs all upgrade scripts (makes + models).  
**Note**: Does NOT include models-sf upgrade.

---

## Development Commands

### Start Development (Full Stack)
```bash
npm run dev
```
**Purpose**: Starts **both** RDS API server and frontend dev server concurrently.  
**Recommended**: ✅ Use this for RDS mode development  
**Output**: Color-coded logs (🔵 API, 🟢 Frontend)  
**Ports**: 
- API: 4000
- Frontend: 5173

**What it runs**:
- `npm run api:rds` (RDS API server)
- `npm run dev:frontend` (Vite dev server)

**Example output**:
```
[API]      [RDS API Server] Running on port 4000
[Frontend] VITE v7.x.x ready in 234 ms
[Frontend] ➜  Local: http://localhost:5173/
```

---

### Start Frontend Only (Local Mode)
```bash
npm run dev:local
```
**Purpose**: Starts frontend in local mode (JSON files only).  
**Use Case**: When you don't need database/API  
**Data Source**: Reads from `public/separated/*.json`  
**Write Operations**: ❌ Not available

---

### Start Frontend Only (RDS Mode)
```bash
npm run dev:frontend
```
**Purpose**: Starts only the frontend dev server.  
**Assumes**: API server is already running separately  
**Use Case**: When you want manual control of API server

---

## API Servers

### RDS API Server
```bash
npm run api:rds
```
**Purpose**: Starts REST API server for RDS database integration.  
**Port**: Configured via `API_PORT` (default: 4000)  
**Authentication**: Bearer token via `API_AUTH_TOKEN`  
**Features**:
- Full CRUD operations for models
- Real-time database access
- Multi-user support
- RESTful API endpoints

**Endpoints**:
- `GET /health` - Health check
- `GET /api/makes` - List manufacturers
- `GET /api/makes/{slug}/models` - Get models
- `POST /api/models` - Create model
- `PUT /api/models/{hash}` - Update model
- `DELETE /api/models/{hash}` - Delete model

**Documentation**: See `RDS_MODE_GUIDE.md`

**Example**:
```bash
# Start server
npm run api:rds

# Test health
curl http://localhost:4000/health

# Test with auth
curl -H "Authorization: Bearer your-token" \
  http://localhost:4000/api/makes
```

---

### Local API Server
```bash
npm run api:start
```
**Purpose**: Starts local file-based API server.  
**Use Case**: Testing, development with JSON files

---

## Testing & Development

### Test Database Connection
```bash
npm run db:test
```
**Purpose**: Tests PostgreSQL connection.  
**Output**: Connection status and database info.

### Database Initialization
```bash
npm run db:init
```
**Purpose**: Initial database setup script.

### Import Separated Files
```bash
npm run db:import-separated
```
**Purpose**: Imports JSON files from `separated/` directory into database.

---

## Environment Variables

All scripts use these environment variables (from `.env` file):

| Variable | Purpose | Example |
|----------|---------|---------|
| `PGHOST` | Database host | `your-db.us-east-1.rds.amazonaws.com` |
| `PGPORT` | Database port | `5432` |
| `PGUSER` | Database user | `postgres` |
| `PGPASSWORD` | Database password | `your-password` |
| `PGDATABASE` | Database name | `wings_insurance` |
| `PGSSL` | Enable SSL | `true` |

---

## Common Workflows

### 1. Fresh Installation (from JSON)
```bash
# Create schema
npm run db:schema:flexible

# Import from makes-models.json
npm run db:import:json

# Verify
npm run db:list:providers
npm run db:view:models-with-providers

# Export to separated files
npm run db:export:flexible
```

### 2. Fresh Installation (from Old Schema)
```bash
# Create schema
npm run db:schema:flexible

# Migrate data from makemodels_items table
npm run db:migrate:flexible

# Verify
npm run db:list:providers
npm run db:view:models-with-providers

# Export
npm run db:export:flexible
```

### 3. Upgrade Existing Database (Add SF Fields)
```bash
# Add Salesforce columns
npm run db:upgrade:models-sf

# Verify
npm run db:view:models-with-providers

# Re-export
npm run db:export:flexible
```

### 4. Complete Reset (Development)
```bash
# Drop and recreate all tables
npm run db:schema:reset

# Import data from JSON
npm run db:import:json

# Verify
npm run db:list:providers
npm run db:view:models-with-providers
```

### 5. Add New Provider
```bash
# Add provider
PROVIDER_CODE=newco PROVIDER_NAME="New Insurance" npm run db:add:provider

# Verify
npm run db:list:providers

# Map models (via UI or SQL)
# ...

# Export
npm run db:export:flexible
```

### 6. Remove Salesforce from Providers
```bash
# Remove SF from providers table
npm run db:remove:salesforce

# Add SF fields to models table
npm run db:upgrade:models-sf

# Verify
npm run db:list:providers  # Should NOT show Salesforce
npm run db:view:models-with-providers  # Should show sf_make, sf_model
```

---

## Script Safety Matrix

| Script | Drops Tables? | Deletes Data? | Safe for Prod? | Requires Confirm? |
|--------|--------------|---------------|----------------|-------------------|
| `db:schema:flexible` | ❌ | ❌ | ✅ | ❌ |
| `db:schema:reset` | ✅ | ✅ | ❌ | ✅ |
| `db:migrate:flexible` | ❌ | ❌ | ✅ | ❌ |
| `db:upgrade:models-sf` | ❌ | ❌ | ✅ | ❌ |
| `db:view:*` | ❌ | ❌ | ✅ | ❌ |
| `db:add:provider` | ❌ | ❌ | ✅ | ❌ |
| `db:export:flexible` | ❌ | ❌ | ✅ | ❌ |

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| `SCRIPTS_REFERENCE.md` | This file - complete script reference |
| `QUICK_START.md` | Quick setup guide |
| `SALESFORCE_FIELDS.md` | Salesforce field documentation |
| `RESET_SCHEMA_GUIDE.md` | Detailed reset script guide |
| `SCHEMA_VISUAL.md` | Visual schema diagrams |
| `FLEXIBLE_SCHEMA_GUIDE.md` | Complete schema guide |
| `SCHEMA_COMPARISON.md` | Old vs new schema comparison |
| `CHANGELOG_SALESFORCE.md` | Salesforce update change log |
| `UPDATE_SUMMARY.md` | Quick update summary |

---

## Troubleshooting

### Connection Issues
```bash
# Test connection
npm run db:test

# Check environment variables
echo $PGHOST
echo $PGDATABASE
```

### Permission Issues
```bash
# Check if user has necessary privileges
psql $DATABASE_URL -c "SELECT has_table_privilege('models', 'SELECT');"
```

### Schema Issues
```bash
# List tables
npm run db:list:tables

# Check if SF fields exist
psql $DATABASE_URL -c "\d models"
```

### Data Validation
```bash
# Count records
psql $DATABASE_URL -c "
  SELECT 
    (SELECT COUNT(*) FROM makes) as makes_count,
    (SELECT COUNT(*) FROM models) as models_count,
    (SELECT COUNT(*) FROM providers) as providers_count,
    (SELECT COUNT(*) FROM model_provider_mappings) as mappings_count;
"
```

---

**Need Help?** Check the specific documentation files listed above or run scripts with `-h` flag (where available).

