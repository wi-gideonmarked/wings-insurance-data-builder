# RDS Mode - Quick Setup (5 Minutes)

## TL;DR

Add database CRUD operations to the Structure Editor React app with 3 simple steps.

---

## Step 1: Configure Environment (1 min)

```bash
# Copy template
cp env.template .env

# Edit .env
nano .env
```

Set these variables:
```bash
# Database
PGHOST=your-rds-endpoint.amazonaws.com
PGPASSWORD=your-password
PGDATABASE=wings_insurance

# Generate auth token
API_AUTH_TOKEN=$(openssl rand -hex 32)

# Enable RDS mode
VITE_DATA_SOURCE=rds
VITE_RDS_API_URL=http://localhost:4000
VITE_RDS_AUTH_TOKEN=$(echo $API_AUTH_TOKEN)
```

---

## Step 2: Setup Database (2 min)

```bash
# Create schema and import data
npm run db:schema:reset && npm run db:import:json

# Verify
npm run db:list:providers
```

Expected output:
```
✓ Makes: 119
✓ Models: 150000
✓ Providers: 3
```

---

## Step 3: Install Dependencies & Start Services (2 min)

```bash
# Install concurrently (first time only)
npm install

# Start both API server and frontend together
npm run dev
```

This will start:
- 🔵 **API Server** on port 4000
- 🟢 **Frontend** on port 5173

Open: `http://localhost:5173`

**Alternative** (Manual control):
```bash
# Terminal 1: Start API server only
npm run api:rds

# Terminal 2: Start frontend only
npm run dev:frontend
```

---

## Verify CRUD Operations

### ✅ READ
- Select a make (e.g., "Piper")
- Models load from database

### ✅ CREATE
- Click "Add" button
- Fill in model details
- Click "Save"
- ✅ Model added to database

### ✅ UPDATE  
- Click "Edit" on any model
- Change details
- Click "Save"
- ✅ Model updated in database

### ✅ DELETE
- Click "Delete" on any model
- Confirm deletion
- ✅ Model removed from database

---

## Environment Variables Summary

| Variable | Purpose | Example |
|----------|---------|---------|
| `PGHOST` | Database host | `xyz.rds.amazonaws.com` |
| `PGUSER` | Database user | `postgres` |
| `PGPASSWORD` | Database password | `your-password` |
| `PGDATABASE` | Database name | `wings_insurance` |
| `API_PORT` | API server port | `4000` |
| `API_AUTH_TOKEN` | API security token | `abc123...` |
| `VITE_DATA_SOURCE` | Mode: `local` or `rds` | `rds` |
| `VITE_RDS_API_URL` | API endpoint | `http://localhost:4000` |
| `VITE_RDS_AUTH_TOKEN` | Auth token (same as above) | `abc123...` |

---

## Switch Between Modes

### Local Mode (JSON files - Read Only)
```bash
# .env
VITE_DATA_SOURCE=local
```
- ✅ Read from JSON files
- ❌ No create/update/delete

### RDS Mode (Database - Full CRUD)
```bash
# .env
VITE_DATA_SOURCE=rds
```
- ✅ Read from database
- ✅ Create new models
- ✅ Update existing models
- ✅ Delete models

---

## Troubleshooting

### API won't start
```bash
# Check database connection
npm run db:test
```

### Frontend can't connect
```bash
# Check API is running
curl http://localhost:4000/health

# Should return: {"status":"healthy"}
```

### Authentication fails
```bash
# Verify tokens match
echo $API_AUTH_TOKEN
echo $VITE_RDS_AUTH_TOKEN

# They must be identical
```

### Models won't save
```bash
# Check you're in RDS mode
# .env should have:
VITE_DATA_SOURCE=rds

# Restart services after .env changes
```

---

## Production Deployment

```bash
# 1. Update API URL for production
VITE_RDS_API_URL=https://your-api-domain.com

# 2. Use HTTPS
PGSSL=true

# 3. Build frontend
npm run build

# 4. Deploy with PM2
pm2 start scripts/rds-api-server.mjs --name rds-api
pm2 serve dist 80 --name frontend --spa
```

---

## API Endpoints Reference

```
GET  /health                     - Health check
GET  /api/makes                  - List all makes
GET  /api/makes/{slug}/models    - Get models for make
GET  /api/models/{hash}          - Get single model
POST /api/models                 - Create model
PUT  /api/models/{hash}          - Update model
DELETE /api/models/{hash}        - Delete model
```

All require: `Authorization: Bearer {token}`

---

## File Structure

```
structure-editor-react/
├── env.template                    # Environment template
├── .env                            # Your config (git ignored)
├── scripts/
│   └── rds-api-server.mjs         # API server
├── src/
│   └── services/
│       └── dataService.ts         # Data abstraction
└── RDS_MODE_GUIDE.md              # Full documentation
```

---

## Next Steps

1. ✅ Follow setup above
2. ✅ Test CRUD operations
3. ✅ Configure for production
4. 📖 Read full guide: `RDS_MODE_GUIDE.md`

---

**Time to setup**: ~5 minutes  
**Difficulty**: Easy  
**Requirements**: PostgreSQL database with imported data  

---

## One-Command Setup (Advanced)

```bash
# Setup everything at once
cp env.template .env && \
nano .env && \
npm run db:schema:reset && \
npm run db:import:json && \
(npm run api:rds &) && \
npm run dev
```

Edit `.env` first, then run this command!

---

**Need help?** See `RDS_MODE_GUIDE.md` for detailed documentation.

