# 🗄️ New Flexible Schema - Visual Guide

## Database Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE DIAGRAM                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│      makes       │  Aircraft Manufacturers
├──────────────────┤
│ 🔑 id            │  Example: 1, 2, 3...
│ 🏷️  slug          │  Kebab-case: "piper", "cessna" (matches JSON filename!)
│ 📝 name          │  Display name: "Piper", "Cessna", "Beechcraft"
│ 📝 label         │  Optional label: "Piper Aircraft Inc."
│ 🕐 created_at    │
│ 🕐 updated_at    │
└────────┬─────────┘
         │
         │ One make has many models
         │
         ▼ (1:N)
┌──────────────────┐
│     models       │  Aircraft Models
├──────────────────┤
│ 🔑 id            │  Example: 101, 102, 103...
│ 🔗 make_id       │  Links to makes.id
│ 🏷️  hash          │  Unique: "piper-pa28-181-1980"
│ 📝 label_make    │  Display: "Piper"
│ 📝 label_model   │  Display: "PA-28-181 Archer II"
│ 📅 year          │  Example: 1980
│ 🕐 created_at    │
│ 🕐 updated_at    │
└────────┬─────────┘
         │
         │ Models can map to many providers (N:M relationship)
         │
         ▼
┌──────────────────────────────┐         ┌──────────────────┐
│ model_provider_mappings      │────────▶│   providers      │
│ (Junction Table)             │         │                  │
├──────────────────────────────┤         ├──────────────────┤
│ 🔑 id                        │         │ 🔑 id            │
│ 🔗 model_id                  │         │ 🏷️  code          │  "iat", "rokstone", "oraero"
│ 🔗 provider_id               │────────▶│ 📝 name          │  "IAT Insurance", "Rokstone"
│ 📝 provider_make             │         │ ✅ is_active     │  true/false
│ 📝 provider_model            │         │ 📦 metadata      │  JSON (optional config)
│ ✅ is_active                 │         │ 🕐 created_at    │
│ 📝 notes                     │         │ 🕐 updated_at    │
│ 🕐 created_at                │         └──────────────────┘
│ 🕐 updated_at                │
└──────────────────────────────┘

Legend:
🔑 Primary Key
🔗 Foreign Key
📝 Text/String
📅 Integer
✅ Boolean
📦 JSON
🕐 Timestamp
```

## Real Data Example

### Scenario: Piper PA-28-181 Archer II (1980)

#### Table 1️⃣: `makes`
```
┌─────┬────────────┬────────────┬────────────────────┬─────────────────────┐
│ id  │ slug       │ name       │ label              │ created_at          │
├─────┼────────────┼────────────┼────────────────────┼─────────────────────┤
│ 1   │ cessna     │ Cessna     │ Cessna             │ 2024-01-15 10:00:00 │
│ 2   │ piper      │ Piper      │ Piper              │ 2024-01-15 10:00:01 │
│ 3   │ beechcraft │ Beechcraft │ Beechcraft         │ 2024-01-15 10:00:02 │
│ 4   │ cirrus     │ Cirrus     │ Cirrus             │ 2024-01-15 10:00:03 │
└─────┴────────────┴────────────┴────────────────────┴─────────────────────┘
       ↑
       This slug matches the JSON filename: piper.json, cessna.json, etc.
