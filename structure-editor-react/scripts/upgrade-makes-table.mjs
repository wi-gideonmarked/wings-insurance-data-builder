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
  const client = getPgClient();

  try {
    console.log('[upgrade-makes-table] Connecting...');
    await client.connect();
    await client.query('BEGIN');

    // Check if slug column exists
    const checkSlug = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'makes' AND column_name = 'slug'
    `);

    if (checkSlug.rows.length === 0) {
      console.log('[upgrade-makes-table] Adding slug column...');
      
      // Add slug column (nullable first)
      await client.query('ALTER TABLE makes ADD COLUMN IF NOT EXISTS slug TEXT');
      
      // Generate slugs from existing names
      const makes = await client.query('SELECT id, name FROM makes');
      console.log(`[upgrade-makes-table] Generating slugs for ${makes.rows.length} makes...`);
      
      for (const make of makes.rows) {
        const slug = toSlug(make.name);
        await client.query('UPDATE makes SET slug = $1 WHERE id = $2', [slug, make.id]);
        console.log(`  ✓ ${make.name} → ${slug}`);
      }
      
      // Now make slug NOT NULL and UNIQUE
      await client.query('ALTER TABLE makes ALTER COLUMN slug SET NOT NULL');
      await client.query('ALTER TABLE makes ADD CONSTRAINT makes_slug_unique UNIQUE (slug)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_makes_slug ON makes(slug)');
      
      console.log('[upgrade-makes-table] ✓ slug column added and populated');
    } else {
      console.log('[upgrade-makes-table] slug column already exists');
    }

    // Check if label column exists
    const checkLabel = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'makes' AND column_name = 'label'
    `);

    if (checkLabel.rows.length === 0) {
      console.log('[upgrade-makes-table] Adding label column...');
      await client.query('ALTER TABLE makes ADD COLUMN IF NOT EXISTS label TEXT');
      
      // Set label to same as name initially
      await client.query('UPDATE makes SET label = name WHERE label IS NULL');
      
      console.log('[upgrade-makes-table] ✓ label column added');
    } else {
      console.log('[upgrade-makes-table] label column already exists');
    }

    // Add index on name if not exists
    await client.query('CREATE INDEX IF NOT EXISTS idx_makes_name ON makes(LOWER(name))');

    await client.query('COMMIT');
    console.log('\n✅ Makes table upgraded successfully!');
    console.log('\nNext step: npm run db:schema:flexible');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[upgrade-makes-table] ERROR:', e?.message || String(e));
    console.error(e.stack);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

