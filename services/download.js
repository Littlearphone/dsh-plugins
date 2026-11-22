/**
 * Services — downloading the tools a row needs.
 *
 * A new machine has no JDK and no Maven, and "install one yourself" is a poor
 * answer from a panel that just listed the rows. This module fetches an official
 * distribution into the same places the rest of the plugin already reads:
 * JDKs land in `~/.jdks/<vendor>-<version>` (where IDEA puts them, so the
 * existing scan and the `.idea` name match pick them up), Maven distributions in
 * `<DSH_HOME>/services/maven/apache-maven-<version>` (offered as runner ids).
 *
 * Downloads are Host jobs: a POST starts one and returns immediately, the UI
 * polls. Everything here is driven by a fixed catalog — no URL is ever taken
 * from the browser — so the worst a caller can do is ask for a listed tool.
 */
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { jdkRoot } from './jdk.js';

const run = promisify(execFile);

/** Feature releases worth offering; each vendor resolves "latest GA" itself. */
const JDK_FEATURES = [8, 11, 17, 21, 25];

/** The platform string Adoptium wants, and the launcher suffix everywhere else. */
function platformTags() {
  const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x64';
  return { os, arch };
}

/**
 * The vendors the download menu offers. Temurin works on every platform through
 * its API; the other two publish stable "latest of this feature" aliases for
 * Windows x64 only, so they are hidden where they cannot be fetched.
 */
export function jdkVendors() {
  const { os, arch } = platformTags();
  const vendors = [
    {
      id: 'temurin',
      label: 'Eclipse Temurin',
      versions: JDK_FEATURES,
      url: (version) =>
        `https://api.adoptium.net/v3/binary/latest/${version}/ga/${os}/${arch}/jdk/hotspot/normal/eclipse`,
    },
  ];
  if (os === 'windows' && arch === 'x64') {
    vendors.push(
      {
        id: 'corretto',
        label: 'Amazon Corretto',
        versions: JDK_FEATURES,
        url: (version) =>
          `https://corretto.aws/downloads/latest/amazon-corretto-${version}-x64-windows-jdk.zip`,
      },
      {
        id: 'microsoft',
        label: 'Microsoft OpenJDK',
        versions: [11, 17, 21, 25],
        url: (version) => `https://aka.ms/download-jdk/microsoft-jdk-${version}-windows-x64.zip`,
      },
    );
  }
  return vendors;
}

/** Where downloads are staged and where Maven distributions live. */
function dshHome() {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh');
}
export function mavenDistRoot() {
  return join(dshHome(), 'services', 'maven');
}
function stagingRoot() {
  return join(dshHome(), 'services', 'downloads');
}

/** `maven-3.10.1`: the runner id a downloaded Maven is known by. */
export function mavenRunnerId(version) {
  return 'maven-' + version;
}

/** The command that runs one downloaded Maven; quoted when its path has spaces. */
export function localMavenCommand(version) {
  const launcher = join('bin', process.platform === 'win32' ? 'mvn.cmd' : 'mvn');
  const path = join(mavenDistRoot(), 'apache-maven-' + version, launcher);
  return /\s/.test(path) ? `"${path}"` : path;
}

/** Maven distributions already unpacked, newest first. */
export async function installedMavens() {
  let entries;
  try {
    entries = await readdir(mavenDistRoot(), { withFileTypes: true });
  } catch {
    return [];
  }
  const launcher = join('bin', process.platform === 'win32' ? 'mvn.cmd' : 'mvn');
  const found = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!/^apache-maven-\d/.test(entry.name)) continue;
    if (!existsSync(join(mavenDistRoot(), entry.name, launcher))) continue;
    found.push({
      version: entry.name.replace(/^apache-maven-/, ''),
      dir: join(mavenDistRoot(), entry.name),
    });
  }
  return found.sort((left, right) => right.version.localeCompare(left.version, 'en', { numeric: true }));
}

/**
 * Maven versions currently on the Apache CDN. Read live because the list moves
 * (3.9.11 exists one month and not the next); the fallback only keeps the menu
 * usable when the CDN cannot be reached.
 */
export async function mavenVersions() {
  try {
    const response = await fetch('https://dlcdn.apache.org/maven/maven-3/', {
      signal: AbortSignal.timeout(5000),
    });
    const text = await response.text();
    const versions = [...text.matchAll(/href="(\d+\.\d+\.\d+)\/"/g)].map((match) => match[1]);
    if (versions.length > 0) {
      return [...new Set(versions)].sort((left, right) => right.localeCompare(left, 'en', { numeric: true }));
    }
  } catch {
    /* offline or the listing changed shape: fall through to the known versions */
  }
  return ['3.10.1', '3.9.16'];
}

/** Everything the download menu needs, plus the jobs currently known. */
export async function downloadCatalog() {
  return {
    jdk: {
      vendors: jdkVendors().map(({ id, label, versions }) => ({ id, label, versions })),
    },
    maven: {
      versions: await mavenVersions(),
      installed: (await installedMavens()).map((entry) => entry.version),
    },
  };
}

/** One download: state, progress and, when it finishes, where the tool landed. */
const JOBS = new Map();
/** Finished jobs stay listable for a while so a reloaded panel can show the result. */
const JOB_TTL_MS = 10 * 60_000;
let jobSeq = 0;

export function listJobs() {
  const now = Date.now();
  for (const [id, job] of JOBS) {
    if (job.state !== 'running' && now - job.finishedAt > JOB_TTL_MS) JOBS.delete(id);
  }
  return [...JOBS.values()].sort((left, right) => left.startedAt - right.startedAt);
}

export function findJob(id) {
  return JOBS.get(id);
}

