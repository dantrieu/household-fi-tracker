// Vercel serverless proxy for CoinGecko API
// Handles: /api/coingecko/api/v3/...
export default async function handler(req, res) {
  const path = req.url.replace(/^\/api\/coingecko/, '');
  const upstreamUrl = `https://api.coingecko.com${path}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HouseholdFITracker/1.0',
      },
    });

    const data = await upstream.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60'); // 1-min CDN cache (free tier rate limit)
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'CoinGecko fetch failed', detail: err.message });
  }
}
