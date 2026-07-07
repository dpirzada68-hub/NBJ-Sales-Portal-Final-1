import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_data (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export default async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === 'GET') {
      const { key } = req.query;
      if (!key) {
        return res.status(400).json({ error: 'Missing key parameter' });
      }
      const rows = await sql`SELECT value FROM app_data WHERE key = ${key}`;
      return res.status(200).json({ value: rows.length ? rows[0].value : null });
    }

    if (req.method === 'POST') {
      const { key, value } = req.body || {};
      if (!key) {
        return res.status(400).json({ error: 'Missing key' });
      }
      await sql`
        INSERT INTO app_data (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error('DB error:', err);
    return res.status(500).json({ error: err.message });
  }
}
