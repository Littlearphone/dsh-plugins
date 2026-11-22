/**
 * Services — discovery.
 *
 * Finds the start scripts of one working directory: its own package.json, plus
 * every package of a workspace (pnpm / npm / yarn) and any Go module below it.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { installedMavens, localMavenCommand } from './download.js';
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

/** The wrapper a project pins its Maven version with, when it ships one. */
const MAVEN_WRAPPER = process.platform === 'win32' ? 'mvnw.cmd' : 'mvnw';

/** PATH entries of the Host — the same PATH its child processes receive. */
function pathEntries() {
  const raw = process.env.PATH ?? process.env.Path ?? '';
  return raw.split(process.platform === 'win32' ? ';' : ':').filter((entry) => entry !== '');
}

/** Whether a bare program name resolves through PATH (PATHEXT decides on Windows). */
export function programOnPath(name) {
  const suffixes =
    process.platform === 'win32'
      ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM').split(';').filter((suffix) => suffix !== '')
      : [''];
  return pathEntries().some((entry) =>
    suffixes.some((suffix) => existsSync(join(entry, name + suffix))),
  );
}

/**
 * The project's wrapper path, if it ships one: its own pom directory first, then
 * the workspace root. A multi-module layout keeps one wrapper at the root, and
 * `-f sub/pom.xml` still has to go through it or the submodule builds with a
 * different Maven.
 */
export function mavenWrapper(root, relative) {
  // `.\` keeps cmd.exe and PowerShell from looking the name up on PATH.
  const prefix = process.platform === 'win32' ? '.\\' : './';
  const own = join(relative, MAVEN_WRAPPER);
  if (existsSync(join(root, own))) return prefix + own;
  if (relative !== '' && existsSync(join(root, MAVEN_WRAPPER))) return prefix + MAVEN_WRAPPER;
  return undefined;
}

/** The command one runner id stands for; `mvnw` needs the wrapper it resolved to. */
export function runnerCommand(id, wrapper) {
  if (id === 'mvnd') return 'mvnd';
  if (id === 'mvnw' && wrapper !== undefined) return wrapper;
  // A Maven the panel downloaded is addressed by its absolute launcher: it is
  // not on PATH, and never should be.
  if (typeof id === 'string' && id.startsWith('maven-')) {
    return localMavenCommand(id.slice('maven-'.length));
  }
  return 'mvn';
}

/**
 * The Maven runners this project can use, best first: its own wrapper (it pins
 * the version the project expects), then the `mvn` on PATH, then `mvnd`, the
 * Maven Daemon, whose CLI is the same, then any Maven the panel downloaded.
 * A machine that develops in IDEA often has no `mvn` at all — the IDE carries
 * its own copy — and a row that can only print "not recognized" is worse than
 * one that runs the daemon.
 */
export function mavenRunners(wrapper, onPath, local = []) {
  const ids = [];
  if (wrapper !== undefined) ids.push('mvnw');
  if (onPath.mvn) ids.push('mvn');
  if (onPath.mvnd) ids.push('mvnd');
  for (const version of local) ids.push('maven-' + version);
  // An empty list is real information: the machine has no Maven at all. The
  // caller still writes `mvn` into the command (the shell's own "not recognized"
  // is the honest failure), but the panel warns before anyone clicks it.
  return ids;
}

/** Swap the leading runner of a Maven command; the rest of the line is untouched. */
export function withRunner(command, id, wrapper) {
  const text = String(command ?? '');
  if (id === undefined || id === '') return text;
  const rest = text.indexOf(' ');
  const start = runnerCommand(id, wrapper);
  return rest === -1 ? start : start + text.slice(rest);
}

/**
 * The wrapper a row's command belongs to, read from the `-f <pom>` the command
 * already carries. The Maven group holds every pom of the workspace, so the
 * directory cannot be taken from the group; the pom path is the only thing a
 * row still knows about its own project.
 */
