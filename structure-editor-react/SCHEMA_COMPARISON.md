# Schema Comparison: Old vs New

## Old Schema (Inflexible)

```
┌────────────────────────────────────────────────────────┐
│              makemodels_items                          │
├────────────────────────────────────────────────────────┤
│ hash (PK)                                              │
│ label_make                                             │
│ label_model                                            │
│ iat_make          ← Hardcoded column for IAT          │
│ iat_model         ← Must modify schema to add more    │
│ rokstone_make     ← providers                          │
│ rokstone_model                                         │
│ oraero_make                                            │
│ oraero_model                                           │
│ sf_make                                                │
│ sf_model                                               │
│ year                                                   │
└────────────────────────────────────────────────────────┘
```

### To Add a New Provider (OLD way):
1. ❌ Run `ALTER TABLE` to add columns
2. ❌ Update all existing rows
3. ❌ Modify export scripts
4. ❌ Update application code
5. ❌ Coordinate deployment

**Problems:**
- 🔴 Schema changes for every new provider
- 🔴 Many NULL values (sparse data)
- 🔴 Can't easily query "all providers"
- 🔴 Difficult to deactivate a provider

---

## New Schema (Flexible)

```
┌──────────────┐           ┌─────────────────────┐
│    makes     │           │       models        │
├──────────────┤           ├─────────────────────┤
│ id (PK)      │←─────1:N──│ id (PK)             │
│ name         │           │ make_id (FK)        │
└──────────────┘           │ hash                │
                           │ label_make          │
                           │ label_model         │
                           │ year                │
                           └──────────┬──────────┘
                                      │
                                      │ N:M
                                      │
      ┌───────────────┐         ┌────▼──────────────────────┐
      │   providers   │         │ model_provider_mappings   │
      ├───────────────┤    1:N  ├───────────────────────────┤
      │ id (PK)       │◀────────│ id (PK)                   │
      │ code          │         │ model_id (FK)             │
      │ name          │         │ provider_id (FK)          │
      │ is_active     │         │ provider_make             │
      │ metadata      │         │ provider_model            │
      └───────────────┘         │ is_active                 │
                                │ notes                     │
                                └───────────────────────────┘
```

### To Add a New Provider (NEW way):
1. ✅ `npm run db:add:provider` (one command!)
2. ✅ Map models to provider (via UI or script)
3. ✅ Done!

**Benefits:**
- 🟢 No schema changes needed
- 🟢 No NULL values (efficient storage)
- 🟢 Easy to query relationships
- 🟢 Can activate/deactivate providers
- 🟢 Can add provider-specific metadata

---

## Data Comparison

### OLD: Single Row for Piper PA-28-181

```sql
SELECT * FROM makemodels_items WHERE hash = 'abc123';
```

```
┌─────────┬────────────┬──────────────┬──────────┬────────────┬──────────────┬─────────────────┬────────────┬──────────────┬─────────┬──────────┬──────┐
│  hash   │ label_make │ label_model  │ iat_make │ iat_model  │ rokstone_make│ rokstone_model  │ oraero_make│ oraero_model │ sf_make │ sf_model │ year │
├─────────┼────────────┼──────────────┼──────────┼────────────┼──────────────┼─────────────────┼────────────┼──────────────┼─────────┼──────────┼──────┤
│ abc123  │ Piper      │ PA-28-181    │ Piper    │ PA-28-181  │ Piper        │ PA-28-181       │ Piper      │ PA28-181     │ NULL    │ NULL     │ 1980 │
└─────────┴────────────┴──────────────┴──────────┴────────────┴──────────────┴─────────────────┴────────────┴──────────────┴─────────┴──────────┴──────┘
```

**Note the NULL values for sf_make and sf_model - wasted space!**

---

### NEW: Normalized Data

#### Makes Table
```sql
SELECT * FROM makes WHERE name = 'Piper';
```
```
┌────┬───────┐
│ id │ name  │
├────┼───────┤
│ 10 │ Piper │
└────┴───────┘
```

#### Models Table
```sql
SELECT * FROM models WHERE hash = 'abc123';
```
```
┌─────┬─────────┬─────────┬────────────┬──────────────┬──────┐
│ id  │ make_id │  hash   │ label_make │ label_model  │ year │
├─────┼─────────┼─────────┼────────────┼──────────────┼──────┤
│ 123 │   10    │ abc123  │ Piper      │ PA-28-181    │ 1980 │
└─────┴─────────┴─────────┴────────────┴──────────────┴──────┘
```

#### Providers Table
```sql
SELECT * FROM providers WHERE is_active = true;
```
```
┌────┬───────────┬────────────────┬───────────┐
│ id │   code    │      name      │ is_active │
├────┼───────────┼────────────────┼───────────┤
│ 1  │ iat       │ IAT Insurance  │   true    │
│ 2  │ rokstone  │ Rokstone       │   true    │
│ 3  │ oraero    │ Oraero         │   true    │
│ 4  │ newco     │ NewCo Insurance│   true    │  ← Easy to add!
└────┴───────────┴────────────────┴───────────┘
```

