/**
 * Services — discovery.
 *
 * Finds the start scripts of one working directory: its own package.json, plus
 * every package of a workspace (pnpm / npm / yarn) and any Go module below it.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
/** Route the browser half calls, relative to the page origin. */
export const ROUTE_PATH = '/services';
/** Guards against a pathological glob fanning out over a huge directory. */
export const MAX_PACKAGES = 60;
/** Directory budget per Go module walk, so one deep tree cannot stall the route. */
export const MAX_WALK = 1200;
/** Depth limit for `package main` discovery inside a module. */
export const MAX_GO_DEPTH = 4;
/** Directories that never contain a project's own commands. */
export const SKIP_DIRS = new Set([
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
export const MAX_DEPTH_NOTE = '**';

/** A request body larger than this is refused rather than buffered. */
export const MAX_BODY_BYTES = 64 * 1024;
export async function readJson(file) {
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
export async function readManifest(dir) {
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
export async function workspaceGlobs(root, manifest) {
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
export async function packageDirs(root, globs) {
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
export async function goModuleDirs(root) {
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
export async function mainPackages(base) {
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
 * Maven lifecycle phases: the rows IDEA's Maven panel always offers, in the
 * order a reader expects them.
 */
const MAVEN_LIFECYCLE = ['clean', 'compile', 'test', 'package', 'install'];

/**
 * Plugin goals worth a row, keyed by the plugin artifact that provides them.
 * Spring Boot is the common case, the rest are the runners people actually use.
 */
const MAVEN_GOALS = [
  ['spring-boot-maven-plugin', 'spring-boot:run', 'Spring Boot'],
  ['exec-maven-plugin', 'exec:java', 'exec'],
  ['jetty-maven-plugin', 'jetty:run', 'Jetty'],
  ['tomcat7-maven-plugin', 'tomcat7:run', 'Tomcat 7'],
  ['cargo-maven3-plugin', 'cargo:run', 'Cargo'],
];

/** Gradle tasks: the lifecycle ones plus the two Spring Boot entry points. */
const GRADLE_TASKS = [
  ['build', 'build'],
  ['test', 'test'],
  ['bootRun', 'Spring Boot'],
  ['run', 'run'],
];

/** Directories below `base` that hold a file named `name`, to a shallow depth. */
export async function dirsWithFile(base, name, depth) {
  const found = [];
  const queue = [''];
  while (queue.length > 0) {
    const relative = queue.shift();
    const absolute = relative === '' ? base : join(base, relative);
    let entries;
    try {
      entries = await readdir(absolute, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isFile() && entry.name === name) found.push(relative);
      if (!entry.isDirectory() || entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      if ((relative === '' ? 0 : relative.split('/').length) >= depth) continue;
      queue.push(relative === '' ? entry.name : `${relative}/${entry.name}`);
    }
  }
  return found;
}

/** Quote a path for a shell command line; Windows only needs it for spaces. */
function shellPath(value) {
  return /\s/.test(value) ? `"${value}"` : value;
}

/**
 * Maven projects in one group: every pom's lifecycle phases plus the goals its
 * plugins provide. `-f` names the pom, so the working directory never decides
 * which project runs — a workspace can hold a dozen of them.
 */
export async function mavenGroups(root, known = []) {
  const dirs = [...new Set(['', ...known, ...(await dirsWithFile(root, 'pom.xml', 2))])];
  const scripts = [];
  for (const relative of dirs) {
    let text;
    try {
      text = await readFile(join(root, relative, 'pom.xml'), 'utf8');
    } catch {
      continue;
    }
    const artifact = /<artifactId>\s*([^<\s]+)\s*<\/artifactId>/.exec(text)?.[1] ?? 'pom';
    const label = relative === '' ? artifact : `${relative} · ${artifact}`;
    const pom = join(relative, 'pom.xml');
    const file = relative === '' ? '' : ` -f ${shellPath(pom)}`;
    const add = (goal, hint) => {
      scripts.push({
        name: goal,
        label,
        command: `mvn -q${file} ${goal}`,
        category: 'maven',
        hint,
      });
    };
    for (const phase of MAVEN_LIFECYCLE) add(phase);
    for (const [plugin, goal, hint] of MAVEN_GOALS) {
      if (text.includes(`<artifactId>${plugin}</artifactId>`)) add(goal, hint);
    }
    // A Spring Boot app inherits the starter parent even without the plugin
    // declaration in its own pom.
    if (/<artifactId>\s*spring-boot-starter-parent\s*<\/artifactId>/.test(text)) {
      add('spring-boot:run', 'Spring Boot');
    }
  }
  if (scripts.length === 0) return [];
  return [{ id: 'maven', kind: 'maven', name: 'Maven', dir: '', scripts }];
}

/** Gradle projects in one group, mirroring the Maven group. */
export async function gradleGroups(root, known = []) {
  const dirs = [...new Set(['', ...known, ...(await dirsWithFile(root, 'build.gradle', 2)), ...(await dirsWithFile(root, 'build.gradle.kts', 2))])];
  const scripts = [];
  for (const relative of dirs) {
    const base = join(root, relative);
    let text;
    try {
      text = await readFile(join(base, 'build.gradle'), 'utf8');
    } catch {
      try {
        text = await readFile(join(base, 'build.gradle.kts'), 'utf8');
      } catch {
        continue;
      }
    }
    const wrapper = (await readdir(base).catch(() => [])).some((name) => name === 'gradlew' || name === 'gradlew.bat');
    const runner = wrapper ? './gradlew' : 'gradle';
    const label = relative === '' ? 'gradle' : relative;
    const springBoot = text.includes('org.springframework.boot') || text.includes('spring-boot');
    for (const [task, hint] of GRADLE_TASKS) {
      if (task === 'bootRun' && !springBoot) continue;
      if (task === 'run' && springBoot) continue;
      scripts.push({
        name: task,
        label,
        command: `${runner} ${task}`,
        category: 'gradle',
        hint,
      });
    }
  }
  if (scripts.length === 0) return [];
  return [{ id: 'gradle', kind: 'gradle', name: 'Gradle', dir: '', scripts }];
}

/**
 * All Go programs of the workspace in one group, because that is how a reader
 * looks for them ("where is the Go stuff"). The module still shows up in each
 * entry's label (`ring · standalone`) and its command carries the full path.
 */
export async function goGroups(root) {
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