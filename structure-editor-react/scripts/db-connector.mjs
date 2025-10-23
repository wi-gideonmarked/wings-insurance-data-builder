import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || '5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  const query = process.env.DB_TEST_QUERY || 'SELECT NOW() AS now';

  try {
    console.log('[db-connector] Connecting to database...');
    await client.connect();
    console.log('[db-connector] Connected. Running test query...');
    const res = await client.query(query);
    console.log('[db-connector] Query result:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('[db-connector] ERROR:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();


