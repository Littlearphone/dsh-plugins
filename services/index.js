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
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * Start configurations live in the workspace, not in this machine's home:
 * .dsh/services.json travels with the project, can be reviewed and committed,
 * and never rewrites the package.json scripts it overrides.
 */
const CONFIG_DIR = '.dsh';
const CONFIG_FILE = 'services.json';

/** One script's identity inside the workspace: `dir` plus the script name. */
function scriptKey(dir, script) {
  return String(dir ?? '') + '\u0000' + String(script ?? '');
}

/** Small stable hash, so a config written without an id still gets the same one. */
function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Every config carries an id: that is what lets one script own several variants. */
function withId(config) {
  if (typeof config.id === 'string' && config.id !== '') return config;
  return { ...config, id: 'c-' + hashString(JSON.stringify(config)) };
}

/** The whole document: overrides, pinned entries and usage times. */
async function readDoc(root) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(join(root, CONFIG_DIR, CONFIG_FILE), 'utf8'));
  } catch {
    parsed = undefined;
  }
  const configs = Array.isArray(parsed?.configs)
    ? parsed.configs
        .filter(
          (config) =>
            config !== null &&
            typeof config === 'object' &&
            typeof config.script === 'string' &&
            typeof config.dir === 'string',
        )
        .map(withId)
    : [];
  const selected =
    parsed?.selected !== null && typeof parsed?.selected === 'object' ? parsed.selected : {};
  const pinned = Array.isArray(parsed?.pinned)
    ? parsed.pinned.filter(
        (entry) =>
          entry !== null && typeof entry === 'object' && typeof entry.script === 'string',
      )
    : [];
  const recent =
    parsed?.ui !== null && typeof parsed?.ui === 'object' && typeof parsed.ui.recent === 'object'
      ? parsed.ui.recent
      : {};
  const collapsed = Array.isArray(parsed?.ui?.collapsed)
    ? parsed.ui.collapsed.filter((id) => typeof id === 'string')
    : [];
  return { configs, pinned, recent, collapsed, selected };
}

async function writeDoc(root, doc) {
  const folder = join(root, CONFIG_DIR);
  await mkdir(folder, { recursive: true });
  const body = {
    version: 3,
    configs: doc.configs ?? [],
    pinned: doc.pinned ?? [],
    selected: doc.selected ?? {},
    ui: { recent: doc.recent ?? {}, collapsed: doc.collapsed ?? [] },
  };
  await writeFile(join(folder, CONFIG_FILE), JSON.stringify(body, null, 2) + '\n', 'utf8');
}

async function readConfigs(root) {
  return (await readDoc(root)).configs;
}

/** Record that a script was started, for ordering the pinned area only. */
async function rememberUse(root, dir, script, at) {
  try {
    const doc = await readDoc(root);
    doc.recent[scriptKey(dir, script)] = at;
    await writeDoc(root, doc);
  } catch (error) {
    console.error('[services] cannot record recent use', error);
  }
}

async function writeConfigs(root, configs) {
  const doc = await readDoc(root);
  await writeDoc(root, { ...doc, configs });
}

/** Normalise one override body into the stored shape; empty fields are dropped. */
function normaliseConfig(body) {
  const config = {
    dir: String(body.dir ?? ''),
    script: String(body.script ?? ''),
  };
  if (config.script === '') return undefined;
  const label = String(body.label ?? body.name ?? '').trim();
  if (label !== '') config.label = label;
  // Passed through verbatim: `npm run x -- <args>` hands this string to the
  // script, so any tokenising here would lose quotes and argument grouping.
  const args = typeof body.args === 'string' ? body.args.trim() : '';
  if (args !== '') config.args = args;
  const env = {};
  if (body.env !== null && typeof body.env === 'object') {
    for (const [key, value] of Object.entries(body.env)) {
      const trimmed = String(key).trim();
      if (trimmed !== '' && value !== null && value !== undefined && String(value) !== '') {
        env[trimmed] = String(value);
      }
    }
  }
  if (Object.keys(env).length > 0) config.env = env;
  const cwd = String(body.cwd ?? '').trim();
  if (cwd !== '') config.cwd = cwd;
  return config;
}

