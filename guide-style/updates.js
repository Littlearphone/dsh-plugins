/**
 * Guide style — the update engine behind the guide page's update card.
 *
 * DSH ships the *operation* (PluginManager.listVersions / updateBundle) but no
 * scheduler: nothing checks a registry or a Git remote unless a person opens
 * the Plugins page. This module is that scheduler. Once per interval it walks
 * the profile's own bundles and installs what is newer:
 *
 *  - `registry` — `listVersions` names the published versions above the
 *    installed one; the newest stable, bundle-declaring, DSH-compatible one is
 *    installed through `updateBundle`.
 *  - `git` — a Git copy publishes no version list, so the remote HEAD is
 *    resolved with `git ls-remote`, its `package.json` is read at that commit,
 *    and `updateBundle` gets the saved spec re-pinned to the new commit. That
 *    only works when the commit also raised the manifest version, because
 *    `updateBundle` refuses anything not strictly newer (semver).
 *  - `git` without a pinned commit — the plain `github:owner/repo#path:/sub`
 *    form a one-line install records. DSH refuses to replace that at all, so
 *    the first newer release is installed here as a removal plus an install of
 *    the same address pinned to the commit just read; after that one
 *    conversion the copy is an ordinary pinned Git copy.
 *
 * Everything else — a `link:` copy, an Official bundle, a bundle that carries
 * plugin management — is reported as skipped: DSH cannot replace it, and
 * pretending otherwise would only produce failed installs. `link:` copies are
 * the notable case: their files are whatever is in that directory, so
 * "updating" them is a working-copy operation, not a package operation.
 *
 * The engine talks to the manager only through injected functions, so it can
 * be exercised without a running Host.
 */

/** The default package name of this bundle; a plugin never updates itself. */
export const PACKAGE = '@local/guide-style';

/** Milliseconds in a minute, for the interval option. */
const MINUTE = 60 * 1000;

/**
 * Split a semver string into comparable parts.
 * @param value - a version such as `1.2.3` or `1.2.3-beta.1`.
 * @returns the parts, or undefined when the string is not a version.
 */
export function parseVersion(value) {
  if (typeof value !== 'string') return undefined;
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value.trim());
  if (match === null) return undefined;
  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] === undefined ? [] : match[4].split('.'),
  };
}

/**
 * Compare two semver strings the way `semver.compare` does.
 * @param left - the first version.
 * @param right - the second version.
 * @returns -1, 0 or 1, or undefined when either side is not a version.
 */
export function compareVersions(left, right) {
  const one = parseVersion(left);
  const two = parseVersion(right);
  if (one === undefined || two === undefined) return undefined;
  for (let index = 0; index < 3; index += 1) {
    if (one.numbers[index] !== two.numbers[index]) return one.numbers[index] > two.numbers[index] ? 1 : -1;
  }
  // A release outranks its own prereleases: 1.0.0 > 1.0.0-beta.1.
  if (one.prerelease.length === 0 && two.prerelease.length === 0) return 0;
  if (one.prerelease.length === 0) return 1;
  if (two.prerelease.length === 0) return -1;
  const length = Math.max(one.prerelease.length, two.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const a = one.prerelease[index];
    const b = two.prerelease[index];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    if (a === b) continue;
    const numericA = /^\d+$/.test(a);
    const numericB = /^\d+$/.test(b);
    if (numericA && numericB) return Number(a) > Number(b) ? 1 : -1;
    // Numeric identifiers sort below alphanumeric ones.
    if (numericA) return -1;
    if (numericB) return 1;
    return a > b ? 1 : -1;
  }
  return 0;
}

/** Hosts pnpm's `github:` / `gitlab:` / `bitbucket:` shorthands expand to. */
const SHORTHAND_HOSTS = {
  github: 'github.com',
  gitlab: 'gitlab.com',
  bitbucket: 'bitbucket.org',
};

