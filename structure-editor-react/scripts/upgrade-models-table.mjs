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

  try {
    console.log('[upgrade-models-table] Connecting...');
    await client.connect();
    await client.query('BEGIN');

    // Check which columns exist in models table
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'models'
      ORDER BY column_name
    `);
    
    const existingColumns = columnsResult.rows.map(r => r.column_name);
    console.log('[upgrade-models-table] Existing columns:', existingColumns.join(', '));

    // Add missing columns
    const columnsToAdd = [
      { name: 'label_make', type: 'TEXT', nullable: true },
      { name: 'label_model', type: 'TEXT', nullable: true },
      { name: 'year', type: 'INTEGER', nullable: true }
    ];

    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`[upgrade-models-table] Adding column: ${col.name}`);
        await client.query(`ALTER TABLE models ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      } else {
        console.log(`[upgrade-models-table] Column ${col.name} already exists`);
      }
    }

    // Check if we need to copy data from old column names to new ones
    // If columns like "labelMake" exist (camelCase), copy to label_make (snake_case)
    if (existingColumns.includes('labelMake') && existingColumns.includes('label_make')) {
      console.log('[upgrade-models-table] Copying data from camelCase to snake_case columns...');
      await client.query('UPDATE models SET label_make = "labelMake" WHERE label_make IS NULL');
    }
    
    if (existingColumns.includes('labelModel') && existingColumns.includes('label_model')) {
      await client.query('UPDATE models SET label_model = "labelModel" WHERE label_model IS NULL');
    }

    // Add indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_models_label_model ON models(label_model)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_models_year ON models(year)');

    await client.query('COMMIT');
    console.log('\n✅ Models table upgraded successfully!');
    console.log('\nNext step: npm run db:schema:flexible');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[upgrade-models-table] ERROR:', e?.message || String(e));
    console.error(e.stack);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

