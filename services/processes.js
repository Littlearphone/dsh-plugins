/**
 * Services — processes.
 *
 * Spawning, output capture, and the marker-based registry that lets a later
 * Host life reap what an earlier one left running.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { readDoc, rememberUse, scriptKey } from './config.js';
/**
 * Started services, keyed by `<workingDirectory>\u0000<id>` — services belong to the\n * workspace, so every Session opened on that folder sees the same processes. The Host owns the process,
 * so it outlives a panel reload; the browser half only reads state and output.
 */
export const RUNNING = new Map();

export function serviceKey(root, id) {
  return `${root}\u0000${id}`;
}

/**
 * Ids this Host has launched, written to disk so a crash or a hard kill still
 * leaves a trail. The next start reaps whatever those markers still point at.
 */
export function registryFile() {
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh');
  return join(home, 'services', 'running.json');
}

export async function readRegistry() {
  try {
    const parsed = JSON.parse(await readFile(registryFile(), 'utf8'));
    return Array.isArray(parsed?.ids) ? parsed.ids.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function writeRegistry(ids) {
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

export async function rememberLaunch(id) {
  const ids = await readRegistry();
  if (!ids.includes(id)) ids.push(id);
  await writeRegistry(ids);
}

export async function forgetLaunch(id) {
  const ids = await readRegistry();
  await writeRegistry(ids.filter((entry) => entry !== id));
}

/** Kill anything a previous Host left behind (crash, forced quit, reload). */
export async function reapPreviousLaunches() {
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
export function markedCommand(shell, id, command) {
  const name = String(shell).toLowerCase();
  if (name.endsWith('cmd.exe') || name.endsWith('\\cmd')) return `set "DSH_SVC=${id}" && ${command}`;
  if (name.endsWith('powershell.exe') || name.endsWith('pwsh.exe')) return `$env:DSH_SVC='${id}'; ${command}`;
  return `export DSH_SVC='${id}'; ${command}`;
}

/** Pids whose command line carries one marker (Windows only; elsewhere an empty list). */
export function findMarkedPids(id) {
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
export function killTree(pids) {
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
export function shellArgv(shell, command) {
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
export function withLocalBins(environment, dirs) {
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
export async function packageManagerFor(dir, root) {
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
export async function spawnService(ctx, sessionId, request, root) {
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
    const base = `${manager} run ${name}`;
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
export function lastOutputLine(record) {
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
export const FINISHED_TTL_MS = 5 * 60_000;

/** Running and recently finished services of one Session, newest first. */
export function listServices(root) {
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
export const MAX_OUTPUT_BYTES = 64 * 1024;

/**
 * The tail of one service's collected output. The reader is offset-based, so the
 * whole buffer is read and then sliced here; the slice is what keeps a chatty
 * service from shipping hundreds of kilobytes to the browser every second.
 */
export function serviceOutput(root, id) {
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