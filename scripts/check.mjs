/**
 * Syntax-check every plugin half without a package manager: `node --check` each
 * `.js` under the plugin directories. Kept dependency-free and runnable straight
 * from `node scripts/check.mjs`, because `npm run` is blocked by the PowerShell
 * execution policy on some Windows setups (npm.ps1).
 *
 * It also fails on a UTF-8 BOM. Windows PowerShell 5.1 writes one with
 * `Set-Content -Encoding UTF8`, and a BOM in `package.json` makes JSON.parse
 * reject the file, which leaves the plugin unable to load at all.
 */
import { spawnSync } from 'node:child_process';
import { open, readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PLUGINS = ['guide-style', 'task-board', 'services'];
/** Extensions where a BOM breaks a parser or the chunk loader. */
const BOM_TYPES = new Set(['.js', '.mjs', '.json', '.yml', '.yaml', '.md', '.svg', '.css']);
/** Dependency and runtime trees, never sources. */
const SKIP_TREES = new Set(['node_modules', '.git', '.dsh', 'dist']);
const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

/** Every source file (recursively) whose first three bytes are a UTF-8 BOM. */
async function bomFiles(dir, found = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_TREES.has(entry.name)) continue;
      await bomFiles(join(dir, entry.name), found);
      continue;
    }
    if (!entry.isFile() || !BOM_TYPES.has(extname(entry.name))) continue;
    const file = join(dir, entry.name);
    let handle;
    try {
      handle = await open(file, 'r');
      const head = Buffer.alloc(3);
      const { bytesRead } = await handle.read(head, 0, 3, 0);
      if (bytesRead === 3 && head.equals(BOM)) found.push(file);
    } catch {
      /* an unreadable file is the syntax step's problem, not this one */
    } finally {
      await handle?.close();
    }
  }
  return found;
}

let failed = 0;
for (const plugin of PLUGINS) {
  // Every bundle, including the package-local chunks (`client.<name>.js`).
  const files = (await readdir(join(ROOT, plugin)))
    .filter((name) => name === 'index.js' || /^client(\.[\w-]+)*\.js$/.test(name))
    .sort();
  for (const file of files) {
    const target = join(ROOT, plugin, file);
    const result = spawnSync(process.execPath, ['--check', target], { stdio: 'inherit' });
    if (result.status === 0) {
      console.log(`ok   ${plugin}/${file}`);
    } else {
      failed += 1;
      console.error(`fail ${plugin}/${file}`);
    }
  }
  try {
    await readdir(join(ROOT, plugin, 'locale'));
    JSON.parse(await readFile(join(ROOT, plugin, 'locale', 'zh.json'), 'utf8'));
    JSON.parse(await readFile(join(ROOT, plugin, 'locale', 'en.json'), 'utf8'));
  } catch (error) {
    console.error(`locale ${plugin}: ${error.message}`);
    failed += 1;
  }
}

const bommed = await bomFiles(ROOT);
for (const file of bommed) {
  console.error(`fail ${relative(ROOT, file).replace(/\\/g, '/')} starts with a UTF-8 BOM`);
  failed += 1;
}
if (bommed.length === 0) console.log('ok   no UTF-8 BOM in sources');

process.exit(failed === 0 ? 0 : 1);
