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
  const providerCode = process.env.PROVIDER_CODE;
  const providerName = process.env.PROVIDER_NAME;
  const isActive = process.env.IS_ACTIVE !== 'false'; // Default to true

  if (!providerCode || !providerName) {
    console.error('Usage: PROVIDER_CODE=xyz PROVIDER_NAME="XYZ Insurance" npm run db:add-provider');
    console.error('\nOptional: IS_ACTIVE=false (default: true)');
    process.exit(1);
  }

  const client = getPgClient();

  try {
    console.log('[add-provider] Connecting...');
    await client.connect();

    const result = await client.query(`
      INSERT INTO providers (code, name, is_active)
      VALUES ($1, $2, $3)
      ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          is_active = EXCLUDED.is_active,
          updated_at = now()
      RETURNING *
    `, [providerCode, providerName, isActive]);

    const provider = result.rows[0];
    console.log('✓ Provider saved successfully:');
    console.log(JSON.stringify(provider, null, 2));
    
    console.log('\nNext steps:');
    console.log('  1. Map aircraft models to this provider using the UI or import script');
    console.log('  2. View all providers: npm run db:list:providers');
  } catch (e) {
    console.error('[add-provider] ERROR:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

