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

  const sql = `
    SELECT 
      p.id,
      p.code,
      p.name,
      p.is_active,
      COUNT(mpm.id) as model_count,
      p.created_at,
      p.updated_at
    FROM providers p
    LEFT JOIN model_provider_mappings mpm ON p.id = mpm.provider_id
    GROUP BY p.id, p.code, p.name, p.is_active, p.created_at, p.updated_at
    ORDER BY p.name
  `;

  try {
    console.log('[list-providers] Connecting...');
    await client.connect();
    const res = await client.query(sql);
    
    console.log('\n=== Insurance Providers ===\n');
    for (const row of res.rows) {
      const status = row.is_active ? '✓ Active' : '✗ Inactive';
      console.log(`${status} | ${row.name} (${row.code})`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Models mapped: ${row.model_count}`);
      console.log(`  Created: ${new Date(row.created_at).toLocaleDateString()}`);
      console.log('');
    }
    
    console.log(`Total providers: ${res.rows.length}\n`);
  } catch (e) {
    console.error('[list-providers] ERROR:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

