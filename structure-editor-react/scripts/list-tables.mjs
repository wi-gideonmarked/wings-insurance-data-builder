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
  const sql = process.env.DB_LIST_TABLES_QUERY || `
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
  `;

  try {
    console.log('[list-tables] Connecting to database...');
    await client.connect();
    console.log('[list-tables] Connected. Listing tables...');
    const res = await client.query(sql);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error('[list-tables] ERROR:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();


