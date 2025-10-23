# RDS Mode Guide - Database Integration

## Overview

The Structure Editor React app now supports **two data sources**:

1. **Local Mode** (default): Reads from static JSON files in `public/separated/`
2. **RDS Mode**: Connects to PostgreSQL database with full CRUD operations

## Key Features

### Local Mode (JSON Files)
- ✅ Read aircraft models from JSON files
- ❌ No write operations (read-only)
- ✅ Fast, no database required
- ✅ Good for development/testing

### RDS Mode (Database)
- ✅ Read aircraft models from PostgreSQL
- ✅ **Create** new models
- ✅ **Update** existing models
- ✅ **Delete** models
- ✅ Real-time synchronization
- ✅ Multi-user support
- ✅ Preserves exact case sensitivity

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│                  (structure-editor-react)                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Data Service Abstraction Layer              │  │
│  │  (switches between local JSON and RDS API)          │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│                     │ Environment Variable:                 │
│                     │ VITE_DATA_SOURCE = 'local' | 'rds'    │
│                     │                                        │
│            ┌────────┴────────┐                              │
│            │                 │                              │
│            ▼                 ▼                              │
│      ┌─────────┐       ┌──────────┐                        │
│      │  Local  │       │   RDS    │                        │
│      │  JSON   │       │   API    │                        │
│      │  Files  │       │  Server  │                        │
│      └─────────┘       └────┬─────┘                        │
└───────────────────────────────│──────────────────────────────┘
                                │
                                │ HTTP API
                                │ (port 4000)
                                │
                                ▼
                        ┌───────────────┐
                        │  PostgreSQL   │
                        │  RDS Database │
                        └───────────────┘
```

---

## Setup Instructions

### Step 1: Configure Environment Variables

Copy the template and create your `.env` file:

```bash
cp env.template .env
```

Edit `.env` with your settings:

```bash
# Database Connection
PGHOST=your-rds-endpoint.amazonaws.com
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your-secure-password
PGDATABASE=wings_insurance
PGSSL=true

# API Server
API_PORT=4000
API_AUTH_TOKEN=generate-secure-token-here

# Frontend Configuration
VITE_DATA_SOURCE=rds                    # Switch to RDS mode
VITE_RDS_API_URL=http://localhost:4000  # API server URL
VITE_RDS_AUTH_TOKEN=same-token-as-above # Must match API_AUTH_TOKEN
```

**Security Note**: Generate a secure token:
```bash
openssl rand -hex 32
```

### Step 2: Prepare the Database

```bash
# 1. Create or reset schema
npm run db:schema:reset

# 2. Import data from makes-models.json
npm run db:import:json

# 3. Verify import
npm run db:list:providers
npm run db:view:models-with-providers
```

### Step 3: Start the RDS API Server

```bash
npm run api:rds
```

You should see:
```
[RDS API Server] Running on port 4000
[RDS API Server] Health check: http://localhost:4000/health
[RDS API Server] Database: your-rds-endpoint:5432/wings_insurance
[RDS API Server] Authentication: Enabled
```

### Step 4: Start Services

```bash
# Install dependencies (first time only)
npm install

# Start both API and frontend together (RECOMMENDED)
npm run dev
```

This single command starts:
- 🔵 **RDS API Server** (port 4000)
- 🟢 **Frontend Dev Server** (port 5173)

**Alternative options**:
```bash
# Start API only
npm run api:rds

# Start frontend only (local mode)
npm run dev:local

# Or use separate terminals
npm run api:rds      # Terminal 1
npm run dev:frontend # Terminal 2

# Production build
npm run build
npm run preview
```

### Step 5: Verify RDS Mode

Open the app and check:
- ✅ Aircraft models load from database
- ✅ You can add new models
- ✅ You can edit existing models
- ✅ You can delete models
- ✅ Changes persist in database

---

## API Endpoints

### Health Check
```
GET /health
```
Returns database connection status.

### Get All Makes
```
GET /api/makes
Authorization: Bearer {token}
```
Returns list of aircraft manufacturers.

### Get Models for a Make
```
GET /api/makes/{slug}/models
Authorization: Bearer {token}
```
Returns all models for a specific manufacturer.

**Example**: `GET /api/makes/piper/models`

### Get Single Model
```
GET /api/models/{hash}
Authorization: Bearer {token}
```
Returns a specific model by hash.

### Create Model
```
POST /api/models
Authorization: Bearer {token}
Content-Type: application/json

