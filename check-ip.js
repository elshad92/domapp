// check-ip.js — проверяет сервер по IP
const http = require('http');
const https = require('https');

function check(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 10000, rejectUnauthorized: false }, (res) => {
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
    'http://51.38.119.218:8000/health',
    'http://51.38.119.218/health',
    'http://51.38.119.218:8000/api/v1/requests',
  ];
  for (const t of targets) {
    const r = await check(t);
    if (r.error) console.log(`${t}\n  ERROR: ${r.error}\n`);
    else console.log(`${t}\n  HTTP ${r.status} | ${r.body}\n`);
  }
})();