/**
 * Overlay the selected variant onto a discovered script. A script may own several
 * variants; the document remembers which one was last chosen, and an untouched
 * script keeps its `package.json` identity.
 */
function withConfig(script, dir, doc) {
  const variants = (doc?.configs ?? []).filter(
    (entry) => entry.dir === dir && entry.script === script.name,
  );
  if (variants.length === 0) return script;
  const key = scriptKey(dir, script.name);
  const chosen =
    variants.find((entry) => entry.id === doc?.selected?.[key]) ?? variants[0];
  return {
    ...script,
    original: script.name,
    // The script keeps its package.json name; the variant label is a separate
    // thing, otherwise a row could no longer be recognised by its script.
    variantLabel: chosen.label ?? '',
    args: chosen.args ?? '',
    env: chosen.env ?? {},
    cwd: chosen.cwd ?? '',
    overridden: true,
    configId: chosen.id,
    variants: variants.map((entry) => ({
      id: entry.id,
      label: entry.label ?? entry.name ?? 'variant',
      args: entry.args ?? '',
    })),
  };
}

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
 * All Go programs of the workspace in one group, because that is how a reader
 * looks for them ("where is the Go stuff"). The module still shows up in each
 * entry's label (`ring · standalone`) and its command carries the full path.
 */
async function goGroups(root) {
  const modules = await goModuleDirs(root);
  const scripts = [];
  for (const moduleDir of modules) {
    const base = join(root, moduleDir);
    const mains = await mainPackages(base);
    if (mains.length === 0) continue;
    for (const relative of mains) {
      const last = relative === '' ? 'main' : relative.split('/').pop();
      const full =
        relative === '' ? moduleDir : moduleDir === '' ? relative : `${moduleDir}/${relative}`;
      scripts.push({
        name: last,
        label: moduleDir === '' ? last : `${moduleDir.split('/').pop()} · ${last}`,
        command: full === '' ? 'go run .' : `go run ./${full}`,
        category: 'go',
      });
    }
  }
  if (scripts.length === 0) return [];
  return [{ id: 'go', kind: 'go', name: 'Go', dir: '', scripts }];
}

/**
 * Started services, keyed by `<workingDirectory>\u0000<id>` — services belong to the\n * workspace, so every Session opened on that folder sees the same processes. The Host owns the process,
 * so it outlives a panel reload; the browser half only reads state and output.
 */
const RUNNING = new Map();

function serviceKey(root, id) {
  return `${root}\u0000${id}`;
}

/**
 * Ids this Host has launched, written to disk so a crash or a hard kill still
 * leaves a trail. The next start reaps whatever those markers still point at.
 */
function registryFile() {
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh');
  return join(home, 'services', 'running.json');
}

