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
/** Directory budget per Go module walk, so one deep tree cannot stall the route. */
const MAX_WALK = 1200;
/** Depth limit for `package main` discovery inside a module. */
const MAX_GO_DEPTH = 4;
/** Directories that never contain a project's own commands. */
const SKIP_DIRS = new Set([
  'node_modules',
  'vendor',
  'testdata',
  '.git',
  '.cache',
  '.idea',
  '.gradle',
  '.next',
  'dist',
  'build',
  'target',
  'out',
  'coverage',
]);
/** Workspace patterns are one level of nesting only; `**` is reported, not expanded. */
const MAX_DEPTH_NOTE = '**';

/** A request body larger than this is refused rather than buffered. */
const MAX_BODY_BYTES = 64 * 1024;

async function readBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('body-too-large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

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

/**
 * Go has no script manifest: what it has is `package main` directories, which
 * are exactly the runnable programs (`go run ./cmd/x`). This finds the modules
 * of the workspace and, inside each, those directories.
 */

/** Module directories declared by `go.work`, or the root itself when only a `go.mod` exists. */
async function goModuleDirs(root) {
  let work;
  try {
    work = await readFile(join(root, 'go.work'), 'utf8');
  } catch {
    work = undefined;
  }
  const dirs = [];
  if (work !== undefined) {
    const block = /use\s*\(([\s\S]*?)\)/.exec(work);
    if (block !== null) {
      for (const line of block[1].split(/\r?\n/)) {
        const cleaned = line.replace(/\/\/.*$/, '').trim();
        if (cleaned === '') continue;
        dirs.push(cleaned.replace(/^\.\//, '').replace(/\/+$/, ''));
      }
    }
    for (const match of work.matchAll(/^\s*use\s+(?!\()(\S+)/gm)) {
      dirs.push(match[1].replace(/^\.\//, '').replace(/\/+$/, ''));
    }
  }
  if (dirs.length === 0) {
    try {
      await readFile(join(root, 'go.mod'), 'utf8');
      dirs.push('');
    } catch {
      /* not a Go module */
    }
  }
  return [...new Set(dirs)];
}

/** Relative directories holding a `package main`, breadth-first within a depth and visit budget. */
async function mainPackages(base) {
  const found = [];
  const queue = [''];
  let visited = 0;
  while (queue.length > 0 && visited < MAX_WALK) {
    const relative = queue.shift();
    const absolute = relative === '' ? base : join(base, relative);
    let entries;
    try {
      entries = await readdir(absolute, { withFileTypes: true });
    } catch {
      continue;
    }
    visited += 1;
    const depth = relative === '' ? 0 : relative.split('/').length;
    let isMain = false;
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        if (depth >= MAX_GO_DEPTH) continue;
        queue.push(relative === '' ? entry.name : `${relative}/${entry.name}`);
        continue;
      }
      if (!entry.name.endsWith('.go') || entry.name.endsWith('_test.go')) continue;
      try {
        const head = await readFile(join(absolute, entry.name), 'utf8');
        if (/^package\s+main\b/m.test(head)) isMain = true;
      } catch {
        /* unreadable file: not a candidate */
      }
    }
    if (isMain) found.push(relative);
  }
  return found;
}

/**
 * All Go programs in one group. A workspace can hold a dozen modules, and one
 * collapsible group per module buries the npm scripts; the module relationship
 * survives in each entry's label (`ring · standalone`) and in the command, which
 * keeps the full path from the workspace root.
 */
async function goGroup(root) {
  const modules = await goModuleDirs(root);
  const scripts = [];
  for (const moduleDir of modules) {
    const base = join(root, moduleDir);
    const mains = await mainPackages(base);
    if (mains.length === 0) continue;
    const moduleLabel = moduleDir === '' ? 'root' : moduleDir.split('/').pop();
    for (const relative of mains) {
      const last = relative === '' ? 'main' : relative.split('/').pop();
      const full = relative === '' ? moduleDir : moduleDir === '' ? relative : `${moduleDir}/${relative}`;
      scripts.push({
        name: `${moduleLabel} · ${last}`,
        command: full === '' ? 'go run .' : `go run ./${full}`,
        category: 'go',
      });
    }
  }
  if (scripts.length === 0) return undefined;
  return { id: 'go', kind: 'go', name: 'Go', dir: '', scripts };
}

/**
 * Started services, keyed by `<sessionId>\u0000<id>`. The Host owns the process,
 * so it outlives a panel reload; the browser half only reads state and output.
 */
const RUNNING = new Map();

function serviceKey(sessionId, id) {
  return `${sessionId}\u0000${id}`;
}

/**
 * One command line, wrapped in the flags the chosen shell actually understands.
 * The default shell is not always pwsh — on Windows it is often cmd.exe, which
 * rejects `-Command` and silently shows its banner instead.
 */
function shellArgv(shell, command) {
  const name = String(shell).toLowerCase();
  if (name.endsWith('cmd.exe') || name.endsWith('\\cmd')) return [shell, '/d', '/c', command];
  if (name.endsWith('powershell.exe') || name.endsWith('pwsh.exe')) {
    return [shell, '-NoLogo', '-NoProfile', '-Command', command];
  }
  if (name.endsWith('bash') || name.endsWith('sh') || name.endsWith('zsh') || name.endsWith('fish')) {
    return [shell, '-lc', command];
  }
  return [shell, '-c', command];
}

/**
 * `npm run` prepends the package's `node_modules/.bin` to PATH; running a script
 * body directly does not, so a script that calls a locally installed binary
 * (`concurrently`, `vite`, `tsc`, …) fails with "not recognized". Put the bins of
 * the script's own package and of the workspace root on PATH ourselves.
 */
function withLocalBins(environment, dirs) {
  const windows = environment.platform === 'windows';
  const separator = windows ? ';' : ':';
  const key = windows ? 'Path' : 'PATH';
  const current = process.env[key] ?? process.env.PATH ?? process.env.Path ?? '';
  const prefix = [...new Set(dirs.filter((dir) => typeof dir === 'string' && dir !== ''))].join(separator);
  if (prefix === '') return undefined;
  return {
    ...process.env,
    [key]: current === '' ? prefix : `${prefix}${separator}${current}`,
  };
}

/**
 * How npm-kind scripts are launched: through the package manager, not as the raw
 * script text. `npm run` is what puts `node_modules/.bin` on PATH and what a
 * developer means by "run this script" — running the body directly breaks any
 * script that calls a locally installed CLI (`concurrently`, `vite`, `tsc`, …).
 */
async function packageManagerFor(dir, root) {
  const candidates = dir === root ? [root] : [dir, root];
  for (const candidate of candidates) {
    for (const [file, manager] of [
      ['pnpm-lock.yaml', 'pnpm'],
      ['yarn.lock', 'yarn'],
      ['package-lock.json', 'npm'],
    ]) {
      try {
        await readFile(join(candidate, file), 'utf8');
        return manager;
      } catch {
        /* try the next marker */
      }
    }
  }
  return 'npm';
}

/** One managed launch: argv built from the platform shell plus the script line. */
async function spawnService(ctx, sessionId, request, root) {
  const subprocess = ctx.get('subprocess');
  if (subprocess === undefined) return { error: 'subprocess-unavailable' };
  const environment = await subprocess.terminalEnvironment();
  const cwd = request.cwd;

  let command;
  if (request.kind === 'go') {
    command = String(request.command ?? '');
  } else {
    const name = String(request.name ?? '');
    if (name === '') return { error: 'empty-script' };
    const manager = await packageManagerFor(cwd, root);
    command = `${manager} run ${name}`;
  }
  if (command === '') return { error: 'empty-command' };
  const shell = environment.defaultShell;
  if (shell === undefined) return { error: 'no-shell' };
  const argv = shellArgv(shell, command);
  const env = withLocalBins(environment, [
    join(cwd, 'node_modules', '.bin'),
    join(root, 'node_modules', '.bin'),
  ]);

  const id = 'svc-' + Math.random().toString(36).slice(2, 10);
  const key = serviceKey(sessionId, id);
  const record = {
    id,
    name: String(request.name ?? 'script'),
    // command is what actually runs (a package-manager invocation); source
    // is the script line the UI lists, which is the identity the panel matches on.
    command,
    source: String(request.source ?? request.command ?? command),
    dir: String(request.dir ?? ''),
    state: 'running',
    exitCode: null,
    startedAt: Date.now(),
    handle: undefined,
  };
  RUNNING.set(key, record);
  try {
    const handle = subprocess.spawn({
      argv,
      cwd,
      env,
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes: 256 * 1024 },
        stderr: { maxBytes: 256 * 1024 },
      },
      graceMs: 1500,
    });
    record.handle = handle;
    handle.done.then(
      (outcome) => {
        record.state = 'exited';
        record.exitCode = outcome?.exitCode ?? null;
      },
      () => {
        record.state = 'failed';
        record.exitCode = null;
      },
    );
  } catch (error) {
    record.state = 'failed';
    return { error: 'spawn-failed', detail: String(error?.message ?? error) };
  }
  return { record };
}

/** The last non-empty output line of one service, for the row's summary line. */
function lastOutputLine(record) {
  if (record.handle === undefined) return '';
  const collected = record.handle.collected;
  const read = (reader) => {
    if (reader === undefined) return '';
    try {
      return reader.readFrom(0).text;
    } catch {
      return '';
    }
  };
  const text = read(collected.stdout) + read(collected.stderr);
  if (text === '') return '';
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return '';
  const last = lines[lines.length - 1].trim();
  return last.length > 200 ? '…' + last.slice(-200) : last;
}

/** Running and recently finished services of one Session, newest first. */
function listServices(sessionId) {
  const prefix = `${sessionId}\u0000`;
  const items = [];
  for (const [key, record] of RUNNING) {
    if (!key.startsWith(prefix)) continue;
    items.push({
      id: record.id,
      name: record.name,
      command: record.command,
      source: record.source,
      dir: record.dir,
      state: record.state,
      exitCode: record.exitCode,
      startedAt: record.startedAt,
      lastLine: lastOutputLine(record),
    });
  }
  return items.sort((left, right) => right.startedAt - left.startedAt);
}

/** How much of a service's output one request returns: the tail, not the whole log. */
const MAX_OUTPUT_BYTES = 64 * 1024;

/**
 * The tail of one service's collected output. The reader is offset-based, so the
 * whole buffer is read and then sliced here; the slice is what keeps a chatty
 * service from shipping hundreds of kilobytes to the browser every second.
 */
function serviceOutput(sessionId, id) {
  const record = RUNNING.get(serviceKey(sessionId, id));
  if (record === undefined || record.handle === undefined) return undefined;
  const collected = record.handle.collected;
  const read = (reader) => {
    if (reader === undefined) return '';
    try {
      return reader.readFrom(0).text;
    } catch {
      return '';
    }
  };
  const text = read(collected.stdout) + read(collected.stderr);
  if (Buffer.byteLength(text) <= MAX_OUTPUT_BYTES) return { text, truncated: false };
  return { text: text.slice(-MAX_OUTPUT_BYTES), truncated: true };
}

function createHandler(ctx) {
  return async function handle(request, response) {
    // Same-origin only: another page must not read or start this machine's work.
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
    const slash = rest.indexOf('/');
    const action = slash === -1 ? rest : rest.slice(0, slash);
    const rawId = slash === -1 ? '' : rest.slice(slash + 1);
    const ACTIONS = ['list', 'start', 'stop', 'state', 'output', 'clear'];
    if (!ACTIONS.includes(action)) {
      reply(response, 404, { error: 'not-found' });
      return;
    }

    let sessionId;
    try {
      sessionId = decodeURIComponent(rawId);
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

    // --- process control -------------------------------------------------
    if (action === 'state') {
      reply(response, 200, { services: listServices(sessionId) });
      return;
    }

    if (action === 'output') {
      const id = url.searchParams.get('id') ?? '';
      const output = serviceOutput(sessionId, id);
      if (output === undefined) {
        reply(response, 404, { error: 'unknown-service' });
        return;
      }
      reply(response, 200, output);
      return;
    }

    if (action === 'clear') {
      const prefix = `${sessionId}\u0000`;
      let removed = 0;
      for (const [key, record] of RUNNING) {
        if (!key.startsWith(prefix)) continue;
        if (record.state === 'running' || record.state === 'stopping') continue;
        RUNNING.delete(key);
        removed += 1;
      }
      reply(response, 200, { removed });
      return;
    }

    if (action === 'start') {
      let body = {};
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        reply(response, 400, { error: 'bad-body' });
        return;
      }
      const cwd = body.dir === undefined || body.dir === '' ? dir : join(dir, String(body.dir));
      const started = await spawnService(
        ctx,
        sessionId,
        { name: body.name, command: body.command, source: body.source, dir: body.dir, kind: body.kind, cwd },
        dir,
      );
      if (started.error !== undefined) {
        reply(response, 500, started);
        return;
      }
      const record = started.record;
      reply(response, 200, {
        service: {
          id: record.id,
          name: record.name,
          command: record.command,
          dir: record.dir,
          state: record.state,
        },
      });
      return;
    }

    if (action === 'stop') {
      let body = {};
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        reply(response, 400, { error: 'bad-body' });
        return;
      }
      const record = RUNNING.get(serviceKey(sessionId, String(body.id ?? '')));
      if (record === undefined) {
        reply(response, 404, { error: 'unknown-service' });
        return;
      }
      try {
        record.handle?.terminate();
        record.state = 'stopping';
        reply(response, 200, { ok: true });
      } catch (error) {
        reply(response, 500, { error: 'stop-failed', detail: String(error?.message ?? error) });
      }
      return;
    }

    // --- discovery -------------------------------------------------------
    try {
      const root = await readManifest(dir);
      const globs = await workspaceGlobs(dir, root);
      const { dirs, skipped } = await packageDirs(dir, globs);

      const groups = [];
      if (root !== undefined) {
        groups.push({ id: 'root', kind: 'npm', name: root.name, dir: '', scripts: root.scripts });
      }
      for (const relative of dirs) {
        const manifest = await readManifest(join(dir, relative));
        if (manifest === undefined) continue;
        groups.push({
          id: relative,
          kind: 'npm',
          name: manifest.name === '' ? relative : manifest.name,
          dir: relative,
          scripts: manifest.scripts,
        });
      }
      const go = await goGroup(dir);
      if (go !== undefined) groups.push(go);

      groups.sort((left, right) => {
        if (left.dir === '' && right.dir !== '') return -1;
        if (right.dir === '' && left.dir !== '') return 1;
        return left.name.localeCompare(right.name);
      });

      reply(response, 200, {
        dir,
        hasManifest: root !== undefined,
        groups: groups.filter((group) => group.scripts.length > 0),
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
    () => {
      const disposeRoute = server.register({ kind: 'prefix', path: ROUTE_PATH, handler });
      // A reload drops every record, and a record with no owner can never be
      // stopped — on Windows the shell's children also outlive a signal to it.
      // Terminate on unload so no started service is left holding a port.
      return () => {
        disposeRoute();
        for (const record of RUNNING.values()) {
          try {
            record.handle?.terminate();
          } catch {
            /* the process may already be gone */
          }
        }
        RUNNING.clear();
      };
    },
    'services: discovery route and started-process cleanup',
  );
}