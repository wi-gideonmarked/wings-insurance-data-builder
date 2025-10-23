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
  const limit = Number(process.env.LIMIT) || 100;
  const sql = `
    SELECT id, slug, name, label, created_at, updated_at
    FROM makes
    ORDER BY name ASC
    LIMIT $1
  `;

  try {
    console.log('[view-makes] Connecting...');
    await client.connect();
    const res = await client.query(sql, [limit]);
    console.log(JSON.stringify(res.rows, null, 2));
    console.log(`\n[view-makes] Returned ${res.rows.length} make(s)`);
  } catch (e) {
    console.error('[view-makes] ERROR:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

