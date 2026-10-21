const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');
const { gzipSync } = require('node:zlib');
const { fixture } = require('./lighthouse-fixtures.cjs');

const root = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path.startsWith('/api/')) {
    const data = fixture(path, req.method);
    if (data === undefined) console.error(`[audit] Unmocked endpoint: ${req.method} ${path}`);
    res.writeHead(data === undefined ? 501 : 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data ?? { message: 'Unmocked audit endpoint' }));
    return;
  }
  const file = resolve(root, '.' + decodeURIComponent(path));
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
  try {
    const target = extname(file) ? file : resolve(root, 'index.html');
    const body = await readFile(target);
    const compressed = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')
      && ['.html', '.js', '.css', '.json', '.svg'].includes(extname(target));
    const payload = compressed ? gzipSync(body) : body;
    res.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream',
      'Content-Length': payload.length, Vary: 'Accept-Encoding', ...(compressed ? { 'Content-Encoding': 'gzip' } : {}) });
    res.end(payload);
  } catch { res.writeHead(404); res.end(); }
});
server.listen(5199, '127.0.0.1', () => console.log('Lighthouse fixture server ready at http://127.0.0.1:5199'));
