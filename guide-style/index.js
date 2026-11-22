/**
 * Host half of the guide-style bundle.
 *
 * Two jobs, both small:
 *
 *  1. the guide page's update card needs to know what it is looking at, so the
 *     state of the last check is served at `GET /guide-style/updates`, and a
 *     click runs one now through `POST /guide-style/updates`;
 *  2. the scheduler itself — `updates.js` owns the logic, this file owns the
 *     cordis lifetime (service lookups, timer, route disposal).
 *
 * The bundle stays usable without the plugin manager (the card then reports
 * `enabled: false`), because a missing service must not take the stylesheet
 * down with it.
 */
import { execFile } from 'node:child_process';
import { createUpdater, PACKAGE, rawManifestUrl } from './updates.js';

/** Both halves are needed: the manager to act, the web server to report. */
export const inject = ['pluginManager', 'webServer'];

/** Everything the profile patch may override, with the defaults in one place. */
const DEFAULTS = {
  enabled: true,
  apply: 'auto',
  intervalMinutes: 30,
  prerelease: false,
  initialDelaySeconds: 15,
  gitTimeoutMs: 15000,
  fetchTimeoutMs: 15000,
};

/**
 * `git ls-remote <url> HEAD`, as a promise of the commit it points at.
 * @param url - a repository URL, in any form pnpm saved.
 * @param timeoutMs - how long the network may take.
 * @returns the commit, or undefined when Git or the network refused.
 */
function lsRemote(url, timeoutMs) {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['ls-remote', '--exit-code', url, 'HEAD'],
      { timeout: timeoutMs, windowsHide: true },
      (error, stdout) => {
        if (error !== null) {
          resolve(undefined);
          return;
        }
        const match = /^([0-9a-f]{40})\s+HEAD$/m.exec(stdout);
        resolve(match === null ? undefined : { commit: match[1] });
      },
    );
  });
}

/**
 * Read one commit's `package.json` from the package host, without cloning.
 * @param parsed - the parsed Git source (`updates.js` decides the URL shape).
 * @param commit - the commit to read.
 * @param timeoutMs - how long the request may take.
 * @returns the parsed manifest, or undefined when it could not be read.
 */
async function readManifest(parsed, commit, timeoutMs) {
  const url = rawManifestUrl(parsed, commit);
  if (url === undefined) return undefined;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * Answer one request on the plugin's route.
 * @param request - the incoming HTTP request.
 * @param response - the outgoing response.
 * @param updater - the engine whose state is served.
 */
async function handleRoute(request, response, updater) {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '');
  const reply = (status, payload) => {
    const body = JSON.stringify(payload);
    response.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-length': Buffer.byteLength(body),
    });
    response.end(body);
  };
  if (path !== '/guide-style/updates') {
    reply(404, { error: 'not-found' });
    return;
  }
  if (request.method === 'POST') {
    reply(200, await updater.check());
    return;
  }
  reply(200, updater.snapshot());
}

/**
 * Mount the scheduler and its route for the plugin's lifetime.
 * @param ctx - Host plugin context.
 * @param config - the profile patch's config block, merged over the defaults.
 */
export function apply(ctx, config) {
  const settings = { ...DEFAULTS, ...(config ?? {}) };
  const manager = ctx.get('pluginManager');
  const server = ctx.get('webServer');

  const updater = createUpdater({
    ownName: PACKAGE,
    settings,
    log: (...parts) => console.log('[guide-style]', ...parts),
    listBundles: async () => {
      if (manager === undefined) throw new Error('the plugin manager is unavailable');
      return await manager.listBundles();
    },
    listVersions: async (name) => {
      if (manager === undefined) throw new Error('the plugin manager is unavailable');
      return await manager.listVersions(name);
    },
    updateBundle: async (name, version, extra) => {
      if (manager === undefined) throw new Error('the plugin manager is unavailable');
      return await manager.updateBundle(name, version, extra);
    },
    lsRemote: (url) => lsRemote(url, settings.gitTimeoutMs),
    readManifest: (parsed, commit) => readManifest(parsed, commit, settings.fetchTimeoutMs),
  });

  if (server !== undefined) {
    ctx.effect(
      () => {
        const dispose = server.register({
          kind: 'prefix',
          path: '/guide-style',
          handler: (request, response) => { void handleRoute(request, response, updater); },
        });
        return () => dispose();
      },
      'guide-style: update state route',
    );
  } else {
    console.error('[guide-style] the web server service is unavailable; no update route');
  }

  if (settings.enabled === false) return;
  ctx.effect(() => updater.start(), 'guide-style: scheduled plugin update check');
}
