// PROTOTYPE server — static files only, no deps. `npm run prototype`.
import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = await realpath(new URL('./', import.meta.url));
const ROOT_PREFIX = ROOT + sep;
const PORT = Number(process.env.PORT || 4321);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' });
    return res.end('bad request');
  }
  if (pathname.includes('\0')) {
    res.writeHead(400, { 'content-type': 'text/plain' });
    return res.end('bad request');
  }

  if (pathname === '/') {
    res.writeHead(302, { location: `/landing/${url.search}` });
    return res.end();
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  // Force relative resolution against ROOT, then require the result to stay
  // inside it — `..` segments and symlinks both have to survive this check.
  const full = resolve(ROOT, '.' + pathname);
  if (!full.startsWith(ROOT_PREFIX)) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    return res.end('forbidden');
  }

  try {
    const real = await realpath(full);
    if (!real.startsWith(ROOT_PREFIX)) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      return res.end('forbidden');
    }
    const body = await readFile(real);
    res.writeHead(200, { 'content-type': TYPES[extname(real)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(PORT, () => {
  console.log(`PROTOTYPE landing variants → http://localhost:${PORT}/landing/?variant=A  (A B C D)`);
});
