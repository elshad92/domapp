const http = require('http');

function check(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ url, status: res.statusCode, body: body.slice(0, 150) }));
    });
    req.on('error', (e) => resolve({ url, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ url, error: 'timeout' }); });
  });
}

(async () => {
  const targets = [
    'http://51.38.119.218/api/v1/requests',
    'http://51.38.119.218/health',
  ];
  for (const t of targets) {
    const r = await check(t);
    if (r.error) console.log(`${t}\n  ERROR: ${r.error}\n`);
    else console.log(`${t}\n  HTTP ${r.status} | ${r.body}\n`);
  }
})();
