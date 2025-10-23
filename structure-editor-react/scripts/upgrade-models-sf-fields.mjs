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

  try {
    console.log('[upgrade-models-sf-fields] Connecting...');
    await client.connect();
    await client.query('BEGIN');

    // Step 1: Add sf_make and sf_model columns to models table
    console.log('\n[Step 1/3] Adding sf_make and sf_model columns to models table...');
    await client.query(`
      ALTER TABLE models 
      ADD COLUMN IF NOT EXISTS sf_make TEXT,
      ADD COLUMN IF NOT EXISTS sf_model TEXT;
    `);
    console.log('  ✓ Columns added');

    // Step 2: Create indexes for the new columns
    console.log('\n[Step 2/3] Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_models_sf_make ON models(sf_make);
      CREATE INDEX IF NOT EXISTS idx_models_sf_model ON models(sf_model);
    `);
    console.log('  ✓ Indexes created');

    // Step 3: Migrate data from makemodels_items if it exists
    console.log('\n[Step 3/3] Migrating Salesforce data from makemodels_items...');
    const checkOldTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'makemodels_items'
      );
    `);
    const hasOldTable = checkOldTable.rows[0].exists;

    if (hasOldTable) {
      const updateResult = await client.query(`
        UPDATE models m
        SET 
          sf_make = mmi.sf_make,
          sf_model = mmi.sf_model,
          updated_at = now()
        FROM makemodels_items mmi
        WHERE m.hash = mmi.hash
          AND (m.sf_make IS NULL OR m.sf_model IS NULL)
      `);
      console.log(`  ✓ Updated ${updateResult.rowCount} models with Salesforce data`);
    } else {
      console.log('  ℹ No makemodels_items table found. Skipping data migration.');
    }

    // Step 4: Update views to include sf_make and sf_model
    console.log('\n[Step 4/4] Updating views...');
    await client.query(`
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

      -- View: Models with provider mappings in JSON format
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
    `);
    console.log('  ✓ Views updated');

    await client.query('COMMIT');
    console.log('\n✅ Upgrade completed successfully!');
    console.log('\nSalesforce fields (sf_make, sf_model) are now:');
    console.log('  ✓ Added to models table');
    console.log('  ✓ Indexed for performance');
    console.log('  ✓ Included in views');
    console.log('  ✓ Will be exported in JSON files');
    console.log('\nNote: Salesforce is treated as canonical reference data, NOT as an insurance provider.');

  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[upgrade-models-sf-fields] ERROR:', e?.message || String(e));
    console.error(e.stack);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

