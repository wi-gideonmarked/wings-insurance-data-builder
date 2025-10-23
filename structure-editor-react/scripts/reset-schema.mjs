import 'dotenv/config';
import { Client } from 'pg';
import readline from 'readline';

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

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  const client = getPgClient();
  const force = process.env.FORCE === 'true';

  try {
    console.log('[reset-schema] Connecting...');
    await client.connect();

    // Check if tables exist
    const checkTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('makes', 'models', 'providers', 'model_provider_mappings')
      ORDER BY table_name
    `);

    if (checkTables.rows.length === 0) {
      console.log('ℹ No existing tables found. Creating new schema...');
    } else {
      console.log('\n⚠️  WARNING: This will DELETE the following tables and ALL their data:');
      checkTables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('\n⚠️  This action CANNOT be undone!');
      console.log('\nTables will be recreated with the new structure (including sf_make, sf_model).\n');

      if (!force) {
        const confirmed = await askConfirmation('Are you sure you want to continue? (yes/no): ');
        if (!confirmed) {
          console.log('\n❌ Operation cancelled by user.');
          process.exit(0);
        }
      } else {
        console.log('⚡ FORCE=true detected. Skipping confirmation.\n');
      }
    }

    await client.query('BEGIN');

    // Step 1: Drop existing tables (in correct order due to foreign keys)
    console.log('\n[Step 1/2] Dropping existing tables...');
    
    const dropSql = `
      -- Drop views first
      DROP VIEW IF EXISTS v_models_with_providers CASCADE;
      DROP VIEW IF EXISTS v_models_complete CASCADE;
      
      -- Drop tables in correct order (child tables first)
      DROP TABLE IF EXISTS model_provider_mappings CASCADE;
      DROP TABLE IF EXISTS models CASCADE;
      DROP TABLE IF EXISTS providers CASCADE;
      DROP TABLE IF EXISTS makes CASCADE;
    `;
    
    await client.query(dropSql);
    console.log('  ✓ Tables dropped');

    // Step 2: Create new schema with Salesforce fields
    console.log('\n[Step 2/2] Creating new schema...');
    
    const createSql = `
      -- ========================================
      -- Core Aircraft Data Tables
      -- ========================================
      
      -- Table 1: Aircraft Makes (Manufacturers)
      CREATE TABLE makes (
        id BIGSERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,       -- Kebab-case identifier (e.g., 'piper', 'cessna')
        name TEXT NOT NULL,              -- Display name (e.g., 'Piper', 'Cessna')
        label TEXT,                      -- Optional user-friendly label
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      
      CREATE INDEX idx_makes_slug ON makes(slug);
      CREATE INDEX idx_makes_name ON makes(LOWER(name));

      -- Table 2: Aircraft Models
      CREATE TABLE models (
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

      CREATE INDEX idx_models_make_id ON models(make_id);
      CREATE INDEX idx_models_label_model ON models("label_model");
      CREATE INDEX idx_models_year ON models(year);
      CREATE INDEX idx_models_sf_make ON models(sf_make);
      CREATE INDEX idx_models_sf_model ON models(sf_model);

      -- ========================================
      -- Insurance Provider Tables (NEW)
      -- ========================================
      
      -- Table 3: Insurance Providers
      CREATE TABLE providers (
        id BIGSERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,       -- e.g., 'iat', 'rokstone', 'oraero' (NOT 'sf')
        name TEXT NOT NULL,              -- e.g., 'IAT Insurance', 'Rokstone'
        is_active BOOLEAN NOT NULL DEFAULT true,
        metadata JSONB,                  -- Additional provider-specific configuration
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX idx_providers_code ON providers(code);
      CREATE INDEX idx_providers_is_active ON providers(is_active);

      -- Table 4: Model-Provider Mappings
      -- This table maps aircraft models to provider-specific names
      CREATE TABLE model_provider_mappings (
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

      CREATE INDEX idx_mappings_model_id ON model_provider_mappings(model_id);
      CREATE INDEX idx_mappings_provider_id ON model_provider_mappings(provider_id);
      CREATE INDEX idx_mappings_is_active ON model_provider_mappings(is_active);
      CREATE INDEX idx_mappings_provider_make ON model_provider_mappings(provider_make);
      CREATE INDEX idx_mappings_provider_model ON model_provider_mappings(provider_model);

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

    await client.query(createSql);
    console.log('  ✓ Schema created');

    await client.query('COMMIT');
    
    console.log('\n✅ Schema reset completed successfully!');
    console.log('\nNew tables created:');
    console.log('  ✓ makes (aircraft manufacturers)');
    console.log('  ✓ models (aircraft models) - includes sf_make, sf_model');
    console.log('  ✓ providers (insurance providers - NOT Salesforce)');
    console.log('  ✓ model_provider_mappings (model-to-provider mappings)');
    console.log('\nViews created:');
    console.log('  ✓ v_models_complete (denormalized view)');
    console.log('  ✓ v_models_with_providers (JSON aggregated view)');
    console.log('\n📝 Next steps:');
    console.log('  1. Migrate data: npm run db:migrate:flexible');
    console.log('  2. Verify: npm run db:list:providers');
    console.log('  3. Export: npm run db:export:flexible');

  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[reset-schema] ERROR:', e?.message || String(e));
    console.error(e.stack);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

