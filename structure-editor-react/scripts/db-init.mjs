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

  const sql = `
    CREATE TABLE IF NOT EXISTS makemodels_items (
      hash text PRIMARY KEY,
      label_make text NOT NULL,
      label_model text NOT NULL,
      oraero_model text NULL,
      oraero_make text NULL,
      iat_make text NULL,
      iat_model text NULL,
      rokstone_make text NULL,
      rokstone_model text NULL,
      sf_make text NULL,
      sf_model text NULL,
      year integer NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_makemodels_items_label_make ON makemodels_items (lower(label_make));
  `;

  try {
    console.log('[db-init] Connecting...');
    await client.connect();
    await client.query(sql);
    console.log('[db-init] Table makemodels_items ensured');
  } catch (e) {
    console.error('[db-init] ERROR:', e?.message || e);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();