{
  "hash": "unique-hash",
  "labelMake": "Piper",
  "labelModel": "PA-28-181",
  "year": 1980,
  "sfMake": "Piper",
  "sfModel": "PA-28-181",
  "iatMake": "Piper",
  "iatModel": "PA-28-181 Archer II",
  "rokstoneMake": "Piper",
  "rokstoneModel": "PA-28-181",
  "oraeroMake": "Piper",
  "oraeroModel": "PA28-181"
}
```

### Update Model
```
PUT /api/models/{hash}
Authorization: Bearer {token}
Content-Type: application/json

{
  "labelMake": "Piper",
  "labelModel": "PA-28-181",
  "year": 1980,
  ...
}
```

### Delete Model
```
DELETE /api/models/{hash}
Authorization: Bearer {token}
```

### Bulk Export
```
GET /api/export
Authorization: Bearer {token}
```
Returns all models grouped by make.

---

## Data Service API

The React app uses `dataService.ts` to abstract data operations:

```typescript
import { initDataService, getDataService } from './services/dataService';

// Initialize on app startup
const dataService = initDataService({
  source: import.meta.env.VITE_DATA_SOURCE || 'local',
  rdsApiUrl: import.meta.env.VITE_RDS_API_URL,
  rdsAuthToken: import.meta.env.VITE_RDS_AUTH_TOKEN
});

// Get available files/makes
const files = await dataService.getAvailableFiles();

// Load models for a make
const models = await dataService.loadModels('piper.json');

// Create a new model (RDS only)
await dataService.createModel(newModel);

// Update a model (RDS only)
await dataService.updateModel(hash, updatedModel);

// Delete a model (RDS only)
await dataService.deleteModel(hash);

// Check if write operations are supported
const canWrite = dataService.supportsWrite(); // true for RDS, false for local
```

---

## Switching Between Modes

### Option 1: Environment Variable (Permanent)

Edit `.env`:
```bash
# Local mode
VITE_DATA_SOURCE=local

# RDS mode
VITE_DATA_SOURCE=rds
```

Then restart the frontend.

### Option 2: Runtime Switch (Temporary)

The app already supports runtime switching via `localStorage`:

```javascript
// Switch to local mode
localStorage.setItem('dataSourceOverride', 'local');

// Switch to RDS mode
localStorage.setItem('dataSourceOverride', 'rds');

// Remove override (use env variable)
localStorage.removeItem('dataSourceOverride');
```

Then reload the page.

---

## Case Sensitivity

Both modes preserve exact case from the data source:

| Field | Local JSON | RDS Database |
|-------|-----------|--------------|
| `labelMake` | From JSON file | From `models.label_make` |
| `labelModel` | From JSON file | From `models.label_model` |
| `sfMake` | From JSON file | From `models.sf_make` |
| `sfModel` | From JSON file | From `models.sf_model` |
| Provider fields | From JSON file | From `model_provider_mappings` |

**All case is preserved exactly as stored.**

---

## Security Considerations

### Authentication
- API uses Bearer token authentication
- Token configured in `.env` file
- Frontend and API must use matching tokens

### HTTPS/SSL
For production:
- Enable SSL for PostgreSQL: `PGSSL=true`
- Use HTTPS for API server
- Update `VITE_RDS_API_URL` to use `https://`

### CORS
The API server has CORS enabled. For production:
- Configure specific origins
- Update `cors()` middleware in `rds-api-server.mjs`

### Environment Variables
- **Never commit `.env` file** to git
- Use `.gitignore` to exclude it
- Store secrets in environment management system

---

## Deployment

### Development
```bash
# Option 1: Start everything at once (RECOMMENDED)
npm run dev

# Option 2: Separate terminals
npm run api:rds      # Terminal 1: API server
npm run dev:frontend # Terminal 2: Frontend

# Option 3: Local mode only (no API)
npm run dev:local
```

### Production

