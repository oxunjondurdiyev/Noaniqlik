/* Testlar uchun minimal statik server (repo ildizi). Faqat 127.0.0.1. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };

function start() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!p.startsWith(ROOT) || p.includes(`${path.sep}node_modules${path.sep}`)) { res.writeHead(403); return res.end(); }
    if (p.endsWith(path.sep)) p = path.join(p, 'index.html');
    fs.readFile(p, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

module.exports = { start };
