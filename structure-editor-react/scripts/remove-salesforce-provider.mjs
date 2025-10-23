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
    console.log('[remove-salesforce] Connecting...');
    await client.connect();
    await client.query('BEGIN');

    // Check if Salesforce provider exists
    const checkResult = await client.query(`
      SELECT id, code, name FROM providers WHERE code = 'salesforce' OR code = 'sf'
    `);

    if (checkResult.rows.length === 0) {
      console.log('[remove-salesforce] No Salesforce provider found. Nothing to do.');
      await client.query('COMMIT');
      return;
    }

    for (const provider of checkResult.rows) {
      console.log(`\n[remove-salesforce] Found provider: ${provider.name} (${provider.code})`);
      
      // Check if there are any mappings
      const mappingsResult = await client.query(`
        SELECT COUNT(*) as count FROM model_provider_mappings WHERE provider_id = $1
      `, [provider.id]);
      
      const mappingCount = parseInt(mappingsResult.rows[0].count);
      
      if (mappingCount > 0) {
        console.log(`  ⚠️  Has ${mappingCount} model mappings`);
        console.log(`  → Deleting mappings...`);
        await client.query(`
          DELETE FROM model_provider_mappings WHERE provider_id = $1
        `, [provider.id]);
        console.log(`  ✓ Deleted ${mappingCount} mappings`);
      } else {
        console.log(`  ✓ No mappings found`);
      }
      
      // Delete the provider
      await client.query(`DELETE FROM providers WHERE id = $1`, [provider.id]);
      console.log(`  ✓ Deleted provider: ${provider.name}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Salesforce provider removed successfully!');
    console.log('\nRemaining providers:');
    
    const remainingProviders = await client.query(`
      SELECT code, name, 
        (SELECT COUNT(*) FROM model_provider_mappings WHERE provider_id = providers.id) as mapping_count
      FROM providers 
      ORDER BY name
    `);
    
    for (const p of remainingProviders.rows) {
      console.log(`  • ${p.name} (${p.code}) - ${p.mapping_count} mappings`);
    }

  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[remove-salesforce] ERROR:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

