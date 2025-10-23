import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

function toSlug(filenameBase) {
  return String(filenameBase)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

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

async function fetchMakes(client) {
  const sql = 'SELECT id, slug, name, label FROM makes ORDER BY lower(name) ASC';
  const r = await client.query(sql);
  return r.rows;
}

async function fetchItemsForMake(client, makeId) {
  // Get models with their provider mappings from flexible schema
  const sql = `
    SELECT 
      m.id,
      m.hash,
      m.label_make as "labelMake",
      m.label_model as "labelModel",
      m.year,
      m.sf_make as "sfMake",
      m.sf_model as "sfModel",
      json_agg(
        json_build_object(
          'providerId', p.id,
          'providerCode', p.code,
          'providerName', p.name,
          'providerMake', mpm.provider_make,
          'providerModel', mpm.provider_model,
          'isActive', mpm.is_active
        ) ORDER BY p.code
      ) FILTER (WHERE p.id IS NOT NULL) as providers
    FROM models m
    LEFT JOIN model_provider_mappings mpm ON m.id = mpm.model_id
    LEFT JOIN providers p ON mpm.provider_id = p.id
    WHERE m.make_id = $1
    GROUP BY m.id, m.hash, m.label_make, m.label_model, m.year, m.sf_make, m.sf_model
    ORDER BY m.year ASC NULLS LAST, m.label_model ASC
  `;
  const r = await client.query(sql, [makeId]);
  
  // Transform the data to match the old format for backward compatibility
  return r.rows.map(row => {
    const transformed = {
      hash: row.hash,
      labelMake: row.labelMake,
      labelModel: row.labelModel,
      year: row.year,
      sfMake: row.sfMake || '',       // Salesforce make (canonical reference)
      sfModel: row.sfModel || '',     // Salesforce model (canonical reference)
    };

    // Add provider-specific fields (for backward compatibility)
    if (row.providers) {
      for (const provider of row.providers) {
        const code = provider.providerCode;
        transformed[`${code}Make`] = provider.providerMake;
        transformed[`${code}Model`] = provider.providerModel;
      }
    }

    // Also include the new providers array
    transformed.providers = row.providers || [];

    return transformed;
  });
}

async function main() {
  // Graceful skip if required env vars are missing
  if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE) {
    console.log('[export-from-db] Skipped: PGHOST/PGUSER/PGDATABASE not set');
    return;
  }
  const destDir = process.env.DEST_DIR || path.join('public', 'separated');
  ensureDir(destDir);

  const client = getPgClient();
  await client.connect();
  try {
    const makes = await fetchMakes(client);
    console.log(`[export-from-db] Found ${makes.length} makes`);
    for (const make of makes) {
      const items = await fetchItemsForMake(client, make.id);
      const slug = make.slug; // Use the slug from database
      const filePath = path.join(destDir, `${slug}.json`);
      fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
      console.log(`[export-from-db] Wrote ${items.length.toString().padStart(4)} items -> ${filePath} (${make.name})`);
    }
    console.log(`[export-from-db] Done. Output directory: ${destDir}`);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error('[export-from-db] ERROR:', e?.message || e);
  process.exit(1);
});


