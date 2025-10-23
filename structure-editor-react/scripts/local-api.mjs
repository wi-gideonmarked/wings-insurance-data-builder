import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Client } from 'pg';

const app = express();
app.use(cors());
app.use(express.json());

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

app.get('/health/db', async (req, res) => {
  const client = getPgClient();
  try {
    await client.connect();
    const r = await client.query('SELECT 1 as ok');
    res.json({ ok: true, result: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  } finally {
    await client.end().catch(() => {});
  }
});

// Example read-only endpoint expected by the builder
// Replace the SELECT with your real schema/table mapping
app.get('/separated/:file', async (req, res) => {
  const file = req.params.file || '';
  const make = file.replace('.json', '').replace(/-/g, ' ');

  const client = getPgClient();
  try {
    await client.connect();
    const sql = `
      SELECT
        hash,
        label_make as "labelMake",
        label_model as "labelModel",
        oraero_model as "oraeroModel",
        oraero_make as "oraeroMake",
        iat_make as "iatMake",
        iat_model as "iatModel",
        rokstone_make as "rokstoneMake",
        rokstone_model as "rokstoneModel",
        sf_make as "sfMake",
        sf_model as "sfModel",
        year
      FROM makemodels_items
      WHERE lower(label_make) = lower($1)
      ORDER BY year ASC NULLS LAST, label_model ASC
    `;
    const r = await client.query(sql, [make]);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  } finally {
    await client.end().catch(() => {});
  }
});

const port = Number(process.env.API_PORT || '4000');
app.listen(port, () => {
  console.log(`[local-api] listening on http://0.0.0.0:${port}`);
});


