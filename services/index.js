/**
 * Host half of the services bundle: discover the start scripts of one Session's
 * working directory — its own `package.json`, plus the packages of a workspace
 * (pnpm/npm/yarn layout) when the directory declares one.
 *
 *   GET /services/list/<sessionId>
 *     → { dir, hasManifest, groups: [{ id, name, dir, scripts: [{ name, command }] }] }
 *
 * The Session is resolved through the Host's own `sessions` store and its
 * effective directory through `workingDirectory`, which is the same pair the
 * rest of the harness uses — no guessing from headers or client state.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Route the browser half calls, relative to the page origin. */
const ROUTE_PATH = '/services';
/** Guards against a pathological glob fanning out over a huge directory. */
const MAX_PACKAGES = 60;
/** Workspace patterns are one level of nesting only; `**` is reported, not expanded. */
const MAX_DEPTH_NOTE = '**';

function reply(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

async function readJson(file) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** One manifest reduced to what the UI needs. */
async function readManifest(dir) {
  const parsed = await readJson(join(dir, 'package.json'));
  if (parsed === undefined || parsed === null || typeof parsed !== 'object') return undefined;
  const scripts = [];
  const declared = parsed.scripts;
  if (declared !== null && typeof declared === 'object') {
    for (const [name, command] of Object.entries(declared)) {
      if (typeof command === 'string' && command !== '') scripts.push({ name, command });
    }
  }
  return { name: typeof parsed.name === 'string' ? parsed.name : '', scripts, raw: parsed };
}

/**
 * Workspace package patterns: `pnpm-workspace.yaml` first, then the `workspaces`
 * field npm and yarn use. Only the `packages:` list is read from the YAML, which
 * is all that file needs for this purpose.
 */
async function workspaceGlobs(root, manifest) {
  const fromYaml = [];
  let yaml;
  try {
    yaml = await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8');
  } catch (error) {
    yaml = undefined;
  }
  if (yaml !== undefined) {
    let inside = false;
    for (const line of yaml.split(/\r?\n/)) {
      if (/^\s*packages\s*:/.test(line)) {
        inside = true;
        continue;
      }
      if (!inside) continue;
      if (/^\S/.test(line)) {
        inside = false;
        continue;
      }
      const item = /^\s*-\s*(.+?)\s*(?:#.*)?$/.exec(line);
      if (item === null) continue;
      fromYaml.push(item[1].replace(/^['"]|['"]$/g, ''));
    }
  }
  if (fromYaml.length > 0) return fromYaml;

  const declared = manifest?.raw?.workspaces;
  if (Array.isArray(declared)) return declared.filter((entry) => typeof entry === 'string');
  if (Array.isArray(declared?.packages)) {
    return declared.packages.filter((entry) => typeof entry === 'string');
  }
  return [];
}

/**
 * Expand the patterns to relative package directories. `packages/*` and exact
 * paths are supported; anything with `**` is skipped rather than approximated.
 */
async function packageDirs(root, globs) {
  const found = new Set();
  const skipped = [];
  for (const glob of globs) {
    if (typeof glob !== 'string' || glob === '' || glob.startsWith('!')) continue;
    const clean = glob.replace(/^\.\//, '').replace(/\/+$/, '');
    if (clean.includes(MAX_DEPTH_NOTE)) {
      skipped.push(glob);
      continue;
    }
    if (clean.endsWith('/*')) {
      const base = clean.slice(0, -2);
      let entries;
      try {
        entries = await readdir(join(root, base), { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          found.add(base === '' ? entry.name : `${base}/${entry.name}`);
        }
      }
      continue;
    }
    if (clean.includes('*')) {
      skipped.push(glob);
      continue;
    }
    found.add(clean);
  }
  return { dirs: [...found].slice(0, MAX_PACKAGES), skipped };
}

function createHandler(ctx) {
  return async function handle(request, response) {
    // Same-origin only: another page must not read this machine's workspace.
    const origin = request.headers.origin;
    const host = request.headers.host;
    if (
      origin !== undefined &&
      host !== undefined &&
      origin !== 'http://' + host &&
      origin !== 'https://' + host
    ) {
      reply(response, 403, { error: 'cross-origin' });
      return;
    }

    const url = new URL(request.url ?? '/', 'http://localhost');
    const rest = url.pathname.startsWith(ROUTE_PATH + '/')
      ? url.pathname.slice(ROUTE_PATH.length + 1)
      : '';
    if (!rest.startsWith('list/')) {
      reply(response, 404, { error: 'not-found' });
      return;
    }

    let sessionId;
    try {
      sessionId = decodeURIComponent(rest.slice('list/'.length));
    } catch (error) {
      reply(response, 400, { error: 'bad-session' });
      return;
    }

    const sessions = ctx.get('sessions');
    const workingDirectory = ctx.get('workingDirectory');
    if (sessions === undefined || workingDirectory === undefined) {
      reply(response, 503, { error: 'unavailable', detail: 'sessions or workingDirectory' });
      return;
    }
    const session = sessions.get(sessionId);
    if (session === undefined) {
      reply(response, 404, { error: 'unknown-session' });
      return;
    }

    let dir;
    try {
      dir = workingDirectory.get(session);
    } catch (error) {
      reply(response, 500, { error: 'no-directory' });
      return;
    }

    try {
      const root = await readManifest(dir);
      const globs = await workspaceGlobs(dir, root);
      const { dirs, skipped } = await packageDirs(dir, globs);

      const groups = [];
      if (root !== undefined) {
        groups.push({ id: 'root', name: root.name, dir: '', scripts: root.scripts });
      }
      for (const relative of dirs) {
        const manifest = await readManifest(join(dir, relative));
        if (manifest === undefined) continue;
        groups.push({
          id: relative,
          name: manifest.name === '' ? relative : manifest.name,
          dir: relative,
          scripts: manifest.scripts,
        });
      }

      reply(response, 200, {
        dir,
        hasManifest: root !== undefined,
        groups,
        workspacePatterns: globs,
        skippedPatterns: skipped,
      });
    } catch (error) {
      reply(response, 500, { error: 'unreadable', detail: String(error?.message ?? error) });
    }
  };
}

/** The Web server carries the route. */
export const inject = ['webServer'];

/**
 * Register the discovery route for the plugin's lifetime.
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
  const server = ctx.get('webServer');
  if (server === undefined) {
    console.error('[services] the web server service is unavailable');
    return;
  }
  const handler = createHandler(ctx);
  ctx.effect(
    () => server.register({ kind: 'prefix', path: ROUTE_PATH, handler }),
    'services: script discovery route',
  );
}
