# 🎯 Flexible Insurance Provider Schema

## 📋 Summary

I've designed a **scalable database schema** that solves your problem of hardcoded insurance provider columns. Instead of having `iat_make`, `rokstone_make`, `oraero_make` as separate columns, you now have a flexible system that supports **unlimited providers**.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OLD SCHEMA (Problems)                     │
├─────────────────────────────────────────────────────────────┤
│  ❌ Hardcoded columns (iat_make, rokstone_make, etc.)      │
│  ❌ Schema change needed for new providers                  │
│  ❌ Many NULL values                                         │
│  ❌ Difficult to maintain                                    │
└─────────────────────────────────────────────────────────────┘

                            ⬇️ MIGRATION

┌─────────────────────────────────────────────────────────────┐
│                    NEW SCHEMA (Solution)                     │
├─────────────────────────────────────────────────────────────┤
│  ✅ Dynamic provider table                                   │
│  ✅ Add providers with one INSERT                            │
│  ✅ Normalized structure (no NULLs)                          │
│  ✅ Easy queries and maintenance                             │
└─────────────────────────────────────────────────────────────┘
```

## 🗄️ Database Tables

### Core Tables

#### 1️⃣ `makes` - Aircraft Manufacturers
```
┌────────────────┐
│     makes      │
├────────────────┤
│ id             │ Primary Key
│ name           │ "Piper", "Cessna", etc.
│ created_at     │
│ updated_at     │
└────────────────┘
```

#### 2️⃣ `models` - Aircraft Models
```
┌────────────────┐
│    models      │
├────────────────┤
│ id             │ Primary Key
│ make_id        │ Foreign Key → makes
│ hash           │ Unique identifier
│ label_make     │ Display name
│ label_model    │ Display name
│ year           │ Model year
│ created_at     │
│ updated_at     │
└────────────────┘
```

#### 3️⃣ `providers` - Insurance Providers ⭐ NEW!
```
┌────────────────┐
│   providers    │
├────────────────┤
│ id             │ Primary Key
│ code           │ "iat", "rokstone", "oraero", "newco"
│ name           │ "IAT Insurance", etc.
│ is_active      │ true/false
│ metadata       │ JSONB (optional config)
│ created_at     │
│ updated_at     │
└────────────────┘
```

#### 4️⃣ `model_provider_mappings` - Connections ⭐ NEW!
```
┌────────────────────────┐
│ model_provider_mappings│
├────────────────────────┤
│ id                     │ Primary Key
│ model_id               │ Foreign Key → models
│ provider_id            │ Foreign Key → providers
│ provider_make          │ Provider's name for make
│ provider_model         │ Provider's name for model
│ is_active              │ true/false
│ notes                  │ Optional notes
│ created_at             │
│ updated_at             │
└────────────────────────┘
```

## 🚀 Getting Started

### Step 1: Create Schema
```bash
npm run db:schema:flexible
```
Creates all 4 tables and helper views.

### Step 2: Migrate Data
```bash
npm run db:migrate:flexible
```
Moves existing data from `makemodels_items` to the new structure.

### Step 3: Verify
```bash
npm run db:list:providers
```
Shows all providers and their mapping counts.

## 📝 Common Operations

### View All Providers
```bash
npm run db:list:providers
```

### Add a New Provider (THE KEY BENEFIT!)
```bash
PROVIDER_CODE=newinsurer \
PROVIDER_NAME="New Insurance Co" \
npm run db:add:provider
```
⏱️ Takes **5 seconds**. No schema changes needed!

### View Models with Providers
```bash
# All models (first 10)
npm run db:view:models-with-providers

# Specific make
MAKE_NAME=Piper npm run db:view:models-with-providers