```

#### Table 2️⃣: `providers`
```
┌─────┬───────────┬─────────────────────┬───────────┬──────────┬─────────────────────┐
│ id  │ code      │ name                │ is_active │ metadata │ created_at          │
├─────┼───────────┼─────────────────────┼───────────┼──────────┼─────────────────────┤
│ 1   │ iat       │ IAT Insurance       │ true      │ null     │ 2024-01-15 10:00:00 │
│ 2   │ rokstone  │ Rokstone            │ true      │ null     │ 2024-01-15 10:00:01 │
│ 3   │ oraero    │ Oraero              │ true      │ null     │ 2024-01-15 10:00:02 │
│ 4   │ sf        │ Salesforce          │ true      │ null     │ 2024-01-15 10:00:03 │
└─────┴───────────┴─────────────────────┴───────────┴──────────┴─────────────────────┘
```

#### Table 3️⃣: `models`
```
┌─────┬─────────┬────────────────────┬────────────┬────────────────────┬──────┬─────────────────────┐
│ id  │ make_id │ hash               │ label_make │ label_model        │ year │ created_at          │
├─────┼─────────┼────────────────────┼────────────┼────────────────────┼──────┼─────────────────────┤
│ 101 │ 2       │ piper-pa28-161     │ Piper      │ PA-28-161          │ 1978 │ 2024-01-15 11:00:00 │
│ 102 │ 2       │ piper-pa28-181     │ Piper      │ PA-28-181          │ 1980 │ 2024-01-15 11:00:01 │
│ 103 │ 2       │ piper-pa28r-201    │ Piper      │ PA-28R-201 Arrow   │ 1985 │ 2024-01-15 11:00:02 │
│ 104 │ 1       │ cessna-172n        │ Cessna     │ 172N Skyhawk       │ 1981 │ 2024-01-15 11:00:03 │
└─────┴─────────┴────────────────────┴────────────┴────────────────────┴──────┴─────────────────────┘
```

#### Table 4️⃣: `model_provider_mappings`
```
┌─────┬──────────┬─────────────┬───────────────┬──────────────────────────┬───────────┬───────┐
│ id  │ model_id │ provider_id │ provider_make │ provider_model           │ is_active │ notes │
├─────┼──────────┼─────────────┼───────────────┼──────────────────────────┼───────────┼───────┤
│ 501 │ 102      │ 1           │ Piper         │ PA-28-181 Archer II      │ true      │ null  │
│ 502 │ 102      │ 2           │ Piper         │ PA-28-181                │ true      │ null  │
│ 503 │ 102      │ 3           │ Piper         │ PA28-181                 │ true      │ null  │
│ 504 │ 101      │ 1           │ Piper         │ PA-28-161 Warrior II     │ true      │ null  │
│ 505 │ 101      │ 2           │ Piper         │ PA-28-161                │ true      │ null  │
│ 506 │ 104      │ 1           │ Cessna        │ 172N                     │ true      │ null  │
└─────┴──────────┴─────────────┴───────────────┴──────────────────────────┴───────────┴───────┘
```

## How to Read This

Let's trace **Piper PA-28-181** (model_id: 102):

1. **Make**: Look up `models.make_id = 2` → `makes.id = 2`
   - Slug: **"piper"** (JSON filename: `piper.json`)
   - Name: **"Piper"** (Display name)
   - Label: **"Piper"** (Optional friendly label)

2. **Model Details**: `models.id = 102`
   - Hash: `piper-pa28-181`
   - Label: `PA-28-181`
   - Year: `1980`

3. **Provider Mappings**: Find all rows in `model_provider_mappings` where `model_id = 102`:
   - **IAT** (provider_id: 1) calls it: `"PA-28-181 Archer II"`
   - **Rokstone** (provider_id: 2) calls it: `"PA-28-181"`
   - **Oraero** (provider_id: 3) calls it: `"PA28-181"` (no dash!)

## Query to Get Everything

```sql
SELECT 
  mk.name AS make,
  m.label_model AS model,
  m.year,
  p.name AS provider,
  mpm.provider_make,
  mpm.provider_model
