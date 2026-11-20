/* TESTS/CROSSBROWSER/SERVER.JS — lokal statik server (node:http; tashqi kutubxona yo'q, tarmoqqa chiqmaydi).
   Faqat 127.0.0.1, faqat GET / HEAD, faqat berilgan ildiz ichidagi fayllar. Sayt CSP si bilan bir xil sarlavha qo'shilmaydi —
   sahifalar o'z <meta http-equiv="Content-Security-Policy"> si bilan tekshiriladi. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

/** @returns {Promise<{ url:string, port:number, close:() => Promise<void>, requests:string[] }>} */
export function startServer(root) {
  const base = path.resolve(root);
  const requests = [];
  const server = http.createServer((req, res) => {
    const send = (code, body, type) => { res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(body); };
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'method');
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); } catch (_) { return send(400, 'url'); }
    requests.push(req.url);
    const file = path.resolve(base, '.' + rel);
    if (file !== base && !file.startsWith(base + path.sep)) return send(403, 'forbidden');
    fs.stat(file, (e, st) => {
      const target = !e && st.isDirectory() ? path.join(file, 'index.html') : file;
      fs.readFile(target, (err, buf) => (err ? send(404, 'not found') : send(200, req.method === 'HEAD' ? '' : buf, TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream')));
    });
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}`, port, requests, close: () => new Promise(r => server.close(() => r())) });
    });
  });
}
