const https = require('https');

const ENDPOINTS = {
  double: '/api/roulette_games/recent',
  crash:  '/api/crash_games/recent',
};

function fetchBlaze(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'blaze.com',
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'application/json',
        'Referer': 'https://blaze.com/',
        'Origin': 'https://blaze.com',
      },
      timeout: 7000,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { reject(new Error('Resposta invalida')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const game = req.query.game;

  if (!ENDPOINTS[game]) {
    return res.status(400).json({ error: 'Use: ?game=double ou ?game=crash' });
  }

  try {
    const data = await fetchBlaze(ENDPOINTS[game]);
    return res.status(200).json({ ok: true, source: 'blaze_live', data });
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message });
  }
};