#### Model-Provider Mappings
```sql
SELECT * FROM model_provider_mappings WHERE model_id = 123;
```
```
┌─────┬──────────┬─────────────┬───────────────┬─────────────────┬───────────┐
│ id  │ model_id │ provider_id │ provider_make │ provider_model  │ is_active │
├─────┼──────────┼─────────────┼───────────────┼─────────────────┼───────────┤
│ 501 │   123    │      1      │ Piper         │ PA-28-181       │   true    │
│ 502 │   123    │      2      │ Piper         │ PA-28-181       │   true    │
│ 503 │   123    │      3      │ Piper         │ PA28-181        │   true    │ ← Note different format!
└─────┴──────────┴─────────────┴───────────────┴─────────────────┴───────────┘
```

**No NULL values! Only store what's needed.**

---

## Storage Efficiency

### OLD Schema Storage

For 10,000 models with 4 providers:
- Each row: ~500 bytes (with NULLs)
- Total: ~5 MB
- If model only maps to 1 provider: **75% wasted space**

### NEW Schema Storage

For 10,000 models with 4 providers:
- Makes: 100 rows × 50 bytes = 5 KB
- Models: 10,000 rows × 200 bytes = 2 MB
- Providers: 4 rows × 100 bytes = 400 bytes
- Mappings: 10,000 rows × 150 bytes = 1.5 MB
- Total: ~3.5 MB
- **30% smaller** + more flexible!

---

## Query Performance

### Get all providers for a model

**OLD:**
```sql
-- Have to check each column individually
SELECT 
  CASE WHEN iat_make IS NOT NULL THEN 'IAT' END as provider_iat,
  CASE WHEN rokstone_make IS NOT NULL THEN 'Rokstone' END as provider_rokstone,
  CASE WHEN oraero_make IS NOT NULL THEN 'Oraero' END as provider_oraero,
  CASE WHEN sf_make IS NOT NULL THEN 'Salesforce' END as provider_sf
FROM makemodels_items
WHERE hash = 'abc123';
```
❌ Complex  
❌ Hard to maintain  
❌ Must update for new providers

**NEW:**
```sql
-- Simple JOIN
SELECT p.name, mpm.provider_make, mpm.provider_model
FROM model_provider_mappings mpm
JOIN providers p ON mpm.provider_id = p.id
WHERE mpm.model_id = 123;
```
✅ Simple  
✅ Elegant  
✅ Works for any number of providers

---

## Adding a New Provider

### OLD Way
```sql
-- Step 1: Add columns (requires downtime!)
ALTER TABLE makemodels_items 
  ADD COLUMN newco_make TEXT,
  ADD COLUMN newco_model TEXT;

-- Step 2: Backfill data for 10,000 rows
UPDATE makemodels_items 
SET newco_make = label_make,
    newco_model = label_model
WHERE <some condition>;

-- Step 3: Update application code
-- Step 4: Update export scripts
-- Step 5: Redeploy everything
```

⏱️ Time: **Hours to days**  
🔴 Risk: **High** (schema migration)  
📉 Downtime: **Required**

### NEW Way
```bash
# Step 1: Add provider
PROVIDER_CODE=newco PROVIDER_NAME="NewCo Insurance" npm run db:add:provider

# Step 2: Map models (optional, can be done gradually)
# Via UI or script

# Done!
```

⏱️ Time: **Seconds**  
🟢 Risk: **Low** (just insert data)  
📈 Downtime: **None**

---

## Migration Path

### Phase 1: Create New Schema ✅
```bash
npm run db:schema:flexible
```

### Phase 2: Migrate Data ✅
```bash
npm run db:migrate:flexible
```

### Phase 3: Run in Parallel 🔄
- Keep both schemas active
- Export from new schema
- Verify data integrity

### Phase 4: Switch Over 🔄
- Update application to use new schema
- Update all queries

### Phase 5: Cleanup ⏳
- Drop old `makemodels_items` table
- Remove old scripts

---

## Conclusion

| Aspect | Old Schema | New Schema |
|--------|-----------|------------|
| **Flexibility** | 🔴 Low | 🟢 High |
| **Scalability** | 🔴 Poor | 🟢 Excellent |
| **Storage** | 🟡 Wasteful | 🟢 Efficient |
| **Queries** | 🟡 Complex | 🟢 Simple |
| **Add Provider** | 🔴 Hours | 🟢 Seconds |
| **Maintenance** | 🔴 High | 🟢 Low |
| **Risk** | 🔴 High | 🟢 Low |

**Recommendation: Migrate to the new schema** ✅

