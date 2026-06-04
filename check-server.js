// check-server.js — проверяет доступность domapp.uz
const https = require('https');
const http = require('http');

function check(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ url, status: res.statusCode, body: body.slice(0, 200) }));
    });
    req.on('error', (e) => resolve({ url, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ url, error: 'timeout' }); });
  });
}

(async () => {
  const targets = [
    'https://domapp.uz/health',
    'https://domapp.uz/api/v1/requests',
    'http://domapp.uz/health',
  ];
  for (const t of targets) {
    const r = await check(t);
    if (r.error) console.log(`${t}\n  ERROR: ${r.error}\n`);
    else console.log(`${t}\n  HTTP ${r.status} | ${r.body}\n`);
  }
})();