/** Stream one URL into a file, counting bytes so the UI can show progress. */
async function downloadFile(url, file, job) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30 * 60_000) });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  job.total = Number(response.headers.get('content-length') ?? 0);
  const counted = new Transform({
    transform(chunk, encoding, callback) {
      job.received += chunk.length;
      callback(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(response.body), counted, createWriteStream(file));
}

/** Unpack an archive with the tool the platform already ships. */
async function extractArchive(archive, destination) {
  await mkdir(destination, { recursive: true });
  const lower = archive.toLowerCase();
  if (process.platform === 'win32' || lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    // Windows' bsdtar reads zip as well as tar.
    await run('tar', ['-xf', archive, '-C', destination], { timeout: 5 * 60_000 });
    return;
  }
  await run('unzip', ['-q', archive, '-d', destination], { timeout: 5 * 60_000 });
}

/** The single top-level directory an archive unpacked to (or the directory itself). */
async function unpackedRoot(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());
  if (directories.length === 1 && entries.length === 1) return join(directory, directories[0].name);
  return directory;
}

/** `JAVA_VERSION="21.0.13.1+2"` → `21.0.13.1`; used for the directory name. */
async function jdkVersionOf(home) {
  try {
    const release = await readFile(join(home, 'release'), 'utf8');
    const match = /JAVA_VERSION="([^"]+)"/.exec(release);
    if (match === null) return undefined;
    return match[1].split('+')[0].trim();
  } catch {
    return undefined;
  }
}

/**
 * Move an unpacked JDK into `~/.jdks`, named the way IDEA names its downloads.
 * Exported so the install step can be exercised without a 200 MB download.
 */
export async function installJdk(root, job) {
  const full = (await jdkVersionOf(root)) ?? job.version;
  const name = `${job.vendor}-${full}`;
  const home = join(jdkRoot(), name);
  if (existsSync(home)) throw new Error('already-installed');
  await mkdir(jdkRoot(), { recursive: true });
  await rename(root, home);
  if (!existsSync(join(home, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))) {
    throw new Error('not-a-jdk');
  }
  job.home = home;
  job.name = name;
}

/** Move an unpacked Maven distribution into the plugin's own tools directory. */
export async function installMaven(root, job) {
  const name = 'apache-maven-' + job.version;
  const home = join(mavenDistRoot(), name);
  if (existsSync(home)) throw new Error('already-installed');
  await mkdir(mavenDistRoot(), { recursive: true });
  await rename(root, home);
  const launcher = join('bin', process.platform === 'win32' ? 'mvn.cmd' : 'mvn');
  if (!existsSync(join(home, launcher))) throw new Error('not-a-maven');
  job.home = home;
  job.runner = mavenRunnerId(job.version);
  job.name = name;
}

/** Staging directories a killed Host left behind; they are disposable. */
async function sweepStaging() {
  let entries;
  try {
    entries = await readdir(stagingRoot(), { withFileTypes: true });
  } catch {
    return;
  }
  const cutoff = Date.now() - 60 * 60_000;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const path = join(stagingRoot(), entry.name);
    try {
      const info = await stat(path);
      if (info.mtimeMs < cutoff) await rm(path, { recursive: true, force: true });
    } catch {
      /* another job may be using it */
    }
  }
}

/**
 * Start one download. Returns the job immediately; the async part updates it as
 * the file arrives, is unpacked and is moved into place.
 */
export function startDownload({ kind, vendor, version }) {
  const job = {
    id: 'dl-' + String((jobSeq += 1)).padStart(3, '0'),
    kind,
    vendor: String(vendor ?? ''),
    version: String(version ?? ''),
    state: 'running',
    phase: 'downloading',
    received: 0,
    total: 0,
    error: '',
    home: '',
    runner: '',
    name: '',
    startedAt: Date.now(),
    finishedAt: 0,
  };
  JOBS.set(job.id, job);

  if (kind !== 'jdk' && kind !== 'maven') {
    job.state = 'error';
    job.error = 'unknown-kind';
    job.finishedAt = Date.now();
    return job;
  }
  const target = kind === 'jdk' ? jdkVendors().find((entry) => entry.id === job.vendor) : undefined;
  if (kind === 'jdk' && target === undefined) {
    job.state = 'error';
    job.error = 'unknown-vendor';
    job.finishedAt = Date.now();
    return job;
  }
  // A Maven version is known before downloading; say "already installed" now
  // instead of fetching 9 MB only to throw it away.
  if (kind === 'maven' && existsSync(join(mavenDistRoot(), 'apache-maven-' + job.version))) {
    job.state = 'error';
    job.error = 'already-installed';
    job.finishedAt = Date.now();
    return job;
  }

  void sweepStaging();

  void (async () => {
    const stage = join(stagingRoot(), job.id);
    try {
      await mkdir(stage, { recursive: true });
      const url =
        kind === 'jdk'
          ? target.url(job.version)
          : `https://dlcdn.apache.org/maven/maven-3/${job.version}/binaries/apache-maven-${job.version}-bin.zip`;
      const archive = join(stage, 'download.bin');
      await downloadFile(url, archive, job);

      job.phase = 'extracting';
      const unpack = join(stage, 'unpacked');
      await extractArchive(archive, unpack);
      const root = await unpackedRoot(unpack);

      if (kind === 'jdk') {
        await installJdk(root, job);
      } else {
        await installMaven(root, job);
      }
      job.state = 'done';
      job.phase = 'done';
    } catch (error) {
      job.state = 'error';
      job.error = String(error?.message ?? error);
    } finally {
      job.finishedAt = Date.now();
      try {
        await rm(stage, { recursive: true, force: true });
      } catch {
        /* the staged copy is disposable */
      }
    }
  })();

  return job;
}