/** The shorthand a package host's HTTPS URL can be written with, when it has one. */
const SHORTHAND_NAMES = { 'github.com': 'github', 'gitlab.com': 'gitlab', 'bitbucket.org': 'bitbucket' };

/**
 * Parse a saved Git package spec: its repository URL, pinned commit and the
 * directory inside the repository.
 *
 * Accepts what pnpm records — `github:owner/repo#<sha>&path:/sub`,
 * `git+https://host/owner/repo.git#<sha>`, `ssh://git@host/...` — so the engine
 * can re-pin the same form instead of inventing a URL the profile never used.
 * @param source - the bundle's saved dependency spec.
 * @returns the parts, or undefined when the spec is not a Git spec.
 */
export function parseGitSource(source) {
  if (typeof source !== 'string' || source === '') return undefined;
  const hash = source.indexOf('#');
  const address = hash === -1 ? source : source.slice(0, hash);
  const fragment = hash === -1 ? '' : source.slice(hash + 1);
  const commit = /(?:^|&)([0-9a-f]{40})(?:&|$)/.exec(fragment);
  const path = /(?:^|&)path:([^&]+)/.exec(fragment);
  let url;
  let host;
  let owner;
  let repo;
  const shorthand = /^([a-z]+):([^/]+\/[^/#&]+)$/i.exec(address);
  if (shorthand !== null && SHORTHAND_HOSTS[shorthand[1].toLowerCase()] !== undefined) {
    host = SHORTHAND_HOSTS[shorthand[1].toLowerCase()];
    const [ownerName, repoName] = shorthand[2].replace(/\.git$/, '').split('/');
    owner = ownerName;
    repo = repoName;
    url = `https://${host}/${owner}/${repo}`;
  } else {
    const trimmed = address.replace(/^git\+/, '');
    const scheme = /^(https?|ssh):\/\//i.exec(trimmed);
    if (scheme === null) return undefined;
    const withoutScheme = trimmed.slice(scheme[0].length);
    const slash = withoutScheme.indexOf('/');
    if (slash === -1) return undefined;
    const authority = withoutScheme.slice(0, slash);
    const rest = withoutScheme.slice(slash + 1).replace(/\.git$/, '');
    host = authority.slice(authority.lastIndexOf('@') + 1).split(':')[0].toLowerCase();
    const parts = rest.split('/').filter(Boolean);
    if (parts.length < 2) return undefined;
    owner = parts[0];
    repo = parts[1];
    url = scheme[1].toLowerCase() === 'ssh'
      ? `ssh://${authority}/${rest}`
      : `${scheme[1].toLowerCase()}://${authority}/${rest}`;
  }
  return {
    url,
    host,
    owner,
    repo,
    // A spec saved from a branch or from a plain `#path:` carries no commit;
    // that copy cannot be updated by `updateBundle`, but it can be re-pinned
    // once by this plugin (see `pinSpec`).
    ...commit === null ? {} : { commit: commit[1] },
    path: path === null ? '' : decodeURIComponent(path[1]),
  };
}

/**
 * The same address with a commit pinned, keeping the directory fragment.
 *
 * This is how an installation that arrived without a pin — the plain
 * `github:owner/repo#path:/sub` form — becomes one `updateBundle` can replace.
 * @param source - the saved spec, pinned or not.
 * @param commit - the commit to pin.
 * @returns the spec, or undefined when the source has no address to keep.
 */
export function pinSpec(source, commit) {
  if (typeof source !== 'string' || source === '') return undefined;
  const hash = source.indexOf('#');
  const address = hash === -1 ? source : source.slice(0, hash);
  if (address === '') return undefined;
  const fragment = hash === -1 ? '' : source.slice(hash + 1);
  // Keep a directory fragment, drop any other ref the spec may carry.
  const path = /(?:^|&)path:([^&]+)/.exec(fragment);
  return `${address}#${commit}${path === null ? '' : `&path:${path[1]}`}`;
}

/**
 * The same spec with its pinned commit replaced.
 * @param source - the saved spec, which must already carry a 40-character commit.
 * @param commit - the commit to pin.
 * @returns the spec, or undefined when the saved form has no commit to replace.
 */
export function withCommit(source, commit) {
  if (!/[0-9a-f]{40}/.test(source)) return undefined;
  return source.replace(/[0-9a-f]{40}/, commit);
}

/**
 * Where a commit's manifest can be read without cloning, for a hosted package.
 * @param parsed - the parsed Git source.
 * @param commit - the commit to read.
 * @returns the URL, or undefined for a host with no known raw file endpoint.
 */
export function rawManifestUrl(parsed, commit) {
  const directory = parsed.path.replace(/^\/+|\/+$/g, '');
  const file = `${directory === '' ? '' : `${directory}/`}package.json`;
  if (parsed.host === 'github.com') {
    return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${commit}/${file}`;
  }
  if (parsed.host === 'gitlab.com') {
    return `https://gitlab.com/${parsed.owner}/${parsed.repo}/-/raw/${commit}/${file}`;
  }
  if (parsed.host === 'bitbucket.org') {
    return `https://bitbucket.org/${parsed.owner}/${parsed.repo}/raw/${commit}/${file}`;
  }
  return undefined;
}

/**
 * Why a bundle cannot be replaced at all, before any network call.
 * @param bundle - one `listBundles` row.
 * @param ownName - this plugin's package name, which it never replaces.
 * @returns the skip reason, or undefined when the bundle is a candidate.
 */
export function skipReason(bundle, ownName) {
  if (bundle === undefined || bundle === null) return 'missing';
  if (bundle.name === ownName) return 'self';
  if (!bundle.installed) return 'not-installed';
  if (bundle.availability !== 'profile') return 'installation-provided';
  if (bundle.official === true) return 'official';
  if (bundle.readOnlyReason !== undefined) return 'management';
  if (bundle.source === undefined) return 'no-source';
  if (bundle.update !== 'registry' && bundle.update !== 'git') {
    // A Git copy saved without a pinned commit is still a candidate: this
    // plugin re-pins it once, after which `updateBundle` can replace it. A
    // `link:` copy is not — DSH loads that directory itself, so there is no
    // package to replace and no address to re-pin.
    return parseGitSource(bundle.source) === undefined ? 'not-updatable' : undefined;
  }
  return undefined;
}

/** A one-line explanation for a skip reason, shown in the card. */
const SKIP_TEXT = {
  missing: 'not in the inventory',
  self: 'this bundle',
  'not-installed': 'not a profile dependency',
  'installation-provided': 'ships with DSH',
  official: 'official bundle',
  management: 'carries plugin management',
  'no-source': 'no saved spec',
  'not-updatable': 'installed from a path, so there is no package to replace',
};

/**
 * Build the engine.
 * @param options - the manager functions, this bundle's name, and the settings.
 * @returns the state reader, the manual trigger, and the timer control.
 */
export function createUpdater(options) {
  const {
    listBundles,
    listVersions,
    updateBundle,
    removeBundle,
    installBundle,
    lsRemote,
    readManifest,
    ownName = PACKAGE,
    settings = {},
    now = () => new Date(),
    log = () => {},
  } = options;
  const enabled = settings.enabled !== false;
  const apply = settings.apply !== 'notify';
  const allowPrerelease = settings.prerelease === true;
  const intervalMinutes = Number.isFinite(settings.intervalMinutes) && settings.intervalMinutes >= 1
    ? settings.intervalMinutes
    : 30;

  /** @type {{ checkedAt: string | null, checking: boolean, nextCheckAt: string | null, plugins: object[], lastRun: object | null }} */
  const state = {
    checkedAt: null,
    checking: false,
    nextCheckAt: null,
    plugins: [],
    lastRun: null,
  };

  /** The published snapshot plus counters, so the card can say what it did. */
  function snapshot() {
    return {
      package: ownName,
      enabled,
      mode: apply ? 'auto' : 'notify',
      intervalMinutes,
      prerelease: allowPrerelease,
      checkedAt: state.checkedAt,
      nextCheckAt: state.nextCheckAt,
      checking: state.checking,
      lastRun: state.lastRun,
      plugins: state.plugins,
    };
  }

  /** One row for the card: what is installed, what is available, what happened. */
  function row(bundle, patch) {
    return {
      name: bundle?.name ?? '',
      kind: bundle?.update ?? 'none',
      installed: bundle?.version,
      latest: undefined,
      status: 'up-to-date',
      detail: undefined,
      ...patch,
    };
  }

  /** Ask the registry for the newest version this DSH can actually run. */
  async function newestRegistryVersion(name) {
    const listed = await listVersions(name);
    if (listed?.status !== 'listed') {
      return { problem: listed?.reason ?? listed?.problem ?? 'version-list-unavailable', versions: listed?.attempts };
    }
    const usable = (listed.versions ?? []).filter(version =>
      version.bundle !== false
      && version.incompatible === undefined
      && (allowPrerelease || version.prerelease !== true));
    return { latest: usable[0]?.version };
  }

  /** `git ls-remote <url> HEAD`, as the commit the remote currently points at. */
  async function headCommit(url) {
    const answer = await lsRemote(url);
    return answer?.commit;
  }

  /** Install one bundle and turn the manager's result into a row status. */
  async function install(bundle, version, extra) {
    if (!apply) return row(bundle, { latest: version, status: 'available', detail: 'auto-apply is off' });
    const result = await updateBundle(bundle.name, version, extra);
    const outcome = result?.result?.application;
    const error = result?.result?.error;
    if (outcome === 'applied' || outcome === 'restart-required') {
      return row(bundle, { latest: version, installed: version, status: 'updated', detail: outcome });
    }
    return row(bundle, {
      latest: version,
      status: 'failed',
      detail: error?.diagnostic ?? error?.code ?? outcome ?? result?.step ?? 'update failed',
    });
  }

  /** One candidate: a registry copy asks the registry, a Git copy asks the remote. */
  async function checkOne(bundle) {
    if (bundle.update === 'registry') {
      const answer = await newestRegistryVersion(bundle.name);
      if (answer.problem !== undefined) {
        return row(bundle, { status: 'unavailable', detail: answer.problem });
      }
      if (answer.latest === undefined) return row(bundle, { status: 'up-to-date' });
      if (compareVersions(answer.latest, bundle.version) !== 1) {
        return row(bundle, { latest: answer.latest, status: 'up-to-date' });
      }
      return install(bundle, answer.latest, {});
    }

    const parsed = parseGitSource(bundle.source);
    if (parsed === undefined) return row(bundle, { status: 'unavailable', detail: 'unreadable git spec' });
    const commit = await headCommit(parsed.url);
    if (commit === undefined) return row(bundle, { status: 'unavailable', detail: 'remote unreachable' });
    const pinned = parsed.commit !== undefined;
    if (pinned && commit === parsed.commit) return row(bundle, { status: 'up-to-date' });
    const manifest = await readManifest(parsed, commit);
    if (manifest?.version === undefined) {
      return row(bundle, { status: 'unavailable', detail: 'could not read the remote manifest' });
    }
    if (compareVersions(manifest.version, bundle.version) !== 1) {
      return row(bundle, {
        status: 'up-to-date',
        latest: manifest.version,
        detail: 'newer commit, same version — updateBundle needs a version bump',
      });
    }
    if (pinned) {
      const spec = withCommit(bundle.source, commit);
      if (spec === undefined) return row(bundle, { status: 'unavailable', detail: 'saved spec has no commit to re-pin' });
      return install(bundle, manifest.version, { spec });
    }
    // Installed from an address without a commit — the plain
    // `github:owner/repo#path:/sub` form. DSH cannot update such a copy, so
    // this is the one replacement the plugin performs itself: remove it and
    // install the same address pinned to the commit just read. From then on
    // the copy is updatable and every later run takes the branch above.
    return bootstrap(bundle, parsed, commit, manifest.version);
  }

  /**
   * Replace an unpinned Git copy with the same address pinned to `commit`.
   *
   * There is no rollback to the installed version — an unpinned spec resolves
   * to whatever the remote holds now, so re-running it would not restore the
   * old code. That is why this only runs when the remote already declares a
   * newer version, and why a failure is reported as failed rather than
   * retried: the plugin is then simply absent from the profile, visible in
   * the Plugins page.
   */
  async function bootstrap(bundle, parsed, commit, version) {
    const spec = pinSpec(bundle.source, commit);
    if (spec === undefined) return row(bundle, { status: 'unavailable', detail: 'saved spec has no address to pin' });
    if (!apply) return row(bundle, { latest: version, status: 'available', detail: 'auto-apply is off' });
    const removed = await removeBundle(bundle.name);
    if (removed?.application === 'failed') {
      return row(bundle, {
        latest: version,
        status: 'failed',
        detail: removed.error?.diagnostic ?? removed.error?.code ?? 'could not remove the unpinned copy',
      });
    }
    const result = await installBundle(spec, { enabled: bundle.enabled !== false, expected: { name: bundle.name, version } });
    const outcome = result?.application;
    if (outcome === 'applied' || outcome === 'restart-required') {
      return row(bundle, { latest: version, installed: version, status: 'updated', detail: `${outcome} (pinned ${commit.slice(0, 7)})` });
    }
    return row(bundle, {
      latest: version,
      status: 'failed',
      detail: result?.error?.diagnostic ?? result?.error?.code ?? outcome ?? 'install failed after removal',
    });
  }

  /**
   * Walk every bundle once. A failure on one bundle never stops the others:
   * an unreachable registry or repository is exactly the case a scheduler
   * has to survive.
   */
  async function check() {
    if (state.checking) return snapshot();
    state.checking = true;
    const started = now();
    const plugins = [];
    try {
      let bundles = [];
      try {
        bundles = await listBundles();
      } catch (error) {
        log('listBundles failed:', error?.message ?? error);
      }
      for (const bundle of bundles ?? []) {
        const reason = skipReason(bundle, ownName);
        if (reason !== undefined) {
          // Only report what a reader can act on: skipped bundles are listed
          // with their reason, not silently dropped.
          if (reason !== 'not-installed' && reason !== 'installation-provided' && reason !== 'self') {
            plugins.push(row(bundle, { status: 'skipped', detail: SKIP_TEXT[reason] ?? reason }));
          }
          continue;
        }
        try {
          plugins.push(await checkOne(bundle));
        } catch (error) {
          plugins.push(row(bundle, { status: 'failed', detail: error?.message ?? String(error) }));
        }
      }
    } finally {
      const finished = now();
      state.plugins = plugins;
      state.checkedAt = finished.toISOString();
      state.checking = false;
      state.nextCheckAt = new Date(finished.getTime() + intervalMinutes * MINUTE).toISOString();
      state.lastRun = {
        startedAt: started.toISOString(),
        finishedAt: finished.toISOString(),
        updated: plugins.filter(plugin => plugin.status === 'updated').map(plugin => plugin.name),
        failed: plugins.filter(plugin => plugin.status === 'failed').map(plugin => plugin.name),
      };
    }
    return snapshot();
  }

  /**
   * Run the check on a schedule.
   * @returns a disposer that stops the timer and nothing else.
   */
  function start() {
    const initial = setTimeout(() => { void check(); }, (settings.initialDelaySeconds ?? 15) * 1000);
    const timer = setInterval(() => { void check(); }, intervalMinutes * MINUTE);
    initial.unref?.();
    timer.unref?.();
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }

  return { check, snapshot, start, intervalMinutes };
}
