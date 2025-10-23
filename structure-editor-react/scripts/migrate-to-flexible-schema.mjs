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

function toSlug(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  const client = getPgClient();

  try {
    console.log('[migrate] Connecting...');
    await client.connect();
    await client.query('BEGIN');

    // Step 1: Seed providers from existing data
    console.log('\n[Step 1/4] Creating insurance providers...');
    const providers = [
      { code: 'iat', name: 'IAT Insurance' },
      { code: 'rokstone', name: 'Rokstone' },
      { code: 'oraero', name: 'Oraero' }
    ];

    for (const provider of providers) {
      await client.query(`
        INSERT INTO providers (code, name, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name, updated_at = now()
      `, [provider.code, provider.name]);
      console.log(`  ✓ ${provider.name} (${provider.code})`);
    }

    // Step 2: Check if old schema exists
    console.log('\n[Step 2/4] Checking for existing data...');
    const checkOldTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'makemodels_items'
      );
    `);
    const hasOldTable = checkOldTable.rows[0].exists;

    if (!hasOldTable) {
      console.log('  ℹ No makemodels_items table found. Skipping migration.');
      await client.query('COMMIT');
      return;
    }

    // Step 3: Migrate makes and models
    console.log('\n[Step 3/4] Migrating makes and models...');
    
    // Get distinct makes
    const makesResult = await client.query(`
      SELECT DISTINCT label_make 
      FROM makemodels_items 
      ORDER BY label_make
    `);

    let migratedMakes = 0;
    let migratedModels = 0;

    for (const row of makesResult.rows) {
      const makeName = row.label_make;
      const makeSlug = toSlug(makeName);
      
      // Insert or get make
      const makeResult = await client.query(`
        INSERT INTO makes (slug, name, label)
        VALUES ($1, $2, $2)
        ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            label = EXCLUDED.label,
            updated_at = now()
        RETURNING id
      `, [makeSlug, makeName]);
      const makeId = makeResult.rows[0].id;
      migratedMakes++;

      // Get all models for this make
      const modelsResult = await client.query(`
        SELECT * FROM makemodels_items
        WHERE label_make = $1
      `, [makeName]);

      for (const modelRow of modelsResult.rows) {
        // Insert model (including Salesforce reference data)
        const modelResult = await client.query(`
          INSERT INTO models (make_id, hash, label_make, label_model, year, sf_make, sf_model)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (hash) DO UPDATE
          SET label_make = EXCLUDED.label_make,
              label_model = EXCLUDED.label_model,
              year = EXCLUDED.year,
              sf_make = EXCLUDED.sf_make,
              sf_model = EXCLUDED.sf_model,
              updated_at = now()
          RETURNING id
        `, [makeId, modelRow.hash, modelRow.label_make, modelRow.label_model, modelRow.year, modelRow.sf_make, modelRow.sf_model]);
        const modelId = modelResult.rows[0].id;
        migratedModels++;

        // Create mappings for each provider (excluding Salesforce - it's not an underwriter)
        const mappings = [
          { code: 'iat', make: modelRow.iat_make, model: modelRow.iat_model },
          { code: 'rokstone', make: modelRow.rokstone_make, model: modelRow.rokstone_model },
          { code: 'oraero', make: modelRow.oraero_make, model: modelRow.oraero_model }
        ];

        for (const mapping of mappings) {
          // Only create mapping if both make and model are present
          if (mapping.make && mapping.model) {
            const providerResult = await client.query(
              'SELECT id FROM providers WHERE code = $1',
              [mapping.code]
            );
            
            if (providerResult.rows.length > 0) {
              const providerId = providerResult.rows[0].id;
              await client.query(`
                INSERT INTO model_provider_mappings (model_id, provider_id, provider_make, provider_model)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (model_id, provider_id) DO UPDATE
                SET provider_make = EXCLUDED.provider_make,
                    provider_model = EXCLUDED.provider_model,
                    updated_at = now()
              `, [modelId, providerId, mapping.make, mapping.model]);
            }
          }
        }
      }
    }

    console.log(`  ✓ Migrated ${migratedMakes} makes`);
    console.log(`  ✓ Migrated ${migratedModels} models`);

    // Step 4: Count mappings
    console.log('\n[Step 4/4] Verifying mappings...');
    const mappingCounts = await client.query(`
      SELECT p.name, p.code, COUNT(mpm.id) as mapping_count
      FROM providers p
      LEFT JOIN model_provider_mappings mpm ON p.id = mpm.provider_id
      GROUP BY p.id, p.name, p.code
      ORDER BY p.name
    `);

    for (const row of mappingCounts.rows) {
      console.log(`  ✓ ${row.name}: ${row.mapping_count} mappings`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Verify data: npm run db:view:models-with-providers');
    console.log('  2. Update export scripts to use new schema');
    console.log('  3. Once verified, you can drop makemodels_items table');

  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[migrate] ERROR:', e?.message || String(e));
    console.error(e.stack);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

