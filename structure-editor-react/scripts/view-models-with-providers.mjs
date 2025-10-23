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
  const limit = Number(process.env.LIMIT) || 10;
  const makeName = process.env.MAKE_NAME;

  let sql = `
    SELECT * FROM v_models_with_providers
  `;
  const params = [];

  if (makeName) {
    sql += ' WHERE LOWER(make_name) = LOWER($1)';
    params.push(makeName);
    sql += ` ORDER BY year ASC NULLS LAST, label_model ASC LIMIT $2`;
    params.push(limit);
  } else {
    sql += ` ORDER BY make_name, year ASC NULLS LAST, label_model ASC LIMIT $1`;
    params.push(limit);
  }

  try {
    console.log('[view-models-with-providers] Connecting...');
    await client.connect();
    const res = await client.query(sql, params);
    console.log(JSON.stringify(res.rows, null, 2));
    console.log(`\n[view-models-with-providers] Returned ${res.rows.length} model(s)`);
    
    if (res.rows.length > 0) {
      console.log('\nExample usage:');
      console.log('  MAKE_NAME=Piper npm run db:view:models-with-providers');
      console.log('  LIMIT=50 npm run db:view:models-with-providers');
    }
  } catch (e) {
    console.error('[view-models-with-providers] ERROR:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

