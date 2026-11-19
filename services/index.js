/**
 * Host half of the services bundle: discover the start scripts of one Session's
 * working directory — its own `package.json`, plus the packages of a workspace
 * (pnpm/npm/yarn layout) when the directory declares one — and run them.
 *
 *   GET /services/list/<sessionId>
 *     → { dir, hasManifest, groups: [{ id, name, dir, scripts: [{ name, command }] }] }
 *
 * The Session is resolved through the Host's own `sessions` store and its
 * effective directory through `workingDirectory`, which is the same pair the
 * rest of the harness uses — no guessing from headers or client state.
 *
 * The implementation is split by concern: `config.js` (start configurations),
 * `discover.js` (scanning), `processes.js` (spawning and the registry) and
 * `routes.js` (the HTTP surface this file registers).
 */
import { ROUTE_PATH } from './discover.js';
import { findMarkedPids, forgetLaunch, killTree, reapPreviousLaunches, RUNNING } from './processes.js';
import { createHandler } from './routes.js';

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