// Vercel serverless proxy for Frankfurter FX API
// Handles: /api/fx/latest?from=USD&to=SGD
export default async function handler(req, res) {
  const path = req.url.replace(/^\/api\/fx/, '');
  const upstreamUrl = `https://api.frankfurter.app${path}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'Accept': 'application/json' },
    });

    const data = await upstream.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600'); // 1-hr CDN cache for FX
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'FX fetch failed', detail: err.message });
  }
}
