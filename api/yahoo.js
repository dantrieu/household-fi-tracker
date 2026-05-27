// Vercel serverless proxy for Yahoo Finance
// Handles: /api/yahoo/v8/finance/chart/:ticker
export default async function handler(req, res) {
  // Strip the /api/yahoo prefix to get the Yahoo Finance path
  const path = req.url.replace(/^\/api\/yahoo/, '');
  const upstreamUrl = `https://query1.finance.yahoo.com${path}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HouseholdFITracker/1.0)',
        'Accept': 'application/json',
      },
    });

    const data = await upstream.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=900'); // 15-min CDN cache
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Upstream fetch failed', detail: err.message });
  }
}
