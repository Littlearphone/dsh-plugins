/**
 * Syntax-check every plugin half without a package manager: `node --check` each
 * `.js` under the plugin directories. Kept dependency-free and runnable straight
 * from `node scripts/check.mjs`, because `npm run` is blocked by the PowerShell
 * execution policy on some Windows setups (npm.ps1).
 */
import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PLUGINS = ['task-board', 'services'];
const FILES = ['index.js', 'client.js'];

let failed = 0;
for (const plugin of PLUGINS) {
  for (const file of FILES) {
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
    JSON.parse(await (await import('node:fs/promises')).readFile(join(ROOT, plugin, 'locale', 'zh.json'), 'utf8'));
    JSON.parse(await (await import('node:fs/promises')).readFile(join(ROOT, plugin, 'locale', 'en.json'), 'utf8'));
  } catch (error) {
    console.error(`locale ${plugin}: ${error.message}`);
    failed += 1;
  }
}

process.exit(failed === 0 ? 0 : 1);