async function readRegistry() {
  try {
    const parsed = JSON.parse(await readFile(registryFile(), 'utf8'));
    return Array.isArray(parsed?.ids) ? parsed.ids.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

async function writeRegistry(ids) {
  const file = registryFile();
  try {
    await mkdir(dirname(file), { recursive: true });
    const temporary = file + '.tmp';
    await writeFile(temporary, JSON.stringify({ ids }), 'utf8');
    await rename(temporary, file);
  } catch (error) {
    console.error('[services] cannot write the launch registry', error);
  }
}

async function rememberLaunch(id) {
  const ids = await readRegistry();
  if (!ids.includes(id)) ids.push(id);
  await writeRegistry(ids);
}

async function forgetLaunch(id) {
  const ids = await readRegistry();
  await writeRegistry(ids.filter((entry) => entry !== id));
}

/** Kill anything a previous Host left behind (crash, forced quit, reload). */
async function reapPreviousLaunches() {
  const ids = await readRegistry();
  if (ids.length === 0) return;
  for (const id of ids) killTree(findMarkedPids(id));
  await writeRegistry([]);
  console.error('[services] reaped ' + ids.length + ' launch(es) from a previous run');
}


/**
 * Every launch carries a unique marker in its command line, in the shell's own
 * syntax: `set "DSH_SVC=<id>"` / `$env:DSH_SVC=...`. The marker is what makes a
 * tree findable later — the shell's own pid is not exposed by the spawn handle,
 * and without it a stop can only signal the shell while its children keep going.
 */
function markedCommand(shell, id, command) {
  const name = String(shell).toLowerCase();
  if (name.endsWith('cmd.exe') || name.endsWith('\\cmd')) return `set "DSH_SVC=${id}" && ${command}`;
  if (name.endsWith('powershell.exe') || name.endsWith('pwsh.exe')) return `$env:DSH_SVC='${id}'; ${command}`;
  return `export DSH_SVC='${id}'; ${command}`;
}

/** Pids whose command line carries one marker (Windows only; elsewhere an empty list). */
function findMarkedPids(id) {
  if (process.platform !== 'win32') return [];
  try {
    const script =
      "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*DSH_SVC=" +
      id +
      "*' } | ForEach-Object { $_.ProcessId }";
    const output = execFileSync(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { encoding: 'utf8', timeout: 8000 },
    );
    return output
      .split(/\s+/)
      .filter((token) => /^\d+$/.test(token))
      .map((token) => Number(token));
  } catch {
    return [];
  }
}

/** Kill a process and its whole tree; the only thing that stops grandchildren on Windows. */
function killTree(pids) {
  for (const pid of pids) {
    if (pid === process.pid) continue;
    try {
      if (process.platform === 'win32') {
        execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: 10000 });
      } else {
        process.kill(pid, 'SIGKILL');
      }
    } catch {
      /* already gone */
    }
  }
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
  const id = 'svc-' + Math.random().toString(36).slice(2, 10);

  // An override may change the parameters, the environment and the directory,
  // but never the script body — that line stays owned by package.json.
  const doc = await readDoc(root);
  const targetDir = String(request.dir ?? '');
  const targetName = String(request.name ?? '');
  const own = doc.configs.filter(
    (config) => config.dir === targetDir && config.script === targetName,
  );
  const override =
    own.find((config) => config.id === String(request.configId ?? '')) ??
    own.find((config) => config.id === doc.selected?.[scriptKey(targetDir, targetName)]) ??
    own[0];
  const extraArgs = String(override?.args ?? '').trim();
  const launchCwd =
    typeof override?.cwd === 'string' && override.cwd !== '' ? join(root, override.cwd) : cwd;

  let command;
  if (request.kind === 'go') {
    const base = String(request.command ?? '');
    command = extraArgs === '' ? base : `${base} ${extraArgs}`;
  } else {
    const name = String(request.name ?? '');
    if (name === '') return { error: 'empty-script' };
    const manager = await packageManagerFor(launchCwd, root);
    const base = `${manager} run "${name}"`;
    command = extraArgs === '' ? base : `${base} -- ${extraArgs}`;
  }
  if (command === '') return { error: 'empty-command' };
  const shell = environment.defaultShell;
  if (shell === undefined) return { error: 'no-shell' };
  const argv = shellArgv(shell, markedCommand(shell, id, command));
  const localBins = withLocalBins(environment, [
    join(launchCwd, 'node_modules', '.bin'),
    join(root, 'node_modules', '.bin'),
  ]);
  const env =
    override?.env === undefined
      ? localBins
      : { ...(localBins ?? process.env), ...override.env };
  const key = serviceKey(root, id);
  const record = {
    root,
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
  // One record per script: starting again replaces the previous run, so history
  // never piles up and there is nothing to clean by hand.
  for (const [existingKey, existing] of RUNNING) {
    if (!existingKey.startsWith(root + '\u0000')) continue;
    if (existing.dir === record.dir && existing.name === record.name) {
      killTree(findMarkedPids(existing.id));
      RUNNING.delete(existingKey);
    }
  }
  RUNNING.set(key, record);
  await rememberLaunch(id);
  void rememberUse(root, String(request.dir ?? ''), String(request.name ?? ''), Date.now());
  try {
    const handle = subprocess.spawn({
      argv,
      cwd: launchCwd,
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
        record.finishedAt = Date.now();
      },
      () => {
        record.state = 'failed';
        record.exitCode = null;
        record.finishedAt = Date.now();
      },
    );
  } catch (error) {
    record.state = 'failed';
    killTree(findMarkedPids(id));
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
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
  if (lines.length === 0) return '';
  // `npm run` echoes the script body as `> command` and adds its own notices;
  // showing those as "the latest log line" hides what the script actually said.
  const meaningful = lines.filter(
    (line) => !line.startsWith('> ') && !line.startsWith('npm notice') && !line.startsWith('npm warn'),
  );
  const source = meaningful.length > 0 ? meaningful : lines;
  const last = source[source.length - 1];
  return last.length > 200 ? '…' + last.slice(-200) : last;
}

/** How long a finished run stays visible; no manual cleanup exists. */
const FINISHED_TTL_MS = 5 * 60_000;

/** Running and recently finished services of one Session, newest first. */
function listServices(root) {
  const now = Date.now();
  const prefix = root + '\u0000';
  for (const [key, record] of RUNNING) {
    if (!key.startsWith(prefix)) continue;
    if (record.state === 'running' || record.state === 'stopping') continue;
    if (record.finishedAt !== undefined && now - record.finishedAt > FINISHED_TTL_MS) {
      RUNNING.delete(key);
    }
  }
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
function serviceOutput(root, id) {
  const record = RUNNING.get(serviceKey(root, id));
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
    const ACTIONS = ['list', 'start', 'stop', 'state', 'output', 'config', 'pin', 'ui'];
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
      reply(response, 200, { services: listServices(dir) });
      return;
    }

    if (action === 'output') {
      const id = url.searchParams.get('id') ?? '';
      const output = serviceOutput(dir, id);
      if (output === undefined) {
        reply(response, 404, { error: 'unknown-service' });
        return;
      }
      reply(response, 200, output);
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
      const record = RUNNING.get(serviceKey(dir, String(body.id ?? '')));
      if (record === undefined) {
        reply(response, 404, { error: 'unknown-service' });
        return;
      }
      try {
        record.handle?.terminate();
        killTree(findMarkedPids(record.id));
        await forgetLaunch(record.id);
        record.state = 'stopping';
        record.finishedAt = Date.now();
        reply(response, 200, { ok: true });
      } catch (error) {
        reply(response, 500, { error: 'stop-failed', detail: String(error?.message ?? error) });
      }
      return;
    }

    // --- view state ------------------------------------------------------
    if (action === 'ui') {
      if (String(request.method ?? 'GET').toUpperCase() !== 'PUT') {
        reply(response, 405, { error: 'method-not-allowed' });
        return;
      }
      let body = {};
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        reply(response, 400, { error: 'bad-body' });
        return;
      }
      const doc = await readDoc(dir);
      const collapsed = Array.isArray(body.collapsed)
        ? body.collapsed.filter((id) => typeof id === 'string')
        : doc.collapsed;
      const selected = { ...doc.selected };
      if (typeof body.dir === 'string' && typeof body.script === 'string') {
        const key = scriptKey(body.dir, body.script);
        if (body.configId === undefined || body.configId === '') delete selected[key];
        else selected[key] = String(body.configId);
      }
      await writeDoc(dir, { ...doc, collapsed, selected });
      reply(response, 200, { collapsed, selected });
      return;
    }

    // --- pinning ---------------------------------------------------------
    if (action === 'pin') {
      let body = {};
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        reply(response, 400, { error: 'bad-body' });
        return;
      }
      const targetDir = String(body.dir ?? '');
      const targetScript = String(body.script ?? '');
      if (targetScript === '') {
        reply(response, 400, { error: 'bad-script' });
        return;
      }
      const doc = await readDoc(dir);
      const rest = doc.pinned.filter(
        (entry) => !(entry.dir === targetDir && entry.script === targetScript),
      );
      if (body.pinned !== false) rest.push({ dir: targetDir, script: targetScript });
      await writeDoc(dir, { ...doc, pinned: rest });
      reply(response, 200, { pinned: rest });
      return;
    }

    // --- start configurations --------------------------------------------
    if (action === 'config') {
      const method = String(request.method ?? 'GET').toUpperCase();
      if (method === 'GET') {
        reply(response, 200, { configs: await readConfigs(dir) });
        return;
      }
      if (method === 'DELETE') {
        const targetId = url.searchParams.get('id') ?? '';
        const targetDir = url.searchParams.get('dir') ?? '';
        const targetScript = url.searchParams.get('script') ?? '';
        const doc = await readDoc(dir);
        const kept = doc.configs.filter((config) =>
          targetId !== ''
            ? config.id !== targetId
            : !(config.dir === targetDir && config.script === targetScript),
        );
        const selected = { ...doc.selected };
        if (targetId !== '') {
          for (const [key, value] of Object.entries(selected)) {
            if (value === targetId) delete selected[key];
          }
        } else {
          delete selected[scriptKey(targetDir, targetScript)];
        }
        await writeDoc(dir, { ...doc, configs: kept, selected });
        reply(response, 200, { configs: kept });
        return;
      }
      if (method === 'PUT' || method === 'POST') {
        let body = {};
        try {
          body = JSON.parse(await readBody(request));
        } catch {
          reply(response, 400, { error: 'bad-body' });
          return;
        }
        // `command` is deliberately not part of this: the script body belongs to
        // package.json, so a variant can only add parameters, env and a cwd.
        const draft = normaliseConfig(body);
        if (draft === undefined) {
          reply(response, 400, { error: 'bad-config' });
          return;
        }
        const doc = await readDoc(dir);
        const id =
          typeof body.id === 'string' && body.id !== '' ? body.id : 'c-' + hashString(JSON.stringify(draft) + Date.now());
        const config = { ...draft, id };
        const next = doc.configs.filter((entry) => entry.id !== id);
        // An empty variant is a deletion, not a blank entry.
        const empty =
          config.label === undefined &&
          config.args === undefined &&
          config.env === undefined &&
          config.cwd === undefined;
        if (!empty) next.push(config);
        next.sort((left, right) =>
          (left.dir + '\u0000' + left.script + '\u0000' + (left.label ?? '')).localeCompare(
            right.dir + '\u0000' + right.script + '\u0000' + (right.label ?? ''),
          ),
        );
        const selected = { ...doc.selected, [scriptKey(config.dir, config.script)]: id };
        await writeDoc(dir, { ...doc, configs: next, selected });
        reply(response, 200, { configs: next, id });
        return;
      }
      reply(response, 405, { error: 'method-not-allowed' });
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
          // Path, not package name: nine packages in one workspace can share the
          // name "frontend", and a title that repeats cannot be told apart.
          name: relative === '' ? manifest.name || 'root' : relative,
          pkg: manifest.name,
          dir: relative,
          scripts: manifest.scripts,
        });
      }
      for (const go of await goGroups(dir)) groups.push(go);

      const doc = await readDoc(dir);
      for (const group of groups) {
        group.scripts = group.scripts.map((script) => {
          const merged = withConfig(script, group.dir, doc);
          const key = scriptKey(group.dir, script.name);
          return {
            ...merged,
            // Every script carries its package.json name, overridden or not: the
            // editor and the pin toggle both post this value back as identity.
            original: script.name,
            pinned: doc.pinned.some(
              (entry) => entry.dir === group.dir && entry.script === script.name,
            ),
            lastStartedAt: Number(doc.recent[key] ?? 0),
          };
        });
      }

      groups.sort((left, right) => {
        if (left.dir === '' && right.dir !== '') return -1;
        if (right.dir === '' && left.dir !== '') return 1;
        return left.name.localeCompare(right.name);
      });

      reply(response, 200, {
        dir,
        hasManifest: root !== undefined,
        groups: groups.filter((group) => group.scripts.length > 0),
        collapsed: doc.collapsed,
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
  // Reap anything a previous Host life left running (crash, forced quit); the
  // registry is what makes "closing dsh also cleans up" hold without a graceful
  // shutdown ever happening.
  void reapPreviousLaunches();

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
          killTree(findMarkedPids(record.id));
          void forgetLaunch(record.id);
        }
        RUNNING.clear();
      };
    },
    'services: discovery route and started-process cleanup',
  );
}