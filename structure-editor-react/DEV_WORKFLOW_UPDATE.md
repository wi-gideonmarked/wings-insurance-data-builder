# ✨ Development Workflow Update

## 🎉 One Command to Rule Them All!

You can now start **both** the RDS API server and frontend with a single command:

```bash
npm run dev
```

## What Changed?

### Before ❌
```bash
# Terminal 1
npm run api:rds

# Terminal 2  
npm run dev
```
*Required 2 separate terminals*

### After ✅
```bash
# Single terminal
npm run dev
```
*Starts both services automatically!*

---

## 📦 New Package

Added `concurrently` to run multiple npm scripts in parallel with color-coded output:

```bash
# Install it (first time)
npm install
```

---

## 🎨 Color-Coded Output

When you run `npm run dev`, you'll see:

```
[API]      [RDS API Server] Running on port 4000          (blue)
[API]      [RDS API Server] Health check: http://localhost:4000/health
[API]      [RDS API Server] Database: your-db:5432/wings_insurance
[Frontend] VITE v7.x.x ready in 234 ms                   (green)
[Frontend] ➜  Local: http://localhost:5173/
[Frontend] ➜  Network: use --host to expose
```

Easy to distinguish between API and Frontend logs!

---

## 📋 All Available Commands

### Development

| Command | What It Does | Use When |
|---------|--------------|----------|
| `npm run dev` | ✅ **Start API + Frontend** | RDS mode development (RECOMMENDED) |
| `npm run dev:local` | Start frontend (local JSON) | You don't need database |
| `npm run dev:frontend` | Start frontend only | API already running separately |
| `npm run api:rds` | Start API server only | Manual API control |

### Production

| Command | What It Does |
|---------|--------------|
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run start` | Build + deploy with PM2 |

---

## 🚀 Quick Start (Updated)

```bash
# 1. Setup environment
cp env.template .env
nano .env

# 2. Setup database
npm run db:schema:reset
npm run db:import:json

# 3. Install dependencies
npm install

# 4. Start everything! 🎉
npm run dev

# 5. Open browser
http://localhost:5173
```

---

## ⚙️ How It Works

Under the hood, `npm run dev` uses `concurrently`:

```json
{
  "dev": "concurrently \"npm run api:rds\" \"npm run dev:frontend\" --names \"API,Frontend\" --prefix-colors \"blue,green\""
}
```

This:
- Runs both commands in parallel
- Adds `[API]` and `[Frontend]` prefixes
- Colors API output blue, Frontend output green
- Handles graceful shutdown (Ctrl+C stops both)

---

## 🛑 Stopping Services

Press `Ctrl+C` once to stop both services gracefully.

---

## 🔧 Troubleshooting

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::4000`

**Solution**:
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Or on Windows WSL
fuser -k 4000/tcp

# Then restart
npm run dev
```

### API Not Starting

**Check**:
```bash
# Verify database connection
npm run db:test

# Verify .env configuration
cat .env | grep PG
```

### Frontend Can't Connect to API

**Check**:
```bash
# Verify API is running (should show both services)
# Look for: [API] [RDS API Server] Running on port 4000

# Test API directly
curl http://localhost:4000/health
```

---

## 💡 Pro Tips

### 1. Watch API Logs Only
```bash
npm run dev 2>&1 | grep "\[API\]"
```

### 2. Watch Frontend Logs Only
```bash
npm run dev 2>&1 | grep "\[Frontend\]"
```

### 3. Run in Background (Linux/Mac)
```bash
npm run dev > dev.log 2>&1 &
tail -f dev.log
```

### 4. Development with Auto-Reload
Both services support auto-reload:
- **Frontend**: Vite hot module replacement (HMR)
- **API**: Restart API manually when changing server code

For API auto-reload, consider using `nodemon`:
```bash
# Add to package.json (optional)
"api:rds:watch": "nodemon ./scripts/rds-api-server.mjs"
```

---

## 📚 Documentation Updated

All guides have been updated to reflect the new workflow:

- ✅ `RDS_QUICK_SETUP.md` - Updated quick start
- ✅ `RDS_MODE_GUIDE.md` - Updated deployment section  
- ✅ `RDS_QUICK_REFERENCE.md` - Updated commands
- ✅ `SCRIPTS_REFERENCE.md` - Added development commands section
- ✅ `package.json` - New scripts added

---

## 🎯 Benefits

1. **Simpler**: One command instead of two terminals
2. **Clearer**: Color-coded logs easy to read
3. **Faster**: No context switching between terminals
4. **Organized**: All logs in one place
5. **Convenient**: Perfect for development workflow

---

## 🔄 Migration from Old Workflow

If you were using the old two-terminal approach:

### Old Way
```bash
# Terminal 1
npm run api:rds

# Terminal 2
npm run dev
```

### New Way
```bash
# Just this!
npm run dev
```

**No breaking changes** - all old commands still work!

---

## 📖 Related Documentation

- **Quick Setup**: `RDS_QUICK_SETUP.md`
- **Full Guide**: `RDS_MODE_GUIDE.md`
- **Command Reference**: `SCRIPTS_REFERENCE.md`
- **Quick Reference**: `RDS_QUICK_REFERENCE.md`

---

**Status**: ✅ Ready to use  
**Breaking Changes**: ❌ None (backward compatible)  
**Setup Required**: Run `npm install` to get `concurrently`

---

Enjoy the improved development experience! 🚀

