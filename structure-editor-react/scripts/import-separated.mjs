import 'dotenv/config';
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = process.env.SRC_DIR || path.join(process.cwd(), 'public', 'separated');

function toInt(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || '5432'),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  const upsertSql = `
    INSERT INTO makemodels_items (
      hash, label_make, label_model, oraero_model, oraero_make,
      iat_make, iat_model, rokstone_make, rokstone_model,
      sf_make, sf_model, year, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now()
    )
    ON CONFLICT (hash)
    DO UPDATE SET
      label_make = EXCLUDED.label_make,
      label_model = EXCLUDED.label_model,
      oraero_model = EXCLUDED.oraero_model,
      oraero_make = EXCLUDED.oraero_make,
      iat_make = EXCLUDED.iat_make,
      iat_model = EXCLUDED.iat_model,
      rokstone_make = EXCLUDED.rokstone_make,
      rokstone_model = EXCLUDED.rokstone_model,
      sf_make = EXCLUDED.sf_make,
      sf_model = EXCLUDED.sf_model,
      year = EXCLUDED.year,
      updated_at = now();
  `;

  try {
    console.log('[import-separated] Connecting...');
    await client.connect();
    console.log('[import-separated] Reading directory:', SRC_DIR);
    const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.json'));
    console.log(`[import-separated] Found ${files.length} files`);
    await client.query('BEGIN');
    for (const file of files) {
      const full = path.join(SRC_DIR, file);
      const items = JSON.parse(fs.readFileSync(full, 'utf8'));
      for (const item of items) {
        const params = [
          item.hash,
          item.labelMake,
          item.labelModel,
          item.oraeroModel || null,
          item.oraeroMake || null,
          item.iatMake || null,
          item.iatModel || null,
          item.rokstoneMake || null,
          item.rokstoneModel || null,
          item.sfMake || null,
          item.sfModel || null,
          toInt(item.year),
        ];
        await client.query(upsertSql, params);
      }
    }
    await client.query('COMMIT');
    console.log('[import-separated] Import completed');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[import-separated] ERROR:', e?.message || e);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();


