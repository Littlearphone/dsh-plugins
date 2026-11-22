/**
 * Services — start configurations.
 *
 * Overrides live in `.dsh/services.json` inside the workspace so they travel
 * with the project and never rewrite the package.json scripts they override.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export const CONFIG_DIR = '.dsh';
export const CONFIG_FILE = 'services.json';

/** Runner ids a Maven launch may choose; the Host maps them to a command. */
export const RUNNERS = ['mvnw', 'mvn', 'mvnd'];

/** One script's identity inside the workspace: `dir` plus the script name. */
export function scriptKey(dir, script) {
  return String(dir ?? '') + '\u0000' + String(script ?? '');
}

/** Small stable hash, so a config written without an id still gets the same one. */
export function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Every config carries an id: that is what lets one script own several variants. */
export function withId(config) {
  if (typeof config.id === 'string' && config.id !== '') return config;
  return { ...config, id: 'c-' + hashString(JSON.stringify(config)) };
}

/** The whole document: overrides, pinned entries and usage times. */
export async function readDoc(root) {
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

export async function writeDoc(root, doc) {
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

export async function readConfigs(root) {
  return (await readDoc(root)).configs;
}

/** Record that a script was started, for ordering the pinned area only. */
export async function rememberUse(root, dir, script, at) {
  try {
    const doc = await readDoc(root);
    doc.recent[scriptKey(dir, script)] = at;
    await writeDoc(root, doc);
  } catch (error) {
    console.error('[services] cannot record recent use', error);
  }
}

export async function writeConfigs(root, configs) {
  const doc = await readDoc(root);
  await writeDoc(root, { ...doc, configs });
}

/** Normalise one override body into the stored shape; empty fields are dropped. */
export function normaliseConfig(body) {
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
  // JVM launch parameters: which Maven runner to use, and which JDK (a path to
  // the JAVA_HOME the row should run with). Both are optional; absent = auto.
  const runner = String(body.runner ?? '').trim();
  if (RUNNERS.includes(runner)) config.runner = runner;
  const jdk = String(body.jdk ?? '').trim();
  if (jdk !== '') config.jdk = jdk;
  return config;
}

/**
 * Overlay the selected variant onto a discovered script. A script may own several
 * variants; the document remembers which one was last chosen, and an untouched
 * script keeps its `package.json` identity.
 */
export function withConfig(script, dir, doc) {
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
    // Maven rows carry their own runner/JDK; an override replaces the runner the
    // discovery picked, and an empty JDK means "the project's".
    runner: chosen.runner ?? script.runner,
    jdk: chosen.jdk ?? '',
    overridden: true,
    configId: chosen.id,
    variants: variants.map((entry) => ({
      id: entry.id,
      label: entry.label ?? entry.name ?? 'variant',
      args: entry.args ?? '',
    })),
  };
}
