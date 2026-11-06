import { access, cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const build = new URL('../.next/', import.meta.url);
const bundle = new URL('standalone/', build);

await access(new URL('server.js', bundle));
await mkdir(new URL('.next/', bundle), { recursive: true });
await cp(fileURLToPath(new URL('static/', build)), fileURLToPath(new URL('.next/static/', bundle)), {
  recursive: true,
});
