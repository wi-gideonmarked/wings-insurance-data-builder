import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const SRC_DIR = process.env.SRC_DIR || path.join(process.cwd(), 'public', 'separated');

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

function toInt(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function ensureMake(client, makeName) {
  const upsertMake = `
    INSERT INTO makes (name, created_at, updated_at)
    VALUES ($1, now(), now())
    ON CONFLICT (name) DO UPDATE SET updated_at = now()
    RETURNING id
  `;
  const r = await client.query(upsertMake, [makeName]);
  return r.rows[0].id;
}

async function upsertModel(client, makeId, item) {
  const sql = `
    INSERT INTO models (
      make_id, hash, "labelMake", "labelModel", "oraeroModel", "oraeroMake",
      "iatMake", "iatModel", "rokstoneMake", "rokstoneModel",
      "sfMake", "sfModel", year, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), now()
    )
    ON CONFLICT (hash)
    DO UPDATE SET
      make_id = EXCLUDED.make_id,
      "labelMake" = EXCLUDED."labelMake",
      "labelModel" = EXCLUDED."labelModel",
      "oraeroModel" = EXCLUDED."oraeroModel",
      "oraeroMake" = EXCLUDED."oraeroMake",
      "iatMake" = EXCLUDED."iatMake",
      "iatModel" = EXCLUDED."iatModel",
      "rokstoneMake" = EXCLUDED."rokstoneMake",
      "rokstoneModel" = EXCLUDED."rokstoneModel",
      "sfMake" = EXCLUDED."sfMake",
      "sfModel" = EXCLUDED."sfModel",
      year = EXCLUDED.year,
      updated_at = now()
  `;

  const params = [
    makeId,
    item.hash,
    item.labelMake || null,
    item.labelModel || null,
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
  await client.query(sql, params);
}

async function main() {
  const client = getPgClient();
  console.log('[import-makes-models] SRC_DIR:', SRC_DIR);
  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.json'));
  console.log(`[import-makes-models] Found ${files.length} files`);

  try {
    await client.connect();
    await client.query('BEGIN');

    for (const file of files) {
      const full = path.join(SRC_DIR, file);
      const items = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (!Array.isArray(items) || items.length === 0) continue;

      const makeName = String(items[0]?.labelMake || '').trim();
      if (!makeName) continue;

      const makeId = await ensureMake(client, makeName);

      for (const item of items) {
        await upsertModel(client, makeId, item);
      }
      console.log(`[import-makes-models] Upserted ${items.length} models for make '${makeName}'`);
    }

    await client.query('COMMIT');
    console.log('[import-makes-models] Import complete');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[import-makes-models] ERROR:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();