export function wrapperOfCommand(root, command) {
  const match = /(?:^|\s)-f\s+("[^"]+"|\S+)/.exec(String(command ?? ''));
  const pom = match === null ? '' : match[1].replace(/^"|"$/g, '');
  const relative = pom === '' ? '' : dirname(pom);
  return mavenWrapper(root, relative === '.' ? '' : relative);
}

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
  // PATH does not change while one discovery runs; probing it per pom would.
  const onPath = { mvn: programOnPath('mvn'), mvnd: programOnPath('mvnd') };
  const local = (await installedMavens()).map((entry) => entry.version);
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
    const wrapper = mavenWrapper(root, relative);
    // Every row of one pom offers the same choices; `runner` is the one the
    // command is written with, and the configuration editor can override it.
    const runners = mavenRunners(wrapper, onPath, local);
    const runner = runners[0] ?? '';
    const command = runnerCommand(runner, wrapper);
    const add = (goal, hint) => {
      scripts.push({
        name: goal,
        label,
        // No `-q`: quiet mode swallows every `[INFO]` line, so a successful
        // build left the panel showing nothing but mvnd's terminal warning —
        // indistinguishable from a failure, with an exit code of 0. The panel
        // is the only place this log is visible at all, so keep Maven's own
        // INFO level.
        command: `${command}${file} ${goal}`,
        category: 'maven',
        runner,
        runners,
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

/**
 * Java entry points. A Maven build has no row for "the class with `main`", the
 * way Go has `package main` — the classes are in the sources, not the pom. They
 * are found by reading `src/main/java`, and run with `exec:java`, which asks
 * Maven for the project classpath: the closest one-line equivalent of IDEA's
 * green gutter arrow. Works for a plain main and for a Spring Boot application
 * alike (a Boot project also gets its `spring-boot:run` row when its pom
 * declares the plugin or inherits the starter parent).
 */
const JAVA_SOURCE_DIR = join('src', 'main', 'java');
/** A pathological tree must not turn one list request into a full source scan. */
const MAX_JAVA_FILES = 400;
/** `public static void main(String[] args)`, in the spellings people use. */
const JAVA_MAIN =
  /(?:public\s+static|static\s+public)\s+void\s+main\s*\(\s*(?:final\s+)?String\s*(?:\[\s*\]|\.\.\.)\s*\w+\s*\)/;
const JAVA_PACKAGE = /^\s*package\s+([\w.]+)\s*;/m;

/** Every `.java` file below `base`, breadth-first and within a budget. */
async function javaSources(base) {
  const found = [];
  const queue = [''];
  while (queue.length > 0 && found.length < MAX_JAVA_FILES) {
    const relative = queue.shift();
    const absolute = relative === '' ? base : join(base, relative);
    let entries;
    try {
      entries = await readdir(absolute, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
        queue.push(relative === '' ? entry.name : join(relative, entry.name));
        continue;
      }
      // Module and package descriptors are never entry points.
      if (!entry.name.endsWith('.java')) continue;
      if (entry.name === 'module-info.java' || entry.name === 'package-info.java') continue;
      found.push(relative === '' ? entry.name : join(relative, entry.name));
      if (found.length >= MAX_JAVA_FILES) break;
    }
  }
  return found;
}

/**
 * The JDK's own compile-and-run pair, for a project that has no build tool at
 * all. `-sourcepath` lets javac pull in whatever the entry file references, so
 * one command covers a whole package tree; `-d .dsh/classes` keeps the output
 * next to the plugin's own state instead of inventing a layout the project does
 * not have. `&&` chains them because both shells the Host can use understand it.
 */
function javacCommand(source, className) {
  const classes = join('.dsh', 'classes');
  return (
    `javac -encoding UTF-8 -sourcepath ${shellPath(JAVA_SOURCE_DIR)}` +
    ` -d ${shellPath(classes)} ${shellPath(source)}` +
    ` && java -cp ${shellPath(classes)} ${className}`
  );
}

/** The `main` classes of a project, in one group. */
export async function javaGroups(root, known = []) {
  const dirs = [...new Set(['', ...known, ...(await dirsWithFile(root, 'pom.xml', 2))])];
  const scripts = [];
  const seen = new Set();
  const onPath = { mvn: programOnPath('mvn'), mvnd: programOnPath('mvnd') };
  const local = (await installedMavens()).map((entry) => entry.version);
  let buildTool = false;
  /** `{ source, className }` for every `main` under one source root. */
  const mainClassesIn = async (base) => {
    const found = [];
    for (const source of await javaSources(base)) {
      let text;
      try {
        text = await readFile(join(base, source), 'utf8');
      } catch {
        continue;
      }
      if (!JAVA_MAIN.test(text)) continue;
      // The fully-qualified name is the identity: two packages may each hold a
      // `Main`, and a row's name is what a saved configuration is keyed by.
      const simple = basename(source, '.java');
      const pkg = JAVA_PACKAGE.exec(text)?.[1];
      found.push({ source, className: pkg === undefined ? simple : `${pkg}.${simple}` });
    }
    return found;
  };

  for (const relative of dirs) {
    let pom;
    try {
      pom = await readFile(join(root, relative, 'pom.xml'), 'utf8');
    } catch {
      continue;
    }
    buildTool = true;
    const artifact = /<artifactId>\s*([^<\s]+)\s*<\/artifactId>/.exec(pom)?.[1] ?? 'pom';
    const label = relative === '' ? artifact : `${relative} · ${artifact}`;
    const file = relative === '' ? '' : ` -f ${shellPath(join(relative, 'pom.xml'))}`;
    const wrapper = mavenWrapper(root, relative);
    const runners = mavenRunners(wrapper, onPath, local);
    const runner = runners[0] ?? '';
    const command = runnerCommand(runner, wrapper);
    const entries = await mainClassesIn(join(root, relative, JAVA_SOURCE_DIR));
    for (const { className } of entries) {
      if (seen.has(className)) continue;
      seen.add(className);
      scripts.push({
        name: className,
        label,
        // `compile` first: `exec:java` runs whatever is in `target/classes`, and a
        // stale or missing class there is the one way this row looks "broken".
        // No `-q`: `exec:java` reports the application's stdout at INFO level, so
        // a quiet build swallows everything the program prints.
        command: `${command}${file} compile exec:java -Dexec.mainClass=${className}`,
        category: 'java',
        runner,
        runners,
      });
    }
  }

  // A project with no build file still has entry points: compile and run them
  // with the JDK itself, so the Java group never depends on Maven existing. A
  // Gradle project is left alone — its dependencies only Gradle knows.
  const gradle =
    existsSync(join(root, 'build.gradle')) || existsSync(join(root, 'build.gradle.kts'));
  if (!buildTool && !gradle) {
    for (const { source, className } of await mainClassesIn(join(root, JAVA_SOURCE_DIR))) {
      if (seen.has(className)) continue;
      seen.add(className);
      scripts.push({
        name: className,
        label: basename(root) || 'java',
        command: javacCommand(join(JAVA_SOURCE_DIR, source), className),
        category: 'javac',
        runner: '',
        runners: [],
      });
    }
  }
  if (scripts.length === 0) return [];
  return [{ id: 'java', kind: 'java', name: 'Java', dir: '', scripts }];
}

/**
 * What the panel should say before anyone clicks a row: a JVM project whose
 * rows cannot possibly start. Discovery still lists those rows — they are the
 * project's own targets and work the moment the tool is installed — but the
 * shell's "not recognized" is a poor first answer on a fresh machine.
 */
export function environmentWarnings(groups, hasJdk) {
  const rows = groups.flatMap((group) => group.scripts);
  const jvm = rows.filter((row) =>
    row.category === 'maven' ||
    row.category === 'java' ||
    row.category === 'gradle' ||
    row.category === 'javac',
  );
  const maven = rows.filter((row) => row.category === 'maven' || row.category === 'java');
  const warnings = [];
  if (maven.length > 0 && maven.every((row) => row.runner === undefined || row.runner === '')) {
    warnings.push('maven');
  }
  if (jvm.length > 0 && hasJdk !== true) warnings.push('jdk');
  return warnings;
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