# More results
LIMIT=50 npm run db:view:models-with-providers
```

### Export to JSON
```bash
npm run db:export:flexible
```
Generates JSON files in `public/separated/` with backward compatibility.

## 📊 Data Structure Example

### Input: Database Tables

**providers:**
| id | code | name |
|----|------|------|
| 1 | iat | IAT Insurance |
| 2 | rokstone | Rokstone |
| 3 | oraero | Oraero |

**models:**
| id | make_id | label_make | label_model | year |
|----|---------|------------|-------------|------|
| 123 | 10 | Piper | PA-28-181 | 1980 |

**model_provider_mappings:**
| model_id | provider_id | provider_make | provider_model |
|----------|-------------|---------------|----------------|
| 123 | 1 | Piper | PA-28-181 Archer II |
| 123 | 2 | Piper | PA-28-181 |
| 123 | 3 | Piper | PA28-181 |

### Output: JSON File (`piper.json`)

```json
[
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
]
```

## 🎯 Key Benefits

| Feature | Old Schema | New Schema |
|---------|-----------|------------|
| **Add Provider** | Hours (schema migration) | Seconds (INSERT) |
| **Storage** | Wasteful (many NULLs) | Efficient |
| **Flexibility** | Low (hardcoded) | High (dynamic) |
| **Maintenance** | Complex | Simple |
| **Scalability** | Poor | Excellent |
| **Risk** | High (schema changes) | Low (data only) |

## 📦 Files Created

### Scripts (in `scripts/`)
- ✅ `create-flexible-schema.mjs` - Creates tables/views
- ✅ `migrate-to-flexible-schema.mjs` - Migrates old data
- ✅ `view-models-with-providers.mjs` - Query helper
- ✅ `add-provider.mjs` - Add new providers
- ✅ `list-providers.mjs` - List all providers
- ✅ `export-from-flexible-schema.mjs` - Export to JSON

### Documentation
- ✅ `QUICK_START.md` - Quick setup guide
- ✅ `FLEXIBLE_SCHEMA_GUIDE.md` - Complete documentation
- ✅ `SCHEMA_COMPARISON.md` - Old vs new comparison
- ✅ `README_NEW_SCHEMA.md` - This file

### Updated
- ✅ `package.json` - Added 6 new npm scripts

## 🛠️ npm Scripts Added

```json
{
  "db:schema:flexible": "Create schema",
  "db:migrate:flexible": "Migrate data",
  "db:list:providers": "List providers",
  "db:add:provider": "Add provider",
  "db:view:models-with-providers": "View models",
  "db:export:flexible": "Export JSON"
}
```

## 🔄 Migration Checklist

- [ ] Review documentation (QUICK_START.md)
- [ ] Create schema: `npm run db:schema:flexible`
- [ ] Migrate data: `npm run db:migrate:flexible`
- [ ] Verify providers: `npm run db:list:providers`
- [ ] Test queries: `npm run db:view:models-with-providers`
- [ ] Update export script in build pipeline
- [ ] Test frontend with new JSON format
- [ ] Add UI for managing providers (future)
- [ ] Drop old `makemodels_items` table (after validation)

## 💡 Example Use Case

**Scenario**: Your company signs with "Global Aviation Insurance"

**Old Way**:
1. Database team adds columns (1-2 days)
2. Backend team updates models (1 day)
3. Frontend team updates UI (1 day)
4. QA testing (2 days)
5. Coordinate deployment (1 day)
⏱️ **Total: ~1 week**

**New Way**:
```bash
PROVIDER_CODE=global \
PROVIDER_NAME="Global Aviation Insurance" \
npm run db:add:provider
```
⏱️ **Total: 30 seconds**

Then map models via UI or script as needed.

## 🎓 Learn More

1. **Quick Start**: Read `QUICK_START.md`
2. **Full Guide**: Read `FLEXIBLE_SCHEMA_GUIDE.md`
3. **Comparison**: Read `SCHEMA_COMPARISON.md`
4. **Scripts**: Check `scripts/` directory

## 🤝 Support

If you need help:
1. Check the documentation files
2. Run `npm run db:test` to test connection
3. Run `npm run db:list:tables` to see all tables

## ✨ Next Steps

1. **Review the documentation**
2. **Run the migration** when ready
3. **Test with a new provider** to see how easy it is
4. **Update your build pipeline** to use `db:export:flexible`

---

**Made with 🎯 for scalability and flexibility!**

