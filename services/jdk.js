/**
 * Services — the JDK a JVM project expects.
 *
 * Maven and Gradle run inside whatever `JAVA_HOME` the Host inherited, which is
 * the machine-wide JDK. That is often not the one the project is written for:
 * the project states it in `.idea` (IDEA's Project SDK) or in its pom, while
 * the shell knows nothing about either. This resolves that JDK the way IDEA
 * does — project setting first, then the version the build declares — and maps
 * the name onto a JetBrains-managed JDK under `~/.jdks`.
 *
 * Everything here is best-effort: an unreadable file, an unknown SDK name or no
 * matching directory all mean "no answer", and the caller keeps the environment
 * it already had.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Where IDEA puts the JDKs it downloads; `~/.jdks/<vendor>-<version>`. */
export function jdkRoot() {
  return join(homedir(), '.jdks');
}

async function readText(file) {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return undefined;
  }
}

/**
 * The Java version a directory name stands for: `temurin-25.0.1` → 25,
 * `temurin-1.8.0_452` → 8. The vendor prefix is everything before the last
 * dash, so a patch number cannot be mistaken for the version.
 */
export function versionOf(name) {
  const tail = name.includes('-') ? name.slice(name.lastIndexOf('-') + 1) : name;
  const match = /^(?:1\.)?(\d+)/.exec(tail);
  return match === null ? undefined : Number(match[1]);
}

/** Enough of a version comparison to order `25.0.1` after `25`. */
function numbersOf(name) {
  return (name.match(/\d+/g) ?? []).map(Number);
}

function compareVersions(left, right) {
  const a = numbersOf(left);
  const b = numbersOf(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return left.localeCompare(right);
}

/** Every JDK under `~/.jdks` that actually has a java launcher. */
export async function installedJdks() {
  const root = jdkRoot();
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const launcher = join('bin', process.platform === 'win32' ? 'java.exe' : 'java');
  const found = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const home = join(root, entry.name);
    if (!existsSync(join(home, launcher))) continue;
    found.push({ name: entry.name, home, version: versionOf(entry.name) });
  }
  return found;
}

/**
 * The project's SDK as IDEA stores it: the name is what the IDE shows, and the
 * language level is the fallback when the name points at a JDK that is gone.
 */
export async function ideaSdk(root) {
  const text = await readText(join(root, '.idea', 'misc.xml'));
  if (text === undefined) return {};
  const name = /project-jdk-name="([^"]+)"/.exec(text)?.[1];
  const level = /languageLevel="JDK_(?:1_)?(\d+)"/.exec(text)?.[1];
  const known = name === undefined || name === '' || name === 'unknown' ? undefined : name;
  const version =
    level === undefined ? (known === undefined ? undefined : versionOf(known)) : Number(level);
  return { name: known, version };
}

/** The Java version a pom declares, if it states one as plain numbers. */
export async function pomJavaVersion(root) {
  const text = await readText(join(root, 'pom.xml'));
  if (text === undefined) return undefined;
  for (const property of [
    'java.version',
    'maven.compiler.release',
    'maven.compiler.source',
    'maven.compiler.target',
  ]) {
    const value = new RegExp(`<${property.replaceAll('.', '\\.')}>\\s*([^<\\s]+)\\s*<`).exec(text)?.[1];
    if (value === undefined || value.startsWith('${')) continue;
    const match = /^(?:1\.)?(\d+)/.exec(value);
    if (match !== null) return Number(match[1]);
  }
  return undefined;
}

/**
 * Pick one installed JDK: the exact name first (`temurin-25.0.1`), then the name
 * as a prefix (`temurin-25` → `temurin-25.0.1`), then any JDK of the wanted
 * major version, newest patch first. Fuzzy matching exists because IDEA's SDK
 * names are its own (`temurin-25`) and do not have to equal a directory name.
 */
export function pickJdk(homes, wanted) {
  const byVersion = (entries) =>
    [...entries].sort((left, right) => compareVersions(right.name, left.name))[0];
  if (wanted.name !== undefined) {
    const name = wanted.name.toLowerCase();
    const exact = homes.find((home) => home.name.toLowerCase() === name);
    if (exact !== undefined) return exact;
    const prefixed = homes.filter((home) => home.name.toLowerCase().startsWith(name + '.'));
    if (prefixed.length > 0) return byVersion(prefixed);
  }
  if (wanted.version !== undefined) {
    const same = homes.filter((home) => home.version === wanted.version);
    if (same.length > 0) return byVersion(same);
  }
  return undefined;
}

/** The JDK home for a project, or undefined when nothing matches. */
export async function projectJavaHome(root, known) {
  const homes = known ?? (await installedJdks());
  if (homes.length === 0) return undefined;
  const fromIdea = pickJdk(homes, await ideaSdk(root));
  if (fromIdea !== undefined) return fromIdea.home;
  const version = await pomJavaVersion(root);
  if (version === undefined) return undefined;
  return pickJdk(homes, { version })?.home;
}

/**
 * What the configuration editor offers: the JDK the project resolves to right
 * now, and every JDK the machine has under `~/.jdks`. One readdir serves both.
 */
export async function jdkChoices(root) {
  const homes = await installedJdks();
  const project = await projectJavaHome(root, homes);
  return {
    project: project ?? '',
    options: homes.map(({ name, home }) => ({ name, home })),
  };
}

/** Whether a command name resolves through the Host's PATH. */
function onPath(name) {
  const raw = process.env.PATH ?? process.env.Path ?? '';
  const suffixes =
    process.platform === 'win32'
      ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM').split(';').filter((suffix) => suffix !== '')
      : [''];
  return raw
    .split(process.platform === 'win32' ? ';' : ':')
    .filter((entry) => entry !== '')
    .some((entry) => suffixes.some((suffix) => existsSync(join(entry, name + suffix))));
}

/**
 * Whether a JVM launch has any JDK at all: the project's own, the Host's
 * `JAVA_HOME`, or a `javac` on PATH. A new machine can have none of them, and
 * every Maven/Gradle/Java row then fails — this is what lets the panel say so
 * before the shell does.
 */
export async function jdkAvailable(root) {
  if ((await projectJavaHome(root)) !== undefined) return true;
  const home = process.env.JAVA_HOME;
  const launcher = join('bin', process.platform === 'win32' ? 'java.exe' : 'java');
  if (home !== undefined && home !== '' && existsSync(join(home, launcher))) return true;
  return onPath('javac');
}
