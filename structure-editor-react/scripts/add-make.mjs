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

function toSlug(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  const makeName = process.env.MAKE_NAME;
  const makeSlug = process.env.MAKE_SLUG;
  const makeLabel = process.env.MAKE_LABEL;

  if (!makeName) {
    console.error('Usage: MAKE_NAME="Piper" npm run db:add:make');
    console.error('\nOptional:');
    console.error('  MAKE_SLUG=piper (defaults to auto-generated from name)');
    console.error('  MAKE_LABEL="Piper Aircraft Inc." (defaults to same as name)');
    console.error('\nExample:');
    console.error('  MAKE_NAME="Piper" MAKE_SLUG=piper npm run db:add:make');
    process.exit(1);
  }

  const client = getPgClient();
  const slug = makeSlug || toSlug(makeName);
  const label = makeLabel || makeName;

  try {
    console.log('[add-make] Connecting...');
    await client.connect();

    const result = await client.query(`
      INSERT INTO makes (slug, name, label)
      VALUES ($1, $2, $3)
      ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name,
          label = EXCLUDED.label,
          updated_at = now()
      RETURNING *
    `, [slug, makeName, label]);

    const make = result.rows[0];
    console.log('✓ Make saved successfully:');
    console.log(JSON.stringify(make, null, 2));
    console.log(`\nJSON filename will be: ${slug}.json`);
    
    console.log('\nNext steps:');
    console.log('  1. Add models for this make');
    console.log('  2. View all makes: npm run db:view:makes');
  } catch (e) {
    console.error('[add-make] ERROR:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

