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
  const limit = Number(process.env.LIMIT) || 50;
  const makeName = process.env.MAKE_NAME;

  let sql = `
    SELECT m.id, m.make_id, mk.name as make_name, m.hash, m."labelMake", m."labelModel",
           m."oraeroModel", m."oraeroMake", m."iatMake", m."iatModel",
           m."rokstoneMake", m."rokstoneModel", m."sfMake", m."sfModel", m.year,
           m.created_at, m.updated_at
    FROM models m
    JOIN makes mk ON m.make_id = mk.id
  `;
  const params = [];

  if (makeName) {
    sql += ' WHERE LOWER(mk.name) = LOWER($1)';
    params.push(makeName);
    sql += ` ORDER BY m.year ASC NULLS LAST, m."labelModel" ASC LIMIT $2`;
    params.push(limit);
  } else {
    sql += ` ORDER BY mk.name, m.year ASC NULLS LAST, m."labelModel" ASC LIMIT $1`;
    params.push(limit);
  }

  try {
    console.log('[view-models] Connecting...');
    await client.connect();
    const res = await client.query(sql, params);
    console.log(JSON.stringify(res.rows, null, 2));
    console.log(`\n[view-models] Returned ${res.rows.length} model(s)`);
  } catch (e) {
    console.error('[view-models] ERROR:', e?.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

