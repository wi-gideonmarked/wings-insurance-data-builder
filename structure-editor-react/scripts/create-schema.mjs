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
  const createSql = `
    CREATE TABLE IF NOT EXISTS makes (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS models (
      id BIGSERIAL PRIMARY KEY,
      make_id BIGINT NOT NULL REFERENCES makes(id) ON DELETE CASCADE,
      hash TEXT NOT NULL UNIQUE,
      "labelMake" TEXT,
      "labelModel" TEXT,
      "oraeroModel" TEXT,
      "oraeroMake" TEXT,
      "iatMake" TEXT,
      "iatModel" TEXT,
      "rokstoneMake" TEXT,
      "rokstoneModel" TEXT,
      "sfMake" TEXT,
      "sfModel" TEXT,
      year INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_models_make_id ON models(make_id);
    CREATE INDEX IF NOT EXISTS idx_models_label_model ON models("labelModel");
  `;

  try {
    console.log('[create-schema] Connecting...');
    await client.connect();
    await client.query('BEGIN');
    await client.query(createSql);
    await client.query('COMMIT');
    console.log('[create-schema] Schema ensured');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[create-schema] ERROR:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();


