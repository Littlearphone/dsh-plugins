/**
 * Host half of the services bundle: discover the start scripts of one Session's
 * working directory.
 *
 * The browser half cannot read the workspace, and a relative HTTP route works on
 * whatever port `dsh web` picked, so discovery lives here:
 *
 *   GET /services/list/<sessionId>  →  { dir, name, scripts: [{ name, command }] }
 *
 * The Session is resolved through the Host's own `sessions` store and its
 * effective directory through `workingDirectory`, which is the same pair the
 * rest of the harness uses — no guessing from headers or client state.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Route the browser half calls, relative to the page origin. */
const ROUTE_PATH = '/services';

function reply(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

/**
 * Read one package manifest.
 * @param dir - directory that holds it.
 * @returns the manifest summary, or undefined when there is no package.json.
 */
async function readManifest(dir) {
  const file = join(dir, 'package.json');
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
  const parsed = JSON.parse(text);
  const scripts = [];
  const declared = parsed !== null && typeof parsed === 'object' ? parsed.scripts : undefined;
  if (declared !== null && typeof declared === 'object') {
    for (const [name, command] of Object.entries(declared)) {
      if (typeof command === 'string' && command !== '') scripts.push({ name, command });
    }
  }
  return {
    name: typeof parsed?.name === 'string' ? parsed.name : '',
    scripts,
  };
}

function createHandler(ctx) {
  return async function handle(request, response) {
    // Same-origin only: another page must not read this machine's workspace.
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
    if (!rest.startsWith('list/')) {
      reply(response, 404, { error: 'not-found' });
      return;
    }

    let sessionId;
    try {
      sessionId = decodeURIComponent(rest.slice('list/'.length));
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

    try {
      const manifest = await readManifest(dir);
      reply(response, 200, {
        dir,
        name: manifest?.name ?? '',
        scripts: manifest?.scripts ?? [],
        hasManifest: manifest !== undefined,
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
  const handler = createHandler(ctx);
  ctx.effect(
    () => server.register({ kind: 'prefix', path: ROUTE_PATH, handler }),
    'services: script discovery route',
  );
}
