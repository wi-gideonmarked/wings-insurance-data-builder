import 'dotenv/config';
import { Client } from 'pg';

function getPgClient() {
  return new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || '5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
}

async function main() {
  const client = getPgClient();
  
  const createSql = `
    -- ========================================
    -- Core Aircraft Data Tables
    -- ========================================
    
    -- Table 1: Aircraft Makes (Manufacturers)
    CREATE TABLE IF NOT EXISTS makes (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,       -- Kebab-case identifier (e.g., 'piper', 'cessna')
      name TEXT NOT NULL,              -- Display name (e.g., 'Piper', 'Cessna')
      label TEXT,                      -- Optional user-friendly label
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_makes_slug ON makes(slug);
    CREATE INDEX IF NOT EXISTS idx_makes_name ON makes(LOWER(name));

    -- Table 2: Aircraft Models
    CREATE TABLE IF NOT EXISTS models (
      id BIGSERIAL PRIMARY KEY,
      make_id BIGINT NOT NULL REFERENCES makes(id) ON DELETE CASCADE,
      hash TEXT NOT NULL UNIQUE,
      label_make TEXT NOT NULL,        -- Display name for make
      label_model TEXT NOT NULL,       -- Display name for model
      year INTEGER,                    -- Model year (optional)
      sf_make TEXT,                    -- Salesforce make name (canonical reference)
      sf_model TEXT,                   -- Salesforce model name (canonical reference)
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_models_make_id ON models(make_id);
    CREATE INDEX IF NOT EXISTS idx_models_label_model ON models("label_model");
    CREATE INDEX IF NOT EXISTS idx_models_year ON models(year);
    CREATE INDEX IF NOT EXISTS idx_models_sf_make ON models(sf_make);
    CREATE INDEX IF NOT EXISTS idx_models_sf_model ON models(sf_model);

    -- ========================================
    -- Insurance Provider Tables (NEW)
    -- ========================================
    
    -- Table 3: Insurance Providers
    CREATE TABLE IF NOT EXISTS providers (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,       -- e.g., 'iat', 'rokstone', 'oraero', 'salesforce'
      name TEXT NOT NULL,              -- e.g., 'IAT Insurance', 'Rokstone'
      is_active BOOLEAN NOT NULL DEFAULT true,
      metadata JSONB,                  -- Additional provider-specific configuration
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_providers_code ON providers(code);
    CREATE INDEX IF NOT EXISTS idx_providers_is_active ON providers(is_active);

    -- Table 4: Model-Provider Mappings
    -- This table maps aircraft models to provider-specific names
    CREATE TABLE IF NOT EXISTS model_provider_mappings (
      id BIGSERIAL PRIMARY KEY,
      model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
      provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      provider_make TEXT NOT NULL,     -- Provider's name for the make
      provider_model TEXT NOT NULL,    -- Provider's name for the model
      is_active BOOLEAN NOT NULL DEFAULT true,
      notes TEXT,                      -- Any special notes about this mapping
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      
      -- Ensure one mapping per model-provider combination
      UNIQUE(model_id, provider_id)
    );

    CREATE INDEX IF NOT EXISTS idx_mappings_model_id ON model_provider_mappings(model_id);
    CREATE INDEX IF NOT EXISTS idx_mappings_provider_id ON model_provider_mappings(provider_id);
    CREATE INDEX IF NOT EXISTS idx_mappings_is_active ON model_provider_mappings(is_active);
    CREATE INDEX IF NOT EXISTS idx_mappings_provider_make ON model_provider_mappings(provider_make);
    CREATE INDEX IF NOT EXISTS idx_mappings_provider_model ON model_provider_mappings(provider_model);

    -- ========================================
    -- Helper Views
    -- ========================================
    
    -- View: Complete aircraft model information with all provider mappings
    CREATE OR REPLACE VIEW v_models_complete AS
    SELECT 
      m.id AS model_id,
      m.hash,
      mk.id AS make_id,
      mk.slug AS make_slug,
      mk.name AS make_name,
      mk.label AS make_label,
      m.label_make,
      m.label_model,
      m.year,
      m.sf_make,
      m.sf_model,
      p.id AS provider_id,
      p.code AS provider_code,
      p.name AS provider_name,
      mpm.provider_make,
      mpm.provider_model,
      mpm.is_active AS mapping_is_active,
      mpm.notes AS mapping_notes
    FROM models m
    JOIN makes mk ON m.make_id = mk.id
    LEFT JOIN model_provider_mappings mpm ON m.id = mpm.model_id
    LEFT JOIN providers p ON mpm.provider_id = p.id;

    -- View: Models with provider mappings in JSON format (for easy API consumption)
    CREATE OR REPLACE VIEW v_models_with_providers AS
    SELECT 
      m.id AS model_id,
      m.hash,
      mk.id AS make_id,
      mk.slug AS make_slug,
      mk.name AS make_name,
      mk.label AS make_label,
      m.label_make,
      m.label_model,
      m.year,
      m.sf_make,
      m.sf_model,
      COALESCE(
        json_agg(
          json_build_object(
            'providerId', p.id,
            'providerCode', p.code,
            'providerName', p.name,
            'providerMake', mpm.provider_make,
            'providerModel', mpm.provider_model,
            'isActive', mpm.is_active
          )
          ORDER BY p.code
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::json
      ) AS provider_mappings
    FROM models m
    JOIN makes mk ON m.make_id = mk.id
    LEFT JOIN model_provider_mappings mpm ON m.id = mpm.model_id AND mpm.is_active = true
    LEFT JOIN providers p ON mpm.provider_id = p.id AND p.is_active = true
    GROUP BY m.id, m.hash, mk.id, mk.slug, mk.name, mk.label, m.label_make, m.label_model, m.year, m.sf_make, m.sf_model;
  `;

  try {
    console.log('[create-flexible-schema] Connecting...');
    await client.connect();
    console.log('[create-flexible-schema] Creating tables and views...');
    await client.query('BEGIN');
    await client.query(createSql);
    await client.query('COMMIT');
    console.log('[create-flexible-schema] ✓ Schema created successfully');
    console.log('\nTables created:');
    console.log('  - makes (aircraft manufacturers)');
    console.log('  - models (aircraft models)');
    console.log('  - providers (insurance providers)');
    console.log('  - model_provider_mappings (model-to-provider mappings)');
    console.log('\nViews created:');
    console.log('  - v_models_complete (denormalized view)');
    console.log('  - v_models_with_providers (JSON aggregated view)');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[create-flexible-schema] ERROR:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