FROM models m
JOIN makes mk ON m.make_id = mk.id
LEFT JOIN model_provider_mappings mpm ON m.id = mpm.model_id
LEFT JOIN providers p ON mpm.provider_id = p.id
WHERE m.hash = 'piper-pa28-181';
```

**Result:**
```
┌───────┬───────────┬──────┬───────────────┬───────────────┬──────────────────────┐
│ make  │ model     │ year │ provider      │ provider_make │ provider_model       │
├───────┼───────────┼──────┼───────────────┼───────────────┼──────────────────────┤
│ Piper │ PA-28-181 │ 1980 │ IAT Insurance │ Piper         │ PA-28-181 Archer II  │
│ Piper │ PA-28-181 │ 1980 │ Rokstone      │ Piper         │ PA-28-181            │
│ Piper │ PA-28-181 │ 1980 │ Oraero        │ Piper         │ PA28-181             │
└───────┴───────────┴──────┴───────────────┴───────────────┴──────────────────────┘
```

## JSON Export Format

This data gets exported to `piper.json` as:

```json
{
  "hash": "piper-pa28-181",
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
    },
    {
      "providerId": 3,
      "providerCode": "oraero",
      "providerName": "Oraero",
      "providerMake": "Piper",
      "providerModel": "PA28-181",
      "isActive": true
    }
  ]
}
```

## Adding a New Provider - Visual Example

### Step 1: Add to `providers` table

```sql
INSERT INTO providers (code, name, is_active)
VALUES ('aviationx', 'AviationX Insurance', true);
-- Returns id: 5
```

```
┌─────┬───────────┬─────────────────────┬───────────┐
│ id  │ code      │ name                │ is_active │
├─────┼───────────┼─────────────────────┼───────────┤
│ 1   │ iat       │ IAT Insurance       │ true      │
│ 2   │ rokstone  │ Rokstone            │ true      │
│ 3   │ oraero    │ Oraero              │ true      │
│ 4   │ sf        │ Salesforce          │ true      │
│ 5   │ aviationx │ AviationX Insurance │ true      │ ← NEW!
└─────┴───────────┴─────────────────────┴───────────┘
```

### Step 2: Map models to new provider

```sql
INSERT INTO model_provider_mappings 
  (model_id, provider_id, provider_make, provider_model)
VALUES 
  (102, 5, 'Piper', 'PA-28-181 Archer');
```

```
┌─────┬──────────┬─────────────┬───────────────┬──────────────────────────┐
│ id  │ model_id │ provider_id │ provider_make │ provider_model           │
├─────┼──────────┼─────────────┼───────────────┼──────────────────────────┤
│ 501 │ 102      │ 1           │ Piper         │ PA-28-181 Archer II      │
│ 502 │ 102      │ 2           │ Piper         │ PA-28-181                │
│ 503 │ 102      │ 3           │ Piper         │ PA28-181                 │
│ 507 │ 102      │ 5           │ Piper         │ PA-28-181 Archer         │ ← NEW!
└─────┴──────────┴─────────────┴───────────────┴──────────────────────────┘
```

### Step 3: Done! ✅

Now when you export, the JSON automatically includes:

```json
{
  "aviationxMake": "Piper",
  "aviationxModel": "PA-28-181 Archer",
  "providers": [
    ...existing providers...,
    {
      "providerId": 5,
      "providerCode": "aviationx",
      "providerName": "AviationX Insurance",
      "providerMake": "Piper",
      "providerModel": "PA-28-181 Archer",
      "isActive": true
    }
  ]
}
```

**No schema changes. No code changes. Just data!** 🎉

## Comparison with Old Schema

### OLD (Column per Provider)
```
makemodels_items
┌──────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┐
│ hash │ iat_mk │ iat_md │ rok_mk │ rok_md │ ora_mk │ ora_md │ avx_mk │ avx_md │
├──────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ xyz  │ Piper  │ PA-28  │ Piper  │ PA-28  │ Piper  │ PA28   │ NULL   │ NULL   │
└──────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┘
                                                               ↑ Need to ALTER TABLE!
```

### NEW (Rows per Provider)
```
model_provider_mappings
┌────┬──────────┬─────────────┬──────┬────────┐
│ id │ model_id │ provider_id │ make │ model  │
├────┼──────────┼─────────────┼──────┼────────┤
│ 1  │ 102      │ 1           │ Pip. │ PA-28  │
│ 2  │ 102      │ 2           │ Pip. │ PA-28  │
│ 3  │ 102      │ 3           │ Pip. │ PA28   │
│ 4  │ 102      │ 5           │ Pip. │ PA-28  │ ← Just INSERT!
└────┴──────────┴─────────────┴──────┴────────┘
```

## Summary

🎯 **4 Tables** instead of 1 bloated table  
🎯 **Clean relationships** with foreign keys  
🎯 **Unlimited providers** without schema changes  
🎯 **No NULL values** - only store what exists  
🎯 **Easy queries** - simple JOINs  
🎯 **Backward compatible** - exports old format + new  

Ready to migrate? Run:
```bash
npm run db:schema:flexible
npm run db:migrate:flexible
```