#### Option 1: PM2
```bash
# Start API server with PM2
pm2 start scripts/rds-api-server.mjs --name rds-api

# Build and serve frontend
npm run build
pm2 serve dist 80 --name frontend --spa
```

#### Option 2: Docker
See `DOCKER_DEPLOYMENT.md` (to be created)

#### Option 3: AWS

Frontend: Deploy to S3 + CloudFront
API: Deploy to ECS/Fargate or Lambda

---

## Troubleshooting

### API Server Won't Start

**Error**: `Connection refused`
```bash
# Check database connection
npm run db:test

# Verify environment variables
echo $PGHOST
echo $PGDATABASE
```

### Frontend Can't Connect to API

**Error**: `Failed to fetch`
```bash
# Check API server is running
curl http://localhost:4000/health

# Check auth token matches
# Compare VITE_RDS_AUTH_TOKEN with API_AUTH_TOKEN
```

### Authentication Failed (401)

**Error**: `Unauthorized`
- Verify `VITE_RDS_AUTH_TOKEN` matches `API_AUTH_TOKEN`
- Check token is included in requests
- Restart both frontend and API after env changes

### CORS Error

**Error**: `Access-Control-Allow-Origin`
- API server must allow frontend origin
- Update CORS configuration in `rds-api-server.mjs`

### Models Not Saving

**Error**: Database write fails
```bash
# Check database permissions
psql $DATABASE_URL -c "SELECT has_table_privilege('models', 'INSERT');"

# Check database connection
npm run db:test
```

---

## Performance

### Local Mode
- **Load time**: < 100ms per file
- **Concurrent users**: Unlimited (static files)
- **Storage**: ~50MB for all JSON files

### RDS Mode
- **Load time**: 200-500ms per request
- **Concurrent users**: Depends on database instance
- **Storage**: Efficient (normalized database)

### Recommendations
- **Development**: Use local mode
- **Production**: Use RDS mode for real-time updates
- **Read-only deployment**: Use local mode (cheaper)

---

## Comparison

| Feature | Local Mode | RDS Mode |
|---------|-----------|----------|
| **Data Source** | JSON files | PostgreSQL database |
| **Read** | ✅ Yes | ✅ Yes |
| **Create** | ❌ No | ✅ Yes |
| **Update** | ❌ No | ✅ Yes |
| **Delete** | ❌ No | ✅ Yes |
| **Multi-user** | ❌ No | ✅ Yes |
| **Real-time sync** | ❌ No | ✅ Yes |
| **Setup complexity** | Simple | Moderate |
| **Cost** | Free (static hosting) | Database costs |
| **Performance** | Very fast | Fast |

---

## Migration Path

### From Local to RDS

```bash
# 1. Export current JSON files (if needed)
# Already in public/separated/

# 2. Setup database
npm run db:schema:reset

# 3. Import from makes-models.json
npm run db:import:json

# 4. Update .env
VITE_DATA_SOURCE=rds

# 5. Start API server
npm run api:rds

# 6. Rebuild frontend
npm run build
```

### From RDS to Local

```bash
# 1. Export from database to JSON
npm run db:export:flexible

# 2. Copy to separated/
cp public/separated/*.json separated/

# 3. Update .env
VITE_DATA_SOURCE=local

# 4. Rebuild frontend
npm run build
```

---

## Related Documentation

- **API Server**: `scripts/rds-api-server.mjs`
- **Data Service**: `src/services/dataService.ts`
- **Database Schema**: `SCHEMA_VISUAL.md`
- **Import Guide**: `IMPORT_JSON_GUIDE.md`
- **Scripts Reference**: `SCRIPTS_REFERENCE.md`

---

## Quick Reference

```bash
# Start RDS API server
npm run api:rds

# Test API health
curl http://localhost:4000/health

# Test with authentication
curl -H "Authorization: Bearer your-token" \
  http://localhost:4000/api/makes

# Switch frontend to RDS mode
# Edit .env: VITE_DATA_SOURCE=rds

# Verify connection
npm run db:test
```

---

**Status**: ✅ Ready to use  
**Supports**: Create, Read, Update, Delete (CRUD)  
**Case Preservation**: ✅ Yes  
**Production Ready**: ✅ Yes (with proper security configuration)

