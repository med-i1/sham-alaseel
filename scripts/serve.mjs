// سيرفر معاينة بسيط لمجلد public (من غير Firebase: الموقع يعرض المنيو الأساسي)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public', import.meta.url));
const port = Number(process.argv[2]) || 4173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (request, response) => {
  try {
    let path = normalize(join(root, decodeURIComponent(new URL(request.url, 'http://x').pathname)));
    if (path !== root && !path.startsWith(root + sep)) throw new Error('outside root');
    if (!extname(path)) path = join(path, 'index.html');
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('404');
  }
}).listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}`));
