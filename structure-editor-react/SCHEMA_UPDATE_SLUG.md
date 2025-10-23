# Schema Update: Added `slug` Field to Makes Table

## What Changed

The `makes` table now includes a **`slug`** field that stores the kebab-case version of the make name, which directly corresponds to the JSON filename in the `separated/` directory.

### Before
```sql
CREATE TABLE makes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,  -- e.g., "Piper"
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### After ✅
```sql
CREATE TABLE makes (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,   -- e.g., "piper" → piper.json
  name TEXT NOT NULL,          -- e.g., "Piper"
  label TEXT,                  -- e.g., "Piper Aircraft Inc." (optional)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Why This Matters

### Problem
Previously, the system had to **generate** the kebab-case filename from the make name every time:
```javascript
const slug = toSlug(make.name); // "Piper" → "piper"
const filename = `${slug}.json`;
```

This meant:
- ❌ Inconsistent slug generation
- ❌ Can't customize filename if needed
- ❌ No single source of truth
- ❌ Harder to query by filename

### Solution
Now the slug is **stored in the database**:
```javascript
const slug = make.slug; // Already "piper" from database
const filename = `${slug}.json`;
```

This means:
- ✅ Consistent slug across all operations
- ✅ Can customize slug if needed (e.g., "de-havilland" vs "de_havilland")
- ✅ Slug is the source of truth
- ✅ Easy to query: `SELECT * FROM makes WHERE slug = 'piper'`

## Example Data

```
┌─────┬─────────────────┬──────────────────┬──────────────────────────┐
│ id  │ slug            │ name             │ label                    │
├─────┼─────────────────┼──────────────────┼──────────────────────────┤
│ 1   │ piper           │ Piper            │ Piper                    │
│ 2   │ cessna          │ Cessna           │ Cessna                   │
│ 3   │ beechcraft      │ Beechcraft       │ Beechcraft               │
│ 4   │ de-havilland    │ De Havilland     │ De Havilland Canada      │
│ 5   │ bell            │ Bell             │ Bell Helicopter          │
└─────┴─────────────────┴──────────────────┴──────────────────────────┘
       ↑                 ↑                  ↑
       Filename          Display in UI     Optional detailed label
       piper.json        "Piper"          "Piper Aircraft Inc."
```

## Relationship to JSON Files

The `slug` field directly maps to your separated JSON files:

```
wings-insurance-data-builder/structure-editor-react/separated/
├── piper.json          ← slug: "piper"
├── cessna.json         ← slug: "cessna"
├── beechcraft.json     ← slug: "beechcraft"
├── de-havilland.json   ← slug: "de-havilland"
└── bell.json           ← slug: "bell"
```

## Migration

The migration script automatically generates slugs from existing names:

```javascript
function toSlug(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// "Piper" → "piper"
// "De Havilland" → "de-havilland"
// "Bell Helicopter" → "bell-helicopter"
```

## Usage Examples

### Adding a New Make

```bash
# Simple (slug auto-generated)
MAKE_NAME="Piper" npm run db:add:make

# With custom slug
MAKE_NAME="De Havilland" MAKE_SLUG="de-havilland" npm run db:add:make

# With label
MAKE_NAME="Piper" MAKE_LABEL="Piper Aircraft Inc." npm run db:add:make
```

### Query by Slug

```sql
-- Find make by slug
SELECT * FROM makes WHERE slug = 'piper';

-- Find all models for a make by slug
SELECT m.*
FROM models m
JOIN makes mk ON m.make_id = mk.id
WHERE mk.slug = 'piper';
```

### Export Uses Slug

```javascript
// In export-from-flexible-schema.mjs
for (const make of makes) {
  const slug = make.slug; // Direct from database
  const filePath = path.join(destDir, `${slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
}
```

## Benefits

### 1. **Consistent Naming**
All parts of the system use the same slug:
- Database: `makes.slug = "piper"`
- Filesystem: `piper.json`
- API: `/api/makes/piper`
- Frontend: `/makes/piper`

### 2. **Customizable**
You can override the auto-generated slug if needed:
```bash
# Special case: want "dehavilland" instead of "de-havilland"
MAKE_NAME="De Havilland" MAKE_SLUG="dehavilland" npm run db:add:make
```

### 3. **URL-Safe**
Slugs are always URL-safe (lowercase, no spaces, alphanumeric + hyphens)

### 4. **Queryable**
Easy to find data by filename:
```sql
SELECT * FROM makes WHERE slug = 'piper';
```

### 5. **Single Source of Truth**
The database slug is the authoritative filename - no guessing or generating.

## Updated Scripts

All scripts have been updated to support the slug field:

| Script | What Changed |
|--------|-------------|
| `create-flexible-schema.mjs` | Added `slug` and `label` columns |
| `migrate-to-flexible-schema.mjs` | Auto-generates slugs during migration |
| `view-makes.mjs` | Shows slug in output |
| `export-from-flexible-schema.mjs` | Uses `make.slug` instead of generating |
| `add-make.mjs` | **NEW** - Helper to add makes with slug |

## New npm Command

```bash
# Add a new make
npm run db:add:make
```

Usage:
```bash
MAKE_NAME="Piper" npm run db:add:make
MAKE_NAME="Piper" MAKE_SLUG="piper" MAKE_LABEL="Piper Aircraft" npm run db:add:make
```

## Summary

| Field | Purpose | Example | Required |
|-------|---------|---------|----------|
| `slug` | Filename, URLs, unique identifier | `"piper"` | ✅ Yes |
| `name` | Display name in UI | `"Piper"` | ✅ Yes |
| `label` | Optional detailed/friendly name | `"Piper Aircraft Inc."` | ❌ No |

**Key Insight**: The `slug` field bridges your **database** and **filesystem**, ensuring consistency across your entire system.

## Migration Checklist

- ✅ Schema updated with `slug` and `label` fields
- ✅ Migration script generates slugs automatically
- ✅ Export script uses database slug
- ✅ View scripts show slug field
- ✅ New `add-make` script created
- ✅ Documentation updated

No action needed - the migration handles everything automatically! 🎉

