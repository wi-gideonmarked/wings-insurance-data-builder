# RDS Mode - Quick Reference Card

## 🎯 Configuration

### Environment Variables (.env)

```bash
# Database Connection
PGHOST=your-rds-endpoint.amazonaws.com
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your-password
PGDATABASE=wings_insurance
PGSSL=true

# API Server
API_PORT=4000
API_AUTH_TOKEN=your-secure-token

# Frontend Mode
VITE_DATA_SOURCE=rds                    # or 'local'
VITE_RDS_API_URL=http://localhost:4000
VITE_RDS_AUTH_TOKEN=your-secure-token   # Must match API_AUTH_TOKEN
```

---

## 🚀 Commands

### Start Services
```bash
npm run dev              # Start BOTH API + Frontend (RECOMMENDED)
npm run dev:local        # Start frontend only (local mode)
npm run api:rds          # Start API server only (port 4000)
npm run dev:frontend     # Start frontend only (port 5173)
npm run build            # Build for production
```

### Database Setup
```bash
npm run db:schema:reset  # Drop and recreate tables
npm run db:import:json   # Import from makes-models.json
npm run db:test          # Test database connection
npm run db:list:providers  # Verify import
```

---

## 📡 API Endpoints

All require: `Authorization: Bearer {token}`

```bash
# Health check
GET  /health

# List makes
GET  /api/makes

# Get models for make
GET  /api/makes/piper/models

# Get single model
GET  /api/models/{hash}

# Create model
POST /api/models
Content-Type: application/json
{ "hash": "...", "labelMake": "...", "labelModel": "...", ... }

# Update model
PUT  /api/models/{hash}
Content-Type: application/json
{ "labelMake": "...", "labelModel": "...", ... }

# Delete model
DELETE /api/models/{hash}

# Bulk export
GET  /api/export
```

---

## 🔧 Testing

```bash
# Test API health
curl http://localhost:4000/health

# Test with auth
curl -H "Authorization: Bearer your-token" \
  http://localhost:4000/api/makes

# Test database
npm run db:test
```

---

## 🎨 Data Structure

```typescript
{
  hash: string,           // Unique identifier
  labelMake: string,      // "Piper" (case preserved)
  labelModel: string,     // "PA-28-181" (case preserved)
  year: number,           // 1980
  sfMake: string,         // Salesforce make
  sfModel: string,        // Salesforce model
  iatMake: string,        // IAT provider make
  iatModel: string,       // IAT provider model
  rokstoneMake: string,   // Rokstone provider make
  rokstoneModel: string,  // Rokstone provider model
  oraeroMake: string,     // Oraero provider make
  oraeroModel: string     // Oraero provider model
}
```

---

## 🔄 Mode Switching

### Local Mode (JSON - Read Only)
```bash
# .env
VITE_DATA_SOURCE=local

# Then restart frontend
npm run dev
```

### RDS Mode (Database - Full CRUD)
```bash
# .env
VITE_DATA_SOURCE=rds

# Then restart both services
npm run api:rds
npm run dev
```

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| API won't start | `npm run db:test` |
| 401 Unauthorized | Check tokens match in .env |
| Can't connect to API | Verify API is running: `curl http://localhost:4000/health` |
| Models won't save | Verify `VITE_DATA_SOURCE=rds` |
| CORS error | Check API CORS config |

---

## 📊 Database Schema

```
makes
├── id (PK)
├── slug          → piper.json
├── name          → "Piper" (case preserved)
└── label

models
├── id (PK)
├── make_id (FK)
├── hash (unique)
├── label_make    → Case preserved
├── label_model   → Case preserved
├── year
├── sf_make       → Salesforce (case preserved)
└── sf_model      → Salesforce (case preserved)

providers
├── id (PK)
├── code          → "iat", "rokstone", "oraero"
└── name

model_provider_mappings
├── id (PK)
├── model_id (FK)
├── provider_id (FK)
├── provider_make   → Case preserved
└── provider_model  → Case preserved
```

---

## 📚 Documentation

- **Quick Setup**: `RDS_QUICK_SETUP.md`
- **Full Guide**: `RDS_MODE_GUIDE.md`
- **Summary**: `RDS_INTEGRATION_SUMMARY.md`
- **All Scripts**: `SCRIPTS_REFERENCE.md`

---

## ⚡ Quick Start

```bash
# 1. Setup
cp env.template .env
nano .env  # Edit with your settings

# 2. Database
npm run db:schema:reset && npm run db:import:json

# 3. Install & Run (one command!)
npm install
npm run dev

# 4. Open
http://localhost:5173
```

Output will show:
```
[API]      [RDS API Server] Running on port 4000
[Frontend] VITE v7.x.x ready in xxx ms
[Frontend] ➜  Local: http://localhost:5173/
```

---

## ✅ CRUD Operations

| Operation | UI Action | API Call |
|-----------|-----------|----------|
| **CREATE** | Click "Add" button | `POST /api/models` |
| **READ** | Select make | `GET /api/makes/{slug}/models` |
| **UPDATE** | Click "Edit" button | `PUT /api/models/{hash}` |
| **DELETE** | Click "Delete" button | `DELETE /api/models/{hash}` |

---

## 🔐 Security Checklist

- [  ] Generate secure token: `openssl rand -hex 32`
- [ ] Set `API_AUTH_TOKEN` in .env
- [ ] Match `VITE_RDS_AUTH_TOKEN` to API token
- [ ] Enable SSL: `PGSSL=true`
- [ ] Use HTTPS in production
- [ ] Never commit .env to git
- [ ] Configure CORS for production domains

---

## 📦 Production Deployment

```bash
# 1. Build frontend
npm run build

# 2. Start with PM2
pm2 start scripts/rds-api-server.mjs --name rds-api
pm2 serve dist 80 --name frontend --spa

# 3. Check status
pm2 status
pm2 logs
```

---

**Print this card for quick reference!**

