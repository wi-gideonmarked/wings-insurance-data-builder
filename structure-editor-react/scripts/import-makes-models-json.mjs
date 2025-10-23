import 'dotenv/config';
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

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
  const jsonFilePath = process.env.JSON_FILE || path.join(process.cwd(), 'makes-models.json');

  try {
    console.log('[import-makes-models-json] Starting import...');
    console.log(`[import-makes-models-json] Reading: ${jsonFilePath}`);
    
    // Read and parse JSON file
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log(`[import-makes-models-json] Found ${jsonData.length} records`);

    await client.connect();
    await client.query('BEGIN');

    // Step 1: Create providers (insurance companies only, NOT Salesforce)
    console.log('\n[Step 1/5] Creating insurance providers...');
    const providers = [
      { code: 'iat', name: 'IAT Insurance' },
      { code: 'rokstone', name: 'Rokstone' },
      { code: 'oraero', name: 'Oraero' }
    ];

    const providerIds = {};
    for (const provider of providers) {
      const result = await client.query(`
        INSERT INTO providers (code, name, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name, updated_at = now()
        RETURNING id
      `, [provider.code, provider.name]);
      providerIds[provider.code] = result.rows[0].id;
      console.log(`  ✓ ${provider.name} (${provider.code}) - ID: ${providerIds[provider.code]}`);
    }

    // Step 2: Group by make and create make records
    console.log('\n[Step 2/5] Creating makes...');
    const makeMap = new Map(); // key: labelMake (preserves case), value: { id, slug, name }
    const makeGroups = {};

    // Group models by make (case-sensitive)
    for (const item of jsonData) {
      const makeName = item.labelMake;
      if (!makeGroups[makeName]) {
        makeGroups[makeName] = [];
      }
      makeGroups[makeName].push(item);
    }

    let makeCount = 0;
    for (const makeName of Object.keys(makeGroups).sort()) {
      const makeSlug = toSlug(makeName);
      
      const result = await client.query(`
        INSERT INTO makes (slug, name, label)
        VALUES ($1, $2, $2)
        ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            label = EXCLUDED.label,
            updated_at = now()
        RETURNING id
      `, [makeSlug, makeName]);
      
      const makeId = result.rows[0].id;
      makeMap.set(makeName, { id: makeId, slug: makeSlug, name: makeName });
      makeCount++;
      
      if (makeCount % 10 === 0 || makeCount === Object.keys(makeGroups).length) {
        console.log(`  ✓ Created ${makeCount}/${Object.keys(makeGroups).length} makes`);
      }
    }

    // Step 3: Create models with Salesforce fields
    console.log('\n[Step 3/5] Creating models...');
    const modelMap = new Map(); // key: hash, value: model_id
    let modelCount = 0;
    let skippedCount = 0;

    for (const item of jsonData) {
      const makeInfo = makeMap.get(item.labelMake);
      if (!makeInfo) {
        console.warn(`  ⚠️  Make not found for: ${item.labelMake}`);
        skippedCount++;
        continue;
      }

      try {
        const result = await client.query(`
          INSERT INTO models (
            make_id, 
            hash, 
            label_make, 
            label_model, 
            year,
            sf_make,
            sf_model
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (hash) DO UPDATE
          SET label_make = EXCLUDED.label_make,
              label_model = EXCLUDED.label_model,
              year = EXCLUDED.year,
              sf_make = EXCLUDED.sf_make,
              sf_model = EXCLUDED.sf_model,
              updated_at = now()
          RETURNING id
        `, [
          makeInfo.id,
          item.hash,
          item.labelMake,        // Preserve exact case
          item.labelModel,       // Preserve exact case
          item.year || null,
          item.sfMake || null,   // Salesforce make - preserve exact case
          item.sfModel || null   // Salesforce model - preserve exact case
        ]);

        const modelId = result.rows[0].id;
        modelMap.set(item.hash, modelId);
        modelCount++;

        if (modelCount % 1000 === 0) {
          console.log(`  ✓ Created ${modelCount}/${jsonData.length} models`);
        }
      } catch (err) {
        console.error(`  ❌ Error creating model ${item.hash}:`, err.message);
        skippedCount++;
      }
    }

    console.log(`  ✓ Created ${modelCount} models total`);
    if (skippedCount > 0) {
      console.log(`  ⚠️  Skipped ${skippedCount} models due to errors`);
    }

    // Step 4: Create provider mappings
    console.log('\n[Step 4/5] Creating provider mappings...');
    let mappingCount = 0;
    let mappingSkipped = 0;

    for (const item of jsonData) {
      const modelId = modelMap.get(item.hash);
      if (!modelId) {
        mappingSkipped++;
        continue;
      }

      // Define mappings for each provider
      const mappings = [
        {
          code: 'iat',
          make: item.iatMake,
          model: item.iatModel
        },
        {
          code: 'rokstone',
          make: item.rokstoneMake,
          model: item.rokstoneModel
        },
        {
          code: 'oraero',
          make: item.oraeroMake,
          model: item.oraeroModel
        }
      ];

      for (const mapping of mappings) {
        // Only create mapping if BOTH make and model are present and not empty
        const hasMake = mapping.make && mapping.make.trim() !== '';
        const hasModel = mapping.model && mapping.model.trim() !== '';
        
        if (hasMake && hasModel) {
          try {
            await client.query(`
              INSERT INTO model_provider_mappings (
                model_id, 
                provider_id, 
                provider_make, 
                provider_model,
                is_active
              )
              VALUES ($1, $2, $3, $4, true)
              ON CONFLICT (model_id, provider_id) DO UPDATE
              SET provider_make = EXCLUDED.provider_make,
                  provider_model = EXCLUDED.provider_model,
                  is_active = EXCLUDED.is_active,
                  updated_at = now()
            `, [
              modelId,
              providerIds[mapping.code],
              mapping.make,   // Preserve exact case
              mapping.model   // Preserve exact case
            ]);
            mappingCount++;
          } catch (err) {
            console.error(`  ❌ Error creating mapping for model ${item.hash}, provider ${mapping.code}:`, err.message);
          }
        }
      }

      if (mappingCount % 5000 === 0 && mappingCount > 0) {
        console.log(`  ✓ Created ${mappingCount} mappings`);
      }
    }

    console.log(`  ✓ Created ${mappingCount} provider mappings total`);

    // Step 5: Verify counts
    console.log('\n[Step 5/5] Verifying import...');
    
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM makes) as makes_count,
        (SELECT COUNT(*) FROM models) as models_count,
        (SELECT COUNT(*) FROM providers) as providers_count,
        (SELECT COUNT(*) FROM model_provider_mappings) as mappings_count
    `);

    console.log(`  ✓ Makes: ${counts.rows[0].makes_count}`);
    console.log(`  ✓ Models: ${counts.rows[0].models_count}`);
    console.log(`  ✓ Providers: ${counts.rows[0].providers_count}`);
    console.log(`  ✓ Mappings: ${counts.rows[0].mappings_count}`);

    // Show provider breakdown
    const providerBreakdown = await client.query(`
      SELECT p.name, p.code, COUNT(mpm.id) as mapping_count
      FROM providers p
      LEFT JOIN model_provider_mappings mpm ON p.id = mpm.provider_id
      GROUP BY p.id, p.name, p.code
      ORDER BY p.name
    `);

    console.log('\n  Provider Breakdown:');
    for (const row of providerBreakdown.rows) {
      console.log(`    ${row.name} (${row.code}): ${row.mapping_count} mappings`);
    }

    // Show sample with Salesforce fields
    console.log('\n  Sample models with Salesforce fields:');
    const samples = await client.query(`
      SELECT 
        m.hash,
        m.label_make,
        m.label_model,
        m.year,
        m.sf_make,
        m.sf_model
      FROM models m
      WHERE m.sf_make IS NOT NULL OR m.sf_model IS NOT NULL
      LIMIT 3
    `);

    for (const sample of samples.rows) {
      console.log(`    ${sample.label_make} ${sample.label_model} (${sample.year})`);
      console.log(`      SF: ${sample.sf_make || '(null)'} / ${sample.sf_model || '(null)'}`);
    }

    await client.query('COMMIT');
    
    console.log('\n✅ Import completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Verify data: npm run db:view:models-with-providers');
    console.log('  2. Export to JSON: npm run db:export:flexible');
    console.log('  3. Check providers: npm run db:list:providers');
    console.log('\n💡 Note: Case sensitivity has been preserved for all make/model names');

  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[import-makes-models-json] ERROR:', e?.message || String(e));
    console.error(e.stack);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

