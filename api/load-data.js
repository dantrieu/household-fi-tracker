import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const { passphrase } = body ?? {};

  if (!passphrase || typeof passphrase !== 'string' || passphrase.trim().length < 6) {
    return res.status(400).json({ error: 'Passphrase must be at least 6 characters' });
  }

  const key = `hfit:${passphrase.trim().toLowerCase()}`;
  const data = await redis.get(key);

  if (data == null) {
    return res.status(404).json({ error: 'No data found for this passphrase. Double-check your spelling.' });
  }

  return res.status(200).json({ data });
}
