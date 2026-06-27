import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const STATIC_DIR = path.resolve(__dirname, 'dist/client');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

// Import the built TanStack Start fetch handler
const { default: handler } = await import('./dist/server/server.js');

const PORT = parseInt(process.env.PORT || '5000', 10);

function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0].split('#')[0];
  const filePath = path.join(STATIC_DIR, urlPath);

  // Security: ensure path stays inside STATIC_DIR
  if (!filePath.startsWith(STATIC_DIR)) return false;

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return false;
  }

  if (!stat.isFile()) return false;

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Length', stat.size);

  // Immutable cache for hashed assets, short cache for everything else
  if (urlPath.startsWith('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }

  fs.createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    // Try static files first
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (serveStatic(req, res)) return;
    }

    // Build Web Fetch API Request from Node.js IncomingMessage
    const proto =
      req.headers['x-forwarded-proto']?.split(',')[0].trim() ?? 'https';
    const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost';
    const url = `${proto}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, rawVal] of Object.entries(req.headers)) {
      if (rawVal == null) continue;
      const vals = Array.isArray(rawVal) ? rawVal : [rawVal];
      for (const v of vals) headers.append(key, v);
    }

    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      if (chunks.length > 0) body = Buffer.concat(chunks);
    }

    const fetchReq = new Request(url, {
      method: req.method,
      headers,
      body: body ?? null,
      // Required by Node.js 18+ for streaming request bodies
      ...(body ? { duplex: 'half' } : {}),
    });

    const fetchRes = await handler.fetch(fetchReq, process.env, {});

    res.statusCode = fetchRes.status;
    fetchRes.headers.forEach((value, key) => res.setHeader(key, value));

    if (fetchRes.body) {
      const reader = fetchRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error('[adapter] Unhandled error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
    }
    res.end('Internal Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[adapter] Server listening on http://0.0.0.0:${PORT}`);
});
